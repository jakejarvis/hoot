import type {
  DetectionContext,
  DetectionRule,
  DnsRecordRule,
  EmailRecordRule,
  FaviconRule,
  HeaderRule,
  HttpHeader,
} from "./types";

// Rule evaluator interface
export interface RuleEvaluator<T extends DetectionRule = DetectionRule> {
  evaluate(rule: T, context: DetectionContext): boolean;
}

// Helper to convert headers to context for rule evaluation
function createHeaderContext(headers: HttpHeader[]) {
  const byName = Object.fromEntries(
    headers.map((h) => [h.name.toLowerCase(), h.value]),
  ) as Record<string, string>;

  return {
    byName,
    server: (byName.server || "").toLowerCase(),
    headerNames: headers.map((h) => h.name.toLowerCase()),
  };
}

// Header rule evaluator
export class HeaderRuleEvaluator implements RuleEvaluator<HeaderRule> {
  evaluate(rule: HeaderRule, context: DetectionContext): boolean {
    if (!context.headers) return false;

    const ctx = createHeaderContext(context.headers);

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
}

// DNS record rule evaluator
export class DnsRecordRuleEvaluator implements RuleEvaluator<DnsRecordRule> {
  evaluate(rule: DnsRecordRule, context: DetectionContext): boolean {
    if (!context.nsHosts || !rule.nsIncludes) return false;

    const haystack = context.nsHosts.join(" ").toLowerCase();
    return rule.nsIncludes.some((s) => haystack.includes(s));
  }
}

// Email record rule evaluator
export class EmailRecordRuleEvaluator
  implements RuleEvaluator<EmailRecordRule>
{
  evaluate(rule: EmailRecordRule, context: DetectionContext): boolean {
    if (!context.mxHosts || !rule.mxIncludes) return false;

    const haystack = context.mxHosts.join(" ").toLowerCase();
    return rule.mxIncludes.some((s) => haystack.includes(s));
  }
}

// Favicon rule evaluator (placeholder for future implementation)
export class FaviconRuleEvaluator implements RuleEvaluator<FaviconRule> {
  evaluate(rule: FaviconRule, context: DetectionContext): boolean {
    // Placeholder implementation - can be enhanced later
    if (!context.domain) return false;

    if (rule.domainIncludes) {
      return rule.domainIncludes.some(
        (domain) =>
          context.domain?.toLowerCase().includes(domain.toLowerCase()) ?? false,
      );
    }

    // Additional favicon-specific matching can be added here
    return false;
  }
}

// Central rule engine
export class RuleEngine {
  private evaluators: Map<string, RuleEvaluator> = new Map();

  constructor() {
    this.evaluators.set("header", new HeaderRuleEvaluator());
    this.evaluators.set("dns", new DnsRecordRuleEvaluator());
    this.evaluators.set("email", new EmailRecordRuleEvaluator());
    this.evaluators.set("favicon", new FaviconRuleEvaluator());
  }

  // Register a custom rule evaluator
  registerEvaluator<T extends DetectionRule>(
    type: string,
    evaluator: RuleEvaluator<T>,
  ): void {
    this.evaluators.set(type, evaluator);
  }

  // Evaluate a single rule against context
  evaluateRule(rule: DetectionRule, context: DetectionContext): boolean {
    const evaluator = this.evaluators.get(rule.type);
    if (!evaluator) {
      throw new Error(`No evaluator registered for rule type: ${rule.type}`);
    }

    return evaluator.evaluate(rule, context);
  }

  // Evaluate all rules - returns true if ANY rule matches (OR logic)
  evaluateRules(rules: DetectionRule[], context: DetectionContext): boolean {
    return rules.some((rule) => this.evaluateRule(rule, context));
  }
}

// Default instance for general use
export const defaultRuleEngine = new RuleEngine();
