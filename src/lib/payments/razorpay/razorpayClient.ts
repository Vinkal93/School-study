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
 * Priority:
 * 1. Environment variables (Local .env.local or Vercel Environment Variables)
 * 2. Super Admin Dynamic Firestore configuration (`paymentSettings/razorpay`)
 */
export async function loadRazorpayCredentials(): Promise<RazorpayCredentials> {
  const envKeyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
  const envKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const envWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  let keyId = "";
  let keySecret = "";
  let webhookSecret = "";
  let isLiveMode = false;

  // 1. Primary: Check Super Admin Dynamic Firestore configuration first
  try {
    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(db, "paymentSettings", "razorpay");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<RazorpayCredentials>;
        if (data.keyId && data.keyId.trim().length > 0) {
          keyId = data.keyId.trim();
        }
        if (data.keySecret && data.keySecret.trim().length > 0) {
          keySecret = data.keySecret.trim();
        }
        if (data.webhookSecret !== undefined && data.webhookSecret.trim().length > 0) {
          webhookSecret = data.webhookSecret.trim();
        }
        if (typeof data.isLiveMode === "boolean") {
          isLiveMode = data.isLiveMode;
        }
      }
    }
  } catch (err: any) {
    console.warn("[Razorpay] Notice: Firestore dynamic settings lookup unauthenticated on server, falling back to environment.");
  }

  // 2. Secondary Fallback: Use Environment variables if Firestore values were not found or incomplete
  if (!keyId && envKeyId) {
    keyId = envKeyId;
  }
  if (!keySecret && envKeySecret) {
    keySecret = envKeySecret;
  }
  if (!webhookSecret && envWebhookSecret) {
    webhookSecret = envWebhookSecret;
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
