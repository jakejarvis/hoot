import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icons.duckduckgo.com",
        pathname: "/ip3/**",
      },
    ],
  },
  experimental: {
    reactCompiler: true,
    inlineCss: true,
    staleTimes: {
      dynamic: 0, // disable client-side router cache for dynamic pages
    },
  },
};

export default nextConfig;
