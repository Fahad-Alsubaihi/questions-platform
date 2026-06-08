import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "pg",
    "pg-pool",
    "better-auth",
    "@tavily/core",
  ],
};

export default nextConfig;
