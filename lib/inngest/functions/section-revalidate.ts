import "server-only";
import { z } from "zod";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { inngest } from "@/lib/inngest/client";
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
      const wait = await step.run("acquire-lock", async () =>
        acquireLockOrWaitForResult({
          lockKey,
          resultKey,
          lockTtl: 60,
        }),
      );
      if (!wait.acquired) continue;
      try {
        await step.run(`revalidate:${section}`, async () => {
          logger.info("[section-revalidate] start", {
            domain: normalizedDomain,
            section,
          });
          await revalidateSection(normalizedDomain, section);
          logger.info("[section-revalidate] done", {
            domain: normalizedDomain,
            section,
          });
          return { domain: normalizedDomain, section };
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
