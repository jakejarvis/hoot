import "server-only";
import { lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  certificates,
  dnsRecords,
  hosting,
  httpHeaders,
  registrations,
  seo,
} from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";

export const scanDue = inngest.createFunction(
  { id: "scan-due-revalidations" },
  { cron: "*/1 * * * *" },
  async ({ step }) => {
    const now = new Date();
    const limit = 200;

    // Fetch due rows with error handling so failures surface with context
    let dueDns: Array<{ domainId: string }>; // dns
    let dueHeaders: Array<{ domainId: string }>; // headers
    let dueHosting: Array<{ domainId: string }>; // hosting
    let dueCerts: Array<{ domainId: string }>; // certificates
    let dueSeo: Array<{ domainId: string }>; // seo
    let dueReg: Array<{ domainId: string }>; // registration
    try {
      [dueDns, dueHeaders, dueHosting, dueCerts, dueSeo, dueReg] =
        await Promise.all([
          db
            .select({ domainId: dnsRecords.domainId })
            .from(dnsRecords)
            .where(lte(dnsRecords.expiresAt, now))
            .limit(limit),
          db
            .select({ domainId: httpHeaders.domainId })
            .from(httpHeaders)
            .where(lte(httpHeaders.expiresAt, now))
            .limit(limit),
          db
            .select({ domainId: hosting.domainId })
            .from(hosting)
            .where(lte(hosting.expiresAt, now))
            .limit(limit),
          db
            .select({ domainId: certificates.domainId })
            .from(certificates)
            .where(lte(certificates.expiresAt, now))
            .limit(limit),
          db
            .select({ domainId: seo.domainId })
            .from(seo)
            .where(lte(seo.expiresAt, now))
            .limit(limit),
          db
            .select({ domainId: registrations.domainId })
            .from(registrations)
            .where(lte(registrations.expiresAt, now))
            .limit(limit),
        ]);
    } catch (error) {
      console.error("[scan-due] database queries failed", {
        error,
        now,
        limit,
      });
      throw error;
    }

    // Group sections per domain to deduplicate events
    const domainsToSections = new Map<string, Set<string>>();
    const addSection = (domain: string, section: string) => {
      if (!domain) return;
      const key = domain;
      const set = domainsToSections.get(key) ?? new Set<string>();
      set.add(section);
      domainsToSections.set(key, set);
    };

    for (const r of dueReg) addSection(r.domainId, "registration");
    for (const r of dueDns) addSection(r.domainId, "dns");
    for (const r of dueHeaders) addSection(r.domainId, "headers");
    for (const r of dueHosting) addSection(r.domainId, "hosting");
    for (const r of dueCerts) addSection(r.domainId, "certificates");
    for (const r of dueSeo) addSection(r.domainId, "seo");

    // Enforce a small payload: cap sections per domain (there are <=6 today)
    const MAX_SECTIONS_PER_DOMAIN = 6;
    const groupedEvents: Array<{
      name: string;
      data: { domain: string; sections: string[] };
    }> = Array.from(domainsToSections.entries()).map(([domain, sections]) => ({
      name: "section/revalidate",
      data: {
        domain: typeof domain === "string" ? domain.trim().toLowerCase() : "",
        sections: Array.from(sections).slice(0, MAX_SECTIONS_PER_DOMAIN),
      },
    }));

    if (groupedEvents.length === 0) {
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
      } catch (error) {
        console.error("[scan-due] sendEvent failed", {
          error,
          batchSize: chunk.length,
          batchIndex: Math.floor(i / BATCH_SIZE),
        });
        throw error;
      }
    }
  },
);

export async function countDueDns(
  now: Date = new Date(),
  limit = 200,
): Promise<number> {
  const rows = await db
    .select({ domainId: dnsRecords.domainId })
    .from(dnsRecords)
    .where(lte(dnsRecords.expiresAt, now))
    .limit(limit);
  return rows.length;
}
