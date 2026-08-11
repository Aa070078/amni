import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@amni/ui", "@amni/shared"],
  reactStrictMode: true,
  output: "standalone",
  devIndicators: false,
  async rewrites() {
    // Local preview proxy: forward /api/v1/* to the NestJS API (same-origin for tunnels).
    return [{ source: "/api/v1/:path*", destination: `${process.env.API_PROXY_TARGET ?? "http://localhost:4000"}/api/v1/:path*` }];
  },
};

export default nextConfig;
