/**
 * @fileoverview This file contains the new, refactored provider detection logic.
 * It uses the separated provider catalogs to identify hosting, email, and DNS
 * providers based on a set of rules.
 */

import {
  DNS_PROVIDERS,
  EMAIL_PROVIDERS,
  HOSTING_PROVIDERS,
} from "./new-catalog";
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
): string {
  for (const provider of providers) {
    // A provider matches if ANY of its rules match (OR logic)
    const matches = provider.rules.some((rule) =>
      evaluateRule(rule, headerContext, mxHosts, nsHosts),
    );

    if (matches) {
      return provider.name;
    }
  }

  return "Unknown";
}

/**
 * Detect hosting provider from HTTP headers.
 */
export function detectHostingProvider(headers: HttpHeader[]): string {
  const context = createHeaderContext(headers);
  return detectProviderFromList(HOSTING_PROVIDERS, context);
}

/**
 * Detect email provider from MX records.
 */
export function detectEmailProvider(mxHosts: string[]): string {
  const result = detectProviderFromList(EMAIL_PROVIDERS, undefined, mxHosts);
  // Maintain existing fallback behavior
  return result !== "Unknown" ? result : mxHosts[0] ? mxHosts[0] : "Unknown";
}

/**
 * Detect DNS provider from NS records.
 */
export function detectDnsProvider(nsHosts: string[]): string {
  const result = detectProviderFromList(
    DNS_PROVIDERS,
    undefined,
    undefined,
    nsHosts,
  );
  // Maintain existing fallback behavior
  return result !== "Unknown" ? result : nsHosts[0] ? nsHosts[0] : "Unknown";
}

/**
 * Map provider name to icon domain for favicon display.
 */
export function mapProviderNameToDomain(name: string): string | undefined {
  if (!name) return undefined;
  const searchName = name.toLowerCase();

  // Search all provider lists
  const allProviders = [
    ...HOSTING_PROVIDERS,
    ...EMAIL_PROVIDERS,
    ...DNS_PROVIDERS,
  ];

  for (const provider of allProviders) {
    // Check exact name match
    if (provider.name.toLowerCase() === searchName) {
      return provider.iconDomain;
    }

    // Check aliases
    if (
      provider.aliases?.some((alias) =>
        searchName.includes(alias.toLowerCase()),
      )
    ) {
      return provider.iconDomain;
    }
  }

  return undefined;
}

// Export provider lists for backward compatibility and access
export const ProviderCatalog = {
  hosting: HOSTING_PROVIDERS,
  email: EMAIL_PROVIDERS,
  dns: DNS_PROVIDERS,
  all: [...HOSTING_PROVIDERS, ...EMAIL_PROVIDERS, ...DNS_PROVIDERS],
};
