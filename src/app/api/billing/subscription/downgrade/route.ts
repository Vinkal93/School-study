import { NextResponse } from "next/server";
import { scheduleDowngrade } from "@/lib/billing/subscriptionLifecycleEngine";

/**
 * POST /api/billing/subscription/downgrade
 * Schedules a downgrade to a lower-tier plan at period end with limit pre-validation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, targetPlanId, currentStudentCount = 0, currentTeacherCount = 0, actorId = "school_admin" } = body;

    if (!schoolId || !targetPlanId) {
      return NextResponse.json(
        { error: "School ID and Target Plan ID are required." },
        { status: 400 }
      );
    }

    const result = await scheduleDowngrade(schoolId, {
      targetPlanId,
      currentStudentCount: parseInt(currentStudentCount.toString(), 10),
      currentTeacherCount: parseInt(currentTeacherCount.toString(), 10),
      actorId,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      pendingChange: result.pendingChange,
    });
  } catch (error: any) {
    console.error("POST Schedule Downgrade Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule downgrade." },
      { status: 400 }
    );
  }
}
