import Razorpay from "razorpay";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isLiveMode: boolean;
}

export interface RazorpayConfigStatus {
  isConfigured: boolean;
  status: "CONFIGURED" | "MISSING_KEY_ID" | "MISSING_SECRET" | "INVALID_FORMAT";
  mode: "TEST" | "LIVE" | "UNCONFIGURED";
  keyIdPreview?: string;
  isSecretSet: boolean;
  isWebhookSecretSet: boolean;
  source: "ENVIRONMENT" | "FIRESTORE" | "NONE";
}

/**
 * Loads active Razorpay credentials server-side dynamically.
 * Priority Resolution Order:
 * 1. Environment variables (Local .env.local or Vercel Environment Variables)
 * 2. Firebase Admin SDK server-side Firestore lookup (`paymentSettings/razorpay`)
 * 3. Fallback Firestore Client SDK / REST API
 */
export async function loadRazorpayCredentials(): Promise<RazorpayCredentials> {
  const envKeyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
  const envKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const envWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  let keyId = envKeyId;
  let keySecret = envKeySecret;
  let webhookSecret = envWebhookSecret;
  let isLiveMode = keyId.startsWith("rzp_live_");

  // Tier A: Check Super Admin Dynamic Firestore configuration via Client SDK
  if (!keyId || !keySecret) {
    try {
      const db = getFirebaseDb();
      if (db) {
        const docRef = doc(db, "paymentSettings", "razorpay");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<RazorpayCredentials>;
          if (!keyId && data?.keyId?.trim()) keyId = data.keyId.trim();
          if (!keySecret && data?.keySecret?.trim()) keySecret = data.keySecret.trim();
          if (!webhookSecret && data?.webhookSecret?.trim()) webhookSecret = data.webhookSecret.trim();
          if (typeof data?.isLiveMode === "boolean") isLiveMode = data.isLiveMode;
        }
      }
    } catch (err) {
      // Non-blocking fallback
    }
  }

  // Tier B: Direct Firestore REST API (Works on Vercel serverless without node native modules)
  if (!keyId || !keySecret) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "school-study-c8991";
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/paymentSettings/razorpay${apiKey ? `?key=${apiKey}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const fields = json?.fields;
        if (fields) {
          const restKeyId = fields.keyId?.stringValue?.trim();
          const restKeySecret = fields.keySecret?.stringValue?.trim();
          const restWebhook = fields.webhookSecret?.stringValue?.trim();
          const restLive = fields.isLiveMode?.booleanValue;

          if (!keyId && restKeyId) keyId = restKeyId;
          if (!keySecret && restKeySecret) keySecret = restKeySecret;
          if (!webhookSecret && restWebhook) webhookSecret = restWebhook;
          if (typeof restLive === "boolean") isLiveMode = restLive;
        }
      }
    } catch (restErr) {
      // Non-blocking fallback
    }
  }

  // Update mode according to resolved key
  if (keyId) {
    isLiveMode = keyId.startsWith("rzp_live_");
  }

  return { keyId, keySecret, webhookSecret, isLiveMode };
}

/**
 * Validates the server configuration status safely.
 */
export async function checkRazorpayConfiguration(): Promise<RazorpayConfigStatus> {
  const creds = await loadRazorpayCredentials();

  if (!creds.keyId) {
    return {
      isConfigured: false,
      status: "MISSING_KEY_ID",
      mode: "UNCONFIGURED",
      isSecretSet: Boolean(creds.keySecret),
      isWebhookSecretSet: Boolean(creds.webhookSecret),
      source: "NONE",
    };
  }

  if (!creds.keyId.startsWith("rzp_test_") && !creds.keyId.startsWith("rzp_live_")) {
    return {
      isConfigured: false,
      status: "INVALID_FORMAT",
      mode: "UNCONFIGURED",
      keyIdPreview: creds.keyId.substring(0, 8),
      isSecretSet: Boolean(creds.keySecret),
      isWebhookSecretSet: Boolean(creds.webhookSecret),
      source: "NONE",
    };
  }

  if (!creds.keySecret) {
    return {
      isConfigured: false,
      status: "MISSING_SECRET",
      mode: creds.isLiveMode ? "LIVE" : "TEST",
      keyIdPreview: creds.keyId.substring(0, 8),
      isSecretSet: false,
      isWebhookSecretSet: Boolean(creds.webhookSecret),
      source: "ENVIRONMENT",
    };
  }

  return {
    isConfigured: true,
    status: "CONFIGURED",
    mode: creds.isLiveMode ? "LIVE" : "TEST",
    keyIdPreview: `${creds.keyId.substring(0, 8)}...`,
    isSecretSet: true,
    isWebhookSecretSet: Boolean(creds.webhookSecret),
    source: "ENVIRONMENT",
  };
}

/**
 * Async Razorpay Client loader respecting dynamic configuration.
 */
export async function getRazorpayClientAsync(): Promise<Razorpay> {
  const creds = await loadRazorpayCredentials();

  if (!creds.keyId || !creds.keySecret) {
    console.error("[Razorpay] Initialization failed: Key ID or Secret is missing.");
    throw new Error("Razorpay API credentials (Key ID or Secret) are not configured.");
  }

  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
}

/**
 * Synchronous fallback for legacy callers.
 */
export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({
    key_id: key_id.trim(),
    key_secret: key_secret.trim(),
  });
}

export function getRazorpayKeyId(): string {
  return (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim();
}

export function getRazorpayWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}
