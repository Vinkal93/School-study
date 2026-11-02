import { NextResponse } from "next/server";
import { requireFeeAccess as authenticateRequest } from "@/lib/fees/server-access";
import { getStudentFinancialSummary } from "@/lib/services/fee-foundation.service";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");
    const requestedStudentId = searchParams.get("studentId");
    const academicYearId = searchParams.get("academicYearId") || "ay_current";

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (requestedSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    const targetStudentId = authResult.user.role === "student"
      ? (authResult.user.studentId || authResult.user.uid)
      : requestedStudentId;

    if (!targetSchoolId || !targetStudentId) {
      return NextResponse.json({ error: "Missing school or student identifier" }, { status: 400 });
    }

    const summary = await getStudentFinancialSummary(targetSchoolId, targetStudentId, academicYearId);
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.warn("Notice: Student financial summary server fallback:", err?.message);
    return NextResponse.json({ error: err?.message || "Student financial summary unavailable." }, { status: 500 });
  }
}
