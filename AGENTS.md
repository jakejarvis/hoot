# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router; default to server components, add `"use client"` only where interaction demands it. Page roots like `app/page.tsx` and API routes in `app/api/*` should stay lean and delegate logic.
- Reusable UI primitives live in `components/` (kebab-case files, PascalCase exports). Share stateful helpers via `hooks/`, and surface domain utilities from `lib/` using the `@/...` alias to avoid deep relative paths.
- Backend integrations and tRPC routers belong in `server/`; keep DNS, RDAP/WHOIS, TLS, and header probing services isolated there and reuse caching primitives from `lib/cache`.
- Static assets sit in `public/`; Tailwind v4 tokens and global styles are managed in `app/globals.css`. Update `instrumentation-client.ts` when adding analytics or observability hooks.

## Build, Test, and Development Commands
- `pnpm dev` starts the turbo-ready dev server at `http://localhost:3000`.
- `pnpm build` compiles the production bundle; run before deploys.
- `pnpm start` serves the compiled output for smoke testing.
- `pnpm lint` runs Biome’s lint + type-aware checks; add `--write` for autofixes.
- `pnpm format` enforces Biome formatting; `pnpm typecheck` runs `tsc --noEmit` for stricter diagnostics.

## Coding Style & Naming Conventions
- TypeScript is mandatory with `strict` options; keep modules under ~300 LOC and prefer pure functions.
- Indentation is 2 spaces. Files and folders are kebab-case; exports stay PascalCase; shared helpers use camelCase named exports.
- Client components must start with `"use client"`. Consolidate shared imports through `@/...` aliases and document non-obvious patterns inline with concise comments when necessary.

## Commit & Pull Request Guidelines
- Commits are single-focus, imperative, sentence case (e.g., `Add RDAP caching layer`). Avoid batching unrelated refactors.
- PRs must summarize user impact, link issues, flag breaking API or dependency changes, and attach UI screenshots or terminal output when relevant.
- Call out any skipped checks explicitly and confirm `.env.local` requirements for reviewers.

## Security & Configuration Tips
- Keep secrets in `.env.local`; Upstash integrations require `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- Cache responses for Cloudflare DoH, RDAP, TLS, and header probes via `lib/cache` and apply retry backoff to stay within provider limits.
- Review `server/trpc.ts` when extending procedures to ensure auth/context expectations remain intact.
