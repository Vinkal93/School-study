import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { dispatchCommunicationMessage } from "@/lib/services/communication.service";
import type { CommunicationLogEntry } from "@/types/communication";

export async function POST(req: NextRequest) {
  try {
    const { logId, schoolId, triggeredBy } = await req.json();

    if (!logId || !schoolId) {
      return NextResponse.json({ success: false, error: "Missing logId or schoolId" }, { status: 400 });
    }

    let existingLog: CommunicationLogEntry | null = null;
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("communication_logs").doc(logId).get();
      if (snap.exists) existingLog = snap.data() as CommunicationLogEntry;
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, "schools", schoolId, "communication_logs", logId));
        if (snap.exists()) existingLog = snap.data() as CommunicationLogEntry;
      }
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
      triggeredBy || {
        uid: "system_retry",
        name: "Admin Retry Action",
        role: "admin",
      }
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
