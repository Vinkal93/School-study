import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import { getSecurityReportData } from "@/lib/services/security-center.service";
import type { SecurityReportData } from "@/types/security-center";

function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.DATA_EXPORT, user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const { searchParams } = new URL(req.url);
    const reportType = (searchParams.get("type") as SecurityReportData["type"]) || "SUMMARY";
    const format = searchParams.get("format") || "json";

    const reportData = await getSecurityReportData(reportType, user?.email || user?.uid || "Super Admin");

    if (format === "csv") {
      // Generate CSV output of findings with formula injection protection
      const headers = ["ID", "Category", "Severity", "Title", "Status", "RetestStatus", "DiscoveredAt", "Owner"];
      const rows = reportData.findings.map((f) => [
        sanitizeCsvCell(f.id),
        sanitizeCsvCell(f.category),
        sanitizeCsvCell(f.severity),
        sanitizeCsvCell(f.title),
        sanitizeCsvCell(f.status),
        sanitizeCsvCell(f.retestStatus),
        sanitizeCsvCell(f.discoveredAt),
        sanitizeCsvCell(f.owner || "Unassigned"),
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

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
