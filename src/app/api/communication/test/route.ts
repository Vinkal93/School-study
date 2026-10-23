import { NextRequest, NextResponse } from "next/server";
import { dispatchTestMessage } from "@/lib/services/communication.service";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import type { CommunicationChannel } from "@/types/communication";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, channel, recipientPhone } = body;

    if (!schoolId || !channel || !recipientPhone) {
      return NextResponse.json(
        { success: false, error: "schoolId, channel, and recipientPhone are required." },
        { status: 400 }
      );
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const triggeredBy = {
      uid: authUser.uid,
      name: authUser.name || "School Admin",
      role: authUser.role,
    };

    const result = await dispatchTestMessage(
      schoolId,
      channel as CommunicationChannel,
      recipientPhone,
      triggeredBy
    );

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    console.error("[API:communication:test] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch test message" },
      { status: 500 }
    );
  }
}
