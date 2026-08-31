import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";
import {
  getCurrentSubscription,
  resolveSubscriptionStatus,
  getSubscriptionHistory,
} from "@/lib/billing/subscriptionEngine";
import { getActivePlan, getActivePlanVersion } from "@/lib/billing/plans";
import { getSchoolUsage } from "@/lib/billing/usage";
import type {
  SchoolSubscription,
  SubscriptionAdjustmentRecord,
  AccessOverrideRecord,
  LimitOverrideRecord,
  PenaltyRecord,
  FinancialAdjustmentRecord,
} from "@/types";

/**
 * GET /api/super-admin/subscriptions/[subscriptionId]
 * Full subscription control center data bundle including adjustments, overrides, penalties, usage & timeline.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required." }, { status: 400 });
    }

    const { requireSuperAdmin } = await import("@/lib/auth/serverAuth");
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const subscription = await getCurrentSubscription(subscriptionId);
    const resolvedState = resolveSubscriptionStatus(subscription);
    const history = await getSubscriptionHistory(subscriptionId);
    const plan = await getActivePlan(subscription.planId);
    const planVersion = await getActivePlanVersion(subscription.planId);
    const usage = await getSchoolUsage(subscription.schoolId);

    const db = getFirebaseDb();
    let schoolData: any = null;
    const adjustments: SubscriptionAdjustmentRecord[] = [];
    const accessOverrides: AccessOverrideRecord[] = [];
    const limitOverrides: LimitOverrideRecord[] = [];
    const penalties: PenaltyRecord[] = [];
    const financialAdjustments: FinancialAdjustmentRecord[] = [];
    const payments: any[] = [];
    const invoices: any[] = [];

    if (db) {
      // 1. Fetch School Document
      try {
        const schSnap = await getDoc(doc(db, "schools", subscription.schoolId));
        if (schSnap.exists()) {
          schoolData = { id: schSnap.id, ...schSnap.data() };
        }
      } catch (e) {}

      // 2. Fetch Adjustments
      try {
        const adjSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        adjSnap.forEach((d) => adjustments.push({ id: d.id, ...d.data() } as SubscriptionAdjustmentRecord));
        adjustments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {}

      // 3. Fetch Access Overrides
      try {
        const accSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        accSnap.forEach((d) => accessOverrides.push({ id: d.id, ...d.data() } as AccessOverrideRecord));
        accessOverrides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {}

      // 4. Fetch Limit Overrides
      try {
        const limSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.LIMIT_OVERRIDES),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        limSnap.forEach((d) => limitOverrides.push({ id: d.id, ...d.data() } as LimitOverrideRecord));
        limitOverrides.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {}

      // 5. Fetch Penalties
      try {
        const penSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.PENALTIES),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        penSnap.forEach((d) => penalties.push({ id: d.id, ...d.data() } as PenaltyRecord));
        penalties.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {}

      // 6. Fetch Financial Adjustments
      try {
        const finSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.FINANCIAL_ADJUSTMENTS),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        finSnap.forEach((d) => financialAdjustments.push({ id: d.id, ...d.data() } as FinancialAdjustmentRecord));
        financialAdjustments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (e) {}

      // 7. Fetch Payments
      try {
        const paySnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        paySnap.forEach((d) => payments.push({ id: d.id, ...d.data() }));
        payments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } catch (e) {}

      // 8. Fetch Invoices
      try {
        const invSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.INVOICES || "invoices"),
            where("schoolId", "==", subscription.schoolId)
          )
        );
        invSnap.forEach((d) => invoices.push({ id: d.id, ...d.data() }));
        invoices.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } catch (e) {}
    }

    // Payment Financial Summary
    const successfulPayments = payments.filter((p) => p.status === "SUCCESS" || p.status === "captured");
    const totalPaidPaise = successfulPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalRefundedPaise = successfulPayments.reduce((acc, p) => acc + (p.refundedAmount || 0), 0);
    const netCollectedPaise = totalPaidPaise - totalRefundedPaise;
    const lastPayment = successfulPayments[0] || null;

    // Unified Chronological Timeline
    const timeline: any[] = [];

    if (subscription.createdAt) {
      timeline.push({
        id: "evt_sub_created",
        type: "SUBSCRIPTION_CREATED",
        title: "Subscription Created",
        description: `Plan: ${plan?.name || subscription.planId} (${subscription.billingCycle})`,
        timestamp: subscription.createdAt,
        badgeColor: "blue",
      });
    }

    payments.forEach((p) => {
      timeline.push({
        id: `evt_pay_${p.id}`,
        type: "PAYMENT",
        title: `Payment ${p.status === "SUCCESS" || p.status === "captured" ? "Received" : p.status}`,
        description: `Amount: ₹${Math.round((p.amount || 0) / 100).toLocaleString("en-IN")} via ${p.method || "Razorpay"}`,
        timestamp: p.capturedAt || p.createdAt,
        badgeColor: p.status === "SUCCESS" || p.status === "captured" ? "emerald" : "rose",
      });
    });

    adjustments.forEach((adj) => {
      timeline.push({
        id: `evt_adj_${adj.id}`,
        type: "ADJUSTMENT",
        title: `Subscription Adjusted: ${adj.type.replace(/_/g, " ")}`,
        description: `Reason: ${adj.reason} | By: ${adj.actorRole || "Super Admin"}`,
        timestamp: adj.createdAt,
        badgeColor: "amber",
      });
    });

    accessOverrides.forEach((ovr) => {
      timeline.push({
        id: `evt_ovr_${ovr.id}`,
        type: "OVERRIDE",
        title: `Access Override: ${ovr.type.replace(/_/g, " ")}`,
        description: `${ovr.featureKey ? `Feature: ${ovr.featureKey} | ` : ""}Reason: ${ovr.reason}`,
        timestamp: ovr.createdAt,
        badgeColor: "purple",
      });
    });

    penalties.forEach((pen) => {
      timeline.push({
        id: `evt_pen_${pen.id}`,
        type: "PENALTY",
        title: `Penalty Applied: ₹${Math.round(pen.amount / 100).toLocaleString("en-IN")}`,
        description: `Status: ${pen.status} | Reason: ${pen.reason}`,
        timestamp: pen.createdAt,
        badgeColor: "rose",
      });
    });

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      subscription,
      resolvedState,
      school: schoolData || {
        name: `School (${subscription.schoolId})`,
        adminName: "School Admin",
      },
      plan,
      planVersion,
      usage,
      paymentSummary: {
        totalPaidPaise,
        totalRefundedPaise,
        netCollectedPaise,
        lastPayment,
      },
      adjustments,
      accessOverrides,
      limitOverrides,
      penalties,
      financialAdjustments,
      payments,
      invoices,
      timeline,
    });
  } catch (error: any) {
    console.error("GET Subscription Detail Error:", error);
    return NextResponse.json(
      { error: "Failed to load subscription detail: " + (error.message || "") },
      { status: 500 }
    );
  }
}
