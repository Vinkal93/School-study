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
  // 1. Start with Vercel / Environment Variable defaults (Secondary Fallback)
  const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
  const envKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const envWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  const envIsLiveMode = envKeyId.startsWith("rzp_live_");

  let keyId = envKeyId;
  let keySecret = envKeySecret;
  let webhookSecret = envWebhookSecret;
  let isLiveMode = envIsLiveMode;

  // 2. Check Super Admin Dynamic Firestore configuration (Primary Priority)
  try {
    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(db, "paymentSettings", "razorpay");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<RazorpayCredentials>;
        if (data.keyId && data.keyId.trim().length > 0) keyId = data.keyId.trim();
        if (data.keySecret && data.keySecret.trim().length > 0) keySecret = data.keySecret.trim();
        if (data.webhookSecret !== undefined && data.webhookSecret.trim().length > 0) webhookSecret = data.webhookSecret.trim();
        if (typeof data.isLiveMode === "boolean") isLiveMode = data.isLiveMode;
      }
    }
  } catch (err) {
    console.warn("Notice: Firestore dynamic settings lookup fallback to Vercel env:", err);
  }

  // 3. Fallback to Vercel env variables if Firestore values were empty or incomplete
  if (!keyId || keyId.trim().length === 0) keyId = envKeyId;
  if (!keySecret || keySecret.trim().length === 0) keySecret = envKeySecret;
  if (!webhookSecret || webhookSecret.trim().length === 0) webhookSecret = envWebhookSecret;

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
