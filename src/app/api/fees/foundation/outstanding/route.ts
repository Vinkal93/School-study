import { NextResponse } from "next/server";
import { requireFeeAccess as authenticateRequest } from "@/lib/fees/server-access";
import {
  calculateStudentOutstanding,
  calculateClassOutstanding,
  calculateSectionOutstanding,
} from "@/lib/services/fee-foundation.service";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");

    const targetSchoolId = authResult.isAuthenticated && authResult.user
      ? (authResult.user.role === "super_admin" ? (requestedSchoolId || authResult.user.schoolId) : authResult.user.schoolId)
      : requestedSchoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Missing school identifier" }, { status: 400 });
    }

    const type = searchParams.get("type"); // "student" | "class" | "section"
    const studentId = searchParams.get("studentId");
    const className = searchParams.get("className");
    const sectionName = searchParams.get("sectionName");
    const academicYearId = searchParams.get("academicYearId") || "ay_current";

    if (type === "student" && studentId) {
      const summary = await calculateStudentOutstanding(targetSchoolId, studentId, academicYearId);
      return NextResponse.json({ success: true, summary });
    }

    if (type === "section" && className && sectionName) {
      const summary = await calculateSectionOutstanding(targetSchoolId, className, sectionName, academicYearId);
      return NextResponse.json({ success: true, summary });
    }

    if (type === "class" && className) {
      const summary = await calculateClassOutstanding(targetSchoolId, className, academicYearId);
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: "Invalid type or missing parameters (studentId / className)" }, { status: 400 });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/outstanding error:", err);
    return NextResponse.json({ error: err.message || "Failed to calculate outstanding balance" }, { status: 500 });
  }
}
