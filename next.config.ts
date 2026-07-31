import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.231.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
