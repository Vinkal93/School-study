import { NextResponse } from "next/server";
import { getGstSettings, updateGstSettings } from "@/lib/billing/gstCouponsEngine";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";

/**
 * GET /api/super-admin/pricing/gst
 * Fetches current platform GST settings.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;

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
    const auth = await requireSuperAdmin(request);
    if (auth.errorResponse) return auth.errorResponse;
    const actorId = auth.user!.uid;

    const rateCheck = enforceRateLimit(request, RATE_LIMIT_PROFILES.STANDARD_API, actorId);
    if (!rateCheck.allowed && rateCheck.response) return rateCheck.response;

    const body = await request.json().catch(() => ({}));
    const { gstEnabled, gstPercentage, gstin } = body || {};

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
