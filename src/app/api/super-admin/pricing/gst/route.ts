import { NextResponse } from "next/server";
import { getGstSettings, updateGstSettings } from "@/lib/billing/gstCouponsEngine";

/**
 * GET /api/super-admin/pricing/gst
 * Fetches current platform GST settings.
 */
export async function GET() {
  try {
    const settings = await getGstSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/pricing/gst
 * Updates platform GST settings (GST toggle, percentage, GSTIN) with audit logging.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { gstEnabled, gstPercentage, gstin, actorId = "super_admin" } = body || {};

    const updated = await updateGstSettings(
      {
        gstEnabled,
        gstPercentage: typeof gstPercentage === "number" ? gstPercentage : undefined,
        gstin,
      },
      actorId
    );

    return NextResponse.json({
      success: true,
      message: "GST settings updated successfully.",
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
