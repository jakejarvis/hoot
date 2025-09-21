import { PROVIDERS } from "./catalog";
import { defaultRegistry } from "./registry";
import { DNS_RULES, EMAIL_RULES, HOSTING_RULES } from "./rules";
import type { HostingRule, HttpHeader } from "./types";

export function mapProviderNameToDomain(name: string): string | undefined {
  // Use the new registry for provider name to domain mapping
  return defaultRegistry.mapProviderNameToDomain(name);
}

// Legacy context type - maintained for backward compatibility
type DetectorContext = {
  server: string;
  byName: Record<string, string>;
  headerNames: string[];
};

function toDetectorContext(headers: HttpHeader[]): DetectorContext {
  const byName = Object.fromEntries(
    headers.map((h) => [h.name.toLowerCase(), h.value]),
  ) as Record<string, string>;
  return {
    byName,
    server: (byName.server || "").toLowerCase(),
    headerNames: headers.map((h) => h.name.toLowerCase()),
  };
}

function hostingRuleMatches(rule: HostingRule, ctx: DetectorContext): boolean {
  if (rule.serverIncludes && ctx.server) {
    if (rule.serverIncludes.some((s) => ctx.server.includes(s))) return true;
  }

  if (rule.headerNameStartsWith) {
    const prefixes = rule.headerNameStartsWith;
    if (ctx.headerNames.some((n) => prefixes.some((p) => n.startsWith(p)))) {
      return true;
    }
  }

  if (rule.headerExists) {
    if (rule.headerExists.some((h) => h in ctx.byName)) return true;
  }

  if (rule.headerValueIncludes) {
    for (const [hn, needles] of Object.entries(rule.headerValueIncludes)) {
      const val = (ctx.byName[hn] || "").toLowerCase();
      if (val && needles.some((needle) => val.includes(needle))) return true;
    }
  }
  return false;
}

export function detectHostingProviderFromHeaders(
  headers: HttpHeader[],
): string {
  // Use new registry-based detection first, fallback to legacy if needed
  const registryResult = defaultRegistry.detectHostingProvider(headers);
  if (registryResult !== "Unknown") {
    return registryResult;
  }

  // Legacy fallback for additional safety
  const ctx = toDetectorContext(headers);
  for (const rule of HOSTING_RULES) {
    if (hostingRuleMatches(rule, ctx)) return rule.provider;
  }
  return "Unknown";
}

export function detectEmailProviderFromMx(mxHosts: string[]): string {
  // Use new registry-based detection first, fallback to legacy if needed
  const registryResult = defaultRegistry.detectEmailProvider(mxHosts);
  if (registryResult !== "Unknown") {
    return registryResult;
  }

  // Legacy fallback for additional safety
  const haystack = mxHosts.join(" ").toLowerCase();
  const found = EMAIL_RULES.find((r) =>
    r.mxIncludes.some((s) => haystack.includes(s)),
  )?.provider;
  return found ?? (mxHosts[0] ? mxHosts[0] : "Unknown");
}

export function detectDnsProviderFromNs(nsHosts: string[]): string {
  // Use new registry-based detection first, fallback to legacy if needed
  const registryResult = defaultRegistry.detectDnsProvider(nsHosts);
  if (registryResult !== "Unknown") {
    return registryResult;
  }

  // Legacy fallback for additional safety
  const haystack = nsHosts.join(" ").toLowerCase();
  const found = DNS_RULES.find((r) =>
    r.nsIncludes.some((s) => haystack.includes(s)),
  )?.provider;
  return found ?? (nsHosts[0] ? nsHosts[0] : "Unknown");
}

// Export catalog with new registry access for enhanced functionality
export const ProviderCatalog = {
  all: PROVIDERS,
  hostingRules: HOSTING_RULES,
  emailRules: EMAIL_RULES,
  dnsRules: DNS_RULES,
  // New registry-based access
  registry: defaultRegistry,
};

// Export the new registry and rule engine for advanced usage
export { defaultRegistry as ProviderRegistry } from "./registry";
export { defaultRuleEngine as RuleEngine } from "./rule-engine";
