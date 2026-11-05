import { NextResponse } from "next/server";
import { getIncidents, IncidentStatus, ErrorSeverity } from "@/lib/monitoring";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors
 * Retrieves paginated error incidents with multi-field search and filters.
 * Protected with authoritative Super Admin authorization.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const { searchParams } = new URL(request.url);

    const status = (searchParams.get("status") || "all") as IncidentStatus | "all";
    const severity = (searchParams.get("severity") || "all") as ErrorSeverity | "all";
    const moduleName = searchParams.get("module") || "all";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));
    const offset = (page - 1) * pageSize;

    const { incidents, total } = await getIncidents({
      status,
      severity,
      module: moduleName,
      search,
      limit: pageSize,
      offset,
    });

    return NextResponse.json({
      success: true,
      incidents,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve incidents.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
