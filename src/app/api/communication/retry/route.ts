import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { dispatchCommunicationMessage } from "@/lib/services/communication.service";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import type { CommunicationLogEntry } from "@/types/communication";

export async function POST(req: NextRequest) {
  try {
    const { logId, schoolId } = await req.json().catch(() => ({}));

    if (!logId || !schoolId) {
      return NextResponse.json({ success: false, error: "Missing logId or schoolId" }, { status: 400 });
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const triggeredBy = {
      uid: authUser.uid,
      name: authUser.name || "School Administration",
      role: authUser.role,
    };

    let existingLog: CommunicationLogEntry | null = null;
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("communication_logs").doc(logId).get();
      if (snap.exists) existingLog = snap.data() as CommunicationLogEntry;
    }

    if (!existingLog) {
      return NextResponse.json({ success: false, error: "Communication record not found" }, { status: 404 });
    }

    // Attempt re-dispatch
    const retryResult = await dispatchCommunicationMessage(
      {
        schoolId: existingLog.schoolId,
        studentId: existingLog.studentId,
        studentName: existingLog.studentName,
        admissionNumber: existingLog.admissionNumber,
        className: existingLog.className,
        parentName: existingLog.parentName,
        recipientPhone: existingLog.channel === "whatsapp" ? existingLog.recipient : undefined,
        recipientEmail: existingLog.channel === "email" ? existingLog.recipient : undefined,
        userId: existingLog.channel === "in_app" ? existingLog.recipient : undefined,
        channel: existingLog.channel,
        title: existingLog.title,
        content: existingLog.content,
        triggerType: existingLog.triggerType,
      },
      triggeredBy
    );

    return NextResponse.json({
      success: retryResult.success,
      status: retryResult.status,
      message: retryResult.success ? "Message retried successfully" : (retryResult.error || "Retry failed"),
    });
  } catch (err: any) {
    console.error("[API:communication:retry] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retry message" },
      { status: 500 }
    );
  }
}
