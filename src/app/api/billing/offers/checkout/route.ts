import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import type { CustomOfferRecord } from "@/types/reports";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/payments/razorpay";

/**
 * POST /api/billing/offers/checkout
 * Validates offer server-side and creates Razorpay order for the exact offer amount (e.g. ₹1 = 100 paise).
 * NEVER trusts client-submitted prices or discounts.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { offerId, schoolId, userId = "school_admin", acceptTerms } = body;

    if (!offerId || !schoolId) {
      return NextResponse.json(
        { error: "offerId and schoolId are required." },
        { status: 400 }
      );
    }

    if (!acceptTerms) {
      return NextResponse.json(
        { error: "You must accept the promotional terms before proceeding." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database service unavailable." },
        { status: 503 }
      );
    }

    // 1. Resolve offer strictly from backend database
    const offerRef = doc(db, BILLING_COLLECTIONS.CUSTOM_OFFERS, offerId);
    const snap = await getDoc(offerRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: "Invalid or non-existent offer." }, { status: 404 });
    }

    const offer = snap.data() as CustomOfferRecord;

    // 2. Validate tenant & offer rules
    if (offer.schoolId !== "global" && offer.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Forbidden: This offer is not valid for your school." },
        { status: 403 }
      );
    }

    if (new Date(offer.validUntil || offer.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This special offer has expired." },
        { status: 400 }
      );
    }

    if ((offer.redeemedCount || 0) >= (offer.maxRedemptions || 1)) {
      return NextResponse.json(
        { error: "This special offer has reached its maximum redemption limit." },
        { status: 400 }
      );
    }

    // 3. Create Razorpay order using server-validated offer amount
    const amountPaise = offer.customPricePaise; // e.g. 100 paise for ₹1
    const orderReceipt = `receipt_ofr_${offer.id.slice(-6)}_${Date.now().toString().slice(-4)}`;

    const razorpayOrder = await createRazorpayOrder({
      amount: amountPaise,
      currency: "INR",
      receipt: orderReceipt,
      notes: {
        offerId: offer.id,
        schoolId,
        planId: offer.offerPlanId,
        userId,
        offerType: offer.offerType || "PROMOTIONAL_RECURRING",
      },
    });

    const keyId = getRazorpayKeyId();

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amountPaise,
      amountRupees: Math.round(amountPaise / 100),
      currency: "INR",
      keyId,
      offer: {
        id: offer.id,
        name: offer.name,
        offerPlanId: offer.offerPlanId,
        planName: offer.planName,
        billingCycle: offer.billingCycle,
        originalPricePaise: offer.originalPricePaise,
        customPricePaise: offer.customPricePaise,
        discountPercentage: offer.discountPercentage,
        validUntil: offer.validUntil || offer.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/billing/offers/checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create offer payment order." },
      { status: 500 }
    );
  }
}
