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

    const [dueDns, dueHeaders, dueHosting, dueCerts, dueSeo, dueReg] =
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

    const events: Array<{
      name: string;
      data: { domainId: string; section: string };
    }> = [];
    for (const r of dueReg)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "registration" },
      });
    for (const r of dueDns)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "dns" },
      });
    for (const r of dueHeaders)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "headers" },
      });
    for (const r of dueHosting)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "hosting" },
      });
    for (const r of dueCerts)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "certificates" },
      });
    for (const r of dueSeo)
      events.push({
        name: "section/revalidate",
        data: { domainId: r.domainId, section: "seo" },
      });

    if (events.length > 0) {
      await step.sendEvent("enqueue-due", events);
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
