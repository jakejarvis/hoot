export type HttpHeader = { name: string; value: string };

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
  domain: string;
  /**
   * Aliases or common variations of the provider's name found in records,
   * used for mapping if direct detection fails.
   */
  aliases?: string[];
  /** An array of rules that, if matched, identify this provider. */
  rules: DetectionRule[];
}
