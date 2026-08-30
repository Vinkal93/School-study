import { NextResponse } from "next/server";
import { generateSchoolReport, generateGlobalSuperAdminReport } from "@/lib/reports/reportEngine";
import { exportToCsv, exportToExcel, exportToPdf } from "@/lib/reports/exportEngine";
import type { SchoolReportType, SuperAdminReportType, ReportExportFormat } from "@/types/reports";
import { createBillingAuditLog } from "@/lib/billing/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      reportType,
      schoolId,
      format = "csv",
      filters = {},
      userPlanTier = "PROFESSIONAL",
      actorId = "admin",
      actorRole = "school_admin",
    } = body;

    if (!reportType) {
      return NextResponse.json({ error: "reportType is required." }, { status: 400 });
    }

    // Plan Gate: Starter plan users cannot export confidential datasets
    if (userPlanTier === "STARTER" && actorRole !== "super_admin") {
      await createBillingAuditLog(
        actorId,
        actorRole,
        "REPORT_EXPORT_FAILED" as any,
        "schoolSubscription",
        schoolId || "unauthorized",
        { reportType, reason: "BLOCKED_STARTER_PLAN" }
      );
      return NextResponse.json(
        { error: "Export is an advanced feature. Please upgrade to Professional or Enterprise plan to export CSV, Excel, and PDF reports." },
        { status: 403 }
      );
    }

    let reportResult;

    // 1. Global Super Admin Reports
    if (reportType.startsWith("GLOBAL_")) {
      if (actorRole !== "super_admin") {
        return NextResponse.json({ error: "Unauthorized. Global reports require Super Admin privileges." }, { status: 403 });
      }
      reportResult = await generateGlobalSuperAdminReport(reportType as SuperAdminReportType, filters);
    }
    // 2. School-Scoped Reports
    else {
      if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
      }
      reportResult = await generateSchoolReport(schoolId, reportType as SchoolReportType, filters, userPlanTier);
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
      const excelBuffer = exportToExcel(reportResult);
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
      const pdfBuffer = exportToPdf(reportResult);
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
