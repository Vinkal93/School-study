import { NextResponse } from "next/server";
import { loadRazorpayCredentials, mapRazorpayError, verifyRazorpaySignature } from "@/lib/payments/razorpay";
import Razorpay from "razorpay";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

/**
 * GET /api/super-admin/payment-settings/test
 * Returns safe diagnostic status without exposing secrets.
 */
export async function GET() {
  try {
    const creds = await loadRazorpayCredentials();
    const isConfigured = Boolean(creds.keyId && creds.keySecret);
    const mode = creds.isLiveMode ? "LIVE" : creds.keyId ? "TEST" : "UNCONFIGURED";
    const keyIdPreview = creds.keyId ? `${creds.keyId.substring(0, 10)}...` : "NOT_CONFIGURED";

    // Test cryptographic signature verification offline logic
    let signatureTestResult = "FAIL";
    try {
      const mockOrderId = "order_test_12345";
      const mockPaymentId = "pay_test_67890";
      const secret = "test_secret_key";
      const crypto = await import("crypto");
      const validSig = crypto
        .createHmac("sha256", secret)
        .update(`${mockOrderId}|${mockPaymentId}`)
        .digest("hex");

      const isValid = verifyRazorpaySignature(mockOrderId, mockPaymentId, validSig);

      if (isValid) signatureTestResult = "PASS";
    } catch (sigErr) {
      signatureTestResult = "FAIL";
    }

    // Fetch last webhook & payment timestamps safely
    let lastWebhookTime: string | null = null;
    let lastPaymentTime: string | null = null;

    try {
      const db = getFirebaseDb();
      if (db) {
        const pSnap = await getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(1))).catch(() => null);
        if (pSnap && !pSnap.empty) {
          lastPaymentTime = pSnap.docs[0].data()?.createdAt || null;
        }

        const wSnap = await getDocs(query(collection(db, "webhookEvents"), orderBy("receivedAt", "desc"), limit(1))).catch(() => null);
        if (wSnap && !wSnap.empty) {
          lastWebhookTime = wSnap.docs[0].data()?.receivedAt || null;
        }
      }
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        environment: mode,
        keyIdStatus: creds.keyId ? "CONFIGURED" : "NOT_CONFIGURED",
        keyIdPreview,
        keySecretStatus: creds.keySecret ? "CONFIGURED" : "NOT_CONFIGURED",
        webhookSecretStatus: creds.webhookSecret ? "CONFIGURED" : "NOT_CONFIGURED",
        orderApiTestStatus: isConfigured ? "READY" : "NOT_CONFIGURED",
        signatureVerificationStatus: signatureTestResult,
        webhookEndpointConfigured: Boolean(creds.webhookSecret),
        lastWebhookTime,
        lastPaymentTime,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load payment diagnostics." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/payment-settings/test
 * Safe server-side connectivity check with Razorpay API (orders.all test fetch).
 */
export async function POST(request: Request) {
  try {
    let { keyId, keySecret } = await request.json().catch(() => ({}));

    if (!keyId || !keySecret) {
      const creds = await loadRazorpayCredentials();
      keyId = keyId || creds.keyId;
      keySecret = keySecret || creds.keySecret;
    }

    if (!keyId || !keySecret) {
      return NextResponse.json({
        success: false,
        error: "Razorpay Key ID and Secret Key must both be configured to test connectivity.",
        status: "CONFIG_MISSING",
      });
    }

    const cleanKeyId = keyId.trim();
    const cleanKeySecret = keySecret.trim();
    const isLive = cleanKeyId.startsWith("rzp_live_");
    const isTest = cleanKeyId.startsWith("rzp_test_");

    if (!isLive && !isTest) {
      return NextResponse.json({
        success: false,
        error: "Invalid Key ID format. Key ID must start with 'rzp_test_' or 'rzp_live_'.",
        status: "CONFIG_MISSING",
        mode: "UNKNOWN",
      });
    }

    console.log(`[RazorpayDiagnostics] Running server connectivity test. Mode: ${isLive ? "LIVE" : "TEST"}`);

    const rzp = new Razorpay({
      key_id: cleanKeyId,
      key_secret: cleanKeySecret,
    });

    try {
      const result = await rzp.orders.all({ count: 1 });
      console.log(`[RazorpayDiagnostics] Connectivity test PASSED. Mode: ${isLive ? "LIVE" : "TEST"}`);

      return NextResponse.json({
        success: true,
        mode: isLive ? "LIVE" : "TEST",
        message: `Successfully connected and authenticated with Razorpay API in ${isLive ? "LIVE" : "TEST"} mode!`,
        status: "CONNECTION_SUCCESS",
        ordersCount: (result as any)?.items?.length ?? 0,
      });
    } catch (apiErr: any) {
      const mapped = mapRazorpayError(apiErr);
      console.error(`[RazorpayDiagnostics] Test failed [${mapped.code}]:`, mapped.message);

      return NextResponse.json({
        success: false,
        mode: isLive ? "LIVE" : "TEST",
        error: mapped.userMessage,
        code: mapped.code,
        status: mapped.code === "RAZORPAY_AUTH_ERROR" ? "AUTHENTICATION_FAILED" : "API_ERROR",
      });
    }
  } catch (error: any) {
    const mapped = mapRazorpayError(error);
    return NextResponse.json({
      success: false,
      error: mapped.userMessage,
      code: mapped.code,
      status: "INTERNAL_ERROR",
    });
  }
}
