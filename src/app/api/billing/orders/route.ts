import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "@/lib/billing";
import { createRazorpayOrder, getRazorpayKeyId, loadRazorpayCredentials } from "@/lib/payments/razorpay";
import type { Plan } from "@/types";
import { InternalOrder } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, userId, planId, billingCycle = "monthly", couponCode } = body;

    // 1. Validate required session parameters
    if (!schoolId || !userId || !planId) {
      return NextResponse.json(
        { error: "Missing required request parameters (schoolId, userId, planId)." },
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

    // 2. Load active Plan & PlanVersion server-side (Section 4 & 5)
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

    // 3. Server-side price calculation in integer PAISE (Section 5)
    let baseAmount = billingCycle === "annual" ? planVersion.annualPrice * 12 : planVersion.monthlyPrice;
    let discountAmount = 0;
    let taxAmount = 0; // Tax calculation if applicable

    if (couponCode) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      if (cleanCoupon === "SAVE20" || cleanCoupon === "WELCOME20") {
        discountAmount = Math.round(baseAmount * 0.2); // 20% discount
      } else if (cleanCoupon === "FLAT500") {
        discountAmount = 50000; // ₹500 in paise
      }
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount + taxAmount);
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 4. Create Razorpay Order via SDK using dynamic credentials (Section 7)
    const razorpayOrder = await createRazorpayOrder({
      amount: finalAmount,
      currency: "INR",
      receipt: orderId,
      notes: {
        schoolId,
        userId,
        planId,
        billingCycle,
      },
    });

    // 5. Store Internal Order Record (Section 6)
    const internalOrder: InternalOrder = {
      id: orderId,
      schoolId,
      userId,
      planId,
      planVersionId: planVersion.id,
      billingCycle,
      baseAmount,
      discountAmount,
      taxAmount,
      finalAmount,
      currency: "INR",
      couponId: couponCode ? couponCode.toUpperCase() : null,
      status: "CREATED",
      razorpayOrderId: razorpayOrder.id,
      createdAt: nowIso,
      expiresAt: expiresAtIso,
    };

    const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId);
    await setDoc(orderRef, internalOrder);

    // Load active public Key ID dynamically
    const creds = await loadRazorpayCredentials();

    // 6. Return checkout-safe payload
    return NextResponse.json({
      orderId: internalOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: "INR",
      key: creds.keyId || getRazorpayKeyId(),
      planName: planData.name,
      billingCycle,
    });
  } catch (error: any) {
    console.error("API Order Creation Error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order. " + (error.message || "") },
      { status: 500 }
    );
  }
}
