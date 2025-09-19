// Types shared across provider detection modules

export type HttpHeader = { name: string; value: string };

export type ProviderCategory = "hosting" | "email" | "registrar" | "dns";

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
