import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { applyFeeWaiver } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: Only school administrators can approve fee waivers." }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId: clientSchoolId, studentId, demandId, amountRupees, reason, approvedBy } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !studentId || !demandId || !amountRupees || !reason) {
      return NextResponse.json({ error: "Missing required fields (studentId, demandId, amountRupees, reason)" }, { status: 400 });
    }

    const result = await applyFeeWaiver(
      targetSchoolId,
      studentId,
      demandId,
      Number(amountRupees),
      reason,
      approvedBy || authResult.user.name || "School Principal",
      authResult.user.uid
    );

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/waiver error:", err);
    return NextResponse.json({ error: err.message || "Failed to apply fee waiver" }, { status: 400 });
  }
}
