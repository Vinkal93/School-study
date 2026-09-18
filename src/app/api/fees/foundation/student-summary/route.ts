import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getStudentFinancialSummary } from "@/lib/services/fee-foundation.service";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
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
    console.error("GET /api/fees/foundation/student-summary error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch student financial summary" }, { status: 500 });
  }
}
