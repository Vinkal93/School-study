import { NextResponse } from "next/server";
import { getIncidents } from "@/lib/monitoring";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors/export
 * Exports error incidents as a formatted CSV file for security audits.
 * Protected with authoritative Super Admin authorization and formula injection sanitization.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.DATA_EXPORT, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

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
      let s = String(val ?? "");
      // Formula Injection mitigation (CWE-1236)
      if (/^[=+\-@\t\r]/.test(s)) {
        s = `'${s}`;
      }
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

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="security-errors-export-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to export incidents.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
