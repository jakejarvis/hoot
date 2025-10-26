import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { getDomainTld } from "rdapper";
import z from "zod";
import { db } from "@/lib/db/client";
import { upsertDomain } from "@/lib/db/repos/domains";
import { domains, userDomains } from "@/lib/db/schema";
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
   * List all domains owned by the user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const records = await db
      .select({
        userDomain: userDomains,
        domain: domains,
      })
      .from(userDomains)
      .innerJoin(domains, eq(domains.id, userDomains.domainId))
      .where(eq(userDomains.userId, ctx.user.id))
      .orderBy((t) => t.userDomain.createdAt);

    return records.map((record) => ({
      id: record.userDomain.id,
      domainId: record.userDomain.domainId,
      domain: record.domain.name,
      verified: !!record.userDomain.verifiedAt,
      verifiedAt: record.userDomain.verifiedAt,
      verificationMethod: record.userDomain.verificationMethod,
      createdAt: record.userDomain.createdAt,
    }));
  }),
});
