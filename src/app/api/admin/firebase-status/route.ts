import { NextResponse } from "next/server";
import { getServiceAccount, isFirebaseAdminConfigured, getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const isConfigured = isFirebaseAdminConfigured();
    const serviceAccount = getServiceAccount();

    const clientEmail = serviceAccount?.clientEmail || "";
    const maskedEmail = clientEmail
      ? clientEmail.replace(/^(.)(.*)(@.*)$/, (_, first, mid, rest) => `${first}***${rest}`)
      : null;

    // Detect which pattern is currently supplied
    let detectedSource = "none";
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
      detectedSource = "FIREBASE_SERVICE_ACCOUNT_KEY";
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      detectedSource = "DISCRETE_VARS (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)";
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      detectedSource = "CREDENTIAL_FILE";
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      detectedSource = "EMULATOR";
    }

    const hasPrivateKey = !!(
      serviceAccount?.privateKey &&
      (serviceAccount.privateKey.includes("BEGIN PRIVATE KEY") ||
        serviceAccount.privateKey.includes("BEGIN RSA PRIVATE KEY"))
    );

    // Connectivity verification (non-destructive read probe if configured)
    let connectivityStatus: "connected" | "untested" | "error" = "untested";
    let connectivityDetails: string | undefined = undefined;

    if (isConfigured) {
      try {
        const db = getSafeAdminDb();
        if (db) {
          // Probe Firestore connectivity with timeout
          const probePromise = db.collection("siteSettings").doc("system_health").get();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database probe timeout (3s)")), 3000)
          );
          await Promise.race([probePromise, timeoutPromise]);
          connectivityStatus = "connected";
        }
      } catch (probeErr: any) {
        connectivityStatus = "error";
        connectivityDetails = probeErr?.message || "Failed to reach Firestore service.";
      }
    }

    return NextResponse.json({
      status: "ok",
      adminConfigured: isConfigured,
      detectedSource,
      projectId: serviceAccount?.projectId || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991",
      clientEmail: maskedEmail,
      hasPrivateKey,
      connectivity: connectivityStatus,
      ...(connectivityDetails ? { connectivityDetails } : {}),
      isEmulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST),
      instructions: !isConfigured
        ? "To enable native Firebase Admin SDK features, set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local"
        : "Firebase Admin is successfully configured and active.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        adminConfigured: false,
        error: error?.message || "Unknown error checking Firebase Admin status",
      },
      { status: 500 }
    );
  }
}
