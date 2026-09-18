import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getFeeDashboardSummary } from "@/lib/services/fee-analytics.service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const month = searchParams.get("month") || undefined;
    const className = searchParams.get("className") || undefined;
    const sectionName = searchParams.get("sectionName") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const summary = await getFeeDashboardSummary(targetSchoolId, {
      academicYearId,
      month,
      className,
      sectionName,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/analytics/dashboard error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load fee dashboard analytics" },
      { status: 500 }
    );
  }
}
