import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { calculateServerBillingPrice } from "@/lib/billing/gstCouponsEngine";
import {
  createRazorpaySubscription,
  loadRazorpayCredentials,
  getOrCreateRazorpayPlanMapping,
} from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;

    const body = await request.json().catch(() => ({}));
    const schoolId = String(body.schoolId || actor.user.schoolId || "");

    if (!schoolId || !ownsBillingSchool(actor.user, schoolId)) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    if (!["monthly", "annual"].includes(body.billingCycle)) {
      return NextResponse.json({ error: "Choose monthly or annual billing." }, { status: 400 });
    }

    const schoolDoc = await actor.db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    if (body.offerId) {
      return NextResponse.json(
        { error: "Use one-time checkout for an offer; recurring pricing must use the published plan." },
        { status: 400 }
      );
    }

    // Authoritative server-side price calculation with coupon validation
    const couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase() : undefined;
    const price = await calculateServerBillingPrice({
      planId: body.planId,
      billingCycle: body.billingCycle,
      couponCode,
    });

    if (!Number.isSafeInteger(price.finalAmountPaise) || price.finalAmountPaise <= 0) {
      return NextResponse.json({ error: "A payable published plan is required." }, { status: 400 });
    }

    const credentials = await loadRazorpayCredentials();
    if (!credentials.keyId || !credentials.keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment gateway keys are not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Super Admin → Settings → Payment Gateway, or choose the Free Starter Plan.",
          code: "RAZORPAY_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // Reuse or create synchronized Razorpay plan mapping (Phase 6 requirement)
    const { razorpayPlanId } = await getOrCreateRazorpayPlanMapping({
      planId: body.planId,
      planVersionId: price.planVersionId,
      planName: price.planName,
      billingCycle: body.billingCycle,
      amountPaise: price.finalAmountPaise,
      currency: "INR",
    });

    // Create recurring subscription intent with Razorpay
    const subscription = await createRazorpaySubscription({
      planId: razorpayPlanId,
      totalCount: body.billingCycle === "annual" ? 10 : 120,
      customerNotify: true,
      notes: {
        schoolId,
        planId: body.planId,
        actorId: actor.user.uid,
        couponCode: couponCode || "",
      },
    });

    const now = new Date().toISOString();

    // Persist pending subscription record in database
    await actor.db.collection("razorpaySubscriptions").doc(subscription.id).set({
      id: subscription.id,
      schoolId,
      userId: actor.user.uid,
      planId: body.planId,
      planVersionId: price.planVersionId,
      billingCycle: body.billingCycle,
      razorpayPlanId,
      amountPaise: price.finalAmountPaise,
      baseAmount: price.baseAmountPaise,
      discountAmount: price.discountAmountPaise,
      taxAmount: price.gstAmountPaise,
      couponCode: couponCode || null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    // If school is currently in onboarding, transition to CHECKOUT_PENDING
    const schoolData = schoolDoc.data();
    if (
      schoolData?.onboardingStatus === "PLAN_SELECTION_REQUIRED" ||
      schoolData?.onboardingStatus === "REGISTRATION_PENDING"
    ) {
      await actor.db.collection("schools").doc(schoolId).update({
        onboardingStatus: "CHECKOUT_PENDING",
        updatedAt: now,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId,
      amountPaise: price.finalAmountPaise,
      amountRupees: price.finalAmountPaise / 100,
      currency: "INR",
      keyId: credentials.keyId,
      plan: {
        id: body.planId,
        name: price.planName,
        billingCycle: body.billingCycle,
      },
      couponApplied: Boolean(couponCode && price.discountAmountPaise > 0),
      discountAmountPaise: price.discountAmountPaise,
    });
  } catch (error) {
    console.error("POST /api/billing/subscriptions/create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recurring checkout unavailable." },
      { status: 503 }
    );
  }
}
