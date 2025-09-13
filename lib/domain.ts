// Utilities for handling user-provided domain input

/**
 * Normalize arbitrary user input into a bare registrable domain string.
 * Accepts values like:
 *  - "example.com"
 *  - "www.example.com."
 *  - "https://example.com/path?x#y"
 *  - "http://user:pass@example.com:8080/"
 *  - "  EXAMPLE.COM  "
 * Returns a lowercased hostname without scheme, path, auth, port, or trailing dot.
 */
export function normalizeDomainInput(input: string): string {
  let value = (input ?? "").trim();
  if (value === "") return "";

  // If it looks like a URL (has a scheme), use URL parsing
  const hasScheme = /:\/\//.test(value);
  if (hasScheme) {
    try {
      const url = new URL(value);
      // URL applies IDNA (punycode) and strips auth/port/path for hostname
      value = url.hostname;
    } catch {
      // If invalid URL with scheme, strip leading scheme-like prefix manually
      value = value.replace(/^\w+:\/\//, "");
      // Remove credentials if present
      value = value.replace(/^[^@]+@/, "");
      // Remove path/query/fragment
      value = value.split("/")[0].split("?")[0].split("#")[0];
    }
  } else {
    // No scheme: try URL parsing with implicit http:// to get punycoded hostname
    try {
      const url = new URL(`http://${value}`);
      value = url.hostname;
    } catch {
      // Fallback: remove any credentials, path, query, or fragment accidentally included
      value = value.replace(/^[^@]+@/, "");
      value = value.split("/")[0].split("?")[0].split("#")[0];
    }
  }

  // Strip port if present
  value = value.replace(/:\d+$/, "");

  // Strip trailing dot
  value = value.replace(/\.$/, "");

  // Remove common leading www.
  value = value.replace(/^www\./i, "");

  return value.toLowerCase();
}

/**
 * Basic domain validity check (hostname-like), not performing DNS or RDAP.
 */
export function isValidDomain(value: string): boolean {
  const v = (value ?? "").trim();
  // Accept punycoded labels (xn--) by allowing digits and hyphens in TLD as well,
  // while disallowing leading/trailing hyphens in any label.
  return /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?!-)[a-z0-9-]{2,63}(?<!-)$/.test(
    v.toLowerCase(),
  );
}
