import type { NextConfig } from "next";

// Where the Spring Boot API lives. Set BACKEND_URL (build/runtime env) per deployment.
const backendUrl = (process.env.BACKEND_URL || "http://localhost:8090").replace(/\/+$/, "");

// Optional extra image host (e.g. your R2 public bucket host), without protocol.
const imageHosts = [
  "images.unsplash.com",
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS || "pub-c3cf41ff651b40069ed1245ae1b0fad7.r2.dev")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: Array.from(new Set(imageHosts)).map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
