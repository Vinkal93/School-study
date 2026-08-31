import { NextResponse } from "next/server";
import { loadRazorpayCredentials, mapRazorpayError } from "@/lib/payments/razorpay";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    let { keyId, keySecret } = await request.json().catch(() => ({}));

    // If not passed explicitly in test request, load from active server credentials
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

    console.log(`[Razorpay] Connection test started. Mode: ${isLive ? "LIVE" : "TEST"}`);

    const rzp = new Razorpay({
      key_id: cleanKeyId,
      key_secret: cleanKeySecret,
    });

    try {
      // Test server-to-server connectivity with Razorpay API (non-mutating fetch)
      const result = await rzp.orders.all({ count: 1 });
      console.log(`[Razorpay] Connection test successful. Mode: ${isLive ? "LIVE" : "TEST"}`);

      return NextResponse.json({
        success: true,
        mode: isLive ? "LIVE" : "TEST",
        message: `Successfully connected and authenticated with Razorpay API in ${isLive ? "LIVE" : "TEST"} mode!`,
        status: "CONNECTION_SUCCESS",
        ordersCount: (result as any)?.items?.length ?? 0,
      });
    } catch (apiErr: any) {
      const mapped = mapRazorpayError(apiErr);
      console.error(`[Razorpay] Connection test failed [${mapped.code}]:`, mapped.message);

      let status = "RAZORPAY_API_ERROR";
      if (mapped.code === "RAZORPAY_AUTH_ERROR") {
        status = "AUTHENTICATION_FAILED";
      } else if (mapped.code === "RAZORPAY_NETWORK_ERROR") {
        status = "NETWORK_ERROR";
      } else if (mapped.code === "CONFIGURATION_ERROR") {
        status = "CONFIG_MISSING";
      }

      return NextResponse.json({
        success: false,
        mode: isLive ? "LIVE" : "TEST",
        error: mapped.userMessage,
        code: mapped.code,
        status,
      });
    }
  } catch (error: any) {
    const mapped = mapRazorpayError(error);
    console.error("[Razorpay] Server Exception during test:", mapped.message);
    return NextResponse.json({
      success: false,
      error: mapped.userMessage,
      code: mapped.code,
      status: "INTERNAL_ERROR",
    });
  }
}
