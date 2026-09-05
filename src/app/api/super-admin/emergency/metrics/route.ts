import { NextResponse } from "next/server";
import { getEmergencySystemMetrics } from "@/lib/emergency/emergencyEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/super-admin/emergency/metrics
 * Returns live emergency system metrics: affected schools, disabled modules, suspended users, uptime.
 */
export async function GET() {
  try {
    const metrics = await getEmergencySystemMetrics();
    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    console.error("Failed to fetch emergency system metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch emergency system metrics",
      },
      { status: 500 }
    );
  }
}
