import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { repairSchoolClassesAndStudentsAdmin } from "@/lib/services/student-class-repair.server";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return (
        authResult.errorResponse ||
        NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Unauthorized: Authentication required." },
          },
          { status: 401 }
        )
      );
    }

    if (authResult.user.role !== "school_admin" && authResult.user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Forbidden: Admin access required." },
        },
        { status: 403 }
      );
    }

    let schoolId = authResult.user.schoolId;

    // If super_admin, allow specifying targetSchoolId in request body
    if (authResult.user.role === "super_admin") {
      try {
        const body = await request.json().catch(() => ({}));
        if (body.targetSchoolId) {
          schoolId = body.targetSchoolId;
        }
      } catch {}
    }

    if (!schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_SCHOOL", message: "No school associated with this request." },
        },
        { status: 400 }
      );
    }

    const summary = await repairSchoolClassesAndStudentsAdmin(schoolId);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error("[API Repair Classes & Students] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message || "Failed to repair class and student data." },
      },
      { status: 500 }
    );
  }
}
