import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { db } from "@/lib/db/client";
import { domains, user, userDomains } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";
import { inngest } from "@/lib/inngest/client";
import {
  type ChangeDetection,
  detectChanges,
  getLatestSnapshot,
  saveSnapshot,
} from "@/lib/notifications/detect-changes";
import {
  canSendNotification,
  getOrCreatePreferences,
  logNotification,
  type NotificationPreferences,
} from "@/lib/notifications/helpers";
import { ns, redis } from "@/lib/redis";
import {
  recordFailureAndBackoff,
  resetFailureBackoff,
  scheduleSectionIfEarlier,
} from "@/lib/schedule";
import { type Section, SectionEnum } from "@/lib/schemas";
import { getCertificates } from "@/server/services/certificates";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { detectHosting } from "@/server/services/hosting";
import { getRegistration } from "@/server/services/registration";
import { getSeo } from "@/server/services/seo";

const eventDataSchema = z.object({
  domain: z.string().min(1),
  section: SectionEnum.optional(),
  sections: z.array(SectionEnum).optional(),
});

export async function revalidateSection(
  domain: string,
  section: Section,
): Promise<unknown> {
  try {
    switch (section) {
      case "dns":
        return await resolveAll(domain);
      case "headers":
        return await probeHeaders(domain);
      case "hosting":
        return await detectHosting(domain);
      case "certificates":
        return await getCertificates(domain);
      case "seo":
        return await getSeo(domain);
      case "registration":
        return await getRegistration(domain);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export const sectionRevalidate = inngest.createFunction(
  {
    id: "section-revalidate",
    concurrency: {
      key: "event.data.domain",
      limit: 1,
    },
  },
  { event: "section/revalidate" },
  async ({ event, step, logger }) => {
    const data = eventDataSchema.parse(event.data);
    const domain = data.domain;
    const normalizedDomain =
      typeof domain === "string" ? domain.trim().toLowerCase() : "";

    const sections: Section[] = Array.isArray(data.sections)
      ? data.sections
      : data.section
        ? [data.section]
        : [];

    if (sections.length === 0) {
      logger.debug("[section-revalidate] no sections provided", {
        domain: normalizedDomain,
      });
      return;
    }

    for (const section of sections) {
      const lockKey = ns("lock", "revalidate", section, normalizedDomain);
      const resultKey = ns("result", "revalidate", section, normalizedDomain);
      const wait = await step.run("acquire-lock", async () =>
        acquireLockOrWaitForResult({
          lockKey,
          resultKey,
          lockTtl: 60,
        }),
      );
      if (!wait.acquired) continue;
      try {
        const currentData = await step.run(
          `revalidate:${section}`,
          async () => {
            logger.info("[section-revalidate] start", {
              domain: normalizedDomain,
              section,
            });
            const data = await revalidateSection(normalizedDomain, section);
            logger.info("[section-revalidate] done", {
              domain: normalizedDomain,
              section,
            });
            return data;
          },
        );

        // Change detection: compare with previous snapshot and notify users
        await step.run(`detect-changes:${section}`, async () => {
          try {
            // Skip if no data was returned from revalidation
            if (!currentData) return;

            // Get domain record from DB
            const domainRecord = await db.query.domains.findFirst({
              where: eq(domains.name, normalizedDomain),
            });

            if (!domainRecord) return;

            // Get latest snapshot
            const previous = await getLatestSnapshot(domainRecord.id, section);

            // Detect changes
            const changes = detectChanges(
              section,
              previous?.snapshotData ?? null,
              currentData,
            );

            // Save new snapshot
            await saveSnapshot(domainRecord.id, section, currentData);

            // Process changes and send notifications
            if (changes.length > 0) {
              logger.info("[section-revalidate] changes detected", {
                domain: normalizedDomain,
                section,
                changes: changes.map((c) => c.type),
              });

              await processChanges(domainRecord, changes, logger);
            }
          } catch (err) {
            logger.warn("[section-revalidate] failed to detect changes", {
              domain: normalizedDomain,
              section,
              error: err,
            });
          }
        });

        // On success: compute next due time using DB TTLs where applicable.
        // We don't know exact DB values here, so schedule a conservative minimum
        // to ensure the due queue repopulates even if on-write scheduling missed.
        const fallbackMs = Date.now() + 60 * 60 * 1000; // 1h safety fallback
        await step.run("reschedule-next-due", async () => {
          try {
            await scheduleSectionIfEarlier(
              section,
              normalizedDomain,
              fallbackMs,
            );
            // Clear any accumulated failure backoff on success
            await resetFailureBackoff(section, normalizedDomain);
          } catch {}
        });
        await step.run("write-result", async () => {
          try {
            await redis.set(
              resultKey,
              JSON.stringify({ completedAt: Date.now() }),
              { ex: 55 },
            );
          } catch (err) {
            logger.warn("[section-revalidate] failed to write result", {
              domain: normalizedDomain,
              section,
              error: err,
            });
          }
        });
      } catch {
        // On failure: backoff and reschedule
        await step.run("backoff-on-failure", async () => {
          try {
            await recordFailureAndBackoff(section, normalizedDomain);
          } catch {}
        });
      } finally {
        await step.run("release-lock", async () => {
          try {
            await redis.del(lockKey);
          } catch (err) {
            logger.warn("[section-revalidate] failed to release lock", {
              domain: normalizedDomain,
              section,
              error: err,
            });
          }
        });
      }
    }
  },
);

/**
 * Process changes and send notifications to all users monitoring this domain
 */
async function processChanges(
  domainRecord: { id: string; name: string },
  changes: ChangeDetection[],
  logger: {
    info: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  },
) {
  // Get all users monitoring this domain
  const users = await db
    .select({
      userDomain: userDomains,
      user: user,
    })
    .from(userDomains)
    .innerJoin(user, eq(user.id, userDomains.userId))
    .where(
      and(
        eq(userDomains.domainId, domainRecord.id),
        sql`${userDomains.verifiedAt} IS NOT NULL`,
      ),
    );

  for (const ud of users) {
    try {
      const prefs = await getOrCreatePreferences(ud.userDomain.userId);
      if (!prefs.emailEnabled) continue;

      for (const change of changes) {
        // Check user preferences for this change type
        const shouldNotify = shouldNotifyForChange(prefs, change.type);
        if (!shouldNotify) continue;

        // Check idempotency (max 1 per day for changes)
        const canSend = await canSendNotification(
          ud.userDomain.userId,
          domainRecord.id,
          change.type,
        );

        if (canSend) {
          // Send email based on change type
          let result: { id: string } | { error: string } | undefined;

          switch (change.type) {
            case "nameserver_changed":
              result = await sendEmail({
                to: ud.user.email,
                subject: `Nameservers Changed for ${domainRecord.name}`,
                template: "nameserver-changed",
                data: {
                  domain: domainRecord.name,
                  previousNs: change.before as string[],
                  currentNs: change.after as string[],
                  verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/domains/${domainRecord.id}`,
                },
              });
              break;
            case "certificate_changed":
              result = await sendEmail({
                to: ud.user.email,
                subject: `Certificate Changed for ${domainRecord.name}`,
                template: "certificate-changed",
                data: {
                  domain: domainRecord.name,
                  changeDetails: {
                    before: change.before as {
                      validFrom: string | null;
                      validTo: string | null;
                      issuer: string | null;
                    },
                    after: change.after as {
                      validFrom: string | null;
                      validTo: string | null;
                      issuer: string | null;
                    },
                  },
                  verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/domains/${domainRecord.id}`,
                },
              });
              break;
            // Add other change types as needed
            default:
              continue;
          }

          // Log notification
          if (result && "id" in result) {
            await logNotification(
              ud.userDomain.userId,
              domainRecord.id,
              change.type,
              result.id,
              { change },
            );
          }
        }
      }
    } catch (err) {
      logger.error("[section-revalidate] failed to notify user of changes", {
        userId: ud.userDomain.userId,
        domain: domainRecord.name,
        error: err,
      });
    }
  }
}

/**
 * Check if user preferences allow notification for this change type
 */
function shouldNotifyForChange(
  prefs: NotificationPreferences,
  changeType: string,
): boolean {
  switch (changeType) {
    case "nameserver_changed":
      return prefs.notifyNameserverChange;
    case "certificate_changed":
      return prefs.notifyCertificateChange;
    case "hosting_changed":
      return prefs.notifyHostingChange;
    case "dns_changed":
      return prefs.notifyDnsChange;
    default:
      return false;
  }
}
