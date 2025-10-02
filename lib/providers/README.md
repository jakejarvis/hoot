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
type IssuerEquals = { kind: "issuerEquals"; value: string };
type IssuerIncludes = { kind: "issuerIncludes"; substr: string };
type RegistrarEquals = { kind: "registrarEquals"; value: string };
type RegistrarIncludes = { kind: "registrarIncludes"; substr: string };

type Logic =
  | { all: Logic[] }
  | { any: Logic[] }
  | { not: Logic }
  | HeaderEquals
  | HeaderIncludes
  | HeaderPresent
  | MxSuffix
  | NsSuffix
  | IssuerEquals
  | IssuerIncludes
  | RegistrarEquals
  | RegistrarIncludes;
```

DetectionContext passed to the evaluator:

```ts
interface DetectionContext {
  headers: Record<string, string>; // normalized lowercased names
  mx: string[];                    // lowercased FQDNs (no trailing dot)
  ns: string[];                    // lowercased FQDNs (no trailing dot)
  issuer?: string;                 // lowercased certificate issuer string
  registrar?: string;              // lowercased registrar name from WHOIS/RDAP
}
```

### Evaluator

See `evalRule` in `lib/providers/detection.ts`.

### Provider Catalog

Providers are defined with a single `rule` per provider and a `category`:

```ts
type Provider = {
  name: string;
  domain: string;
  category: "hosting" | "email" | "dns" | "ca" | "registrar";
  rule: Logic;
};
```

## Usage

```ts
import {
  detectHostingProvider,
  detectEmailProvider,
  detectDnsProvider,
  detectCertificateAuthority,
  detectRegistrar,
} from '@/lib/providers/detection';

const hosting = detectHostingProvider([{ name: 'server', value: 'Vercel' }]);
const email = detectEmailProvider(['aspmx.l.google.com.']);
const dns = detectDnsProvider(['ns1.cloudflare.com']);
const ca = detectCertificateAuthority("Let's Encrypt R3");
const registrar = detectRegistrar('GoDaddy Inc.');
```

Add to the appropriate section in `catalog.ts`:

```typescript
export const HOSTING_PROVIDERS: Provider[] = [
  // existing providers...
  {
    name: "Railway",
    domain: "railway.app",
    category: "hosting",
    rule: {
      any: [
        { kind: "headerPresent", name: "x-railway-id" },
        { kind: "headerEquals", name: "server", value: "railway" },
      ],
    },
  },
];
```

## Rule Types

### Header primitives

```ts
{ kind: "headerPresent", name: "cf-ray" }
{ kind: "headerEquals", name: "server", value: "vercel" }
{ kind: "headerIncludes", name: "server", substr: "cloud" }
```

### DNS primitives

```ts
{ kind: "mxSuffix", suffix: "aspmx.l.google.com" }
{ kind: "nsSuffix", suffix: "cloudflare.com" }
```

### Certificate Authority primitives

```ts
{ kind: "issuerIncludes", substr: "let's encrypt" }
{ kind: "issuerEquals", value: "isrg r3" }
```

### Registrar primitives

```ts
{ kind: "registrarIncludes", substr: "godaddy inc" }
{ kind: "registrarEquals", value: "namecheap" }
```

## Rule Evaluation

- **Provider-level**: Evaluate the provider's single `rule` with `evalRule`. Compose complex logic using `{ all | any | not }`.
- **Rule primitives**: Header, DNS, issuer, and registrar primitives match against normalized context values.
- **Fallbacks**: Returns "Unknown" if no provider matches; DNS/Email fall back to the registrable domain of the first record when unknown.

## Benefits

1. **Simple**: Each rule is focused and easy to understand
2. **Extensible**: Easy to add new rule types and providers
3. **Maintainable**: Clean separation between providers and detection logic
4. **Robust**: Unified evaluation prevents inconsistencies
5. **Fast**: Efficient pre-calculated contexts avoid redundant work

This approach provides a clean, maintainable foundation for provider detection that's easy to understand and extend.
