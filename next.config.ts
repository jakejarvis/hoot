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
        hostname: "www.google.com",
        pathname: "/s2/favicons",
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
