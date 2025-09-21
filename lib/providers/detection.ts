import { toRegistrableDomain } from "@/lib/domain-server";
import {
  DNS_PROVIDERS,
  EMAIL_PROVIDERS,
  HOSTING_PROVIDERS,
  REGISTRAR_PROVIDERS,
} from "./catalog";
import type { DetectionRule, HttpHeader, Provider } from "./types";

/**
 * A context object for header-based detection, pre-calculating values to
 * avoid redundant work in the loop.
 */
interface HeaderDetectionContext {
  headers: HttpHeader[];
  headerMap: Map<string, string>;
  headerNames: Set<string>;
}

/**
 * Create a detection context from HTTP headers for efficient rule evaluation.
 */
function createHeaderContext(headers: HttpHeader[]): HeaderDetectionContext {
  const headerMap = new Map<string, string>();
  const headerNames = new Set<string>();

  for (const header of headers) {
    const name = header.name.toLowerCase();
    const value = header.value.toLowerCase();
    headerMap.set(name, value);
    headerNames.add(name);
  }

  return { headers, headerMap, headerNames };
}

/**
 * Evaluate a single detection rule against the provided context.
 */
function evaluateRule(
  rule: DetectionRule,
  headerContext?: HeaderDetectionContext,
  mxHosts?: string[],
  nsHosts?: string[],
): boolean {
  switch (rule.type) {
    case "header": {
      if (!headerContext) return false;

      const headerName = rule.name.toLowerCase();
      const headerValue = headerContext.headerMap.get(headerName);

      // Check for header presence
      if (rule.present) {
        return headerContext.headerNames.has(headerName);
      }

      // Check for header value match
      if (rule.value && headerValue) {
        return headerValue.includes(rule.value.toLowerCase());
      }

      // If no specific checks, just check for presence
      return headerContext.headerNames.has(headerName);
    }

    case "dns": {
      const hosts = rule.recordType === "MX" ? mxHosts : nsHosts;
      if (!hosts) return false;

      const searchValue = rule.value.toLowerCase();
      return hosts.some((host) => host.toLowerCase().includes(searchValue));
    }

    default:
      return false;
  }
}

/**
 * Detect a provider from a list of providers using the provided context.
 */
function detectProviderFromList(
  providers: Provider[],
  headerContext?: HeaderDetectionContext,
  mxHosts?: string[],
  nsHosts?: string[],
): ProviderRef {
  for (const provider of providers) {
    // A provider matches if ANY of its rules match (OR logic)
    const matches = provider.rules.some((rule) =>
      evaluateRule(rule, headerContext, mxHosts, nsHosts),
    );

    if (matches) {
      return { name: provider.name, domain: provider.domain };
    }
  }

  return { name: "Unknown", domain: null };
}

/**
 * Detect hosting provider from HTTP headers.
 */
export type ProviderRef = { name: string; domain: string | null };

export function detectHostingProvider(headers: HttpHeader[]): ProviderRef {
  const context = createHeaderContext(headers);
  return detectProviderFromList(HOSTING_PROVIDERS, context);
}

/**
 * Detect email provider from MX records.
 */
export function detectEmailProvider(mxHosts: string[]): ProviderRef {
  const found = detectProviderFromList(EMAIL_PROVIDERS, undefined, mxHosts);
  if (found.name !== "Unknown") return found;
  const first = mxHosts[0];
  if (first) {
    const root = toRegistrableDomain(first);
    return { name: root || first, domain: root || null };
  }
  return { name: "Unknown", domain: null };
}

/**
 * Detect DNS provider from NS records.
 */
export function detectDnsProvider(nsHosts: string[]): ProviderRef {
  const found = detectProviderFromList(
    DNS_PROVIDERS,
    undefined,
    undefined,
    nsHosts,
  );
  if (found.name !== "Unknown") return found;
  const first = nsHosts[0];
  if (first) {
    const root = toRegistrableDomain(first);
    return { name: root || first, domain: root || null };
  }
  return { name: "Unknown", domain: null };
}

/** Resolve registrar domain from a registrar name using partial matching */
export function resolveRegistrarDomain(registrarName: string): string | null {
  const name = (registrarName || "").toLowerCase();
  if (!name) return null;

  for (const reg of REGISTRAR_PROVIDERS) {
    if (reg.name.toLowerCase() === name) return reg.domain;
  }

  for (const reg of REGISTRAR_PROVIDERS) {
    if (name.includes(reg.name.toLowerCase())) return reg.domain;
  }

  for (const reg of REGISTRAR_PROVIDERS) {
    if (reg.aliases?.some((a) => name.includes(a.toLowerCase()))) {
      return reg.domain;
    }
  }

  return null;
}

/**
 * Map provider name to icon domain for favicon display.
 */
// mapping helpers removed; detectors now return name+domain directly

// Export provider lists for backward compatibility and access
export const ProviderCatalog = {
  hosting: HOSTING_PROVIDERS,
  email: EMAIL_PROVIDERS,
  dns: DNS_PROVIDERS,
  all: [...HOSTING_PROVIDERS, ...EMAIL_PROVIDERS, ...DNS_PROVIDERS],
};
