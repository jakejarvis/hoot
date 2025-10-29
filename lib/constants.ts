export const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const USER_AGENT =
  process.env.EXTERNAL_USER_AGENT ||
  "domainstack.io/0.1 (+https://domainstack.io)";

export const REPOSITORY_SLUG = "jakejarvis/domainstack.io";

// Time constants
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

// ===== Blob Storage Cache TTLs =====
// How long to cache uploaded assets (favicons, screenshots, social images)
export const TTL_FAVICON = 7 * SECONDS_PER_DAY; // 1 week
export const TTL_SCREENSHOT = 14 * SECONDS_PER_DAY; // 2 weeks
export const TTL_SOCIAL_PREVIEW = 7 * SECONDS_PER_DAY; // 1 week

// ===== Database Cache Expiry TTLs =====
// When cached data in Postgres becomes stale and needs refresh
// (Used by lib/db/ttl.ts functions to calculate expiresAt timestamps)

export const TTL_REGISTRATION_REGISTERED = SECONDS_PER_DAY; // 24 hours
export const TTL_REGISTRATION_UNREGISTERED = 6 * SECONDS_PER_HOUR; // 6 hours
export const TTL_REGISTRATION_NEAR_EXPIRY = SECONDS_PER_HOUR; // 1 hour
export const TTL_REGISTRATION_EXPIRY_THRESHOLD = 7 * SECONDS_PER_DAY; // 7 days

export const TTL_DNS_DEFAULT = SECONDS_PER_HOUR; // 1 hour
export const TTL_DNS_MAX = SECONDS_PER_DAY; // 24 hours (cap for received TTLs)

export const TTL_CERTIFICATES_WINDOW = SECONDS_PER_DAY; // 24 hours
export const TTL_CERTIFICATES_MIN = SECONDS_PER_HOUR; // 1 hour
export const TTL_CERTIFICATES_EXPIRY_BUFFER = 48 * SECONDS_PER_HOUR; // 48 hours before expiry

export const TTL_HEADERS = 12 * SECONDS_PER_HOUR; // 12 hours
export const TTL_HOSTING = SECONDS_PER_DAY; // 24 hours
export const TTL_SEO = SECONDS_PER_DAY; // 24 hours

// ===== Redis Cache TTLs =====
// Lightweight registration status cache (true/false only)
export const REDIS_TTL_REGISTERED = SECONDS_PER_DAY; // 24 hours
export const REDIS_TTL_UNREGISTERED = SECONDS_PER_HOUR; // 1 hour

// ===== Background Job Revalidation Minimums =====
// Minimum time between Inngest-triggered refreshes (prevents too-frequent updates)
// Should be <= corresponding cache TTL (no point refreshing more often than cache expires)
export const REVALIDATE_MIN_DNS = SECONDS_PER_HOUR; // 1 hour
export const REVALIDATE_MIN_HEADERS = 6 * SECONDS_PER_HOUR; // 6 hours
export const REVALIDATE_MIN_HOSTING = SECONDS_PER_DAY; // 24 hours
export const REVALIDATE_MIN_CERTIFICATES = 6 * SECONDS_PER_HOUR; // 6 hours
export const REVALIDATE_MIN_SEO = SECONDS_PER_DAY; // 24 hours
export const REVALIDATE_MIN_REGISTRATION = SECONDS_PER_DAY; // 24 hours

// ===== Background Job Configuration =====
export const DRAIN_CRON_MINUTES = 2;
export const PER_SECTION_BATCH = 50;
export const MAX_EVENTS_PER_RUN = 200;
export const LEASE_SECS = 120;
export const BACKOFF_BASE_SECS = 5 * 60; // 5 minutes
export const BACKOFF_MAX_SECS = 6 * 60 * 60; // 6 hours

// File-like suffixes and extensions that should not be treated as TLDs/domains
// This is an allowlist of obvious web asset extensions and build artifacts
// that commonly appear in 404s (e.g., sourcemaps) and should be ignored.
export const BLACKLISTED_SUFFIXES: readonly string[] = [
  // https://fuckyougoogle.zip essentially.
  ".css.map",
  ".js.map",
  ".ts.map",
  ".mjs.map",
  ".cjs.map",

  // other
  ".arpa",
];

// TLDs or domain suffixes that are not generally available to the public.
// This is a small, non-exhaustive list that can be expanded over time.
// Values should be lowercase and include the leading dot for suffix matching.
export const NONPUBLIC_TLDS: readonly string[] = [
  ".edu", // US accredited post-secondary institutions
  ".gov", // US government
  ".mil", // US military
  ".int", // International treaty-based orgs
  ".gov.uk", // UK government
  ".ac.uk", // UK academia
  ".aero",
  ".coop",
  ".museum",
  ".jobs",
  ".travel",
  ".post",
  ".tel",

  // TODO: add brands (.google, .amazon, etc.)
];
