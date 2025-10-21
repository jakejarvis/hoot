export const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const USER_AGENT =
  process.env.EXTERNAL_USER_AGENT ||
  "domainstack.io/0.1 (+https://domainstack.io)";

export const REPOSITORY_SLUG = "jakejarvis/domainstack.io";

// Cache TTLs
export const FAVICON_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
export const SCREENSHOT_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week
export const SOCIAL_PREVIEW_TTL_SECONDS = 7 * 24 * 60 * 60; // 1 week

export const DEFAULT_SUGGESTIONS = [
  "github.com",
  "reddit.com",
  "wikipedia.org",
  "firefox.com",
  "jarv.is",
];

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
