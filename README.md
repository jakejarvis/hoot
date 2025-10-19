# 📚 [Domainstack](https://domainstack.io) - Domain Intelligence Tool

[Domainstack](https://domainstack.io) is an all‑in‑one app for exploring domain names. Search any domain (e.g., [`github.com`](https://domainstack.io/github.com)) and get instant insights including WHOIS/RDAP lookups, DNS records, SSL certificates, HTTP headers, hosting details, geolocation, and SEO signals.

![Screenshot of Domainstack domain analysis page for GitHub.com](https://github.com/user-attachments/assets/5a13d2c5-2d1c-4f70-bc52-a2742d43ebc6)

---

## 🚀 Features

- **Instant domain reports**: Registration, DNS, certificates, HTTP headers, hosting & email, and geolocation.
- **SEO insights**: Extract titles, meta tags, social previews, canonical data, and `robots.txt` signals.
- **Screenshots & favicons**: Server-side screenshots and favicon extraction, cached via UploadThing.
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
- **UploadThing** for favicon/screenshot storage
- [**rdapper**](https://github.com/jakejarvis/rdapper) for RDAP lookups with WHOIS fallback
- **Puppeteer** (with `@sparticuz/chromium` on server) for screenshots
- **Mapbox** for IP geolocation maps
- **PostHog** analytics
- **Vitest** for testing and **Biome** for lint/format

---

## 🌱 Getting Started

1. Clone & install:
```bash
git clone https://github.com/jakejarvis/domainstack.io.git
cd domainstack.io
pnpm install
```

2. Configure environment (see `.env.example`)

3. Run database migrations:
```bash
pnpm db:migrate
# Seed known providers in `lib/providers/rules/`
pnmm db:seed:providers
```

4. Run dev server:
```bash
pnpm dev
```
Open http://localhost:3000

---

## 🧰 Useful Commands

```bash
pnpm dev # start dev server
pnpm lint # Biome lint/format checks
pnpm typecheck # tsc --noEmit
pnpm test:run # Vitest
```

---

## 📜 License

[MIT](LICENSE)

Toybrick by Ary Prasetyo from [Noun Project](https://thenounproject.com/browse/icons/term/toybrick/) (CC BY 3.0)
