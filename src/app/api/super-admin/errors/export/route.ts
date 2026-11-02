import { NextResponse } from "next/server";
import { getIncidents } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors/export
 * Exports error incidents as a formatted CSV file for security audits.
 */
export async function GET(request: Request) {
  try {
    const { incidents } = await getIncidents({ limit: 1000 });

    const headers = [
      "Incident ID",
      "Severity",
      "Status",
      "Error Code",
      "Module",
      "Operation",
      "Occurrences",
      "Affected Schools",
      "Affected Users",
      "First Seen (UTC)",
      "Last Seen (UTC)",
      "Latest Message",
    ];

    const escapeCsv = (val: string | number | undefined) => {
      const s = String(val ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = incidents.map((inc) => [
      escapeCsv(inc.id),
      escapeCsv(inc.severity),
      escapeCsv(inc.status),
      escapeCsv(inc.errorCode),
      escapeCsv(inc.module),
      escapeCsv(inc.operation),
      inc.occurrences,
      inc.affectedSchoolsCount,
      inc.affectedUsersCount,
      escapeCsv(inc.firstSeen),
      escapeCsv(inc.lastSeen),
      escapeCsv(inc.latestMessage),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="school-study-incidents-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to export incidents.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
