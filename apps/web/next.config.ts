import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@amni/ui", "@amni/shared"],
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
