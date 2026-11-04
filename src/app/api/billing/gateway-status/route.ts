import { NextResponse } from "next/server";
import { loadRazorpayCredentials } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const creds = await loadRazorpayCredentials();
    const isConfigured = Boolean(creds.keyId && creds.keySecret);
    const mode = creds.isLiveMode ? "LIVE" : creds.keyId ? "TEST" : "UNCONFIGURED";

    return NextResponse.json({
      success: true,
      isConfigured,
      mode,
      keyIdPreview: creds.keyId ? `${creds.keyId.substring(0, 8)}...` : null,
    });
  } catch (error: any) {
    console.error("GET /api/billing/gateway-status error:", error);
    return NextResponse.json({
      success: false,
      isConfigured: false,
      mode: "UNCONFIGURED",
      error: error?.message || "Failed to check payment gateway status.",
    });
  }
}
