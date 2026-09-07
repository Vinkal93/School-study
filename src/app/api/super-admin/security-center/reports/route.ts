import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { getSecurityReportData } from "@/lib/services/security-center.service";
import type { SecurityReportData } from "@/types/security-center";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const reportType = (searchParams.get("type") as SecurityReportData["type"]) || "SUMMARY";
    const format = searchParams.get("format") || "json";

    const reportData = await getSecurityReportData(reportType, user?.email || user?.uid || "Super Admin");

    if (format === "csv") {
      // Generate CSV output of findings
      const headers = ["ID", "Category", "Severity", "Title", "Status", "RetestStatus", "DiscoveredAt", "Owner"];
      const rows = reportData.findings.map((f) => [
        f.id,
        f.category,
        f.severity,
        `"${f.title.replace(/"/g, '""')}"`,
        f.status,
        f.retestStatus,
        f.discoveredAt,
        `"${f.owner || "Unassigned"}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="security-report-${reportType.toLowerCase()}-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate security report" },
      { status: 500 }
    );
  }
}
