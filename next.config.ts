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
  experimental: {
    // Community video uploads (up to 50 MB) pass through middleware, which buffers 10 MB by default.
    proxyClientMaxBodySize: '55mb',
  },
  images: {
    remotePatterns: Array.from(new Set(imageHosts)).map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async redirects() {
    return [
      // The rota was renamed "Staff schedule"; keep old links and bookmarks working.
      { source: "/business/rota", destination: "/business/staff-schedule", permanent: true },
      // Requests and jobs (quote requests, home-visit jobs) are for solo providers, not multi-staff businesses.
      { source: "/business/requests", destination: "/business/bookings", permanent: false },
      { source: "/business/requests/:path*", destination: "/business/bookings", permanent: false },
      { source: "/business/jobs", destination: "/business/bookings", permanent: false },
      { source: "/business/jobs/:path*", destination: "/business/bookings", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
