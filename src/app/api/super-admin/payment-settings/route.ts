import { NextResponse } from "next/server";
import { RazorpayCredentials } from "@/lib/payments/razorpay";
import { createBillingAuditLog } from "@/lib/billing";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••••••••••";
  return `${secret.slice(0, 4)}****************${secret.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
    let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    let webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    let isLiveMode = keyId.startsWith("rzp_live_");

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
        }
      }
    } catch (e) {
      console.warn("Notice: adminDb lookup fallback in GET payment-settings:", e);
    }

    return NextResponse.json({
      keyId,
      isSecretSet: Boolean(keySecret && keySecret.length > 0),
      maskedSecretKey: maskSecret(keySecret),
      isWebhookSecretSet: Boolean(webhookSecret && webhookSecret.length > 0),
      maskedWebhookSecret: maskSecret(webhookSecret),
      isLiveMode,
    });
  } catch (error: any) {
    console.warn("GET Payment Settings Exception (Using env fallback):", error);
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

    if (!keyId || typeof keyId !== "string" || keyId.trim().length === 0) {
      return NextResponse.json({ error: "Razorpay Key ID is required." }, { status: 400 });
    }

    let existingData: RazorpayCredentials | null = null;
    let dbMethod: "admin" | "client" = "admin";

    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        const snap = await adminDb.doc("paymentSettings/razorpay").get();
        if (snap.exists) {
          existingData = snap.data() as RazorpayCredentials;
        }
      }
    } catch (e) {
      dbMethod = "client";
    }

    if (dbMethod === "client" || !existingData) {
      try {
        const { getFirebaseDb } = await import("@/lib/firebase/client");
        const { doc, getDoc } = await import("firebase/firestore");
        const clientDb = getFirebaseDb();
        if (clientDb) {
          const snap = await getDoc(doc(clientDb, "paymentSettings", "razorpay"));
          if (snap.exists()) {
            existingData = snap.data() as RazorpayCredentials;
          }
        }
      } catch (e) {
        // Safe continuation
      }
    }

    let finalSecret = existingData?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    if (keySecret && typeof keySecret === "string" && keySecret.trim().length > 0 && !keySecret.includes("*") && !keySecret.includes("•")) {
      finalSecret = keySecret.trim();
    }

    if (!finalSecret || finalSecret.trim().length === 0) {
      return NextResponse.json(
        { error: "Razorpay Secret Key is required. Please enter your Secret Key from the Razorpay Dashboard." },
        { status: 400 }
      );
    }

    let finalWebhookSecret = existingData?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (webhookSecret && typeof webhookSecret === "string" && webhookSecret.trim().length > 0 && !webhookSecret.includes("*") && !webhookSecret.includes("•")) {
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

    // Save to Firestore via Admin SDK (with Client SDK fallback)
    let saved = false;
    try {
      const { adminDb } = await import("@/lib/firebase/admin");
      if (adminDb) {
        await adminDb.doc("paymentSettings/razorpay").set(updatedConfig, { merge: true });
        saved = true;
      }
    } catch (e) {
      // Fallback
    }

    if (!saved) {
      const { getFirebaseDb } = await import("@/lib/firebase/client");
      const { doc, setDoc } = await import("firebase/firestore");
      const clientDb = getFirebaseDb();
      if (clientDb) {
        await setDoc(doc(clientDb, "paymentSettings", "razorpay"), updatedConfig, { merge: true });
      }
    }

    try {
      await createBillingAuditLog(
        actorEmail || "super_admin",
        "super_admin",
        "MANUAL_ACCESS_CHANGE",
        "accessPolicy",
        "razorpay_settings",
        { actionType: "RAZORPAY_KEYS_UPDATED", keyId: updatedConfig.keyId, isLiveMode: updatedConfig.isLiveMode }
      );
    } catch (e) {
      // Non-blocking audit log
    }

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
    return NextResponse.json(
      { error: "Failed to save payment settings: " + (error.message || error.toString()) },
      { status: 500 }
    );
  }
}
