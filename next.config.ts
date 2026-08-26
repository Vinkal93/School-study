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
};

export default nextConfig;
