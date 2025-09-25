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
- Prefer Vitest/Jest + React Testing Library. Name tests `*.test.ts(x)` and colocate or place in `tests/`.
- Focus on `lib/` and `server/` units; add lightweight integration tests for API routes.
- Add a `pnpm test` script when introducing tests; aim for meaningful coverage on critical paths.

## Commit & Pull Request Guidelines
- Commits: single-focus, imperative, sentence case (e.g., "Add RDAP caching layer").
- PRs: describe user impact, link issues, flag breaking changes/deps, and attach screenshots or terminal logs when relevant.
- Call out skipped checks and confirm `.env.local` requirements for reviewers.

## Security & Configuration Tips
- Keep secrets in `.env.local` (Upstash: `KV_REST_API_URL`, `KV_REST_API_TOKEN`).
- Cache Cloudflare DoH, RDAP, TLS, and header probes via `lib/cache`; apply retry backoff to respect provider limits.
- Review `server/trpc.ts` when extending procedures to ensure auth/context remain intact.

