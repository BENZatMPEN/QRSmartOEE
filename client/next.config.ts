import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ✅ Proxy WebSocket (Socket.IO) ไปยัง SmartOEE API
      {
        source: "/socket.io/:path*",
        destination: "http://host.docker.internal:3010/socket.io/:path*",
      },
      // ✅ Proxy REST API ไปยัง SmartOEE API
      {
        source: "/api-oee/:path*",
        destination: "http://host.docker.internal:3010/api/:path*",
      },
      // ✅ Proxy REST API ของ QR API
      {
        source: "/api-qr/:path*",
        destination: "http://qrsmart-api:8000/:path*",
      },
    ];
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
