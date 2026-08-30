import { NextResponse } from "next/server";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/billing/subscriptionLifecycleEngine";

/**
 * POST /api/billing/subscription/cancel
 * Sets cancelAtPeriodEnd = true for the school's subscription.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, actorId = "school_admin" } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required." }, { status: 400 });
    }

    const result = await cancelSubscriptionAtPeriodEnd(schoolId, actorId);

    return NextResponse.json({
      success: true,
      message: "Subscription set to cancel at period end. Access will be maintained until expiration.",
      subscription: result.subscription,
    });
  } catch (error: any) {
    console.error("POST Cancel Subscription Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription." },
      { status: 500 }
    );
  }
}
