import { NextResponse } from "next/server";
import { getCurrentSubscription, resolveSubscriptionStatus, getSubscriptionHistory } from "@/lib/billing/subscriptionEngine";
import { getActivePlan, getActivePlanVersion } from "@/lib/billing/plans";

/**
 * GET /api/billing/subscription
 * Returns current subscription details, resolved status, plan limits, and history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || "school_default";

    const subscription = await getCurrentSubscription(schoolId);
    const resolvedState = resolveSubscriptionStatus(subscription);
    const history = await getSubscriptionHistory(schoolId);
    const plan = await getActivePlan(subscription.planId);
    const planVersion = await getActivePlanVersion(subscription.planId);

    return NextResponse.json({
      success: true,
      subscription,
      resolvedState,
      plan,
      planVersion,
      history,
    });
  } catch (error: any) {
    console.error("GET Billing Subscription Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status: " + (error.message || "") },
      { status: 500 }
    );
  }
}
