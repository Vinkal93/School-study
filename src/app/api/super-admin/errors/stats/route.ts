import { NextResponse } from "next/server";
import { getMonitoringStats } from "@/lib/monitoring";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors/stats
 * Retrieves live database-backed incident telemetry metrics for Super Admin Error Center.
 * Protected with authoritative Super Admin authorization.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, auth.user!.uid);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const stats = await getMonitoringStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load error stats.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
