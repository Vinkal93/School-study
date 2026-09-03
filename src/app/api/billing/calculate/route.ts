import { NextResponse } from "next/server";
import { calculateServerBillingPrice } from "@/lib/billing/gstCouponsEngine";

/**
 * POST /api/billing/calculate
 * Server-authoritative endpoint that calculates plan price, coupon discount, net taxable amount, GST, and total payable amount.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { planId, billingCycle = "monthly", couponCode, customOfferPricePaise } = body || {};

    if (!planId || typeof planId !== "string" || !planId.trim()) {
      return NextResponse.json(
        { success: false, error: "planId is required." },
        { status: 400 }
      );
    }

    const normalizedCycle = String(billingCycle).toLowerCase() === "annual" ? "annual" : "monthly";

    const calculation = await calculateServerBillingPrice({
      planId,
      billingCycle: normalizedCycle,
      couponCode: couponCode ? String(couponCode) : null,
      customOfferPricePaise: typeof customOfferPricePaise === "number" ? customOfferPricePaise : null,
    });

    return NextResponse.json({
      success: true,
      calculation,
    });
  } catch (error: any) {
    console.error("POST /api/billing/calculate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate billing breakdown." },
      { status: 500 }
    );
  }
}
