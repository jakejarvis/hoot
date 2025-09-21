# Provider Detection System

This system provides extensible and robust provider detection using a clean rule-based approach.

## Architecture

The new detection system is built around simple, focused types:

### DetectionRule

Each rule is specific and focused:

```typescript
type DetectionRule =
  // HTTP header matching
  | { type: "header"; name: string; value?: string; present?: boolean }
  // DNS record matching  
  | { type: "dns"; recordType: "MX" | "NS"; value: string };
```

### Provider

Each provider has metadata and an array of detection rules:

```typescript
interface Provider {
  name: string;           // "Vercel"
  iconDomain: string;     // "vercel.com" 
  aliases?: string[];     // ["vercel"]
  rules: DetectionRule[]; // Array of rules that identify this provider
}
```

## Usage

### Basic Detection

```typescript
import { detectHostingProvider, detectEmailProvider, detectDnsProvider } from '@/lib/providers';

// Hosting detection
const headers = [
  { name: 'server', value: 'vercel' },
  { name: 'x-vercel-id', value: 'abc123' }
];
const hosting = detectHostingProvider(headers);
console.log(hosting); // "Vercel"

// Email detection  
const mxRecords = ['mx1.google.com', 'mx2.google.com'];
const email = detectEmailProvider(mxRecords);
console.log(email); // "Google Workspace"

// DNS detection
const nsRecords = ['ns1.cloudflare.com', 'ns2.cloudflare.com'];  
const dns = detectDnsProvider(nsRecords);
console.log(dns); // "Cloudflare"
```

### Adding New Providers

Add to the appropriate catalog file (`hosting-providers.ts`, `email-providers.ts`, `dns-providers.ts`):

```typescript
export const HOSTING_PROVIDERS: Provider[] = [
  // existing providers...
  {
    name: "Railway",
    iconDomain: "railway.app",
    aliases: ["railway"],
    rules: [
      { type: "header", name: "x-railway-id", present: true },
      { type: "header", name: "server", value: "railway" }
    ],
  },
];
```

## Rule Types

### Header Rules

```typescript
// Check if header exists
{ type: "header", name: "cf-ray", present: true }

// Check header value contains substring
{ type: "header", name: "server", value: "vercel" }

// Check header exists (same as present: true)  
{ type: "header", name: "x-vercel-id" }
```

### DNS Rules

```typescript
// Check MX record contains substring
{ type: "dns", recordType: "MX", value: "google.com" }

// Check NS record contains substring
{ type: "dns", recordType: "NS", value: "cloudflare.com" }
```

## Benefits

1. **Simple**: Each rule is focused and easy to understand
2. **Extensible**: Easy to add new rule types and providers
3. **Maintainable**: Clean separation between providers and detection logic
4. **Robust**: Unified evaluation prevents inconsistencies
5. **Backward Compatible**: Legacy detection functions still work

## Migration

The system maintains full backward compatibility:

```typescript
// These functions work exactly as before
detectHostingProviderFromHeaders(headers);
detectEmailProviderFromMx(mxHosts);
detectDnsProviderFromNs(nsHosts);
```

New functions are available with cleaner APIs:

```typescript
// New, cleaner functions
detectHostingProvider(headers);
detectEmailProvider(mxHosts);
detectDnsProvider(nsHosts);
```

## Rule Evaluation

- **Provider-level**: A provider matches if **ANY** of its rules match (OR logic)
- **Rule-level**: Each rule has specific matching criteria
- **Fallback**: System falls back to legacy detection for safety

This approach provides a much cleaner, more maintainable foundation for provider detection while preserving all existing functionality.