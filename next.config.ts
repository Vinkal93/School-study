import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local verification builds separate from the running development server.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
  // Disable x-powered-by header for security and payload reduction
  poweredByHeader: false,

  // Prevent serverless bundler crashes with firebase-admin and native modules
  serverExternalPackages: ["firebase-admin"],
  turbopack: {
    resolveAlias: {"@/lib/firebase/admin": {browser:"./src/lib/firebase/admin.browser.ts"}},
  },


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

  // Allow both localhost and 127.0.0.1 during local development
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // Production Security Headers
  async headers() {
    return [
      ...["admin", "teacher", "student", "super-admin", "billing", "api", "setup-super-admin", "su"].map((segment) => ({
        source: `/${segment}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
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
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },


};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sbci",

  project: "school-study",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
