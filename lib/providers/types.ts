/**
 * @fileoverview This file contains the type definitions for the provider
 * detection system.
 */

export type HttpHeader = { name: string; value: string };

export type ProviderCategory = "hosting" | "email" | "registrar" | "dns";

/**
 * A rule for detecting a provider. Each rule has a type and parameters
 * specific to that type.
 */
export type DetectionRule =
  // Match based on HTTP headers.
  // `name` is the header name (e.g., "server").
  // `value` is an optional substring to look for in the header's value.
  // `present` can be used to check for the mere existence of a header.
  | { type: "header"; name: string; value?: string; present?: boolean }

  // Match based on DNS records.
  // `recordType` is the type of DNS record (MX or NS).
  // `value` is a substring to look for in the record's value.
  | { type: "dns"; recordType: "MX" | "NS"; value: string };

/**
 * A provider definition, including metadata and the rules to detect it.
 */
export interface Provider {
  /** The canonical name of the provider (e.g., "Vercel") */
  name: string;
  /** The domain used to fetch the provider's icon (e.g., "vercel.com") */
  iconDomain: string;
  /**
   * Aliases or common variations of the provider's name found in records,
   * used for mapping if direct detection fails.
   */
  aliases?: string[];
  /** An array of rules that, if matched, identify this provider. */
  rules: DetectionRule[];
}

// Legacy types - maintain backward compatibility
export type ProviderEntry = {
  name: string;
  domain: string; // for favicon display
  category: ProviderCategory;
  aliases?: string[]; // lowercase aliases to help domain mapping by free-form names
};

export type HostingRule = {
  provider: string; // must match ProviderEntry.name
  // All matching is case-insensitive and uses substring includes
  serverIncludes?: string[];
  headerNameStartsWith?: string[];
  headerExists?: string[];
  headerValueIncludes?: Record<string, string[]>; // header -> substrings
};

export type EmailRule = {
  provider: string; // must match ProviderEntry.name
  // Match if any MX host string contains one of these substrings (case-insensitive)
  mxIncludes: string[];
};

export type DnsRule = {
  provider: string; // must match ProviderEntry.name
  // Match if any NS host string contains one of these substrings (case-insensitive)
  nsIncludes: string[];
};
