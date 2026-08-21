import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.231.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
