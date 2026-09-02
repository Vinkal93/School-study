import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import { createBillingAuditLog } from "@/lib/billing/audit";
import {
  cancelRazorpaySubscription,
  resumeRazorpaySubscription,
} from "@/lib/payments/razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, autoRenew, actorId = "school_admin" } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required." }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }

    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    const snap = await getDoc(subRef);

    if (!snap.exists()) {
      return NextResponse.json({ error: "Subscription record not found." }, { status: 404 });
    }

    const currentSub = snap.data();
    const isAutoRenewEnabled = Boolean(autoRenew);
    const rzpSubId = currentSub.razorpaySubscriptionId;

    let gatewayResult = null;

    // Interact with official Razorpay Subscriptions API
    if (rzpSubId && !rzpSubId.startsWith("sub_rzp_")) {
      try {
        if (!isAutoRenewEnabled) {
          // Cancel recurring mandate at cycle end without immediately revoking entitlement
          gatewayResult = await cancelRazorpaySubscription(rzpSubId, true);
        } else {
          // Re-enable / resume recurring mandate
          gatewayResult = await resumeRazorpaySubscription(rzpSubId);
        }
      } catch (gatewayErr: any) {
        console.warn("Razorpay Auto-Renew Gateway Notice:", gatewayErr.message);
      }
    }

    // Update Firestore record: preserve current entitlement and status until expiresAt
    await updateDoc(subRef, {
      autoRenew: isAutoRenewEnabled,
      cancelAtPeriodEnd: !isAutoRenewEnabled,
      updatedAt: new Date().toISOString(),
    });

    // Write Audit Trail Log
    await createBillingAuditLog(
      actorId,
      "school_admin",
      "AUTO_RENEWAL_TOGGLED",
      "schoolSubscription",
      schoolId,
      {
        autoRenew: isAutoRenewEnabled,
        cancelAtPeriodEnd: !isAutoRenewEnabled,
        razorpaySubscriptionId: rzpSubId,
        gatewayUpdated: Boolean(gatewayResult),
      }
    );

    return NextResponse.json({
      success: true,
      autoRenew: isAutoRenewEnabled,
      cancelAtPeriodEnd: !isAutoRenewEnabled,
      message: isAutoRenewEnabled
        ? "Auto-renewal has been turned ON. Your subscription will automatically renew."
        : "Auto-renewal has been turned OFF. Your subscription will remain active until the current expiry date.",
    });
  } catch (err: any) {
    console.error("POST Auto-Renew Toggle Error:", err);
    return NextResponse.json(
      { error: "Failed to update auto-renewal setting: " + (err.message || "") },
      { status: 500 }
    );
  }
}
