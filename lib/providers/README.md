# Provider Detection System

This system provides extensible and robust provider detection using a clean rule-based approach.

## Architecture

The detection system is built around simple, focused types:

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
  domain: string;     // "vercel.com" 
  rules: DetectionRule[]; // Array of rules that identify this provider
}
```

## Usage

### Basic Detection

```typescript
import { 
  detectHostingProvider, 
  detectEmailProvider, 
  detectDnsProvider,
  detectCertificateAuthority,
  resolveRegistrarDomain
} from '@/lib/providers/detection';

// Hosting detection
const headers = [
  { name: 'server', value: 'vercel' },
  { name: 'x-vercel-id', value: 'abc123' }
];
const hosting = detectHostingProvider(headers);
console.log(hosting); // { name: "Vercel", domain: "vercel.com" }

// Email detection  
const mxRecords = ['mx1.google.com', 'mx2.google.com'];
const email = detectEmailProvider(mxRecords);
console.log(email); // { name: "Google Workspace", domain: "google.com" }

// DNS detection
const nsRecords = ['ns1.cloudflare.com', 'ns2.cloudflare.com'];  
const dns = detectDnsProvider(nsRecords);
console.log(dns); // { name: "Cloudflare", domain: "cloudflare.com" }

// Certificate Authority detection (alias matching against issuer string)
const ca = detectCertificateAuthority("Let's Encrypt R3");
console.log(ca); // { name: "Let's Encrypt", domain: "letsencrypt.org" }

// Registrar domain resolution (partial match of registrar names)
const registrarName = 'GoDaddy Inc.';
const registrarDomain = resolveRegistrarDomain(registrarName);
console.log(registrarDomain); // "godaddy.com"
```

### Adding New Providers

Add to the appropriate section in `catalog.ts`:

```typescript
export const HOSTING_PROVIDERS: Provider[] = [
  // existing providers...
  {
    name: "Railway",
    domain: "railway.app",
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

// Check header exists (shorthand - same as present: true)  
{ type: "header", name: "x-vercel-id" }
```

### DNS Rules

```typescript
// Check MX record contains substring
{ type: "dns", recordType: "MX", value: "google.com" }

// Check NS record contains substring
{ type: "dns", recordType: "NS", value: "cloudflare.com" }
```

### Certificate Authorities

Modeled via a dedicated provider type with alias matching (no DetectionRule):

```ts
interface CertificateAuthorityProvider {
  name: string;        // "Let's Encrypt"
  domain: string;      // "letsencrypt.org"
  aliases?: string[];  // ["isrg", "r3", "lets encrypt"]
}
```

## Rule Evaluation

- **Provider-level**: A provider matches if **ANY** of its rules match (OR logic)
- **Rule-level**: Each rule has specific matching criteria
- **Fallback**: Returns "Unknown" if no provider matches, or first hostname for DNS/email

## Benefits

1. **Simple**: Each rule is focused and easy to understand
2. **Extensible**: Easy to add new rule types and providers
3. **Maintainable**: Clean separation between providers and detection logic
4. **Robust**: Unified evaluation prevents inconsistencies
5. **Fast**: Efficient pre-calculated contexts avoid redundant work

This approach provides a clean, maintainable foundation for provider detection that's easy to understand and extend.