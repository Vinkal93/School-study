import { NextResponse } from "next/server";
import { generateSchoolReport, generateGlobalSuperAdminReport } from "@/lib/reports/reportEngine";
import type { SchoolReportType, SuperAdminReportType } from "@/types/reports";
import { createBillingAuditLog } from "@/lib/billing/audit";
import { requireSchoolAdmin, requireSuperAdmin } from "@/lib/auth/serverAuth";
import { requireEntitlement, buildEntitlementErrorResponse } from "@/lib/billing/middleware";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportType, schoolId, filters = {} } = body;

    if (!reportType) {
      return NextResponse.json({ error: "reportType is required." }, { status: 400 });
    }

    let reportResult;
    let actorId = "system";
    let actorRole = "admin";

    // 1. Global Super Admin Reports
    if (reportType.startsWith("GLOBAL_")) {
      const auth = await requireSuperAdmin(request);
      if (auth.errorResponse) return auth.errorResponse;
      actorId = auth.user!.uid;
      actorRole = auth.user!.role;
      reportResult = await generateGlobalSuperAdminReport(reportType as SuperAdminReportType, filters);
    }
    // 2. School-Scoped Reports
    else {
      if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required for school reports." }, { status: 400 });
      }

      const auth = await requireSchoolAdmin(request, schoolId);
      if (auth.errorResponse) return auth.errorResponse;
      actorId = auth.user!.uid;
      actorRole = auth.user!.role;

      // Authoritative Server-Side Entitlement Check
      if (actorRole !== "super_admin") {
        try {
          await requireEntitlement(schoolId, { feature: "advanced_reports" });
        } catch (entErr: any) {
          return buildEntitlementErrorResponse(entErr);
        }
      }

      reportResult = await generateSchoolReport(schoolId, reportType as SchoolReportType, filters);
    }

    // Audit Logging
    try {
      await createBillingAuditLog(
        actorId,
        actorRole,
        "REPORT_VIEWED" as any,
        "schoolSubscription",
        schoolId || "global",
        { reportType, totalRecords: reportResult.totalRecords, isRestricted: reportResult.isRestricted }
      );
    } catch (e) {}

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
