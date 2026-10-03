import { NextResponse } from "next/server";
import { getFeeSettings, updateFeeSettings } from "@/lib/services/fee.service";
import { canAccessFeature } from "@/lib/billing/featureAccess";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const settings = await getFeeSettings(schoolId);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error("GET /api/fees/settings error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load fee settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, settings, actorId } = body;

    if (!schoolId || !settings) {
      return NextResponse.json(
        { error: "School ID and settings are required" },
        { status: 400 }
      );
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const updated = await updateFeeSettings(schoolId, settings, actorId || "school_admin");
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error("POST /api/fees/settings error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save fee settings" },
      { status: 500 }
    );
  }
}
