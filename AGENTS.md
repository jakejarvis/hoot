# Repository Guidelines

## Project Structure & Module Organization
- `app/` Next.js App Router (RSC-first). Pages like `app/page.tsx`, API routes in `app/api/*` (e.g., `app/api/trpc/[trpc]/route.ts`).
- `components/` UI building blocks (`ui/`, layout pieces). Component files use kebab-case; exports use PascalCase.
- `server/` tRPC backend: `routers/` (procedures), `services/` (DNS, RDAP/WHOIS, TLS, headers), `trpc.ts` (init).
- `lib/` shared utilities (domain parsing, Redis cache, tRPC client), plus `@/` path alias from `tsconfig.json`.
- `hooks/` React hooks, `public/` static assets, `app/globals.css` Tailwind v4 styles.

## Build, Test, and Development Commands
- `pnpm dev` Run the local dev server at `http://localhost:3000`.
- `pnpm build` Production build (Next.js 15, React 19).
- `pnpm start` Start the built app.
- `pnpm lint` Lint and type-aware checks via Biome.
- `pnpm format` Apply formatting fixes (Biome).

## Coding Style & Naming Conventions
- TypeScript, strict mode on. Indentation: 2 spaces (Biome-enforced).
- React components: PascalCase exports; client components add `"use client"`.
- Files/folders: kebab-case (e.g., `domain-report-view.tsx`). Server utilities/procedures use camelCase.
- Imports prefer `@/...` alias (e.g., `@/server/routers/_app`). Keep modules small and cohesive: UI in `components/`, I/O in `server/services/`.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject, sentence case (e.g., "Refactor DomainReportView for clarity"). Group related changes.
- PRs: include a clear summary, linked issues, and screenshots for UI changes. Note any config/env updates.
- Before submit: run `pnpm lint`, `pnpm build`, and verify no type errors. Describe user-visible changes and rollout concerns.

## Security & Configuration Tips
- Environment: Upstash Redis optional cache via `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Do not commit secrets; use `.env.local`.
- External calls: DNS over HTTPS (Cloudflare), RDAP, TLS probing, HTTP headers. Be mindful of rate limits and error handling.
