import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  previewBulkDemandGeneration,
  generateBulkFeeDemands,
} from "@/lib/services/fee-foundation.service";

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
      action = "generate", // "preview" | "generate"
      academicYearId,
      academicYearName,
      className,
      sectionName,
      periodName,
      studentIds,
      includeArrears,
    } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !academicYearId) {
      return NextResponse.json({ error: "schoolId and academicYearId are required" }, { status: 400 });
    }

    const options = {
      academicYearId,
      academicYearName,
      className: className || "all",
      sectionName: sectionName || "all",
      periodName: periodName || "all",
      studentIds,
      includeArrears: Boolean(includeArrears),
      actorId: authResult.user.uid,
      actorName: authResult.user.name || authResult.user.role,
    };

    if (action === "preview") {
      const previewResult = await previewBulkDemandGeneration(targetSchoolId, options);
      return NextResponse.json({ success: true, ...previewResult });
    }

    const executionResult = await generateBulkFeeDemands(targetSchoolId, options);
    return NextResponse.json({ success: true, ...executionResult });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/demands/bulk error:", err);
    return NextResponse.json({ error: err.message || "Bulk demand generation failed" }, { status: 500 });
  }
}
