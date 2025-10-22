import "server-only";

import { captureServer } from "@/lib/analytics/server";
import { ns, redis } from "@/lib/redis";
import {
  BACKOFF_BASE_SECS,
  BACKOFF_MAX_SECS,
  LEASE_SECS,
  MIN_TTL_SECS,
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
