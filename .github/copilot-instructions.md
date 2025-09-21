# Hoot - Domain Analysis Tool

Hoot is a Next.js web application that provides comprehensive domain analysis including WHOIS data, DNS records, SSL certificates, hosting information, and HTTP headers. The app uses tRPC for type-safe APIs, Upstash Redis for caching, and PostHog for analytics.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Prerequisites & Setup
- Install Node.js 20+ (project requires Node.js 22+ but works with 20+)
- Install pnpm globally: `npm install -g pnpm`
- Set up environment variables: `cp .env.example .env.local` (optional for basic development)

### Essential Commands
- **Install dependencies**: `pnpm install` -- takes ~12 seconds
- **Development server**: `pnpm dev` -- starts in ~1.1 seconds at http://localhost:3000. NEVER CANCEL.
- **Build**: `pnpm build` -- takes ~43 seconds. NEVER CANCEL. Set timeout to 60+ minutes.
- **Type checking**: `pnpm typecheck` -- takes ~7 seconds (has known image import errors, non-blocking)
- **Linting**: `pnpm lint` -- takes <1 second using Biome
- **Formatting**: `pnpm format` -- takes <1 second using Biome
- **Production server**: `pnpm start` -- CURRENTLY BROKEN due to Next.js canary bug with routesManifest.dataRoutes

### Build and Test Validation
- **CRITICAL**: NEVER CANCEL build commands. Build takes ~43 seconds but set timeout to 60+ minutes for safety.
- Always run `pnpm install` first in a fresh clone
- Always run `pnpm lint` and `pnpm format` before committing changes
- Type checking will show errors for missing image types in `components/domain/hosting-map.tsx` - these are non-blocking
- Build succeeds despite typecheck errors (Next.js skips validation during build)

## Manual Validation Scenarios

After making changes, always test these user scenarios:

### Core Functionality Test
1. Start dev server: `pnpm dev`
2. Navigate to http://localhost:3000
3. Test domain search:
   - Enter "google.com" in the search box
   - Click "Analyze" button
   - Verify page navigates to /google.com
   - Wait for all sections to load (Registration, Hosting & Email, DNS Records, SSL Certificates, HTTP Headers)
   - Verify Export JSON button becomes enabled
   - Test the search bar in header works for new domain searches

### Additional Validation Scenarios
- Test homepage hero animation cycles through different domain-related terms
- Test theme toggle (light/dark mode) works correctly
- Test responsive design on different screen sizes
- Verify external links in footer open correctly
- Test error handling with invalid domain names (e.g., "invalid..domain")

## Repository Structure & Navigation

### Key Directories
- **`app/`** - Next.js App Router pages and API routes
  - `app/page.tsx` - Homepage with domain search form
  - `app/[domain]/page.tsx` - Dynamic domain analysis page
  - `app/api/trpc/[trpc]/route.ts` - tRPC API endpoint
  - `app/api/favicon/route.ts` - Favicon fetching API
- **`server/`** - Backend services and tRPC routers
  - `server/routers/` - tRPC procedure definitions
  - `server/services/` - Core services (DNS, WHOIS, TLS, headers, hosting)
  - `server/analytics/` - PostHog analytics integration
- **`components/`** - Reusable UI components (kebab-case files, PascalCase exports)
  - `components/domain/` - Domain-specific components
  - `components/ui/` - Generic UI primitives
- **`lib/`** - Shared utilities and helpers
  - `lib/providers/` - Provider detection logic
  - `lib/redis.ts` - Upstash Redis caching utilities
- **`hooks/`** - Custom React hooks

### Important Files
- **`AGENTS.md`** - Repository guidelines (read this for coding standards)
- **`biome.json`** - Biome configuration for linting and formatting
- **`tsconfig.json`** - TypeScript configuration with strict mode
- **`package.json`** - Dependencies and scripts
- **`.env.example`** - Environment variable template

## Core Services & APIs

### Domain Analysis Services (server/services/)
- **DNS Resolution** (`dns.ts`) - Resolves A, AAAA, MX, CNAME, TXT, NS records
- **WHOIS/RDAP** (`rdap.ts`) - Fetches registration information
- **TLS Certificates** (`tls.ts`) - Retrieves SSL certificate details
- **HTTP Headers** (`headers.ts`) - Probes server headers and security info
- **Hosting Detection** (`hosting.ts`) - Identifies hosting providers and geolocation
- **Favicon Service** (`favicon.ts`) - Fetches and processes domain favicons

### tRPC API Structure
- **Domain Router** (`server/routers/domain.ts`) - Main domain analysis procedures
- All procedures use caching via `lib/redis.ts` for performance
- Error handling and retry logic built into service layer

## Environment Configuration

### Required for Full Functionality
```bash
# PostHog Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Upstash Redis (required for caching)
KV_REST_API_TOKEN=your_upstash_token
KV_REST_API_URL=your_upstash_url
```

### Development without Environment Variables
- App runs without analytics (PostHog warnings in console are normal)
- App runs without Redis caching (all data fetched fresh each time)
- All core functionality works without environment variables

## Coding Standards & Best Practices

### Follow AGENTS.md Guidelines
- Use TypeScript with strict mode
- 2-space indentation 
- Kebab-case files, PascalCase exports
- Server components by default, add `"use client"` only when needed
- Use `@/...` imports to avoid relative paths
- Keep modules under ~300 LOC

### Common Patterns
- **Server actions**: Delegate logic from page components to server utilities
- **Error boundaries**: Use React error boundaries for robust error handling  
- **Caching**: Use `lib/redis.ts` utilities for consistent caching patterns
- **Type safety**: Leverage tRPC for end-to-end type safety

## Known Issues & Troubleshooting

### Build Issues
- **TypeScript errors on image imports**: Non-blocking, build succeeds anyway
- **Production server fails**: Next.js canary bug with `routesManifest.dataRoutes` - use dev server instead

### Development Issues
- **PostHog warnings**: Normal when NEXT_PUBLIC_POSTHOG_KEY not set
- **Upstash errors**: Normal when KV_REST_API_* vars not set, caching disabled
- **Node version warning**: App works with Node 20+ despite preferring 22+

### Performance Notes
- DNS queries may take 2-5 seconds depending on domain
- WHOIS/RDAP queries can take 3-10 seconds
- TLS certificate fetching typically takes 1-3 seconds
- All queries run in parallel for better UX

## Testing Changes

### Before Committing
1. Run `pnpm lint` - must pass without errors
2. Run `pnpm format` - auto-fixes formatting  
3. Run `pnpm typecheck` - warnings acceptable, errors should be investigated
4. Test build: `pnpm build` - must complete successfully
5. Manual validation: Test domain search functionality end-to-end

### CI/CD Considerations
- No GitHub Actions workflows currently configured
- Deployment typically handled via Vercel
- Build must succeed for deployment
- All linting must pass

## Frequently Used Commands Output

### Repository Root Structure
```
.env.example          # Environment template
.git/                 # Git repository
.gitignore           # Git ignore rules
AGENTS.md            # Repository guidelines
README.md            # Basic Next.js info
app/                 # Next.js pages and APIs
biome.json           # Linter/formatter config  
components/          # React components
components.json      # shadcn/ui config
hooks/               # Custom React hooks
instrumentation-client.ts  # PostHog client setup
lib/                 # Shared utilities
middleware.ts        # Next.js middleware
next.config.ts       # Next.js configuration
package.json         # Dependencies and scripts
pnpm-lock.yaml       # Dependency lockfile
pnpm-workspace.yaml  # Monorepo config
postcss.config.mjs   # PostCSS config
server/              # Backend services
tsconfig.json        # TypeScript config
vercel.json          # Vercel deployment config
```

### Package.json Scripts
```json
{
  "dev": "next dev --turbo",
  "build": "next build", 
  "start": "next start",
  "lint": "biome check",
  "format": "biome format --write",
  "typecheck": "tsc --noEmit"
}
```