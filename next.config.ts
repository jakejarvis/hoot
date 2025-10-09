import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    ppr: "incremental",
    staleTimes: {
      dynamic: 0, // disable client-side router cache for dynamic pages
    },
  },
  rewrites: async () => {
    return [
      {
        source: "/_proxy/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/_proxy/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/healthz",
        destination: "/api/healthz",
      },
    ];
  },
  headers: async () => {
    return process.env.VERCEL_ENV === "production"
      ? [
          {
            source: "/:path*",
            headers: [
              {
                key: "Content-Security-Policy-Report-Only",
                value: `
                  default-src 'self';
                  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.posthog.com https://vercel.live https://vitals.vercel-insights.com;
                  style-src 'self' 'unsafe-inline' https://vercel.live;
                  img-src 'self' https://f2zros4g9k.ufs.sh https://vercel.live https://vercel.com data: blob:;
                  font-src 'self' https://vercel.live https://assets.vercel.com;
                  object-src 'none';
                  connect-src 'self' https://*.posthog.com https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com https://vercel.live https://vitals.vercel-insights.com https://*.pusher.com wss://*.pusher.com;
                  worker-src 'self' data: blob:;
                  child-src 'self' blob:;
                  frame-src 'self' https://vercel.live;
                  frame-ancestors 'none';
                  form-action 'self';
                  base-uri 'self';
                  ${
                    process.env.NEXT_PUBLIC_POSTHOG_KEY
                      ? `report-uri https://us.i.posthog.com/report/?token=${process.env.NEXT_PUBLIC_POSTHOG_KEY}; report-to posthog`
                      : ""
                  }
                `
                  .replace(/\s{2,}/g, " ")
                  .trim(),
              },
              {
                key: "Reporting-Endpoints",
                value: process.env.NEXT_PUBLIC_POSTHOG_KEY
                  ? `posthog="https://us.i.posthog.com/report/?token=${process.env.NEXT_PUBLIC_POSTHOG_KEY}"`
                  : "",
              },
            ],
          },
        ]
      : [];
  },
  skipTrailingSlashRedirect: true,
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY as string,
  envId: process.env.POSTHOG_ENV_ID as string,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  sourcemaps: {
    enabled: true,
  },
});
