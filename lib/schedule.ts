import "server-only";

import { captureServer } from "@/lib/analytics/server";
import { ns, redis } from "@/lib/redis";
import {
  BACKOFF_BASE_SECS,
  BACKOFF_MAX_SECS,
  LEASE_SECS,
  MAX_EVENTS_PER_RUN,
  MIN_TTL_SECS,
  PER_SECTION_BATCH,
} from "@/lib/revalidation-config";
import { type Section, SectionEnum } from "@/lib/schemas";

function minTtlSecondsForSection(section: Section): number {
  return MIN_TTL_SECS[section];
}

function backoffMsForAttempts(attempts: number): number {
  const baseSecs = BACKOFF_BASE_SECS;
  const maxSecs = BACKOFF_MAX_SECS;
  const ms = Math.min(
    maxSecs,
    Math.max(baseSecs, baseSecs * 2 ** Math.max(0, attempts - 1)),
  );
  return ms * 1000;
}

export async function scheduleSectionIfEarlier(
  section: Section,
  domain: string,
  dueAtMs: number,
): Promise<boolean> {
  // Validate dueAtMs before any computation or Redis writes
  if (!Number.isFinite(dueAtMs) || dueAtMs < 0) {
    try {
      await captureServer("schedule_section", {
        section,
        domain,
        due_at_ms: dueAtMs,
        outcome: "invalid_due",
      });
    } catch {}
    return false;
  }
  const now = Date.now();
  const minDueMs = now + minTtlSecondsForSection(section) * 1000;
  const desired = Math.max(dueAtMs, minDueMs);

  const dueKey = ns("due", section);
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
  try {
    await captureServer("schedule_section", {
      section,
      domain,
      due_at_ms: desired,
      current_ms: current ?? null,
      now_ms: now,
      outcome: "scheduled",
    });
  } catch {}
  return true;
}

export async function scheduleSectionsForDomain(
  domain: string,
  sections: Array<{ section: Section; dueAtMs: number }>,
): Promise<void> {
  await Promise.all(
    sections.map((s) => scheduleSectionIfEarlier(s.section, domain, s.dueAtMs)),
  );
}

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
  try {
    await captureServer("schedule_backoff", {
      section,
      domain,
      attempts,
      next_at_ms: nextAtMs,
    });
  } catch {}
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
  try {
    await captureServer("schedule_backoff_reset", { section, domain });
  } catch {}
}

export function allSections(): Section[] {
  return SectionEnum.options as Section[];
}

export function getLeaseSeconds(): number {
  return LEASE_SECS;
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

    for (const domain of dueMembers) {
      const previouslySelected = domainToSections.has(domain);
      if (!previouslySelected && eventsSent >= globalMax) continue;
      const leaseKey = ns("lease", section, domain);
      // Attempt to acquire lease for this section+domain
      const ok = await redis.set(leaseKey, "1", {
        nx: true,
        ex: leaseSecs,
      });
      // If lease not acquired, skip
      if (ok !== "OK") continue;

      // Enforce global budget at selection time: increment when first selecting a domain
      if (!previouslySelected) {
        eventsSent += 1;
      }

      const set = domainToSections.get(domain) ?? new Set<Section>();
      set.add(section);
      domainToSections.set(domain, set);
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

  try {
    await captureServer("due_drain", {
      duration_ms: Date.now() - startedAt,
      emitted: events.length,
      groups: grouped.length,
    });
  } catch {}

  return { events, groups: grouped.length };
}
