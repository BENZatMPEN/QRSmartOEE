import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-oee/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_OEE_API_URL ||
          "http://host.docker.internal:3010"
        }/api/:path*`,
      },
      {
        source: "/api-qr/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_QR_API_URL || "http://qrsmart-api:8000"
        }/:path*`,
      },
    ];
  },

  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
