import { NextResponse } from "next/server";
import { processRefund, getRefundsList, getRefundableAmount } from "@/lib/payments/refunds";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || undefined;
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;

    const refunds = await getRefundsList({ schoolId, status, type });
    return NextResponse.json({ refunds });
  } catch (error: any) {
    console.error("Super Admin Refunds GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load refunds list: " + (error.message || "") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;
    const actorId = auth.user!.uid;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, actorId);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const body = await request.json();
    const { paymentId, amountPaise, reason, subscriptionPolicy } = body;

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required." }, { status: 400 });
    }

    if (!amountPaise || amountPaise <= 0) {
      return NextResponse.json({ error: "A valid positive refund amount is required." }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: "A descriptive refund reason is required." }, { status: 400 });
    }

    const result = await processRefund({
      paymentId,
      amountPaise: Math.round(amountPaise),
      reason,
      actorId,
      subscriptionPolicy: subscriptionPolicy || "NO_CHANGE",
    });

    return NextResponse.json({
      success: true,
      refund: result.refund,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error("Super Admin Refund POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund." },
      { status: 400 }
    );
  }
}
