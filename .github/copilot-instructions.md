# GitHub Copilot Instructions for DomainStack

This repository contains DomainStack, a domain intelligence tool built with Next.js 15 and React 19. Please follow these guidelines when assisting with code in this repository.

## Additional Resources

- **AGENTS.md** - Contains detailed repository guidelines for project structure, coding conventions, testing, and security
- **README.md** - Project overview, features, tech stack, and getting started instructions

Refer to these files for comprehensive information about the repository's architecture and development practices.

## Project Overview

DomainStack is an all-in-one app for exploring domain names, providing instant insights including WHOIS info, DNS records, SSL certificates, HTTP headers, hosting details, and geolocation. The app features a modern, interactive UI with dark mode support and fast, privacy-focused data fetching with caching.

## Project Structure & Module Organization

- `app/` - Next.js App Router with server components by default. Keep `app/page.tsx` and `app/api/*` thin and delegate to `server/` or `lib/`.
- `components/` - Reusable UI primitives (kebab-case files, PascalCase exports).
- `hooks/` - Shared stateful helpers (camelCase named exports).
- `lib/` - Domain utilities and caching (`lib/cache`). Import via `@/...` aliases.
- `server/` - Backend integrations and tRPC routers. Isolate DNS, RDAP/WHOIS, TLS, headers, and screenshot services.
- `public/` - Static assets. Tailwind v4 tokens live in `app/globals.css`. Update `instrumentation-client.ts` when adding analytics.

## Tech Stack

- **Next.js 15** with Turbopack
- **React 19** with React Compiler
- **TypeScript** (strict mode enabled)
- **Tailwind CSS v4**
- **tRPC** for API endpoints
- **Upstash Redis** for caching
- **UploadThing** for favicon and screenshot storage
- **Puppeteer Core + @sparticuz/chromium** for server screenshots (fallback to `puppeteer` locally)
- **Biome** for linting and formatting

## Development Commands

- `pnpm dev` - Start dev server at http://localhost:3000
- `pnpm build` - Compile production bundle
- `pnpm start` - Serve compiled output for smoke tests
- `pnpm lint` - Run Biome lint + type-aware checks (`--write` to fix)
- `pnpm format` - Apply Biome formatting
- `pnpm typecheck` - Run `tsc --noEmit` for stricter diagnostics
- `pnpm test:run` - Run test suite

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
- **RDAP/WHOIS** - Domain registration information via `rdapper`
- **DNS Resolution** - A/AAAA/MX/NS/TXT via Cloudflare DoH
- **TLS/SSL Certificates** - Chain analysis
- **HTTP Headers** - Security headers and tech detection
- **Geolocation** - IP → map
- **Favicon & Screenshot Storage** - UploadThing with Redis index

- Service: `server/services/screenshot.ts` using Puppeteer.
- Storage: `lib/storage.ts` uploads via UploadThing and returns `{ url, key }` stored in Redis with TTLs.
- Client UI: `components/domain/screenshot.tsx` and `components/domain/screenshot-tooltip.tsx` with optimized loading state and one-time fetch gating.
- Router: `server/routers/domain.ts` exposes `domain.screenshot` via `createDomainProcedure`.
- Config: prefer `puppeteer-core` + `@sparticuz/chromium` on Vercel; fallback to `puppeteer` locally. In `next.config.ts`, `serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]`.
- Env:
  - `UPLOADTHING_SECRET` (required)
  - `UPLOADTHING_APP_ID` (recommended)
  - `SCREENSHOT_TTL_SECONDS` (optional, default 7 days)
  - `EXTERNAL_USER_AGENT` (optional UA override)
  - `PUPPETEER_SKIP_DOWNLOAD=1` on Vercel to skip full puppeteer install

### Cron Upload Pruning
- Route: `app/api/cron/blob-prune/route.ts` (GET only, Bearer auth via `CRON_SECRET`).
- Deletes expired UploadThing files by key from `purge:favicon` and `purge:screenshot` ZSETs; batch size configurable via `PURGE_BATCH`.

## Testing Guidelines
- Runner: **Vitest**; environment `jsdom` by default; Node tests with `/* @vitest-environment node */`.
- Setup: `vitest.setup.ts` mocks analytics, `server-only`, and Redis.
- UI tests: prefer behavior tests; mock Radix primitives and TRPC/React Query as needed.
- Server tests: hoisted ESM mocks; unique cache domains; reset Redis between tests.
- New tests:
  - `server/services/screenshot.test.ts` mocks puppeteer and UploadThing storage.
  - `lib/storage.test.ts` covers upload helpers.

## Security & Configuration
- Keep secrets in `.env.local`
- Review `server/trpc.ts` when extending routers
- Validate all external inputs with Zod
- Use `server-only` imports for sensitive modules
