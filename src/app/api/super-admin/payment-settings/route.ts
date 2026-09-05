import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { loadRazorpayCredentials, type RazorpayCredentials } from "@/lib/payments/razorpay";
import { createBillingAuditLog } from "@/lib/billing";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••••••••••";
  return `${secret.slice(0, 4)}****************${secret.slice(-4)}`;
}

export async function GET(request: Request) {
  try {
    const creds = await loadRazorpayCredentials().catch(() => ({
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
      keySecret: process.env.RAZORPAY_KEY_SECRET || "",
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
      isLiveMode: false,
    }));

    const keyId = creds.keyId || "";
    const keySecret = creds.keySecret || "";
    const webhookSecret = creds.webhookSecret || "";
    const isLiveMode = creds.isLiveMode ?? keyId.startsWith("rzp_live_");

    return NextResponse.json({
      success: true,
      keyId,
      isSecretSet: Boolean(keySecret && keySecret.length > 0),
      maskedSecretKey: maskSecret(keySecret),
      isWebhookSecretSet: Boolean(webhookSecret && webhookSecret.length > 0),
      maskedWebhookSecret: maskSecret(webhookSecret),
      isLiveMode,
    });
  } catch (error: any) {
    console.error("GET Payment Settings Exception:", error);
    const envKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
    const envSecret = process.env.RAZORPAY_KEY_SECRET || "";
    const envWebhook = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    return NextResponse.json({
      success: true,
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
      return NextResponse.json({ success: false, error: "Razorpay Key ID is required." });
    }

    const cleanKeyId = keyId.trim();

    let existingData: RazorpayCredentials | null = null;
    const safeAdmin = getSafeAdminDb();
    if (safeAdmin) {
      try {
        const snap = await safeAdmin.collection("paymentSettings").doc("razorpay").get();
        if (snap.exists) {
          existingData = snap.data() as RazorpayCredentials;
        }
      } catch (e) {
        // Non-blocking
      }
    }
    if (!existingData) {
      try {
        const cDb = getFirebaseDb();
        if (cDb) {
          const snap = await getDoc(doc(cDb, "paymentSettings", "razorpay"));
          if (snap.exists()) {
            existingData = snap.data() as RazorpayCredentials;
          }
        }
      } catch (e) {
        // Non-blocking
      }
    }

    let finalSecret = existingData?.keySecret || process.env.RAZORPAY_KEY_SECRET || "";
    if (keySecret && typeof keySecret === "string" && keySecret.trim().length > 0 && !keySecret.includes("*") && !keySecret.includes("•")) {
      finalSecret = keySecret.trim();
    }

    if (!finalSecret || finalSecret.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: "Razorpay Secret Key is required. Please type your Secret Key in the 'Razorpay Secret Key' box.",
      });
    }

    let finalWebhookSecret = existingData?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (webhookSecret && typeof webhookSecret === "string" && webhookSecret.trim().length > 0 && !webhookSecret.includes("*") && !webhookSecret.includes("•")) {
      finalWebhookSecret = webhookSecret.trim();
    }

    const updatedConfig: RazorpayCredentials & { updatedAt: string; updatedBy: string } = {
      keyId: cleanKeyId,
      keySecret: finalSecret,
      webhookSecret: finalWebhookSecret,
      isLiveMode: typeof isLiveMode === "boolean" ? isLiveMode : cleanKeyId.startsWith("rzp_live_"),
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail || "super_admin",
    };

    // 1. Sync in-memory process environment variables immediately
    process.env.RAZORPAY_KEY_ID = updatedConfig.keyId;
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = updatedConfig.keyId;
    process.env.RAZORPAY_KEY_SECRET = updatedConfig.keySecret;
    if (updatedConfig.webhookSecret) {
      process.env.RAZORPAY_WEBHOOK_SECRET = updatedConfig.webhookSecret;
    }

    // 2. Persist to local .env.local file if on local filesystem
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, "utf-8");

        const updateEnvVar = (key: string, val: string) => {
          const regex = new RegExp(`^${key}=.*$`, "m");
          if (regex.test(content)) {
            content = content.replace(regex, `${key}=${val}`);
          } else {
            content += `\n${key}=${val}`;
          }
        };

        updateEnvVar("RAZORPAY_KEY_ID", updatedConfig.keyId);
        updateEnvVar("NEXT_PUBLIC_RAZORPAY_KEY_ID", updatedConfig.keyId);
        updateEnvVar("RAZORPAY_KEY_SECRET", updatedConfig.keySecret);
        if (updatedConfig.webhookSecret) {
          updateEnvVar("RAZORPAY_WEBHOOK_SECRET", updatedConfig.webhookSecret);
        }

        fs.writeFileSync(envPath, content, "utf-8");
        console.log("[Razorpay Settings] Saved credentials to .env.local and synced process.env");
      }
    } catch (fsErr) {
      // Non-blocking in serverless environments
    }

    // 3. Persist to Firestore via Admin SDK or Client SDK
    if (safeAdmin) {
      try {
        await safeAdmin.collection("paymentSettings").doc("razorpay").set(updatedConfig, { merge: true });
        console.log("[Razorpay Settings] Persisted credentials via safeAdmin to paymentSettings/razorpay");
      } catch (firestoreErr) {
        console.warn("[Razorpay Settings] safeAdmin write notice:", firestoreErr);
      }
    }
    try {
      const cDb = getFirebaseDb();
      if (cDb) {
        await setDoc(doc(cDb, "paymentSettings", "razorpay"), updatedConfig, { merge: true });
        console.log("[Razorpay Settings] Persisted credentials via cDb to paymentSettings/razorpay");
      }
    } catch (clientWriteErr) {
      console.warn("[Razorpay Settings] cDb write notice:", clientWriteErr);
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
      message: "Razorpay API Key settings updated and synchronized successfully!",
      keyId: updatedConfig.keyId,
      isSecretSet: updatedConfig.keySecret.length > 0,
      maskedSecretKey: maskSecret(updatedConfig.keySecret),
      isWebhookSecretSet: updatedConfig.webhookSecret.length > 0,
      maskedWebhookSecret: maskSecret(updatedConfig.webhookSecret),
      isLiveMode: updatedConfig.isLiveMode,
    });
  } catch (error: any) {
    console.error("POST Payment Settings Error Details:", error?.stack || error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to save payment settings.",
    });
  }
}
