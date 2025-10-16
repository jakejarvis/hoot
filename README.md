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

2. **Start local Redis (optional but recommended):**  
   For local development with caching and screenshot features, start Redis with Docker Compose:
   ```bash
   docker compose up -d
   ```
   This starts a Redis server and Upstash-compatible REST proxy at `http://localhost:8079`.

3. **Configure `.env.local`:**  
   Copy `.env.example` to `.env.local` and configure:
   ```bash
   cp .env.example .env.local
   ```
   
   For local development with docker-compose Redis:
   ```env
   KV_REST_API_URL=http://localhost:8079
   KV_REST_API_TOKEN=local_dev_token
   ```
   
   See `.env.example` for other optional credentials (UploadThing for favicon/screenshot storage, Mapbox for maps, PostHog for analytics).

4. **Start the dev server:**  
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License

[MIT](LICENSE)

Owl logo by [Jordy Madueño](https://thenounproject.com/creator/jordymadueno/) from [Noun Project](https://thenounproject.com/) (CC BY 3.0).
