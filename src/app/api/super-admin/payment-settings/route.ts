import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { loadRazorpayCredentials, RazorpayCredentials } from "@/lib/payments/razorpay";
import { createBillingAuditLog } from "@/lib/billing";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••••••••••";
  return `${secret.slice(0, 4)}****************${secret.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    const creds = await loadRazorpayCredentials();

    return NextResponse.json({
      keyId: creds?.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      isSecretSet: Boolean(creds?.keySecret && creds.keySecret.length > 0),
      maskedSecretKey: maskSecret(creds?.keySecret || ""),
      isWebhookSecretSet: Boolean(creds?.webhookSecret && creds.webhookSecret.length > 0),
      maskedWebhookSecret: maskSecret(creds?.webhookSecret || ""),
      isLiveMode: creds?.isLiveMode || false,
    });
  } catch (error: any) {
    console.warn("GET Payment Settings Notice (Using env fallback):", error);
    const envKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
    const envSecret = process.env.RAZORPAY_KEY_SECRET || "";
    const envWebhook = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    return NextResponse.json({
      keyId: envKeyId,
      isSecretSet: envSecret.length > 0,
      maskedSecretKey: maskSecret(envSecret),
      isWebhookSecretSet: envWebhook.length > 0,
      maskedWebhookSecret: maskSecret(envWebhook),
      isLiveMode: envKeyId.startsWith("rzp_live_"),
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keyId, keySecret, webhookSecret, isLiveMode, actorEmail } = body;

    if (!keyId || typeof keyId !== "string") {
      return NextResponse.json({ error: "Razorpay Key ID is required." }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    const docRef = doc(db, "paymentSettings", "razorpay");
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? (existingSnap.data() as RazorpayCredentials) : null;

    let finalSecret = existingData?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    if (keySecret && !keySecret.includes("*") && !keySecret.includes("•")) {
      finalSecret = keySecret.trim();
    }

    let finalWebhookSecret = existingData?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (webhookSecret !== undefined && !webhookSecret.includes("*") && !webhookSecret.includes("•")) {
      finalWebhookSecret = webhookSecret.trim();
    }

    const updatedConfig: RazorpayCredentials & { updatedAt: string; updatedBy: string } = {
      keyId: keyId.trim(),
      keySecret: finalSecret,
      webhookSecret: finalWebhookSecret,
      isLiveMode: typeof isLiveMode === "boolean" ? isLiveMode : keyId.startsWith("rzp_live_"),
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail || "super_admin",
    };

    await setDoc(docRef, updatedConfig, { merge: true });

    await createBillingAuditLog(
      actorEmail || "super_admin",
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      "razorpay_settings",
      { actionType: "RAZORPAY_KEYS_UPDATED", keyId: updatedConfig.keyId, isLiveMode: updatedConfig.isLiveMode }
    );

    return NextResponse.json({
      success: true,
      message: "Razorpay API Key settings updated securely in backend Firestore!",
      keyId: updatedConfig.keyId,
      isSecretSet: updatedConfig.keySecret.length > 0,
      maskedSecretKey: maskSecret(updatedConfig.keySecret),
      isLiveMode: updatedConfig.isLiveMode,
    });
  } catch (error: any) {
    console.error("POST Payment Settings Error:", error);
    return NextResponse.json({ error: "Failed to save payment settings." }, { status: 500 });
  }
}
