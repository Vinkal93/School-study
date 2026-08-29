import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "@/lib/billing";
import type { Plan } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, billingCycle = "monthly", couponCode } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Missing required parameter 'planId'." },
        { status: 400 }
      );
    }

    if (billingCycle !== "monthly" && billingCycle !== "annual") {
      return NextResponse.json(
        { error: "Invalid billingCycle. Must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable." },
        { status: 500 }
      );
    }

    // 1. Load active Plan & PlanVersion server-side
    const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return NextResponse.json(
        { error: `Plan '${planId}' not found.` },
        { status: 404 }
      );
    }

    const planData = { id: planSnap.id, ...planSnap.data() } as Plan;
    const planVersion = await getActivePlanVersion(planId);

    if (!planVersion) {
      return NextResponse.json(
        { error: `Active plan version for '${planId}' not found.` },
        { status: 404 }
      );
    }

    // 2. Server-side price calculation in integer PAISE
    const baseAmount =
      billingCycle === "annual"
        ? planVersion.annualPrice * 12
        : planVersion.monthlyPrice;

    let discountAmount = 0;
    let couponValid = false;
    let couponMessage = "";

    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      if (cleanCoupon === "SAVE20" || cleanCoupon === "WELCOME20") {
        discountAmount = Math.round(baseAmount * 0.2); // 20% discount
        couponValid = true;
        couponMessage = "20% discount coupon applied successfully!";
      } else if (cleanCoupon === "FLAT500") {
        discountAmount = 50000; // ₹500 discount in paise
        couponValid = true;
        couponMessage = "₹500 flat discount applied successfully!";
      } else {
        couponValid = false;
        couponMessage = "Invalid or expired coupon code.";
      }
    }

    const taxAmount = 0;
    const finalAmount = Math.max(0, baseAmount - discountAmount + taxAmount);

    return NextResponse.json({
      planId,
      planName: planData.name,
      planSlug: planData.slug,
      billingCycle,
      baseAmount,
      discountAmount,
      taxAmount,
      finalAmount,
      currency: "INR",
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
      couponValid,
      couponMessage,
      limits: planVersion.limits || planData.limits,
      features: planVersion.features || planData.features,
    });
  } catch (error: any) {
    console.error("API Billing Calculate Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate server-side pricing: " + (error.message || "") },
      { status: 500 }
    );
  }
}
