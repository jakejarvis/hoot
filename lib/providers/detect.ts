/**
 * @fileoverview Main provider detection functions using the clean rule-based system.
 */

import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
} from "./detection";
import type { HttpHeader } from "./types";

// Export the main detection functions
export function detectHostingProviderFromHeaders(
  headers: HttpHeader[],
): string {
  return detectHostingProvider(headers);
}

export function detectEmailProviderFromMx(mxHosts: string[]): string {
  return detectEmailProvider(mxHosts);
}

export function detectDnsProviderFromNs(nsHosts: string[]): string {
  return detectDnsProvider(nsHosts);
}

// Export the provider catalog and mapping function
export { mapProviderNameToDomain, ProviderCatalog } from "./detection";
