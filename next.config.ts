import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8090/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8090/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
