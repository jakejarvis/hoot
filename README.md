# 🦉 Hoot - Domain Intelligence Tool

[Hoot.sh](https://hoot.sh) is a all-in-one app for exploring domain names. Easily search for any domain (like [`github.com`](https://hoot.sh/github.com)) and get instant insights including WHOIS info, DNS records, SSL certificates, HTTP headers, hosting details, and geolocation.

![Screenshot of Hoot domain analysis page for GitHub.com](https://github.com/user-attachments/assets/fa82ad38-7af3-46f6-94a2-901e45c12af1)

---

## 🚀 Features

- **Super Simple Search:** Enter any domain name and instantly view everything you need.
- **Comprehensive Reports:** See registration info, hosting & email, DNS records, SSL certificates, and HTTP headers.
- **Interactive UI:** Expand/collapse sections, copy data, and enjoy beautiful dark mode.
- **Fast & Private:** Data is fetched live, with caching for speed—no sign-up required.
- **Favicons & Screenshots:** Extract favicons and capture homepage screenshots, cached on UploadThing for quick reuse.

---

## 🛠️ Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **tRPC** API endpoints
- **Upstash Redis** for caching
- **UploadThing** for favicon & screenshot storage
- **rdapper** for RDAP registration lookups with WHOIS fallback
- **Puppeteer** for server-side screenshots
- **Mapbox** for embedded IP geolocation maps
- **PostHog** for product analytics
- **Biome** linting and formatting

---

## 🌱 Getting Started

1. **Clone & install dependencies:**  
   ```bash
   git clone https://github.com/jakejarvis/hoot.git
   cd hoot
   pnpm install
   ```

2. **Start the dev server:**  
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **(Optional) Configure `.env.local`:**  
   See `.env.example` for Redis and UploadThing credentials (needed for caching and favicon/screenshot features).

---

## 🔄 v2 Cutover: Postgres + Drizzle + Inngest

- **Primary store**: Postgres (Neon). All domain sections persist to tables in `server/db/schema.ts` via Drizzle.
- **Drizzle**: Schema/migrations in `drizzle/`. Config in `drizzle.config.ts`. Client at `server/db/client.ts`.
- **Redis role**: Short-lived locks, rate limiting, and image/report caches only (no primary data). See `lib/cache.ts`, `lib/report-cache.ts`.
- **Background jobs (Inngest)**:
  - `app/api/inngest/route.ts` serves functions.
  - `section-revalidate`: re-fetch a section for a domain.
  - `domain-inspected`: fans out per-section revalidation.
  - `scan-due`: cron to enqueue revalidations for stale rows.
- **TTL & freshness**: Policies in `server/db/ttl.ts`. Each service reads from Postgres first and revalidates when stale.
- **Services**: `server/services/*` now read/write Postgres via repos in `server/repos/*`.

### Environment
- `DATABASE_URL` (required)
- Redis/UploadThing/PostHog remain as before (see `.env.example`).

### Commands
```bash
# Drizzle
pnpm drizzle:generate
pnpm drizzle:migrate

# Dev / checks / tests
pnpm dev
pnpm lint
pnpm typecheck
pnpm test:run
```

### Notes
- Provider catalog is seeded from `lib/providers/rules/*` via `server/db/seed/providers.ts`.
- Trigram search enabled via `pg_trgm` migration in `drizzle/`.
- No back-compat/migration from Redis snapshots; v2 is a clean switch.

---

## 📜 License

[MIT](LICENSE)

Owl logo by [Jordy Madueño](https://thenounproject.com/creator/jordymadueno/) from [Noun Project](https://thenounproject.com/) (CC BY 3.0).
