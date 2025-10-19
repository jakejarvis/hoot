# Repository Guidelines

## Project Structure & Module Organization
- `app/` Next.js App Router. Default to server components; keep `app/page.tsx` and `app/api/*` thin and delegate to `server/` or `lib/`.
- `components/` reusable UI primitives (kebab-case files, PascalCase exports).
- `hooks/` shared stateful helpers (camelCase named exports).
- `lib/` domain utilities and caching (`lib/cache`); import via `@/...` aliases.
- `server/` backend integrations and tRPC routers; isolate DNS, RDAP/WHOIS, TLS, and header probing services.
- `server/db/` Drizzle ORM schema, migrations, and repository layer for Postgres persistence.
- `server/inngest/` Inngest functions for background jobs and scheduled section revalidation.
- `public/` static assets; Tailwind v4 tokens live in `app/globals.css`. Update `instrumentation-client.ts` when adding analytics.

## Build, Test, and Development Commands
- `pnpm dev` — start dev server at http://localhost:3000.
- `pnpm build` — compile production bundle.
- `pnpm start` — serve compiled output for smoke tests.
- `pnpm lint` — run Biome lint + type-aware checks (`--write` to fix).
- `pnpm format` — apply Biome formatting.
- `pnpm typecheck` — run `tsc --noEmit` for stricter diagnostics.
- `pnpm db:generate` — generate Drizzle migrations.
- `pnpm db:push` — push the current schema to the database.
- `pnpm db:migrate` — apply migrations to the database.
- `pnpm db:studio` — open Drizzle Studio.
- `pnpm db:seed:providers` — seed known provider rules.
- Requires Node.js >= 22 (see `package.json` engines).

## Coding Style & Naming Conventions
- TypeScript only, `strict` enabled; prefer small, pure modules (≈≤300 LOC).
- 2-space indentation. Files/folders: kebab-case; exports: PascalCase; helpers: camelCase named exports.
- Client components must begin with `"use client"`. Consolidate imports via `@/...`. Keep page roots lean.
 - Use `drizzle-zod` for DB boundary validation:
   - Read schemas: `server/db/zod.ts` `*Select` (strict `Date` types)
   - Write schemas: `server/db/zod.ts` `*Insert`/`*Update` (dates coerced)
   - Reuse domain Zod types for JSON columns (SEO, registration) to avoid drift
   - Reference: drizzle-zod docs [drizzle-zod](https://orm.drizzle.team/docs/zod)

## Testing Guidelines
- Use **Vitest** with React Testing Library; config in `vitest.config.ts`.
- Global setup in `vitest.setup.ts`:
  - Mocks analytics clients/servers and `server-only`.
  - `unstable_cache` mocked as a no-op; caching behavior is not under test.
- Database in tests: Drizzle client is not globally mocked. Replace `@/server/db/client` with a PGlite-backed instance when needed.
- Redis in tests: do NOT use globals. Mock per-suite with the in-memory adapter:
  - In `beforeAll`: `const { makeInMemoryRedis } = await import("@/lib/redis-mock"); const impl = makeInMemoryRedis(); vi.doMock("@/lib/redis", () => impl);`
  - In `beforeEach`/`afterEach`: `const { resetInMemoryRedis } = await import("@/lib/redis-mock"); resetInMemoryRedis();`
  - Seed/assert via the mocked client: `const { redis } = await import("@/lib/redis"); await redis.set(key, value);`
- UI tests:
  - Do not add direct tests for `components/ui/*` (shadcn).
  - Mock Radix primitives (Accordion, Tooltip) when testing domain sections.
  - Mock TRPC/React Query for components like `Favicon` and `Screenshot`.
- Server tests:
  - Prefer `vi.hoisted` for ESM module mocks (e.g., `node:tls`).
  - Use unique cache keys/domains; call `resetInMemoryRedis()` in `afterEach`.
  - Screenshot service (`server/services/screenshot.ts`) uses hoisted mocks for `puppeteer`/`puppeteer-core` and `@sparticuz/chromium`.
- Browser APIs: Mock `URL.createObjectURL`/`revokeObjectURL` with `vi.fn()` in tests that need them.
- Commands: `pnpm test`, `pnpm test:run`, `pnpm test:coverage`.

## Commit & Pull Request Guidelines
- Commits: single-focus, imperative, sentence case (e.g., "Add RDAP caching layer").
- PRs: describe user impact, link issues, flag breaking changes/deps, and attach screenshots or terminal logs when relevant.
- Call out skipped checks and confirm `.env.local` requirements for reviewers.

## Security & Configuration Tips
- Keep secrets in `.env.local`.
- Screenshots (Puppeteer): prefer `puppeteer-core` + `@sparticuz/chromium` on Vercel.
- Persist domain data in Postgres via Drizzle; use Redis for short-lived caching/locks. Apply retry backoff to respect provider limits.
- Background revalidation runs via Inngest functions (scheduled and event-driven).
- Review `server/trpc.ts` when extending procedures to ensure auth/context remain intact.
