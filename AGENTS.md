# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router, primarily server components, with routes like `app/page.tsx` and API handlers under `app/api/*`.
- `components/` contains reusable UI primitives in kebab-case files while exports stay PascalCase.
- `server/` holds tRPC routers plus DNS, RDAP/WHOIS, TLS, and header probing services.
- `lib/` centralizes shared utilities (domain parsing, caching, tRPC client); prefer the `@/...` alias.
- `hooks/` stores React hooks; `public/` carries static assets; Tailwind v4 styles live in `app/globals.css`.

## Build, Test, and Development Commands
- `pnpm dev` boots the Turbo-ready dev server at `http://localhost:3000`.
- `pnpm build` generates the production bundle.
- `pnpm start` serves the compiled app locally for smoke tests.
- `pnpm lint` runs Biome linting and type-aware checks.
- `pnpm format` applies Biome formatting fixes; rerun `pnpm lint --apply` if automated patches are acceptable.
- `pnpm typecheck` executes the TypeScript compiler in no-emit mode.

## Coding Style & Naming Conventions
- TypeScript everywhere with `strict` options; prefer modules under ~300 LOC for clarity.
- Indentation is 2 spaces, enforced via Biome.
- Client components begin with `"use client"`; exports are PascalCase.
- Files and folders use kebab-case; shared utilities expose named camelCase functions.
- Use `@/...` imports instead of deep relative paths.

## Commit & Pull Request Guidelines
- Commits are single-focus, imperative, sentence case (e.g., "Add RDAP caching layer").
- Pull requests summarize user impact, link issues, note config/env updates, and attach UI screenshots or terminal output when relevant.
- Before review, run `pnpm lint`, `pnpm typecheck`, and `pnpm build`; call out any skipped checks.
- Flag breaking API changes or new dependencies directly in the PR description.

## Security & Configuration Tips
- Keep secrets in `.env.local`; Upstash credentials require `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- External integrations (Cloudflare DoH, RDAP, TLS probes) are rate-limited—cache responses in `lib/cache` and implement retry backoff.
- Review `server/trpc.ts` to meet auth/context expectations when extending procedures.
