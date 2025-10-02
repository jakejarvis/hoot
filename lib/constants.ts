export const USER_AGENT =
  process.env.HOOT_USER_AGENT || "hoot.sh/0.1 (+https://hoot.sh)";

export const DEFAULT_SUGGESTIONS = [
  "google.com",
  "wikipedia.org",
  "github.com",
  "cloudflare.com",
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
];
