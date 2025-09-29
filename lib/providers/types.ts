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
  /** An array of rules that, if matched, identify this provider. */
  rules: DetectionRule[];
}

/** Registrar providers do not use rules; they are matched by partial name */
export interface RegistrarProvider {
  /** Canonical registrar display name (e.g., "GoDaddy") */
  name: string;
  /** Domain for favicon (e.g., "godaddy.com") */
  domain: string;
  /** Additional case-insensitive substrings to match (e.g., ["godaddy inc"]). */
  aliases?: string[];
}

/** Certificate Authority providers matched via aliases in issuer strings */
export interface CertificateAuthorityProvider {
  /** Canonical CA display name (e.g., "Let's Encrypt") */
  name: string;
  /** Domain for favicon (e.g., "letsencrypt.org") */
  domain: string;
  /** Case-insensitive substrings or tokens present in issuer, e.g. ["isrg", "r3"] */
  aliases?: string[];
}
