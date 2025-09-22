# 🦉 Hoot - Domain Intelligence Tool

[Hoot.sh](https://hoot.sh) is a all-in-one app for exploring domain names. Easily search for any domain (like [`github.com`](https://hoot.sh/github.com)) and get instant insights including WHOIS info, DNS records, SSL certificates, HTTP headers, hosting details, and geolocation.

![Screenshot of Hoot domain analysis page for GitHub.com](https://github.com/user-attachments/assets/fa82ad38-7af3-46f6-94a2-901e45c12af1)

---

## 🚀 Features

- **Super Simple Search:** Enter any domain name and instantly view everything you need.
- **Comprehensive Reports:** See registration info, hosting & email, DNS records, SSL certificates, and HTTP headers.
- **Interactive UI:** Expand/collapse sections, copy data, and enjoy beautiful dark mode.
- **Fast & Private:** Data is fetched live, with caching for speed—no sign-up required.

---

## 🛠️ Tech Stack

- **Next.js 15** with Turbopack
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **tRPC** API endpoints
- **Upstash Redis** for caching
- **Vercel Blob** for favicon storage

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
   See `.env.example` for Upstash Redis and Vercel Blob credentials (needed for caching and favicon features).

---

## 🙋‍♂️ About

Made with ❤️ by [@jakejarvis](https://github.com/jakejarvis). [Licensed under MIT.](LICENSE) Owl logo by Jordy Matsuoka from Noun Project (CC BY 3.0).
