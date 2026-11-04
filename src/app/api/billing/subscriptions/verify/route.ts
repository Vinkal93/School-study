import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import {
  verifyRazorpaySubscriptionSignatureAsync,
  getRazorpayClientAsync,
} from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfillment";
import { logAuditEvent } from "@/lib/services/audit.service";
import type { AuditAction, AuditTargetType } from "@/types/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;

    const body = await request.json().catch(() => ({}));
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      schoolId: requestedSchoolId,
    } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required subscription verification parameters." },
        { status: 400 }
      );
    }

    const schoolId = String(requestedSchoolId || actor.user.schoolId || "");
    if (!schoolId || !ownsBillingSchool(actor.user, schoolId)) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    // 1. Authoritative HMAC-SHA256 signature verification
    const isSignatureValid = await verifyRazorpaySubscriptionSignatureAsync({
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    });

    if (!isSignatureValid) {
      console.error("[Subscription Verification] Cryptographic signature mismatch", {
        razorpay_payment_id,
        razorpay_subscription_id,
      });
      return NextResponse.json(
        { error: "Invalid payment signature for recurring subscription." },
        { status: 400 }
      );
    }

    // 2. Fetch local pending intent
    const pendingSnap = await actor.db
      .collection("razorpaySubscriptions")
      .doc(razorpay_subscription_id)
      .get();

    if (!pendingSnap.exists) {
      return NextResponse.json(
        { error: "Subscription record not found. Please contact support." },
        { status: 404 }
      );
    }

    const pendingData = pendingSnap.data()!;
    if (pendingData.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Tenant boundary violation: Subscription does not belong to this school." },
        { status: 403 }
      );
    }

    // 3. Reconcile with Razorpay API
    const gateway = await getRazorpayClientAsync();
    const [actualPayment, mandate] = await Promise.all([
      gateway.payments.fetch(razorpay_payment_id),
      gateway.subscriptions.fetch(razorpay_subscription_id),
    ]);

    if (!actualPayment || !mandate) {
      return NextResponse.json(
        { error: "Unable to verify payment with Razorpay gateway." },
        { status: 502 }
      );
    }

    // 4. Create an authoritative order record to fulfill via fulfillment engine
    const orderId = `rec_${razorpay_payment_id}`;
    const orderRef = actor.db.collection("orders").doc(orderId);
    const now = new Date().toISOString();
    const periodEndSeconds = Number(mandate.current_end || 0);
    const subscriptionPeriodEnd = periodEndSeconds > 0
      ? new Date(periodEndSeconds * 1000).toISOString()
      : new Date(Date.now() + 30 * 86400000).toISOString();

    await actor.db.runTransaction(async (tx) => {
      const existing = await tx.get(orderRef);
      if (!existing.exists) {
        tx.set(orderRef, {
          id: orderId,
          schoolId,
          userId: actor.user.uid,
          planId: pendingData.planId,
          planVersionId: pendingData.planVersionId,
          billingCycle: pendingData.billingCycle,
          baseAmount: pendingData.baseAmount,
          discountAmount: pendingData.discountAmount,
          taxAmount: pendingData.taxAmount,
          finalAmount: pendingData.amountPaise,
          currency: "INR",
          couponId: pendingData.couponCode || null,
          status: "CREATED",
          razorpayOrderId: actualPayment.order_id || "",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySubscriptionId: razorpay_subscription_id,
          subscriptionPeriodEnd,
          createdAt: now,
          expiresAt: subscriptionPeriodEnd,
        });
      }
    });

    // 5. Fulfill payment, update school entitlements, and generate invoice
    const fulfillmentResult = await fulfillSuccessfulPayment(orderId, razorpay_payment_id, "callback");

    // 6. Authoritatively update onboarding state to ONBOARDING_COMPLETE
    await actor.db.collection("schools").doc(schoolId).update({
      onboardingStatus: "ONBOARDING_COMPLETE",
      subscriptionStatus: "ACTIVE",
      planId: pendingData.planId,
      updatedAt: now,
    }).catch(() => {});

    // Update pending subscription intent status
    await actor.db.collection("razorpaySubscriptions").doc(razorpay_subscription_id).update({
      status: "ACTIVE",
      razorpayPaymentId: razorpay_payment_id,
      activatedAt: now,
      updatedAt: now,
    }).catch(() => {});

    // 7. Security audit logging
    await logAuditEvent({
      actorId: actor.user.uid,
      actorName: (actor.user as any).name || "School Admin",
      actorEmail: (actor.user as any).email || "",
      actorRole: actor.user.role as any,
      actorSchoolId: schoolId,
      targetUserId: actor.user.uid,
      targetSchoolId: schoolId,
      action: "SUBSCRIPTION_ACTIVATED" as AuditAction,
      entityType: "school" as AuditTargetType,
      entityId: schoolId,
      reason: `Recurring subscription ${razorpay_subscription_id} verified and activated.`,
      metadata: {
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        planId: pendingData.planId,
        amountPaise: pendingData.amountPaise,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Subscription activated successfully! Welcome to SchoolStudy.",
      redirectUrl: "/admin",
      orderId,
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      expiresAt: fulfillmentResult.subscription.expiresAt,
    });
  } catch (error: any) {
    console.error("POST /api/billing/subscriptions/verify error:", error);
    return NextResponse.json(
      { error: error?.message || "Subscription verification failed." },
      { status: 500 }
    );
  }
}
