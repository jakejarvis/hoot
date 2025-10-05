# Repository Guidelines

## Project Structure & Module Organization
- `app/` Next.js App Router. Default to server components; keep `app/page.tsx` and `app/api/*` thin and delegate to `server/` or `lib/`.
- `components/` reusable UI primitives (kebab-case files, PascalCase exports).
- `hooks/` shared stateful helpers (camelCase named exports).
- `lib/` domain utilities and caching (`lib/cache`); import via `@/...` aliases.
- `server/` backend integrations and tRPC routers; isolate DNS, RDAP/WHOIS, TLS, and header probing services.
- `public/` static assets; Tailwind v4 tokens live in `app/globals.css`. Update `instrumentation-client.ts` when adding analytics.

## Build, Test, and Development Commands
- `pnpm dev` — start dev server at http://localhost:3000.
- `pnpm build` — compile production bundle.
- `pnpm start` — serve compiled output for smoke tests.
- `pnpm lint` — run Biome lint + type-aware checks (`--write` to fix).
- `pnpm format` — apply Biome formatting.
- `pnpm typecheck` — run `tsc --noEmit` for stricter diagnostics.

## Coding Style & Naming Conventions
- TypeScript only, `strict` enabled; prefer small, pure modules (≈≤300 LOC).
- 2-space indentation. Files/folders: kebab-case; exports: PascalCase; helpers: camelCase named exports.
- Client components must begin with `"use client"`. Consolidate imports via `@/...`. Keep page roots lean.

## Testing Guidelines
- Use **Vitest** with React Testing Library; config in `vitest.config.ts`.
- Global setup in `vitest.setup.ts`:
  - Mocks analytics clients/servers and `server-only`.
  - Centralized Redis mock exposed via `global.__redisTestHelper` for consistent state and resets.
  - `unstable_cache` mocked as a no-op; caching behavior is not under test.
- UI tests:
  - Do not add direct tests for `components/ui/*` (shadcn).
  - Mock Radix primitives (Accordion, Tooltip) when testing domain sections.
  - Mock TRPC/React Query for components like `Favicon` and `Screenshot`.
- Server tests:
  - Prefer `vi.hoisted` for ESM module mocks (e.g., `node:tls`).
  - Use unique cache keys/domains; call `global.__redisTestHelper.reset()` in `afterEach`.
  - Screenshot service (`server/services/screenshot.ts`) uses hoisted mocks for `puppeteer`/`puppeteer-core` and `@sparticuz/chromium`.
- Browser APIs: Mock `URL.createObjectURL`/`revokeObjectURL` with `vi.fn()` in tests that need them.
- Commands: `pnpm test`, `pnpm test:run`, `pnpm test:coverage`.

## Commit & Pull Request Guidelines
- Commits: single-focus, imperative, sentence case (e.g., "Add RDAP caching layer").
- PRs: describe user impact, link issues, flag breaking changes/deps, and attach screenshots or terminal logs when relevant.
- Call out skipped checks and confirm `.env.local` requirements for reviewers.

## Security & Configuration Tips
- Keep secrets in `.env.local`.
- Blob: `BLOB_SIGNING_SECRET`, `BLOB_READ_WRITE_TOKEN`, `FAVICON_TTL_SECONDS`, `SCREENSHOT_TTL_SECONDS`.
- Screenshots (Puppeteer): prefer `puppeteer-core` + `@sparticuz/chromium` on Vercel; optional `PUPPETEER_SKIP_DOWNLOAD=1` to avoid full download; `HOOT_USER_AGENT` to override UA; optional `PUPPETEER_EXECUTABLE_PATH` locally.
- Cache Cloudflare DoH, RDAP, TLS, and header probes via `lib/cache`; apply retry backoff to respect provider limits.
- Review `server/trpc.ts` when extending procedures to ensure auth/context remain intact.

