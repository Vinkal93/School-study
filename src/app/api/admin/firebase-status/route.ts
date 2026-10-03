import { NextResponse } from "next/server";
import { getServiceAccount, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

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
    }

    return NextResponse.json({
      status: "ok",
      adminConfigured: isConfigured,
      detectedSource,
      projectId: serviceAccount?.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991",
      clientEmail: maskedEmail,
      hasPrivateKey: !!(serviceAccount?.privateKey && serviceAccount.privateKey.includes("BEGIN PRIVATE KEY")),
      instructions: !isConfigured
        ? "To enable native Firebase Admin SDK features, set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local"
        : "Firebase Admin is successfully configured.",
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
