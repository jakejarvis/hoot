import { PROVIDERS } from "./catalog";
import { defaultRuleEngine } from "./rule-engine";
import { DNS_RULES, EMAIL_RULES, HOSTING_RULES } from "./rules";
import type {
  DetectionContext,
  DnsRecordRule,
  EmailRecordRule,
  HeaderRule,
  HttpHeader,
  ProviderCategory,
  ProviderRegistryEntry,
} from "./types";

export class ProviderRegistry {
  private providers: ProviderRegistryEntry[] = [];
  private ruleEngine = defaultRuleEngine;

  constructor() {
    this.initializeWithLegacyRules();
  }

  // Initialize registry with existing rule structure for backward compatibility
  private initializeWithLegacyRules(): void {
    this.providers = [...PROVIDERS];

    // Convert hosting rules to new format
    for (const legacyRule of HOSTING_RULES) {
      const provider = this.findProvider(legacyRule.provider);
      if (provider) {
        const headerRule: HeaderRule = {
          type: "header",
          serverIncludes: legacyRule.serverIncludes,
          headerNameStartsWith: legacyRule.headerNameStartsWith,
          headerExists: legacyRule.headerExists,
          headerValueIncludes: legacyRule.headerValueIncludes,
        };

        if (!provider.rules) provider.rules = [];
        provider.rules.push(headerRule);
      }
    }

    // Convert email rules to new format
    for (const legacyRule of EMAIL_RULES) {
      const provider = this.findProvider(legacyRule.provider);
      if (provider) {
        const emailRule: EmailRecordRule = {
          type: "email",
          mxIncludes: legacyRule.mxIncludes,
        };

        if (!provider.rules) provider.rules = [];
        provider.rules.push(emailRule);
      }
    }

    // Convert DNS rules to new format
    for (const legacyRule of DNS_RULES) {
      const provider = this.findProvider(legacyRule.provider);
      if (provider) {
        const dnsRule: DnsRecordRule = {
          type: "dns",
          nsIncludes: legacyRule.nsIncludes,
        };

        if (!provider.rules) provider.rules = [];
        provider.rules.push(dnsRule);
      }
    }
  }

  // Add a new provider to the registry
  addProvider(provider: ProviderRegistryEntry): void {
    const existingIndex = this.providers.findIndex(
      (p) => p.name === provider.name,
    );
    if (existingIndex >= 0) {
      this.providers[existingIndex] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  // Find provider by name
  findProvider(name: string): ProviderRegistryEntry | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // Get all providers of a specific category
  getProvidersByCategory(category: ProviderCategory): ProviderRegistryEntry[] {
    return this.providers.filter((p) => p.category === category);
  }

  // Get all providers
  getAllProviders(): ProviderRegistryEntry[] {
    return [...this.providers];
  }

  // Detect provider using new rule engine
  detectProvider(
    context: DetectionContext,
    category?: ProviderCategory,
  ): string {
    const candidateProviders = category
      ? this.getProvidersByCategory(category)
      : this.providers;

    for (const provider of candidateProviders) {
      if (provider.rules && provider.rules.length > 0) {
        if (this.ruleEngine.evaluateRules(provider.rules, context)) {
          return provider.name;
        }
      }
    }

    return "Unknown";
  }

  // Specific detection methods for backward compatibility
  detectHostingProvider(headers: HttpHeader[]): string {
    return this.detectProvider({ headers }, "hosting");
  }

  detectEmailProvider(mxHosts: string[]): string {
    const result = this.detectProvider({ mxHosts }, "email");
    // Maintain existing fallback behavior
    return result !== "Unknown" ? result : mxHosts[0] ? mxHosts[0] : "Unknown";
  }

  detectDnsProvider(nsHosts: string[]): string {
    const result = this.detectProvider({ nsHosts }, "dns");
    // Maintain existing fallback behavior
    return result !== "Unknown" ? result : nsHosts[0] ? nsHosts[0] : "Unknown";
  }

  // Map provider name to domain for favicon display
  mapProviderNameToDomain(name: string): string | undefined {
    if (!name) return undefined;
    const n = name.toLowerCase();

    for (const p of this.providers) {
      if (p.aliases?.some((a) => n.includes(a))) return p.domain;
    }
    const direct = this.providers.find((p) => p.name.toLowerCase() === n);
    return direct?.domain;
  }
}

// Default registry instance
export const defaultRegistry = new ProviderRegistry();
