import { NextResponse } from "next/server";
import { generateSchoolReport, generateGlobalSuperAdminReport, REPORT_CONFIGS } from "@/lib/reports/reportEngine";
import { exportToCsv, exportToExcel, exportToPdf } from "@/lib/reports/exportEngine";
import type { SchoolReportType, SuperAdminReportType, ReportExportFormat } from "@/types/reports";
import { createBillingAuditLog } from "@/lib/billing/audit";
import { requireSchoolAdmin, requireSuperAdmin } from "@/lib/auth/serverAuth";

import { requireEntitlement, buildEntitlementErrorResponse } from "@/lib/billing/middleware";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportType,
      schoolId,
      format = "csv",
      filters = {},
      userPlanTier = "PROFESSIONAL",
    } = body;

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
        return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
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
          await createBillingAuditLog(
            actorId,
            actorRole,
            "REPORT_EXPORT_FAILED" as any,
            "schoolSubscription",
            schoolId || "unauthorized",
            { reportType, reason: entErr.message }
          );
          return buildEntitlementErrorResponse(entErr);
        }
      }

      if (body.clientRows && Array.isArray(body.clientRows) && body.clientRows.length > 0) {
        const config = REPORT_CONFIGS[reportType as SchoolReportType];
        reportResult = {
          reportType: reportType as SchoolReportType,
          title: config?.title || "Report",
          description: "Official Institutional Record",
          schoolName: body.schoolName || "School",
          schoolId,
          generatedAt: new Date().toISOString(),
          columns: config?.columns || [],
          rows: body.clientRows,
          summaryMetrics: [
            { label: "Total Records", value: body.clientRows.length },
          ],
          totalRecords: body.clientRows.length,
          isRestricted: false,
        };
      } else {
        reportResult = await generateSchoolReport(schoolId, reportType as SchoolReportType, filters, userPlanTier);
      }
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const sanitizedTitle = (reportResult.title || "report").toLowerCase().replace(/[^a-z0-9]+/g, "_");

    // A. CSV EXPORT
    if (format === "csv") {
      const csvString = exportToCsv(reportResult);
      const filename = `${sanitizedTitle}_${timestamp}.csv`;

      await createBillingAuditLog(
        actorId,
        actorRole,
        "REPORT_EXPORTED" as any,
        "schoolSubscription",
        schoolId || "global",
        { reportType, format: "csv", totalRecords: reportResult.totalRecords }
      );

      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // B. EXCEL (.XLSX) EXPORT
    if (format === "xlsx") {
      const excelBuffer = await exportToExcel(reportResult);
      const filename = `${sanitizedTitle}_${timestamp}.xlsx`;

      await createBillingAuditLog(
        actorId,
        actorRole,
        "REPORT_EXPORTED" as any,
        "schoolSubscription",
        schoolId || "global",
        { reportType, format: "xlsx", totalRecords: reportResult.totalRecords }
      );

      return new NextResponse(Buffer.from(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // C. PDF EXPORT
    if (format === "pdf") {
      const pdfBuffer = await exportToPdf(reportResult);
      const filename = `${sanitizedTitle}_${timestamp}.pdf`;

      await createBillingAuditLog(
        actorId,
        actorRole,
        "REPORT_EXPORTED" as any,
        "schoolSubscription",
        schoolId || "global",
        { reportType, format: "pdf", totalRecords: reportResult.totalRecords }
      );

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported export format: ${format}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/reports/export error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate report export." },
      { status: 500 }
    );
  }
}
