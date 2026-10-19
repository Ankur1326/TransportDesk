import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headless Chromium for the LR PDF route: keep both packages out of the
  // bundle and make sure the compressed Chromium binary ships with the route.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/consignments/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  // The old single-company marketing pages no longer exist; keep their links working.
  async redirects() {
    return [
      { source: "/services", destination: "/features", permanent: true },
      { source: "/fleet", destination: "/features", permanent: true },
      { source: "/quote", destination: "/sign-up", permanent: true },
      { source: "/track", destination: "/", permanent: true },
      { source: "/payment", destination: "/", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;