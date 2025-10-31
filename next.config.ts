import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/**": ["node_modules/@sparticuz/chromium/bin/**"],
  },
  experimental: {
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
