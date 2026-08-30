import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header for security and payload reduction
  poweredByHeader: false,

  // Enable gzip/brotli compression
  compress: true,

  // Speed up compilation and optimize package tree-shaking
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "firebase",
      "next-themes",
    ],
  },

  // Disable React strict mode double renders in development for faster interaction
  reactStrictMode: false,
  // Production Security Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
