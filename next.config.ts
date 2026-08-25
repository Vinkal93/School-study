import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Speed up compilation and bundling
  experimental: {
    optimizePackageImports: ["lucide-react", "clsx", "tailwind-merge", "firebase"],
  },
  // Disable react strict mode double renders in development if desired for faster renders
  reactStrictMode: false,
};

export default nextConfig;
