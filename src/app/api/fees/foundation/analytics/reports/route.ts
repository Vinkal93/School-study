import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getClassCollectionSummary,
  getFeeHeadCollectionSummary,
  getPaymentMethodReport,
  getFeeDashboardSummary,
} from "@/lib/services/fee-analytics.service";

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

    const reportType = searchParams.get("type") || "collection_summary";
    const academicYearId = searchParams.get("academicYearId") || "ay_2026_27";
    const month = searchParams.get("month") || undefined;
    const className = searchParams.get("className") || undefined;
    const sectionName = searchParams.get("sectionName") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    let reportData: any = null;

    if (reportType === "class_wise") {
      reportData = await getClassCollectionSummary(targetSchoolId, {
        academicYearId,
        month,
      });
    } else if (reportType === "fee_head") {
      reportData = await getFeeHeadCollectionSummary(targetSchoolId, {
        academicYearId,
        className,
        month,
      });
    } else if (reportType === "payment_mode") {
      reportData = await getPaymentMethodReport(targetSchoolId, {
        academicYearId,
        startDate,
        endDate,
      });
    } else {
      // Default: collection_summary
      reportData = await getFeeDashboardSummary(targetSchoolId, {
        academicYearId,
        month,
        className,
        sectionName,
        startDate,
        endDate,
      });
    }

    return NextResponse.json({
      success: true,
      reportType,
      data: reportData,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/analytics/reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate fee report" },
      { status: 500 }
    );
  }
}
