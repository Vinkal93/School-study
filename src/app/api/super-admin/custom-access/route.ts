import { NextResponse } from "next/server";
import {
  grantDemoOrCustomAccess,
  listAllCustomPlanAccess,
} from "@/lib/billing/customOffers";

export async function GET() {
  try {
    const list = await listAllCustomPlanAccess();
    return NextResponse.json({ success: true, records: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load custom access records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schoolId, schoolName, accessTier = "PROFESSIONAL", durationDays = 7, featuresGranted, reason, actorId = "super_admin" } = body;

    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
    }

    const record = await grantDemoOrCustomAccess(
      schoolId,
      schoolName || schoolId,
      accessTier,
      durationDays || 7,
      featuresGranted || ["advanced_reports", "attendance_automation", "notices_announcements"],
      reason || "Demo plan access preview",
      actorId
    );

    return NextResponse.json({
      success: true,
      record,
      message: `${accessTier} demo access granted for ${durationDays} days to ${schoolName || schoolId}.`,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/custom-access error:", error);
    return NextResponse.json({ error: error.message || "Failed to grant custom access." }, { status: 500 });
  }
}
