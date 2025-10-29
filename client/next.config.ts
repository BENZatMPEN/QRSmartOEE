import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ✅ Socket server (รันบนเครื่องจริง)
      {
        source: "/api-oee/:path*",
        // destination: "http://localhost:3100/api/:path*",
        destination: "http://host.docker.internal:3100/api/:path*",
        // 💡 ถ้าใช้ Linux ต้องเพิ่ม extra_hosts ใน docker-compose
      },

      // ✅ API (NestJS ใน docker-compose service: qrsmart-api)
      {
        source: "/api-qr/:path*",
        // destination: "http://localhost:8000/:path*",
        destination: "http://qrsmart-api:8000/:path*",
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
