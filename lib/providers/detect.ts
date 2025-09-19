import { PROVIDERS } from "./catalog";
import { DNS_RULES, EMAIL_RULES, HOSTING_RULES } from "./rules";
import type { HostingRule, HttpHeader } from "./types";

export function mapProviderNameToDomain(name: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();

  for (const p of PROVIDERS) {
    if (p.aliases?.some((a) => n.includes(a))) return p.domain;
  }
  const direct = PROVIDERS.find((p) => p.name.toLowerCase() === n);
  return direct?.domain;
}

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
  const ctx = toDetectorContext(headers);
  for (const rule of HOSTING_RULES) {
    if (hostingRuleMatches(rule, ctx)) return rule.provider;
  }
  return "Unknown";
}

export function detectEmailProviderFromMx(mxHosts: string[]): string {
  const haystack = mxHosts.join(" ").toLowerCase();
  const found = EMAIL_RULES.find((r) =>
    r.mxIncludes.some((s) => haystack.includes(s)),
  )?.provider;
  return found ?? (mxHosts[0] ? mxHosts[0] : "Unknown");
}

export function detectDnsProviderFromNs(nsHosts: string[]): string {
  const haystack = nsHosts.join(" ").toLowerCase();
  const found = DNS_RULES.find((r) =>
    r.nsIncludes.some((s) => haystack.includes(s)),
  )?.provider;
  return found ?? (nsHosts[0] ? nsHosts[0] : "Unknown");
}

export const ProviderCatalog = {
  all: PROVIDERS,
  hostingRules: HOSTING_RULES,
  emailRules: EMAIL_RULES,
  dnsRules: DNS_RULES,
};
