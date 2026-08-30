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
    let plan = await getActivePlan(subscription.planId).catch(() => null);
    let planVersion = await getActivePlanVersion(subscription.planId).catch(() => null);

    if (!plan) {
      plan = {
        id: subscription.planId || "plan_starter",
        name: subscription.planId === "plan_professional" ? "Professional Plan" : subscription.planId === "plan_enterprise" ? "Enterprise Plan" : "Starter Plan",
        slug: subscription.planId ? subscription.planId.replace("plan_", "") : "starter",
        description: "Standard school management plan",
        status: "ACTIVE",
        displayOrder: 1,
        isPopular: subscription.planId === "plan_professional",
        features: ["Student Management", "Teacher Management", "Classes", "Attendance"],
        limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (!planVersion) {
      planVersion = {
        id: `${plan.id}_v1`,
        planId: plan.id,
        version: 1,
        monthlyPrice: plan.slug === "professional" ? 199900 : 99900,
        annualPrice: plan.slug === "professional" ? 159900 : 79900,
        currency: "INR",
        features: plan.features,
        limits: plan.limits,
        effectiveFrom: new Date().toISOString(),
        effectiveUntil: null,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };
    }

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
