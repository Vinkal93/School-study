import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { generateStudentFeeDemands } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: You cannot generate fee demands." }, { status: 403 });
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      academicYearId,
      academicYearName,
    } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !studentId) {
      return NextResponse.json({ error: "Missing school or student identifier" }, { status: 400 });
    }

    const demands = await generateStudentFeeDemands(
      targetSchoolId,
      {
        id: studentId,
        name: studentName || "Student",
        admissionNumber: admissionNumber || studentId,
        className: className || "",
        sectionName: sectionName || "A",
      },
      academicYearId || "ay_current",
      academicYearName || "2026-27",
      authResult.user.uid
    );

    return NextResponse.json({ success: true, count: demands.length, demands });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/demands/generate error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate fee demands" }, { status: 400 });
  }
}
