import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { duplicateFeeStructuresForAcademicYear } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: Only administrators can duplicate fee structures." }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId: clientSchoolId, sourceAcademicYearId, targetAcademicYearId, targetAcademicYearName } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !sourceAcademicYearId || !targetAcademicYearId) {
      return NextResponse.json({ error: "sourceAcademicYearId and targetAcademicYearId are required" }, { status: 400 });
    }

    const duplicated = await duplicateFeeStructuresForAcademicYear(
      targetSchoolId,
      sourceAcademicYearId,
      targetAcademicYearId,
      targetAcademicYearName || targetAcademicYearId,
      authResult.user.uid
    );

    return NextResponse.json({
      success: true,
      count: duplicated.length,
      structures: duplicated,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/structures/duplicate error:", err);
    return NextResponse.json({ error: err.message || "Failed to duplicate fee structures" }, { status: 500 });
  }
}
