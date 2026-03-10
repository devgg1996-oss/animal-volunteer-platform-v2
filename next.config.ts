import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
