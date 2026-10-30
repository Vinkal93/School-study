/**
 * Configuration Schemas and Validation Types
 * Part of Phase 2: Centralized Configuration System
 */

export interface PublicClientConfig {
  siteUrl: string;
  appUrl: string;
  isProduction: boolean;
  paymentGatewayLive: boolean;
  analytics: {
    gaMeasurementId?: string;
  };
  sentry: {
    dsn?: string;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  razorpay: {
    keyId?: string;
  };
}

export interface ServerConfig {
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  cronSecret?: string;
  backupCronSecret?: string;
  nextAuthSecret?: string;
  encryptionKey?: string;
  firebaseAdmin: {
    isConfigured: boolean;
    projectId: string;
    clientEmail?: string;
    privateKey?: string;
    source: "service_account_key" | "discrete_vars" | "credential_file" | "emulator" | "none";
  };
  razorpay: {
    isConfigured: boolean;
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
  };
  communication: {
    twilio: {
      isConfigured: boolean;
      accountSid?: string;
      authToken?: string;
      whatsappFrom?: string;
      smsFrom?: string;
    };
    email: {
      provider: string;
      apiKey?: string;
      senderAddress: string;
      senderName: string;
    };
    encryptionKey?: string;
  };
  ai: {
    geminiKey?: string;
    openaiKey?: string;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  missingRequired: string[];
  warnings: string[];
}

/**
 * Safely masks secret values for logging / diagnostics.
 */
export function maskSecret(val?: string | null, keepChars: number = 4): string {
  if (!val || typeof val !== "string") return "(not set)";
  const trimmed = val.trim();
  if (trimmed.length <= keepChars * 2) return "********";
  return `${trimmed.substring(0, keepChars)}...${trimmed.substring(trimmed.length - keepChars)}`;
}
