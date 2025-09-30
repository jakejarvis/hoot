// Server-only domain helpers using tldts
// Note: Do not import this file in client components.

import { parse } from "tldts";
import { BLACKLISTED_SUFFIXES } from "./constants";

/**
 * Normalize arbitrary input (domain or URL) to its registrable domain (eTLD+1).
 * Returns null when the input is not a valid ICANN domain (e.g., invalid TLD, IPs).
 */
export function toRegistrableDomain(input: string): string | null {
  const raw = (input ?? "").trim();
  if (raw === "") return null;

  const result = parse(raw);

  // Reject IPs and non-ICANN/public suffixes.
  if (result.isIp) return null;
  if (!result.isIcann) return null;

  const domain = result.domain ?? "";
  if (domain === "") return null;
  return domain.toLowerCase();
}

/**
 * Quick boolean check for acceptable domains using tldts parsing.
 */
export function isAcceptableDomainInput(input: string): boolean {
  return toRegistrableDomain(input) !== null;
}

/**
 * Returns true when the provided input looks like a blacklisted file-like path
 * or when its final label (TLD-like) is in our blacklist. This protects the
 * domain route from accidentally attempting lookups for 404 asset paths like
 * ".css.map".
 */
export function isBlacklistedDomainLike(input: string): boolean {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "") return false;

  // Shortcut: exact suffixes such as ".css.map" that frequently appear
  for (const suffix of BLACKLISTED_SUFFIXES) {
    if (value.endsWith(suffix)) return true;
  }

  return false;
}
