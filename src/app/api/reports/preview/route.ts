import { NextResponse } from "next/server";
import { generateSchoolReport, generateGlobalSuperAdminReport } from "@/lib/reports/reportEngine";
import type { SchoolReportType, SuperAdminReportType } from "@/types/reports";
import { createBillingAuditLog } from "@/lib/billing/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportType, schoolId, filters = {}, userPlanTier = "PROFESSIONAL", actorId = "admin", actorRole = "school_admin" } = body;

    if (!reportType) {
      return NextResponse.json({ error: "reportType is required." }, { status: 400 });
    }

    let reportResult;

    // 1. Global Super Admin Reports
    if (reportType.startsWith("GLOBAL_")) {
      if (actorRole !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized. Global platform reports require Super Admin role." }, { status: 403 });
      }
      reportResult = await generateGlobalSuperAdminReport(reportType as SuperAdminReportType, filters);
    }
    // 2. School-Scoped Reports
    else {
      if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required for school reports." }, { status: 400 });
      }
      reportResult = await generateSchoolReport(schoolId, reportType as SchoolReportType, filters, userPlanTier);
    }

    // Audit Logging
    await createBillingAuditLog(
      actorId,
      actorRole,
      "REPORT_VIEWED" as any,
      "schoolSubscription",
      schoolId || "global",
      { reportType, totalRecords: reportResult.totalRecords, isRestricted: reportResult.isRestricted }
    );

    return NextResponse.json({
      success: true,
      data: reportResult,
    });
  } catch (error: any) {
    console.error("POST /api/reports/preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report preview." },
      { status: 500 }
    );
  }
}
