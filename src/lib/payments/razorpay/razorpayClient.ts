import Razorpay from "razorpay";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isLiveMode: boolean;
}

/**
 * Loads active Razorpay credentials dynamically.
 * Priority:
 * 1. Server-side stored Firestore config (`paymentSettings/razorpay`)
 * 2. Process environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`)
 */
export async function loadRazorpayCredentials(): Promise<RazorpayCredentials> {
  let keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  let isLiveMode = keyId.startsWith("rzp_live_");

  try {
    if (typeof window === "undefined") {
      try {
        const { adminDb } = await import("@/lib/firebase/admin");
        if (adminDb) {
          const snap = await adminDb.doc("paymentSettings/razorpay").get();
          if (snap.exists) {
            const data = snap.data() as Partial<RazorpayCredentials>;
            if (data.keyId) keyId = data.keyId;
            if (data.keySecret) keySecret = data.keySecret;
            if (data.webhookSecret !== undefined) webhookSecret = data.webhookSecret;
            if (typeof data.isLiveMode === "boolean") isLiveMode = data.isLiveMode;
            return { keyId, keySecret, webhookSecret, isLiveMode };
          }
        }
      } catch (e) {
        // Fallback to client DB if adminDb fails
      }
    }

    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(db, "paymentSettings", "razorpay");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<RazorpayCredentials>;
        if (data.keyId) keyId = data.keyId;
        if (data.keySecret) keySecret = data.keySecret;
        if (data.webhookSecret !== undefined) webhookSecret = data.webhookSecret;
        if (typeof data.isLiveMode === "boolean") isLiveMode = data.isLiveMode;
      }
    }
  } catch (err) {
    console.warn("Could not load dynamic Razorpay config from Firestore, falling back to process.env:", err);
  }

  return { keyId, keySecret, webhookSecret, isLiveMode };
}

/**
 * Async Razorpay Client loader respecting dynamic Super Admin settings.
 */
export async function getRazorpayClientAsync(): Promise<Razorpay> {
  const creds = await loadRazorpayCredentials();

  if (!creds.keyId || !creds.keySecret) {
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
    key_id,
    key_secret,
  });
}

export function getRazorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

export function getRazorpayWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}
