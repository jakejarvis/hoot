// Types shared across provider detection modules

export type HttpHeader = { name: string; value: string };

export type ProviderCategory = "hosting" | "email" | "registrar" | "dns";

export type ProviderEntry = {
  name: string;
  domain: string; // for favicon display
  category: ProviderCategory;
  aliases?: string[]; // lowercase aliases to help domain mapping by free-form names
};

// Legacy rule types - maintain backward compatibility
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

// New extensible rule engine types
export type RuleType = "header" | "dns" | "email" | "favicon";

export interface BaseRule {
  type: RuleType;
}

export interface HeaderRule extends BaseRule {
  type: "header";
  // All matching is case-insensitive and uses substring includes
  serverIncludes?: string[];
  headerNameStartsWith?: string[];
  headerExists?: string[];
  headerValueIncludes?: Record<string, string[]>; // header -> substrings
}

export interface DnsRecordRule extends BaseRule {
  type: "dns";
  // Match if any NS host string contains one of these substrings (case-insensitive)
  nsIncludes?: string[];
}

export interface EmailRecordRule extends BaseRule {
  type: "email";
  // Match if any MX host string contains one of these substrings (case-insensitive)
  mxIncludes?: string[];
}

export interface FaviconRule extends BaseRule {
  type: "favicon";
  // Match favicon content or source characteristics
  domainIncludes?: string[];
  pathIncludes?: string[];
}

export type DetectionRule =
  | HeaderRule
  | DnsRecordRule
  | EmailRecordRule
  | FaviconRule;

// Provider registry entry with detection rules
export interface ProviderRegistryEntry extends ProviderEntry {
  rules?: DetectionRule[];
}

// Context for rule evaluation
export type DetectionContext = {
  headers?: HttpHeader[];
  mxHosts?: string[];
  nsHosts?: string[];
  domain?: string;
};
