import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import {
  getCurrentSubscription,
  resolveSubscriptionStatus,
  getSubscriptionHistory,
} from "@/lib/billing/subscriptionEngine";
import {
  suspendSubscription,
  resumeSuspendedSubscription,
} from "@/lib/billing/subscriptionLifecycleEngine";
import { getActivePlan, getActivePlanVersion } from "@/lib/billing/plans";

/**
 * GET /api/super-admin/subscriptions/[subscriptionId]
 * Returns full subscription details, plan version, history, invoices, and payment records
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

    const subscription = await getCurrentSubscription(subscriptionId);
    const resolvedState = resolveSubscriptionStatus(subscription);
    const history = await getSubscriptionHistory(subscriptionId);
    const plan = await getActivePlan(subscription.planId);
    const planVersion = await getActivePlanVersion(subscription.planId);

    const db = getFirebaseDb();
    const payments: any[] = [];
    const invoices: any[] = [];

    if (db) {
      // Fetch Payments for this school
      try {
        const paySnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"),
            where("schoolId", "==", subscriptionId)
          )
        );
        paySnap.forEach((d) => payments.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Notice: Payments fetch notice:", e);
      }

      // Fetch Invoices for this school
      try {
        const invSnap = await getDocs(
          query(
            collection(db, BILLING_COLLECTIONS.INVOICES || "invoices"),
            where("schoolId", "==", subscriptionId)
          )
        );
        invSnap.forEach((d) => invoices.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn("Notice: Invoices fetch notice:", e);
      }
    }

    return NextResponse.json({
      success: true,
      subscription,
      resolvedState,
      plan,
      planVersion,
      history,
      payments,
      invoices,
    });
  } catch (error: any) {
    console.error("GET Subscription Detail Error:", error);
    return NextResponse.json(
      { error: "Failed to load subscription detail: " + (error.message || "") },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/subscriptions/[subscriptionId]
 * Emergency Super Admin Action: Suspend or Resume Subscription with mandatory reason & audit trail.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const body = await request.json();
    const { actionType, reason, actorId = "super_admin" } = body;

    if (actionType === "suspend") {
      if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
        return NextResponse.json(
          { error: "A valid reason (at least 3 characters) is required for emergency suspension." },
          { status: 400 }
        );
      }

      const result = await suspendSubscription(subscriptionId, reason.trim(), actorId);
      return NextResponse.json({
        success: true,
        message: `Subscription for school '${subscriptionId}' has been SUSPENDED successfully.`,
        subscription: result.subscription,
      });
    } else if (actionType === "resume") {
      const result = await resumeSuspendedSubscription(subscriptionId, actorId);
      return NextResponse.json({
        success: true,
        message: `Subscription for school '${subscriptionId}' has been RESUMED to ACTIVE state.`,
        subscription: result.subscription,
      });
    }

    return NextResponse.json({ error: "Invalid action type. Allowed: 'suspend', 'resume'." }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH Subscription Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription." },
      { status: 500 }
    );
  }
}
