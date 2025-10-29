import "server-only";
import { z } from "zod";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { MAX_FAILURE_ATTEMPTS } from "@/lib/constants";
import { inngest } from "@/lib/inngest/client";
import { ns, redis } from "@/lib/redis";
import {
  getFailureAttempts,
  moveToDLQ,
  recordFailureAndBackoff,
  resetFailureBackoff,
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
): Promise<void> {
  switch (section) {
    case "dns":
      await resolveAll(domain);
      return;
    case "headers":
      await probeHeaders(domain);
      return;
    case "hosting":
      await detectHosting(domain);
      return;
    case "certificates":
      await getCertificates(domain);
      return;
    case "seo":
      await getSeo(domain);
      return;
    case "registration":
      await getRegistration(domain);
      return;
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

      // Step 1: Acquire lock and revalidate section data
      const result = await step.run(
        `revalidate-with-lock:${section}`,
        async () => {
          // Try to acquire lock or wait for result
          const wait = await acquireLockOrWaitForResult({
            lockKey,
            resultKey,
            lockTtl: 60,
          });

          if (!wait.acquired) {
            return { skipped: true, success: false };
          }

          // Lock acquired, perform revalidation
          try {
            logger.info("[section-revalidate] start", {
              domain: normalizedDomain,
              section,
            });
            await revalidateSection(normalizedDomain, section);
            logger.info("[section-revalidate] done", {
              domain: normalizedDomain,
              section,
            });
            return { skipped: false, success: true };
          } catch (err) {
            logger.error("[section-revalidate] failed", {
              domain: normalizedDomain,
              section,
              error: err,
            });
            return { skipped: false, success: false };
          }
        },
      );

      // Skip cleanup if we didn't acquire the lock
      if (result.skipped) continue;

      // Step 2: Cleanup - write result, reset/record backoff, release lock
      await step.run(`cleanup:${section}`, async () => {
        try {
          if (result.success) {
            // Write completion result for deduplication
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

            // Clear any accumulated failure backoff on success
            // Services already schedule next run after successful writes
            try {
              await resetFailureBackoff(section, normalizedDomain);
            } catch {}
          } else {
            // On failure: record failure and apply backoff
            try {
              await recordFailureAndBackoff(section, normalizedDomain);

              // Check if we've hit max failures and should move to DLQ
              const attempts = await getFailureAttempts(
                section,
                normalizedDomain,
              );
              if (attempts >= MAX_FAILURE_ATTEMPTS) {
                await moveToDLQ(section, normalizedDomain);
                logger.warn(
                  "[section-revalidate] moved to DLQ after max failures",
                  {
                    domain: normalizedDomain,
                    section,
                    attempts,
                  },
                );
              }
            } catch {}
          }
        } finally {
          // Always release lock
          try {
            await redis.del(lockKey);
          } catch (err) {
            logger.warn("[section-revalidate] failed to release lock", {
              domain: normalizedDomain,
              section,
              error: err,
            });
          }
        }
      });
    }
  },
);
