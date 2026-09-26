import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages Next.js functions from the standard trace output. Keep
  // standalone output for the Docker/AWS Lambda image only.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.231.1"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Study material uploads are capped at 10 MB in the domain rules; leave
      // headroom for multipart overhead. Vercel and Lambda request limits still apply.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
