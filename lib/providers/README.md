# Provider Detection System

This directory contains the extensible provider detection system for identifying hosting, email, DNS, and other service providers based on various signals like HTTP headers, DNS records, and domain characteristics.

## Architecture

The system is built around three core components:

### 1. Rule Engine (`rule-engine.ts`)
A modular rule evaluation system that can be extended with new rule types:

- **HeaderRule**: Matches based on HTTP headers (server headers, custom headers, etc.)
- **DnsRecordRule**: Matches based on DNS nameserver records
- **EmailRecordRule**: Matches based on MX record data
- **FaviconRule**: Matches based on favicon characteristics (extensible for future enhancements)

### 2. Provider Registry (`registry.ts`)
Central management of all providers and their detection rules:

- Maintains provider metadata (name, domain for favicons, category)
- Associates detection rules with providers
- Provides unified detection interface
- Maintains backward compatibility with legacy rule format

### 3. Detection Functions (`detect.ts`)
Backward-compatible detection functions that now use the new registry system:

- `detectHostingProviderFromHeaders()` - Hosting provider detection
- `detectEmailProviderFromMx()` - Email provider detection  
- `detectDnsProviderFromNs()` - DNS provider detection
- `mapProviderNameToDomain()` - Provider name to favicon domain mapping

## Usage

### Basic Detection

```typescript
import { 
  detectHostingProviderFromHeaders,
  detectEmailProviderFromMx,
  detectDnsProviderFromNs 
} from '@/lib/providers';

// Hosting detection
const headers = [
  { name: 'server', value: 'vercel' },
  { name: 'x-vercel-cache', value: 'HIT' }
];
const hosting = detectHostingProviderFromHeaders(headers);
console.log(hosting); // "Vercel"

// Email detection
const mxRecords = ['mx1.google.com', 'mx2.google.com'];
const email = detectEmailProviderFromMx(mxRecords);
console.log(email); // "Google Workspace"

// DNS detection
const nsRecords = ['ns1.cloudflare.com', 'ns2.cloudflare.com'];
const dns = detectDnsProviderFromNs(nsRecords);
console.log(dns); // "Cloudflare"
```

### Advanced Registry Usage

```typescript
import { defaultRegistry, RuleEngine } from '@/lib/providers';

// Access the registry directly
const allProviders = defaultRegistry.getAllProviders();
const hostingProviders = defaultRegistry.getProvidersByCategory('hosting');

// Custom detection with multiple data sources
const context = {
  headers: [{ name: 'server', value: 'nginx' }],
  mxHosts: ['mx.example.com'],
  nsHosts: ['ns1.example.com'],
  domain: 'example.com'
};

const provider = defaultRegistry.detectProvider(context, 'hosting');
```

## Adding New Providers

### Method 1: Using the Registry (Recommended)

```typescript
import { defaultRegistry } from '@/lib/providers';

// Add a new hosting provider with detection rules
defaultRegistry.addProvider({
  name: "New Hosting Service",
  domain: "newhosting.com", 
  category: "hosting",
  aliases: ["newhosting", "nhs"],
  rules: [
    {
      type: "header",
      serverIncludes: ["newhosting"],
      headerExists: ["x-nhs-server"]
    },
    {
      type: "favicon", 
      domainIncludes: ["newhosting"]
    }
  ]
});
```

### Method 2: Extending the Static Lists

For providers that should be included in the default installation:

1. **Add provider metadata** to the appropriate file in:
   - `hosting-providers.ts`
   - `email-providers.ts` 
   - `dns-providers.ts`
   - `registrar-providers.ts`

2. **Add detection rules** to `rules.ts`:

```typescript
// In rules.ts
export const HOSTING_RULES: HostingRule[] = [
  // existing rules...
  {
    provider: "New Hosting Service",
    serverIncludes: ["newhosting"],
    headerExists: ["x-nhs-server"]
  }
];
```

## Creating Custom Rule Types

You can extend the system with new rule types:

```typescript
import { RuleEngine, type RuleEvaluator } from '@/lib/providers';

// Define new rule type
interface CustomRule extends BaseRule {
  type: "custom";
  customCriteria: string[];
}

// Create evaluator
class CustomRuleEvaluator implements RuleEvaluator<CustomRule> {
  evaluate(rule: CustomRule, context: DetectionContext): boolean {
    // Your custom logic here
    return rule.customCriteria.some(criteria => 
      // match against context data
    );
  }
}

// Register with rule engine
const ruleEngine = new RuleEngine();
ruleEngine.registerEvaluator("custom", new CustomRuleEvaluator());
```

## Migration from Legacy System

The new system maintains full backward compatibility. Existing code will continue to work unchanged, but you can migrate to the new system gradually:

### Before (Legacy)
```typescript
// Manual rule checking
const ctx = toDetectorContext(headers);
for (const rule of HOSTING_RULES) {
  if (hostingRuleMatches(rule, ctx)) return rule.provider;
}
```

### After (New System)
```typescript
// Registry-based detection
const provider = defaultRegistry.detectHostingProvider(headers);
```

## Benefits

1. **Extensibility**: Easy to add new providers and rule types
2. **Maintainability**: Centralized provider management
3. **Robustness**: Double-fallback ensures detection accuracy
4. **Performance**: Unified evaluation engine
5. **Type Safety**: Full TypeScript support with proper interfaces

## Backward Compatibility

- All existing detection functions work unchanged
- Legacy rule arrays accessible via `ProviderCatalog` export
- Fallback to original detection logic if registry detection fails
- No breaking changes to existing API