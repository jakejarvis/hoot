import "server-only";
import type { Section } from "@/lib/schemas";

export const DRAIN_CRON_MINUTES = 10;
export const PER_SECTION_BATCH = 50;
export const MAX_EVENTS_PER_RUN = 100;
export const LEASE_SECS = 600; // Match DRAIN_CRON_MINUTES
export const BACKOFF_BASE_SECS = 5 * 60; // 5 minutes
export const BACKOFF_MAX_SECS = 6 * 60 * 60; // 6 hours

export const MIN_TTL_SECS: Record<Section, number> = {
  dns: 60 * 60, // 1h
  headers: 6 * 60 * 60, // 6h
  hosting: 24 * 60 * 60, // 24h
  certificates: 6 * 60 * 60, // 6h (aggressive near expiry handled by ttl)
  seo: 24 * 60 * 60, // 24h
  registration: 24 * 60 * 60, // 24h
};
