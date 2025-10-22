import "server-only";

import { captureServer } from "@/lib/analytics/server";
import { inngest } from "@/lib/inngest/client";
import { ns, redis } from "@/lib/redis";
import {
  DRAIN_CRON_MINUTES,
  MAX_EVENTS_PER_RUN,
  PER_SECTION_BATCH,
} from "@/lib/revalidation-config";
import { allSections, getLeaseSeconds } from "@/lib/schedule";
import type { Section } from "@/lib/schemas";

export const dueDrain = inngest.createFunction(
  { id: "due-drain" },
  // drain frequently with small budgets to smooth load
  {
    cron:
      DRAIN_CRON_MINUTES <= 60
        ? `*/${DRAIN_CRON_MINUTES} * * * *`
        : "*/1 * * * *", // fall back to every minute
  },
  async ({ step, logger }) => {
    const startedAt = Date.now();
    const sections = allSections();
    const perSectionBatch = PER_SECTION_BATCH;
    const globalMax = MAX_EVENTS_PER_RUN;
    const leaseSecs = getLeaseSeconds();

    let eventsSent = 0;
    const domainToSections = new Map<string, Set<Section>>();

    for (const section of sections) {
      if (eventsSent >= globalMax) break;
      const dueKey = ns("due", section);
      const now = Date.now();
      // Pull a small window of due domains
      const dueMembers = (await redis.zrange(dueKey, 0, now, {
        byScore: true,
        offset: 0,
        count: Math.min(perSectionBatch, globalMax - eventsSent),
      })) as string[];
      if (!dueMembers.length) continue;

      for (const domain of dueMembers) {
        if (eventsSent >= globalMax) break;
        const leaseKey = ns("lease", section, domain);
        // Attempt to acquire lease for this section+domain
        const ok = await redis.set(leaseKey, "1", {
          nx: true,
          ex: leaseSecs,
        });
        // If lease not acquired, skip
        if (ok !== "OK" && ok !== undefined) continue;

        // Enforce global budget at selection time: increment when first selecting a domain
        const previouslySelected = domainToSections.has(domain);
        if (!previouslySelected) {
          if (eventsSent >= globalMax) break;
          eventsSent += 1;
        }

        const set = domainToSections.get(domain) ?? new Set<Section>();
        set.add(section);
        domainToSections.set(domain, set);
      }
      if (eventsSent >= globalMax) break;
    }

    const grouped = Array.from(domainToSections.entries());
    if (grouped.length === 0) {
      logger.debug("[due-drain] nothing due");
      return;
    }

    // Emit events, each event coalescing multiple sections per domain
    const BATCH_SIZE = 200;
    const events: Array<{
      name: string;
      data: { domain: string; sections: Section[] };
    }> = grouped.map(([domain, set]) => ({
      name: "section/revalidate",
      data: { domain, sections: Array.from(set) },
    }));

    let emitted = 0;
    let batchIndex = 0;
    for (let i = 0; i < events.length; ) {
      if (emitted >= globalMax) break;
      const remaining = Math.max(0, globalMax - emitted);
      const size = Math.min(BATCH_SIZE, remaining);
      if (size <= 0) break;
      const chunk = events.slice(i, i + size) as Array<{
        name: string;
        data: { domain: string; sections: Section[] };
      }>;
      await step.sendEvent(`enqueue-due-${batchIndex}` as const, chunk);
      // Best-effort cleanup; wrap to avoid aborting enqueue on cleanup failures
      try {
        for (const evt of chunk) {
          const { domain, sections } = evt.data;
          await Promise.all(
            sections.map((s) => redis.zrem(ns("due", s), domain)),
          );
        }
      } catch {}
      emitted += chunk.length;
      i += size;
      batchIndex += 1;
    }

    eventsSent = emitted;
    try {
      await captureServer("due_drain", {
        duration_ms: Date.now() - startedAt,
        emitted,
        groups: grouped.length,
      });
    } catch {}
  },
);
