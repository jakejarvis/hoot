# GitHub Copilot Instructions for Hoot

This repository contains Hoot, a domain intelligence tool built with Next.js 15 and React 19. Please follow these guidelines when assisting with code in this repository.

## Additional Resources

- **AGENTS.md** - Contains detailed repository guidelines for project structure, coding conventions, testing, and security
- **README.md** - Project overview, features, tech stack, and getting started instructions

Refer to these files for comprehensive information about the repository's architecture and development practices.

## Project Overview

Hoot is an all-in-one app for exploring domain names, providing instant insights including WHOIS info, DNS records, SSL certificates, HTTP headers, hosting details, and geolocation. The app features a modern, interactive UI with dark mode support and fast, privacy-focused data fetching with caching.

## Project Structure & Module Organization

- `app/` - Next.js App Router with server components by default. Keep `app/page.tsx` and `app/api/*` thin and delegate to `server/` or `lib/`.
- `components/` - Reusable UI primitives (kebab-case files, PascalCase exports).
- `hooks/` - Shared stateful helpers (camelCase named exports).
- `lib/` - Domain utilities and caching (`lib/cache`). Import via `@/...` aliases.
- `server/` - Backend integrations and tRPC routers. Isolate DNS, RDAP/WHOIS, TLS, and header probing services.
- `public/` - Static assets. Tailwind v4 tokens live in `app/globals.css`. Update `instrumentation-client.ts` when adding analytics.

## Tech Stack

- **Next.js 15** with Turbopack
- **React 19** with React Compiler
- **TypeScript** (strict mode enabled)
- **Tailwind CSS v4**
- **tRPC** for API endpoints
- **Upstash Redis** for caching
- **Vercel Blob** for favicon storage
- **Biome** for linting and formatting

## Development Commands

- `pnpm dev` - Start dev server at http://localhost:3000
- `pnpm build` - Compile production bundle
- `pnpm start` - Serve compiled output for smoke tests
- `pnpm lint` - Run Biome lint + type-aware checks (`--write` to fix)
- `pnpm format` - Apply Biome formatting
- `pnpm typecheck` - Run `tsc --noEmit` for stricter diagnostics

## Coding Style & Conventions

- **TypeScript only** with `strict` mode enabled
- Prefer small, pure modules (≈≤300 LOC)
- **2-space indentation**
- Files/folders: **kebab-case**
- Exports: **PascalCase** for components, **camelCase** for helpers
- Client components must begin with `"use client"`
- Consolidate imports via `@/...` aliases
- Keep page roots lean, delegate to `server/` or `lib/`

## Key Domain Analysis Features

### Data Sources & Services
- **RDAP/WHOIS** - Domain registration information via `rdapper` library
- **DNS Resolution** - Multiple record types (A, AAAA, MX, NS, TXT, etc.) via Cloudflare DoH
- **TLS/SSL Certificates** - Certificate chain analysis and validation
- **HTTP Headers** - Security headers, server information, technology detection
- **Geolocation** - IP address mapping with interactive maps
- **Favicon Detection** - Domain favicon extraction and storage via Vercel Blob

### External API Integration
All external API calls should be:
- Cached using Upstash Redis with appropriate TTL
- Protected with retry logic and rate limiting
- Handled gracefully with fallbacks for failures
- Validated using Zod schemas

### Domain Processing Pipeline
1. Domain validation and normalization using `tldts`
2. Parallel data fetching for different analysis types
3. Provider detection using rule-based system
4. Data aggregation and presentation in expandable sections

## Key Architectural Patterns

### Provider Detection System
The `lib/providers/` directory contains a rule-based provider detection system:
- Detects hosting, email, DNS, and registrar providers
- Uses declarative rules for HTTP headers and DNS records
- Clean separation between provider catalog and detection logic
- Returns `{ name: string, domain: string | null }` objects

### Caching Strategy
- Use `lib/cache` for caching external API calls (Cloudflare DoH, RDAP, TLS probes)
- Apply retry backoff to respect provider rate limits
- Store secrets in `.env.local` (Upstash: `KV_REST_API_URL`, `KV_REST_API_TOKEN`)

### Component Architecture
- Server components by default
- UI components in `components/ui/` following shadcn/ui patterns
- Domain-specific components in `components/domain/`
- Use `Section` component for collapsible report sections

## Testing Guidelines

- Runner: **Vitest** with TypeScript and React support (`@vitejs/plugin-react`, `vite-tsconfig-paths`)
- Environment: **jsdom** by default (set in `vitest.config.ts`), with selective Node tests via `/* @vitest-environment node */`
- Setup file: `vitest.setup.ts`
  - Mocks analytics (`@/lib/analytics/{client,server}`)
  - No-op for `server-only`
  - Centralized Redis mock using `vi.hoisted` and exposes `global.__redisTestHelper` for `reset()`/assertions
  - `unstable_cache` is a no-op pass-through (documented as intentional)
- UI testing patterns
  - Prefer testing behavior with React Testing Library
  - Do NOT test `components/ui/*` (shadcn) directly
  - Mock Radix primitives (Accordion/Tooltip) in section tests to avoid context errors
  - Mock TRPC/React Query hooks where needed (e.g., `Favicon`)
- Server testing patterns
  - Use hoisted ESM mocks (`vi.hoisted`) for modules like `node:tls`
  - Use unique cache keys/domains to avoid cross-test cache crosstalk
  - Reset global Redis mock between tests: `global.__redisTestHelper.reset()`
- Browser API shims (per-test)
  - Explicitly mock `URL.createObjectURL`/`URL.revokeObjectURL` with `vi.fn()` in tests that need them
- Commands
  - `pnpm test` (watch), `pnpm test:run` (CI-friendly), `pnpm test:coverage` (HTML/LCOV)

## Security & Configuration

- Keep secrets in `.env.local`
- Review `server/trpc.ts` when extending procedures to ensure auth/context remain intact
- Validate all external inputs using Zod schemas
- Use server-only imports for sensitive operations

## Common Patterns

### tRPC Setup
The project uses tRPC v11 with superjson transformer:
```typescript
// server/trpc.ts
export const router = t.router;
export const publicProcedure = t.procedure;

// Usage in routers
export const exampleRouter = router({
  getData: publicProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .query(async ({ input }) => {
      // Implementation
    }),
});
```

### Component Structure
Follow this pattern for domain-specific components:
```typescript
interface ComponentProps {
  data?: SomeType | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function Component({ data, isLoading, isError, onRetry }: ComponentProps) {
  return (
    <Section
      title="Section Title"
      description="Section description"
      icon={<IconComponent className="h-4 w-4" />}
      status={isLoading ? "loading" : isError ? "error" : "ready"}
    >
      {data ? (
        <KeyValue label="Label" value="Value" />
      ) : isError ? (
        <ErrorWithRetry onRetry={onRetry} />
      ) : (
        <Skeletons lines={3} />
      )}
    </Section>
  );
}
```

### Provider Detection
```typescript
import { detectHostingProvider, detectEmailProvider, detectDnsProvider } from '@/lib/providers/detection';

// HTTP headers detection
const hostingProvider = detectHostingProvider(headers);

// MX records detection
const emailProvider = detectEmailProvider(['mx1.example.com']);

// NS records detection  
const dnsProvider = detectDnsProvider(['ns1.example.com']);

// All return: { name: "Provider Name", domain: "example.com" | null }
```

### Caching Pattern
```typescript
import { getFromCache, setInCache } from '@/lib/redis';

// Cache with TTL
await setInCache(`key:${domain}`, data, 3600); // 1 hour
const cached = await getFromCache(`key:${domain}`);
```

### Error Handling & Loading States
```typescript
// Components should handle all three states
export function AnalysisSection({ data, isLoading, isError, onRetry }: SectionProps) {
  return (
    <Section status={isLoading ? "loading" : isError ? "error" : "ready"}>
      {data ? (
        // Success state
        <DataDisplay data={data} />
      ) : isError ? (
        // Error state with retry
        <ErrorWithRetry onRetry={onRetry} />
      ) : (
        // Loading state
        <Skeletons lines={3} />
      )}
    </Section>
  );
}
```

### UI Component Patterns
- Use `KeyValue` for label-value pairs with optional icons and copy buttons
- Use `Section` for collapsible report sections with loading states
- Use `Badge` for status indicators and data source labels
- Use `Favicon` for provider icons with fallbacks
- Use `TruncatedValue` for long values with expand/collapse
- Use `CopyButton` for copyable values with toast feedback

## File Naming Conventions

- Components: `kebab-case.tsx` (e.g., `copy-button.tsx`)
- Utilities: `kebab-case.ts` (e.g., `domain-utils.ts`)
- Types: `types.ts` or inline with implementation
- Tests: `*.test.ts(x)`

When working on this codebase, prioritize code quality, TypeScript safety, and following the established architectural patterns. Always use the existing utility functions and components when available rather than creating duplicates.