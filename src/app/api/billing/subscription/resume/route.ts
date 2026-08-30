import { NextResponse } from "next/server";
import { resumeSubscription } from "@/lib/billing/subscriptionLifecycleEngine";

/**
 * POST /api/billing/subscription/resume
 * Resumes a subscription scheduled for cancellation (cancelAtPeriodEnd = false).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, actorId = "school_admin" } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required." }, { status: 400 });
    }

    const result = await resumeSubscription(schoolId, actorId);

    return NextResponse.json({
      success: true,
      message: "Subscription resumed successfully. Auto-renewal status restored.",
      subscription: result.subscription,
    });
  } catch (error: any) {
    console.error("POST Resume Subscription Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resume subscription." },
      { status: 500 }
    );
  }
}
