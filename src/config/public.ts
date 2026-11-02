/**
 * Client-Safe Public Configuration
 * Part of Phase 2: Centralized Configuration System
 * 
 * This module can be imported anywhere (Client or Server).
 * It NEVER includes private keys, database credentials, or secret tokens.
 */

import type { PublicClientConfig, ConfigValidationResult } from "./schema";

export function getPublicConfig(): PublicClientConfig {
  const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);

  const siteUrl = env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_APP_URL || "https://school.sbci.online";

  return {
    siteUrl,
    appUrl: env.NEXT_PUBLIC_APP_URL || siteUrl,
    isProduction: env.NODE_ENV === "production",
    paymentGatewayLive: env.NEXT_PUBLIC_PAYMENT_GATEWAY_LIVE === "true",
    analytics: {
      gaMeasurementId: env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined,
    },
    sentry: {
      dsn: env.NEXT_PUBLIC_SENTRY_DSN || undefined,
    },
    firebase: {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAXjKi7fCJrjT6NERRM4OaKIAyT8jRFqAw",
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "school-study-c8991.firebaseapp.com",
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991",
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "school-study-c8991.firebasestorage.app",
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "108412631999",
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:108412631999:web:9c8af9689a884d29b4ff0a",
    },
    razorpay: {
      keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID || undefined,
    },
  };
}

export function validatePublicConfig(): ConfigValidationResult {
  const cfg = getPublicConfig();
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!cfg.firebase.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!cfg.firebase.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!cfg.firebase.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");

  if (!cfg.razorpay.keyId) {
    warnings.push("NEXT_PUBLIC_RAZORPAY_KEY_ID is missing; online fee checkout will be unavailable.");
  }

  return {
    isValid: missing.length === 0,
    missingRequired: missing,
    warnings,
  };
}

export const publicConfig = getPublicConfig();
