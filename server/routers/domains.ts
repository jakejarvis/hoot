import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDomainTld } from "rdapper";
import z from "zod";
import { db } from "@/lib/db/client";
import { upsertDomain } from "@/lib/db/repos/domains";
import {
  certificates,
  domains,
  registrations,
  userDomains,
} from "@/lib/db/schema";
import { normalizeDomainInput } from "@/lib/domain";
import { toRegistrableDomain } from "@/lib/domain-server";
import {
  generateVerificationToken,
  verifyDnsTxt,
  verifyFile,
  verifyMetaTag,
} from "@/server/services/domain-verification";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const VerificationMethodSchema = z.enum(["dns", "meta", "file"]);

/**
 * Domains router for domain ownership verification
 */
export const domainsRouter = createTRPCRouter({
  /**
   * Add a domain to the user's account for verification
   */
  add: protectedProcedure
    .input(
      z.object({
        domain: z.string().min(1).transform(normalizeDomainInput),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { domain } = input;

      // Validate domain
      const registrable = toRegistrableDomain(domain);
      if (!registrable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid domain format",
        });
      }

      // Ensure domain exists in domains table
      const domainRecord = await upsertDomain({
        name: registrable,
        tld: getDomainTld(registrable) ?? "",
        unicodeName: domain,
      });

      // Check if user already owns this domain
      const existing = await db.query.userDomains.findFirst({
        where: and(
          eq(userDomains.userId, ctx.user.id),
          eq(userDomains.domainId, domainRecord.id),
        ),
      });

      // If domain is already verified, don't allow re-adding
      if (existing?.verifiedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Domain is already verified",
        });
      }

      // If domain exists but not verified, return existing token
      if (existing?.verificationToken) {
        return {
          token: existing.verificationToken,
          domain: registrable,
          domainId: domainRecord.id,
        };
      }

      // Generate new verification token
      const token = generateVerificationToken();

      // Insert or update user_domains record
      if (existing) {
        await db
          .update(userDomains)
          .set({
            verificationToken: token,
            updatedAt: new Date(),
          })
          .where(eq(userDomains.id, existing.id));

        return {
          token,
          domain: registrable,
          domainId: domainRecord.id,
        };
      }

      // Insert new record
      await db.insert(userDomains).values({
        userId: ctx.user.id,
        domainId: domainRecord.id,
        verificationToken: token,
      });

      return {
        token,
        domain: registrable,
        domainId: domainRecord.id,
      };
    }),

  /**
   * Verify domain ownership using specified method
   */
  verify: protectedProcedure
    .input(
      z.object({
        domainId: z.string().uuid(),
        method: VerificationMethodSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { domainId, method } = input;

      // Get user domain record with domain info
      const records = await db
        .select({
          userDomain: userDomains,
          domain: domains,
        })
        .from(userDomains)
        .innerJoin(domains, eq(domains.id, userDomains.domainId))
        .where(
          and(
            eq(userDomains.userId, ctx.user.id),
            eq(userDomains.domainId, domainId),
          ),
        )
        .limit(1);

      const record = records[0];

      if (!record) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Domain not found or does not belong to you",
        });
      }

      // Check if already verified
      if (record.userDomain.verifiedAt) {
        return {
          verified: true,
          verifiedAt: record.userDomain.verifiedAt,
        };
      }

      // Ensure we have a token to verify against
      if (!record.userDomain.verificationToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No verification token found. Please re-add the domain.",
        });
      }

      // Perform verification based on method
      const domainName = record.domain.name;
      const verificationToken = record.userDomain.verificationToken;

      const result =
        method === "dns"
          ? await verifyDnsTxt(domainName, verificationToken)
          : method === "meta"
            ? await verifyMetaTag(domainName, verificationToken)
            : await verifyFile(domainName, verificationToken);

      // If verification successful, update the record
      if (result.verified) {
        const verifiedAt = new Date();

        await db
          .update(userDomains)
          .set({
            verifiedAt,
            verificationMethod: method,
            verificationToken: null, // Clear token after successful verification
            updatedAt: new Date(),
          })
          .where(eq(userDomains.id, record.userDomain.id));

        return {
          verified: true,
          verifiedAt,
        };
      }

      // Verification failed
      return {
        verified: false,
      };
    }),

  /**
   * List all domains owned by the user with expiry data
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Get user domains with registration data
    const records = await db
      .select({
        id: userDomains.id,
        domainId: userDomains.domainId,
        domain: domains.name,
        verified: sql<boolean>`${userDomains.verifiedAt} IS NOT NULL`,
        verifiedAt: userDomains.verifiedAt,
        verificationMethod: userDomains.verificationMethod,
        createdAt: userDomains.createdAt,
        registrationExpiresAt: registrations.expirationDate,
      })
      .from(userDomains)
      .innerJoin(domains, eq(domains.id, userDomains.domainId))
      .leftJoin(registrations, eq(registrations.domainId, domains.id))
      .where(eq(userDomains.userId, ctx.user.id))
      .orderBy(desc(userDomains.createdAt));

    // Get the most recent certificate for each domain
    const domainIds = records.map((r) => r.domainId);
    const certs =
      domainIds.length > 0
        ? await db
            .select({
              domainId: certificates.domainId,
              validTo: certificates.validTo,
            })
            .from(certificates)
            .where(
              sql`${certificates.domainId} IN ${domainIds} 
                  AND ${certificates.fetchedAt} = (
                    SELECT MAX(c2.fetched_at) 
                    FROM certificates c2 
                    WHERE c2.domain_id = ${certificates.domainId}
                  )`,
            )
        : [];

    // Map certificates to domains
    const certMap = new Map(
      certs.map((c) => [c.domainId, c.validTo?.toISOString()]),
    );

    // Combine results
    return records.map((r) => ({
      ...r,
      certificateExpiresAt: certMap.get(r.domainId) ?? null,
    }));
  }),

  /**
   * Get a specific user domain for verification
   */
  getForVerification: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const record = await db
        .select({
          id: userDomains.id,
          domain: domains.name,
          verificationToken: userDomains.verificationToken,
          verified: sql<boolean>`${userDomains.verifiedAt} IS NOT NULL`,
        })
        .from(userDomains)
        .innerJoin(domains, eq(domains.id, userDomains.domainId))
        .where(
          and(
            eq(userDomains.id, input.id),
            eq(userDomains.userId, ctx.user.id),
          ),
        )
        .limit(1);

      if (!record[0]) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return record[0];
    }),
});
