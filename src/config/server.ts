/**
 * Server-Only Validated Configuration
 * Part of Phase 2: Centralized Configuration System
 * 
 * STRICT SECURITY RULE: This module must NEVER be imported into client components.
 */

import type { ServerConfig, ConfigValidationResult } from "./schema";
import { maskSecret } from "./schema";

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: Server configuration module cannot be loaded in client bundles.");
  }
}

export function getServerConfig(): ServerConfig {
  assertServerOnly();

  const env = process.env;
  const nodeEnv = (env.NODE_ENV || "development") as "development" | "production" | "test";
  const isProduction = nodeEnv === "production";

  // 1. Detect Firebase Admin Configuration Source
  let adminSource: ServerConfig["firebaseAdmin"]["source"] = "none";
  let clientEmail: string | undefined = undefined;
  let privateKey: string | undefined = undefined;

  const rawKey = env.FIREBASE_SERVICE_ACCOUNT_KEY || env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (rawKey && rawKey.trim()) {
    adminSource = "service_account_key";
    try {
      let json = rawKey.trim();
      if (!json.startsWith("{")) {
        json = Buffer.from(json, "base64").toString("utf-8");
      }
      const parsed = JSON.parse(json);
      clientEmail = parsed.client_email;
      privateKey = parsed.private_key;
    } catch {}
  } else if (
    (env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_ADMIN_CLIENT_EMAIL) &&
    (env.FIREBASE_PRIVATE_KEY || env.FIREBASE_ADMIN_PRIVATE_KEY)
  ) {
    adminSource = "discrete_vars";
    clientEmail = env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_ADMIN_CLIENT_EMAIL;
    privateKey = env.FIREBASE_PRIVATE_KEY || env.FIREBASE_ADMIN_PRIVATE_KEY;
  } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH || env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminSource = "credential_file";
  } else if (env.FIRESTORE_EMULATOR_HOST) {
    adminSource = "emulator";
  }

  const isFirebaseAdminConfigured =
    adminSource !== "none" ||
    Boolean(env.FIREBASE_CONFIG && env.FIREBASE_CONFIG.includes("client_email"));

  // 2. Razorpay Server Configuration
  const razorpayKeyId = env.RAZORPAY_KEY_ID || env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET;
  const razorpayWebhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  const isRazorpayConfigured = Boolean(razorpayKeyId && razorpayKeySecret);

  // 3. Twilio & Communication Configuration
  const twilioSid = env.TWILIO_ACCOUNT_SID;
  const twilioToken = env.TWILIO_AUTH_TOKEN;
  const isTwilioConfigured = Boolean(twilioSid && twilioToken);

  return {
    nodeEnv,
    isProduction,
    cronSecret: env.CRON_SECRET,
    backupCronSecret: env.BACKUP_CRON_SECRET,
    nextAuthSecret: env.NEXTAUTH_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    firebaseAdmin: {
      isConfigured: isFirebaseAdminConfigured,
      projectId: env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991",
      clientEmail,
      privateKey,
      source: adminSource,
    },
    razorpay: {
      isConfigured: isRazorpayConfigured,
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      webhookSecret: razorpayWebhookSecret,
    },
    communication: {
      twilio: {
        isConfigured: isTwilioConfigured,
        accountSid: twilioSid,
        authToken: twilioToken,
        whatsappFrom: env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
        smsFrom: env.TWILIO_SMS_FROM,
      },
      email: {
        provider: env.EMAIL_PROVIDER || "none",
        apiKey: env.RESEND_API_KEY || env.EMAIL_API_KEY,
        senderAddress: env.EMAIL_SENDER_ADDRESS || "notifications@schoolstudy.in",
        senderName: env.EMAIL_SENDER_NAME || "School Study Platform",
      },
      encryptionKey: env.COMMUNICATION_ENCRYPTION_KEY,
    },
    ai: {
      geminiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
      openaiKey: env.OPENAI_API_KEY,
    },
  };
}

export function validateServerConfig(): ConfigValidationResult {
  const cfg = getServerConfig();
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!cfg.firebaseAdmin.isConfigured) {
    warnings.push(
      "Firebase Admin SDK is not configured. Server-side registration and privileged transactions will be restricted."
    );
  }

  if (!cfg.razorpay.isConfigured) {
    warnings.push("Razorpay server secrets missing; subscription payments and webhook verification disabled.");
  }

  if (!cfg.communication.twilio.isConfigured) {
    warnings.push("Twilio credentials missing; WhatsApp and SMS notifications disabled.");
  }

  return {
    isValid: missing.length === 0,
    missingRequired: missing,
    warnings,
  };
}

/**
 * Returns safe server health summary with all secret tokens redacted.
 */
export function getServerConfigHealth() {
  const cfg = getServerConfig();
  return {
    nodeEnv: cfg.nodeEnv,
    isProduction: cfg.isProduction,
    firebaseAdmin: {
      configured: cfg.firebaseAdmin.isConfigured,
      projectId: cfg.firebaseAdmin.projectId,
      source: cfg.firebaseAdmin.source,
      clientEmailMasked: cfg.firebaseAdmin.clientEmail
        ? maskSecret(cfg.firebaseAdmin.clientEmail, 3)
        : "(none)",
    },
    razorpay: {
      configured: cfg.razorpay.isConfigured,
      keyIdMasked: maskSecret(cfg.razorpay.keyId, 4),
      hasSecret: Boolean(cfg.razorpay.keySecret),
      hasWebhookSecret: Boolean(cfg.razorpay.webhookSecret),
    },
    communication: {
      twilioConfigured: cfg.communication.twilio.isConfigured,
      emailProvider: cfg.communication.email.provider,
    },
    ai: {
      hasGeminiKey: Boolean(cfg.ai.geminiKey),
      hasOpenaiKey: Boolean(cfg.ai.openaiKey),
    },
  };
}
