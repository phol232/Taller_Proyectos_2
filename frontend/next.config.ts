import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" solo para Docker; Vercel y Cloudflare Pages gestionan su propio build
  ...(process.env.VERCEL || process.env.CF_PAGES ? {} : { output: "standalone" }),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;


