import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ✅ Proxy REST API ไปยัง SmartOEE API (เฉพาะ HTTP)
      {
        source: "/api-oee/:path*",
        destination: "http://host.docker.internal:3010/api/:path*",
      },

      // ✅ Proxy REST API ของ QR API (ทำงานใน docker)
      {
        source: "/api-qr/:path*",
        destination: "http://qrsmart-api:8000/:path*",
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
