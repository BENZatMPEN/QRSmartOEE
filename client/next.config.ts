import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ✅ Proxy WebSocket ไปที่ OEE หลัก
      {
        source: "/api-oee/:path*",
        destination: "http://host.docker.internal:3010/:path*",
      },
      // ✅ Proxy API ไปที่ QR API
      {
        source: "/api-qr/:path*",
        destination: "http://qrsmart-api:8000/:path*",
      },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
