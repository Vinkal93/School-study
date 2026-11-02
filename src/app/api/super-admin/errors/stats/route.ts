import { NextResponse } from "next/server";
import { getMonitoringStats } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/errors/stats
 * Retrieves live database-backed incident telemetry metrics for Super Admin Error Center.
 */
export async function GET() {
  try {
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
