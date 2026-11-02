import { NextRequest, NextResponse } from "next/server";
import { recordManualWhatsAppAction } from "@/lib/services/communication.service";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, logId, action } = body;

    if (!schoolId || !logId || !action) {
      return NextResponse.json(
        { success: false, error: "schoolId, logId, and action ('manual_copied' | 'manual_opened' | 'manual_sent') are required" },
        { status: 400 }
      );
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    await recordManualWhatsAppAction(schoolId, logId, action);
    return NextResponse.json({ success: true, message: `Action ${action} recorded.` });
  } catch (err: any) {
    console.error("[API:communication:manual-action] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to record manual action" },
      { status: 500 }
    );
  }
}
