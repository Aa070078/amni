import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@amni/ui", "@amni/shared"],
  reactStrictMode: true,
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  devIndicators: false,
  async redirects() {
    return [{ source: "/sales/crm/:path*", destination: "/crm/:path*", permanent: true }];
  },
  async rewrites() {
    // Local preview proxy: forward /api/v1/* to the NestJS API (same-origin for tunnels).
    return [
      { source: "/crm/:path*", destination: "/sales/crm/:path*" },
      { source: "/api/v1/:path*", destination: `${process.env.API_PROXY_TARGET ?? "http://localhost:4000"}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
