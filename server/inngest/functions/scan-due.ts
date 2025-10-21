import "server-only";
import { eq, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  certificates,
  dnsRecords,
  domains,
  hosting,
  httpHeaders,
  httpHeadersMeta,
  registrations,
  seo,
} from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";

export const scanDue = inngest.createFunction(
  { id: "scan-due-revalidations" },
  { cron: "*/1 * * * *" },
  async ({ step, logger }) => {
    const now = new Date();
    const limit = 200;

    // Fetch due rows with error handling so failures surface with context
    let dueDns: Array<{ domainId: string; domain: string }> = []; // dns
    let dueHeaders: Array<{ domainId: string; domain: string }> = []; // headers
    let dueHosting: Array<{ domainId: string; domain: string }> = []; // hosting
    let dueCerts: Array<{ domainId: string; domain: string }> = []; // certificates
    let dueSeo: Array<{ domainId: string; domain: string }> = []; // seo
    let dueReg: Array<{ domainId: string; domain: string }> = []; // registration
    await step.run("query-due-rows", async () => {
      try {
        [dueDns, dueHeaders, dueHosting, dueCerts, dueSeo, dueReg] =
          await Promise.all([
            db
              .select({ domainId: dnsRecords.domainId, domain: domains.name })
              .from(dnsRecords)
              .innerJoin(domains, eq(dnsRecords.domainId, domains.id))
              .where(lte(dnsRecords.expiresAt, now))
              .limit(limit),
            db
              .select({ domainId: httpHeaders.domainId, domain: domains.name })
              .from(httpHeaders)
              .innerJoin(domains, eq(httpHeaders.domainId, domains.id))
              .where(lte(httpHeaders.expiresAt, now))
              .limit(limit),
            db
              .select({ domainId: hosting.domainId, domain: domains.name })
              .from(hosting)
              .innerJoin(domains, eq(hosting.domainId, domains.id))
              .where(lte(hosting.expiresAt, now))
              .limit(limit),
            db
              .select({ domainId: certificates.domainId, domain: domains.name })
              .from(certificates)
              .innerJoin(domains, eq(certificates.domainId, domains.id))
              .where(lte(certificates.expiresAt, now))
              .limit(limit),
            db
              .select({ domainId: seo.domainId, domain: domains.name })
              .from(seo)
              .innerJoin(domains, eq(seo.domainId, domains.id))
              .where(lte(seo.expiresAt, now))
              .limit(limit),
            db
              .select({
                domainId: registrations.domainId,
                domain: domains.name,
              })
              .from(registrations)
              .innerJoin(domains, eq(registrations.domainId, domains.id))
              .where(lte(registrations.expiresAt, now))
              .limit(limit),
          ]);
        logger.info("[scan-due] queried due rows");
        return {
          now: now.toISOString(),
          limit,
          counts: {
            dns: dueDns.length,
            headers: dueHeaders.length,
            hosting: dueHosting.length,
            certs: dueCerts.length,
            seo: dueSeo.length,
            registration: dueReg.length,
          },
        };
      } catch (error) {
        logger.error("[scan-due] database queries failed", {
          error,
          now: now.toISOString(),
          limit,
        });
        throw error;
      }
    });

    // Best-effort prune of expired http_headers_meta rows (simple, fast)
    await step.run("prune-http-headers-meta", async () => {
      try {
        await db
          .delete(httpHeadersMeta)
          .where(lte(httpHeadersMeta.expiresAt, now));
      } catch (error) {
        logger.warn("[scan-due] prune http_headers_meta failed", { error });
      }
    });

    // Group sections per domain to deduplicate events
    const domainsToSections = new Map<string, Set<string>>();
    const addSection = (
      domainName: string,
      _domainId: string,
      section: string,
    ) => {
      if (!domainName) return;
      const key = domainName;
      const set = domainsToSections.get(key) ?? new Set<string>();
      set.add(section);
      domainsToSections.set(key, set);
    };

    for (const r of dueReg) addSection(r.domain, r.domainId, "registration");
    for (const r of dueDns) addSection(r.domain, r.domainId, "dns");
    for (const r of dueHeaders) addSection(r.domain, r.domainId, "headers");
    for (const r of dueHosting) addSection(r.domain, r.domainId, "hosting");
    for (const r of dueCerts) addSection(r.domain, r.domainId, "certificates");
    for (const r of dueSeo) addSection(r.domain, r.domainId, "seo");

    // Enforce a small payload: cap sections per domain (there are <=6 today)
    const MAX_SECTIONS_PER_DOMAIN = 6;
    const groupedEvents: Array<{
      name: string;
      data: { domain: string; sections: string[] };
    }> = Array.from(domainsToSections.entries()).map(([domain, sections]) => ({
      name: "section/revalidate",
      data: {
        domain,
        sections: Array.from(sections).slice(0, MAX_SECTIONS_PER_DOMAIN),
      },
    }));

    if (groupedEvents.length === 0) {
      logger.debug("[scan-due] no due groups; exiting");
      return;
    }

    // Batch events to avoid oversized payloads
    const BATCH_SIZE = 200;
    for (let i = 0; i < groupedEvents.length; i += BATCH_SIZE) {
      const chunk = groupedEvents.slice(i, i + BATCH_SIZE);
      try {
        await step.sendEvent(
          `enqueue-due-${Math.floor(i / BATCH_SIZE)}`,
          chunk,
        );
        logger.info("[scan-due] enqueued batch", {
          batchSize: chunk.length,
          batchIndex: Math.floor(i / BATCH_SIZE),
        });
      } catch (error) {
        logger.error("[scan-due] sendEvent failed", {
          error,
          batchSize: chunk.length,
          batchIndex: Math.floor(i / BATCH_SIZE),
        });
        throw error;
      }
    }
  },
);
