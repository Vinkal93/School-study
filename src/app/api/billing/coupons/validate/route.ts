import { NextResponse } from "next/server";
import { validateOfferForCheckout } from "@/lib/billing/offersPromotionsEngine";
import type { ValidateCouponInput } from "@/types/offerPromotion";

/**
 * POST /api/billing/coupons/validate
 * Public / School Admin checkout endpoint to authoritatively validate a coupon code
 * and compute exact base price, discount, taxable amount, GST, and final price in integer paise.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      code,
      planId = "plan_starter",
      billingCycle = "monthly",
      schoolId,
      userId,
      baseAmountPaise,
      isFirstPurchase,
    } = body as ValidateCouponInput;

    if (!code || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a coupon code.",
          isValid: false,
        },
        { status: 400 }
      );
    }

    const validationResult = await validateOfferForCheckout({
      code: code.trim().toUpperCase(),
      planId,
      billingCycle,
      schoolId,
      userId,
      baseAmountPaise,
      isFirstPurchase,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error || `Coupon "${code}" is invalid or cannot be applied.`,
          ...validationResult,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Coupon "${validationResult.code}" applied successfully!`,
      ...validationResult,
    });
  } catch (error: any) {
    console.error("POST /api/billing/coupons/validate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate coupon code.",
        isValid: false,
      },
      { status: 500 }
    );
  }
}
