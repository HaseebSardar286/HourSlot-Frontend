import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-c3cf41ff651b40069ed1245ae1b0fad7.r2.dev',
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
