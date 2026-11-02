import { requireFeeAccess } from "@/lib/fees/server-access";
import { NextResponse } from "next/server";
import { adjustStudentMonthLedger } from "@/lib/services/fee.service";
import { canAccessFeature } from "@/lib/billing/featureAccess";

export async function POST(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const body = await request.json();
    const { schoolId: requestedSchoolId, studentId, monthName, adjustment, actorId, academicYearId } = body;
    const schoolId = auth.user.role === "super_admin" ? requestedSchoolId || auth.user.schoolId : auth.user.schoolId;

    if (!schoolId || !studentId || !monthName || !adjustment) {
      return NextResponse.json(
        { error: "Missing required fields for month adjustment" },
        { status: 400 }
      );
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const updated = await adjustStudentMonthLedger(
      schoolId,
      studentId,
      monthName,
      adjustment,
      auth.user.uid,
      academicYearId || "ay_current"
    );

    return NextResponse.json({ success: true, assignment: updated });
  } catch (err: any) {
    console.error("POST /api/fees/adjustments error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to adjust student fee ledger" },
      { status: 500 }
    );
  }
}
