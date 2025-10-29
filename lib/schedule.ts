import "server-only";

import { sql } from "drizzle-orm";
import {
  BACKOFF_BASE_SECS,
  BACKOFF_MAX_SECS,
  DLQ_COOLDOWN_HOURS,
  LEASE_SECS,
  MAX_EVENTS_PER_RUN,
  PER_SECTION_BATCH,
  REVALIDATE_MIN_CERTIFICATES,
  REVALIDATE_MIN_DNS,
  REVALIDATE_MIN_HEADERS,
  REVALIDATE_MIN_HOSTING,
  REVALIDATE_MIN_REGISTRATION,
  REVALIDATE_MIN_SEO,
  STALE_ACCESS_THRESHOLD_DAYS,
} from "@/lib/constants";
import { db } from "@/lib/db/client";
import { findDomainByName } from "@/lib/db/repos/domains";
import { domains } from "@/lib/db/schema";
import { ns, redis } from "@/lib/redis";
import { type Section, SectionEnum } from "@/lib/schemas";

// Section dependency graph: sections that depend on others
const SECTION_DEPENDENCIES: Partial<Record<Section, Section[]>> = {
  hosting: ["dns"], // Hosting detection needs DNS data
  certificates: ["dns"], // Certificate lookup needs DNS for validation
};

// Priority tiers for queue management
export type Priority = "high" | "normal" | "low";

/**
 * Determine priority based on last access time.
 * Recent access = high priority, older = normal, very old = low.
 * Exported for services to use when scheduling with priority.
 */
export function determinePriority(
  lastAccessedAt: Date | null | undefined,
): Priority {
  if (!lastAccessedAt) return "normal";

  const ageMs = Date.now() - lastAccessedAt.getTime();
  const oneHour = 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (ageMs < oneHour) return "high";
  if (ageMs < sevenDays) return "normal";
  return "low";
}

function minTtlSecondsForSection(section: Section): number {
  switch (section) {
    case "dns":
      return REVALIDATE_MIN_DNS;
    case "headers":
      return REVALIDATE_MIN_HEADERS;
    case "hosting":
      return REVALIDATE_MIN_HOSTING;
    case "certificates":
      return REVALIDATE_MIN_CERTIFICATES;
    case "seo":
      return REVALIDATE_MIN_SEO;
    case "registration":
      return REVALIDATE_MIN_REGISTRATION;
  }
}

function backoffMsForAttempts(attempts: number): number {
  const baseSecs = BACKOFF_BASE_SECS;
  const maxSecs = BACKOFF_MAX_SECS;
  const secs = Math.min(
    maxSecs,
    Math.max(baseSecs, baseSecs * 2 ** Math.max(0, attempts - 1)),
  );
  return secs * 1000;
}

/**
 * Internal helper to schedule a single section without dependencies.
 * Optionally accepts a priority to use priority lanes.
 */
async function scheduleSingle(
  section: Section,
  domain: string,
  dueAtMs: number,
  priority?: Priority,
): Promise<boolean> {
  // Validate dueAtMs before any computation or Redis writes
  if (!Number.isFinite(dueAtMs) || dueAtMs < 0) {
    return false;
  }
  const now = Date.now();
  const minDueMs = now + minTtlSecondsForSection(section) * 1000;
  const desired = Math.max(dueAtMs, minDueMs);

  // Use priority suffix if specified, otherwise use standard key
  const dueKey = priority ? ns("due", section, priority) : ns("due", section);

  let current: number | null = null;
  try {
    const score = await redis.zscore(dueKey, domain);
    current = typeof score === "number" ? score : null;
  } catch {
    current = null;
  }
  if (typeof current === "number" && current <= desired) {
    return false;
  }
  await redis.zadd(dueKey, { score: desired, member: domain });
  return true;
}

/**
 * Schedule a section and automatically schedule its dependencies.
 * Dependencies are scheduled slightly earlier (60s before) to ensure they're fresh.
 */
export async function scheduleSectionIfEarlier(
  section: Section,
  domain: string,
  dueAtMs: number,
): Promise<boolean> {
  // Schedule the main section
  const scheduled = await scheduleSingle(section, domain, dueAtMs);

  // Auto-schedule dependencies slightly earlier
  const dependencies = SECTION_DEPENDENCIES[section];
  if (dependencies && scheduled) {
    const depDueAtMs = dueAtMs - 60000; // 60 seconds earlier
    await Promise.all(
      dependencies.map((dep) => scheduleSingle(dep, domain, depDueAtMs)),
    );
  }

  return scheduled;
}

export async function scheduleSectionsForDomain(
  domain: string,
  sections: Array<{ section: Section; dueAtMs: number }>,
): Promise<void> {
  await Promise.all(
    sections.map((s) => scheduleSectionIfEarlier(s.section, domain, s.dueAtMs)),
  );
}

/**
 * Schedules sections soon; actual run time is bounded by each section's min TTL.
 */
export async function scheduleImmediate(
  domain: string,
  sections: Section[],
  delayMs: number = 1000,
): Promise<void> {
  const now = Date.now();
  await scheduleSectionsForDomain(
    domain,
    sections.map((s) => ({ section: s, dueAtMs: now + delayMs })),
  );
}

export async function recordFailureAndBackoff(
  section: Section,
  domain: string,
): Promise<number> {
  const taskKey = ns("task", section);
  let attempts = 0;
  try {
    const res = await redis.hincrby(taskKey, domain, 1);
    attempts = typeof res === "number" ? res : 1;
  } catch {
    attempts = 1;
  }
  const nextAtMs = Date.now() + backoffMsForAttempts(attempts);
  await redis.zadd(ns("due", section), { score: nextAtMs, member: domain });
  return nextAtMs;
}

export async function resetFailureBackoff(
  section: Section,
  domain: string,
): Promise<void> {
  const taskKey = ns("task", section);
  try {
    await redis.hdel(taskKey, domain);
  } catch {}
}

/**
 * Move a domain to the dead letter queue after persistent failures.
 * Removes it from the regular queue and clears failure counters.
 */
export async function moveToDLQ(
  section: Section,
  domain: string,
): Promise<void> {
  const dlqKey = ns("dlq", section);
  const dueKey = ns("due", section);
  const taskKey = ns("task", section);

  const cooldownMs = DLQ_COOLDOWN_HOURS * 60 * 60 * 1000;
  const restoreAt = Date.now() + cooldownMs;

  try {
    // Add to DLQ with cooldown timestamp
    await redis.zadd(dlqKey, { score: restoreAt, member: domain });

    // Remove from regular queue
    await redis.zrem(dueKey, domain);

    // Clear failure counter
    await redis.hdel(taskKey, domain);

    console.warn(
      `[schedule] moved ${domain} to DLQ for section ${section}, cooldown until ${new Date(restoreAt).toISOString()}`,
    );
  } catch (err) {
    console.error(
      `[schedule] failed to move ${domain} to DLQ for section ${section}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}

/**
 * Restore a domain from the dead letter queue back to the regular queue.
 * Can be called manually or automatically after cooldown period.
 */
export async function restoreFromDLQ(
  section: Section,
  domain: string,
): Promise<void> {
  const dlqKey = ns("dlq", section);
  const dueKey = ns("due", section);

  try {
    // Remove from DLQ
    await redis.zrem(dlqKey, domain);

    // Schedule immediately
    const now = Date.now();
    await redis.zadd(dueKey, { score: now, member: domain });

    console.info(
      `[schedule] restored ${domain} from DLQ for section ${section}`,
    );
  } catch (err) {
    console.error(
      `[schedule] failed to restore ${domain} from DLQ for section ${section}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}

/**
 * Get the current failure attempt count for a domain+section.
 */
export async function getFailureAttempts(
  section: Section,
  domain: string,
): Promise<number> {
  const taskKey = ns("task", section);
  try {
    const attempts = await redis.hget(taskKey, domain);
    return typeof attempts === "string" ? Number.parseInt(attempts, 10) : 0;
  } catch {
    return 0;
  }
}

export function allSections(): Section[] {
  return SectionEnum.options as Section[];
}

export function getLeaseSeconds(): number {
  return LEASE_SECS;
}

/**
 * Clean up orphaned queue entries that no longer exist in the database.
 * Should be run periodically (e.g., weekly) to prevent Redis memory bloat.
 */
export async function cleanupOrphanedQueueEntries(): Promise<{
  removed: number;
  checked: number;
}> {
  const sections = allSections();
  const priorities: Array<Priority | null> = ["high", "normal", "low", null];

  let totalRemoved = 0;
  let totalChecked = 0;

  for (const section of sections) {
    for (const priority of priorities) {
      const dueKey = priority
        ? ns("due", section, priority)
        : ns("due", section);

      try {
        // Get all members from this queue
        const allMembers = (await redis.zrange(dueKey, 0, -1)) as string[];
        if (allMembers.length === 0) continue;

        totalChecked += allMembers.length;

        // Check which domains exist in DB (batch query)
        const existing = await db
          .select({ name: domains.name })
          .from(domains)
          .where(sql`${domains.name} = ANY(${allMembers})`);

        const existingSet = new Set(existing.map((d) => d.name));
        const orphaned = allMembers.filter((m) => !existingSet.has(m));

        // Remove orphaned entries
        if (orphaned.length > 0) {
          await redis.zrem(dueKey, ...orphaned);
          totalRemoved += orphaned.length;
          console.info(
            `[cleanup] removed ${orphaned.length} orphaned entries from ${dueKey}`,
          );
        }
      } catch (err) {
        console.error(
          `[cleanup] failed to clean ${dueKey}`,
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }

    // Also clean up orphaned lease keys and task counters
    try {
      const taskKey = ns("task", section);
      const allTasks = await redis.hgetall(taskKey);
      if (allTasks && typeof allTasks === "object") {
        const taskDomains = Object.keys(allTasks);
        if (taskDomains.length > 0) {
          const existing = await db
            .select({ name: domains.name })
            .from(domains)
            .where(sql`${domains.name} = ANY(${taskDomains})`);
          const existingSet = new Set(existing.map((d) => d.name));
          const orphanedTasks = taskDomains.filter((d) => !existingSet.has(d));
          if (orphanedTasks.length > 0) {
            await redis.hdel(taskKey, ...orphanedTasks);
            console.info(
              `[cleanup] removed ${orphanedTasks.length} orphaned task counters for ${section}`,
            );
          }
        }
      }
    } catch (err) {
      console.error(
        `[cleanup] failed to clean task counters for ${section}`,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  return { removed: totalRemoved, checked: totalChecked };
}

type DueDrainResult = {
  events: Array<{
    name: string;
    data: { domain: string; sections: Section[] };
  }>;
  groups: number;
};

/**
 * Drains due domains from Redis sorted sets and builds revalidation events.
 * Used by the Vercel cron job to trigger section revalidation via Inngest.
 */
export async function drainDueDomainsOnce(): Promise<DueDrainResult> {
  const sections = allSections();
  const perSectionBatch = PER_SECTION_BATCH;
  const globalMax = MAX_EVENTS_PER_RUN;
  const leaseSecs = getLeaseSeconds();

  let eventsSent = 0;
  const domainToSections = new Map<string, Set<Section>>();

  // Process priority lanes in order: high, normal, low, then fallback to non-priority
  const priorities: Array<Priority | null> = ["high", "normal", "low", null];

  for (const section of sections) {
    if (eventsSent >= globalMax) break;

    for (const priority of priorities) {
      if (eventsSent >= globalMax) break;

      const dueKey = priority
        ? ns("due", section, priority)
        : ns("due", section);
      const now = Date.now();

      const remaining = Math.max(0, globalMax - eventsSent);
      if (remaining === 0) break;

      const fetchCount = Math.min(perSectionBatch, remaining);

      // Pull a small window of due domains
      const dueMembers = (await redis.zrange(dueKey, 0, now, {
        byScore: true,
        offset: 0,
        count: fetchCount,
      })) as string[];
      if (!dueMembers.length) continue;

      // Phase 1: Filter out stale domains and prepare lease candidates
      const leaseCandidates: Array<{
        domain: string;
        leaseKey: string;
        previouslySelected: boolean;
      }> = [];

      for (const domain of dueMembers) {
        const previouslySelected = domainToSections.has(domain);
        if (!previouslySelected && eventsSent >= globalMax) continue;

        // Check if domain is stale (not accessed recently) - only on first selection
        if (!previouslySelected) {
          const staleThresholdMs =
            STALE_ACCESS_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
          try {
            const domainRecord = await findDomainByName(domain);
            if (domainRecord?.lastAccessedAt) {
              const lastAccessMs = domainRecord.lastAccessedAt.getTime();
              const ageMs = Date.now() - lastAccessMs;
              if (ageMs > staleThresholdMs) {
                // Domain is stale, remove from queue and skip
                await redis.zrem(dueKey, domain);
                console.debug(
                  `[drain] skipped stale domain ${domain} last accessed ${Math.floor(ageMs / (24 * 60 * 60 * 1000))} days ago`,
                );
                continue;
              }
            }
          } catch (err) {
            // Non-critical: log and proceed with revalidation
            console.debug(
              `[drain] staleness check failed for ${domain}`,
              err instanceof Error ? err : new Error(String(err)),
            );
          }
        }

        const leaseKey = ns("lease", section, domain);
        leaseCandidates.push({ domain, leaseKey, previouslySelected });
      }

      // Phase 2: Batch acquire leases using pipeline
      if (leaseCandidates.length > 0) {
        const pipeline = redis.pipeline();
        for (const { leaseKey } of leaseCandidates) {
          pipeline.set(leaseKey, "1", { nx: true, ex: leaseSecs });
        }
        const results = (await pipeline.exec()) as Array<
          [Error | null, string | null]
        >;

        // Phase 3: Process lease acquisition results
        for (let i = 0; i < leaseCandidates.length; i++) {
          const candidate = leaseCandidates[i];
          const result = results[i];

          // Check if lease was acquired successfully (result is "OK" or null for success)
          const acquired = result && result[0] === null && result[1] === "OK";
          if (!acquired) continue;

          // Enforce global budget at selection time: increment when first selecting a domain
          if (!candidate.previouslySelected) {
            eventsSent += 1;
          }

          const set =
            domainToSections.get(candidate.domain) ?? new Set<Section>();
          set.add(section);
          domainToSections.set(candidate.domain, set);
        }
      }
    }
  }

  const grouped = Array.from(domainToSections.entries());
  const events: Array<{
    name: string;
    data: { domain: string; sections: Section[] };
  }> = grouped.map(([domain, set]) => ({
    name: "section/revalidate",
    data: { domain, sections: Array.from(set) },
  }));

  return { events, groups: grouped.length };
}
