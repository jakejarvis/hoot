# 📚 [Domainstack](https://domainstack.io) - Domain Intelligence Tool

[Domainstack](https://domainstack.io) is an all-in-one app for exploring domain names. Search any domain (e.g., [`github.com`](https://domainstack.io/github.com)) and get instant insights including WHOIS/RDAP lookups, DNS records, SSL certificates, HTTP headers, hosting details, geolocation, and SEO signals.

![Screenshot of Domainstack domain analysis page for GitHub.com](https://github.com/user-attachments/assets/5a13d2c5-2d1c-4f70-bc52-a2742d43ebc6)

---

## 🚀 Features

- **Instant domain reports**: Registration, DNS, certificates, HTTP headers, hosting & email, and geolocation.
- **SEO insights**: Extract titles, meta tags, social previews, canonical data, and `robots.txt` signals.
- **Screenshots & favicons**: Server-side screenshots and favicon extraction, cached in Cloudflare R2.
- **Fast, private, no sign-up**: Live fetches with smart caching.
- **Reliable data pipeline**: Postgres persistence (Drizzle), background revalidation (Inngest), and Redis for short-lived caching/locks.

---

## 🛠️ Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **tRPC** API
- **Postgres** + **Drizzle ORM**
- **Inngest** for background jobs and scheduled revalidation
- **Upstash Redis** for caching, rate limits, and locks
- **Cloudflare R2** (S3 API) for favicon/screenshot storage
- [**rdapper**](https://github.com/jakejarvis/rdapper) for RDAP lookups with WHOIS fallback
- **Puppeteer** (with `@sparticuz/chromium` on server) for screenshots
- **Mapbox** for IP geolocation maps
- **PostHog** analytics
- **Vitest** for testing and **Biome** for lint/format

---

## 🌱 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/jakejarvis/domainstack.io.git
cd domainstack.io
pnpm install
```

### 2. Configure environment variables

Create `.env.local` (used by `pnpm dev`):

```env
# --- Database (local) ---
# TCP URL used by Drizzle CLI & direct TCP usage
DATABASE_URL=postgres://postgres:postgres@localhost:5432/main

# --- Redis (local via SRH) ---
# SRH mimics Upstash REST locally; point your app’s Upstash client here.
KV_REST_API_URL=http://localhost:8079
KV_REST_API_TOKEN=dev-token

# --- Inngest Dev Server ---
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:8288
# If your Inngest handler lives at a custom route, set:
INNGEST_SERVE_PATH=/api/inngest
```

### 3. Start local dev services (Docker)

We provide a single [`docker-compose.yml`](docker-compose.yml) and a helper script ([`start-dev-infra.sh`](scripts/start-dev-infra.sh)) that boots all services and waits for them to be ready:

- **Postgres** on `localhost:5432`
- **Neon wsproxy** on `localhost:5433` (WebSocket proxy used by the Neon serverless driver)
- **Redis** on `localhost:6379`
- **Serverless Redis HTTP (SRH)** on `http://localhost:8079` (Upstash-compatible REST proxy)
- **Inngest Dev Server** on `http://localhost:8288`

Run:

```bash
pnpm dev:start-docker
```

> On Linux, if `host.docker.internal` isn’t available, add `extra_hosts` to the Inngest service in `docker-compose.yml`:
>
> ```yaml
> extra_hosts: ["host.docker.internal:host-gateway"]
> ```

### 4. Run Drizzle database migrations & seeds

```bash
pnpm db:generate   # generate SQL from schema
pnpm db:migrate    # apply migrations to local Postgres
pnpm db:seed:providers  # seed known providers in lib/providers/rules/
```

### 5. Start the Next.js dev server

Run in a second terminal window:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

The Inngest Dev UI will be available at [http://localhost:8288](http://localhost:8288) and is already configured to call the local Next.js server at `http://localhost:3000/api/inngest`.

---

## 🧰 Useful Commands

```bash
pnpm dev                  # start dev server (uses .env.development.local)
pnpm dev:start-docker     # start Dockerized local services and wait until ready
pnpm lint                 # Biome lint/format checks
pnpm typecheck            # tsc --noEmit
pnpm test:run             # Vitest

# Drizzle
pnpm db:generate    # generate SQL migrations from schema
pnpm db:migrate     # apply db migrations
pnpm db:studio      # open Drizzle Studio against your current env URL
pnpm db:seed:providers
```

---

## 📜 License

[MIT](LICENSE)

Toybrick by Ary Prasetyo from [Noun Project](https://thenounproject.com/browse/icons/term/toybrick/) (CC BY 3.0)
