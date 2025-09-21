# Hoot - Domain Inspection Tool

Hoot is a Next.js application that provides comprehensive domain analysis including WHOIS data, DNS records, SSL certificates, HTTP headers, hosting information, and geolocation. The app uses React 19, Next.js 15 with Turbopack, TypeScript, Tailwind CSS v4, tRPC, and integrates with Upstash Redis and Vercel Blob for caching and storage.

**Always reference these instructions first and only fallback to search or bash commands when you encounter unexpected information that does not match what is documented here.**

## Working Effectively

Bootstrap, build, and test the repository:
- Install pnpm globally: `npm install -g pnpm`
- Install dependencies: `pnpm install` -- takes 10 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
- Typecheck the code: `pnpm typecheck` -- takes 8 seconds but has known leaflet icon import errors (non-blocking).
- Lint the code: `pnpm lint` -- takes 1 second and passes cleanly.
- Format the code: `pnpm format` -- takes 1 second and passes cleanly.
- Build production bundle: `pnpm build` -- takes 49 seconds. NEVER CANCEL. Set timeout to 900+ seconds.
- Start development server: `pnpm dev` -- starts in 1.2 seconds at http://localhost:3000
- Production server: `pnpm start` -- has known routing issues, use dev server for testing.

## Validation

- Always manually validate any changes by running `pnpm dev` and testing the application in browser.
- ALWAYS test both the homepage domain search functionality and the domain analysis pages (e.g., /example.com).
- Key user scenarios to test after making changes:
  1. Homepage loads with animated hero text and domain search form
  2. Enter domain (e.g., "example.com") and click "Analyze" 
  3. Domain analysis page loads with Registration, Hosting & Email, DNS Records, SSL Certificates, and HTTP Headers sections
  4. Sections expand/collapse and data loads via tRPC queries
- Always run `pnpm format` and `pnpm lint` before committing or the build may fail.
- Test with domains like: google.com, github.com, cloudflare.com for comprehensive validation.

## System Requirements

- Node.js >=22.x (works with 20.19.5 but shows warnings)
- pnpm 10.17.0+ (install with `npm install -g pnpm`)
- No additional system dependencies required

## Project Structure

- `app/` - Next.js App Router with server components (add `"use client"` only when needed)
  - `page.tsx` - Homepage with domain search
  - `[domain]/page.tsx` - Dynamic domain analysis pages
  - `globals.css` - Tailwind v4 styles
- `components/` - Reusable UI components (kebab-case files, PascalCase exports)
  - `ui/` - Base UI primitives
  - `domain/` - Domain-specific components
- `server/` - Backend logic and tRPC routers
  - `services/` - DNS, WHOIS, TLS, headers, favicon services
  - `routers/` - tRPC API endpoints
- `lib/` - Shared utilities and helpers (use `@/...` imports)
- `hooks/` - React hooks
- `.env.example` - Environment variable template

## Configuration

Create `.env.local` for local development with:
```bash
# Optional: PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Required for caching: Upstash Redis
KV_REST_API_TOKEN=
KV_REST_API_URL=

# Required for favicon storage: Vercel Blob
BLOB_READ_WRITE_TOKEN=
FAVICON_BLOB_SIGNING_SECRET=
```

## Common Tasks

The application works without environment variables but caching and favicon features require Upstash and Vercel Blob credentials.

### Working with Domain Services
- DNS resolution uses multiple DoH providers (Cloudflare, Google, Quad9)
- WHOIS data comes from `whoiser` package 
- TLS certificate info uses Node.js built-in `tls` module
- HTTP headers fetched with custom timeout/retry logic
- All services include caching via `lib/cache` Redis abstraction

### Key Files to Check When Making Changes
- `server/trpc.ts` - Main tRPC router configuration
- `lib/cache/` - Caching primitives for external API calls
- `components/domain/domain-report-view.tsx` - Main domain analysis UI
- `server/services/` - Individual service implementations

### Known Issues
- TypeScript shows import errors for leaflet icon files (non-blocking)
- Production server (`pnpm start`) has routing issues - use dev server for testing
- PostHog and Vercel Analytics may show console errors without proper configuration

### Build Output
Production build creates:
- Static homepage (○)  
- Dynamic domain pages (◐ Partial Prerender)
- tRPC API routes (ƒ Dynamic)
- Middleware for request handling

### Deployment
The application is designed for Vercel deployment with:
- Automatic Upstash Redis integration
- Vercel Blob for favicon storage
- PostHog analytics integration
- Edge runtime for optimal performance

## Tips for Developers

- Use `@/...` imports to avoid deep relative paths
- Keep TypeScript modules under 300 LOC
- Prefer server components, add `"use client"` only when interaction is needed
- 2-space indentation, kebab-case files, PascalCase component exports
- All external API calls should use the retry/timeout patterns from existing services
- Test domain analysis with various domain types (personal, corporate, CDN-hosted)