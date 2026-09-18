import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getClassCollectionSummary,
  getFeeHeadCollectionSummary,
  getPaymentMethodReport,
  getFeeDefaulters,
  getFeeDashboardSummary,
} from "@/lib/services/fee-analytics.service";
import { logFinancialAudit } from "@/lib/services/fee-foundation.service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      reportType,
      academicYearId,
      className,
      sectionName,
      month,
      format,
    } = body;

    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    let csvContent = "";
    let filename = `fee_report_${Date.now()}.csv`;

    if (reportType === "defaulters") {
      filename = `fee_defaulters_${className || "all"}_${Date.now()}.csv`;
      const res = await getFeeDefaulters(targetSchoolId, {
        academicYearId,
        className,
        sectionName,
      });

      const headers = ["Admission No", "Student Name", "Class", "Section", "Total Due (INR)", "Oldest Due Date", "Days Overdue", "Status"];
      const rows = res.defaulters.map((d) => [
        `"${d.admissionNumber}"`,
        `"${d.studentName}"`,
        `"${d.className}"`,
        `"${d.sectionName}"`,
        d.totalOutstandingRupees,
        `"${d.oldestDueDate.slice(0, 10)}"`,
        d.daysOverdue,
        `"${d.status}"`,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (reportType === "class_wise") {
      filename = `class_collection_${month || "all"}_${Date.now()}.csv`;
      const list = await getClassCollectionSummary(targetSchoolId, { academicYearId, month });
      const headers = ["Class", "Total Students", "Expected (INR)", "Collected (INR)", "Outstanding (INR)", "Collection Rate (%)"];
      const rows = list.map((r) => [
        `"${r.className}"`,
        r.studentCount,
        r.expectedRupees,
        r.collectedRupees,
        r.outstandingRupees,
        r.collectionRate,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else if (reportType === "fee_head") {
      filename = `fee_head_collection_${Date.now()}.csv`;
      const list = await getFeeHeadCollectionSummary(targetSchoolId, { academicYearId, className, month });
      const headers = ["Fee Head", "Expected (INR)", "Collected (INR)", "Outstanding (INR)", "Collection Rate (%)"];
      const rows = list.map((r) => [
        `"${r.feeHeadName}"`,
        r.expectedRupees,
        r.collectedRupees,
        r.outstandingRupees,
        r.collectionRate,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    } else {
      // Default collection trend
      filename = `monthly_collection_trend_${Date.now()}.csv`;
      const summary = await getFeeDashboardSummary(targetSchoolId, { academicYearId, className, sectionName });
      const headers = ["Month", "Expected (INR)", "Collected (INR)", "Outstanding (INR)", "Collection Rate (%)"];
      const rows = summary.collectionTrend.map((t) => [
        `"${t.monthName}"`,
        t.expectedRupees,
        t.collectedRupees,
        t.outstandingRupees,
        t.collectionRate,
      ]);
      csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    // Log Financial Audit
    await logFinancialAudit(
      targetSchoolId,
      { id: authResult.user.uid, role: authResult.user.role, name: authResult.user.name },
      "CREATE",
      "Adjustment",
      `export_${reportType}_${Date.now()}`,
      null,
      { reportType, filters: { className, sectionName, month, academicYearId } },
      `Exported ${reportType} report as CSV`
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/analytics/export error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to export fee report" },
      { status: 500 }
    );
  }
}
