# Provider Detection System

This system provides extensible and robust provider detection using a declarative JSON-serializable logic AST with AND/OR/NOT composition over domain primitives.

## Architecture

### Logic AST

```ts
type HeaderEquals = { kind: "headerEquals"; name: string; value: string };
type HeaderIncludes = { kind: "headerIncludes"; name: string; substr: string };
type HeaderPresent = { kind: "headerPresent"; name: string };
type MxSuffix = { kind: "mxSuffix"; suffix: string };
type NsSuffix = { kind: "nsSuffix"; suffix: string };
type IssuerIncludes = { kind: "issuerIncludes"; substr: string };

type Logic =
  | { all: Logic[] }
  | { any: Logic[] }
  | { not: Logic }
  | HeaderEquals
  | HeaderIncludes
  | HeaderPresent
  | MxSuffix
  | NsSuffix
  | IssuerIncludes;
```

### Evaluator

See `evalRule` in `lib/providers/detection.ts`.

### Provider Catalog

Providers are defined with a single `rule` per provider and a `category`:

```ts
type Provider = { name: string; domain: string; category: "hosting"|"email"|"dns"|"ca"; rule: Logic };
```

## Usage

```ts
import { detectHostingProvider, detectEmailProvider, detectDnsProvider, detectCertificateAuthority, resolveRegistrarDomain } from '@/lib/providers/detection';

const hosting = detectHostingProvider([{ name: 'server', value: 'Vercel' }]);
const email = detectEmailProvider(['aspmx.l.google.com.']);
const dns = detectDnsProvider(['ns1.cloudflare.com']);
const ca = detectCertificateAuthority("Let's Encrypt R3");
```

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