import { NextRequest, NextResponse } from "next/server";
import {
  getSchoolCommunicationAccess,
  getSchoolCommunicationLogs,
  getSchoolTemplates,
} from "@/lib/services/communication.service";
import { getSchoolAutomationRules } from "@/lib/services/communication-automation.service";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const [access, logs, rules, templates] = await Promise.all([
      getSchoolCommunicationAccess(schoolId, authResult.user).catch((err) => {
        console.warn("[API:communication:status] Communication access resolution notice:", err);
        return null;
      }),
      getSchoolCommunicationLogs(schoolId, undefined, undefined, 50).catch(() => []),
      getSchoolAutomationRules(schoolId).catch(() => []),
      getSchoolTemplates(schoolId).catch(() => []),
    ]);

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "ACCESS_RESOLUTION_FAILED",
          error: "Failed to resolve communication entitlements for this school.",
        },
        { status: 500 }
      );
    }

    // Calculate usage from recent logs
    let waSent = 0;
    let emailSent = 0;
    let inAppSent = 0;
    let failed = 0;

    logs.forEach((l) => {
      if (l.status === "failed") {
        failed++;
      } else {
        if (l.channel === "whatsapp") waSent++;
        else if (l.channel === "email") emailSent++;
        else if (l.channel === "in_app") inAppSent++;
      }
    });

    access.monthlyUsage = {
      ...(access.monthlyUsage || {
        totalSent: 0,
        whatsappSent: 0,
        smsSent: 0,
        emailSent: 0,
        inAppSent: 0,
        manualOpened: 0,
        testsSent: 0,
        failed: 0,
        limit: access.limits?.monthlyWhatsAppAllowance ?? 0,
      }),
      whatsappSent: waSent,
      emailSent,
      inAppSent,
      failed,
      totalSent: waSent + emailSent + inAppSent,
    };

    return NextResponse.json({
      success: true,
      access,
      templates,
      rules,
      recentLogs: logs,
    });
  } catch (err: any) {
    console.error("[API:communication:status] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch communication status" },
      { status: 500 }
    );
  }
}

/**
 * Handles incoming Twilio delivery status callback webhooks.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let messageSid = "";
    let messageStatus = "";
    let errorCode = "";
    let errorMessage = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      messageSid = (formData.get("MessageSid") as string) || (formData.get("SmsSid") as string) || "";
      messageStatus = (formData.get("MessageStatus") as string) || (formData.get("SmsStatus") as string) || "";
      errorCode = (formData.get("ErrorCode") as string) || "";
      errorMessage = (formData.get("ErrorMessage") as string) || "";
    } else {
      const json = await req.json().catch(() => ({}));
      messageSid = json.MessageSid || json.messageSid || "";
      messageStatus = json.MessageStatus || json.messageStatus || "";
      errorCode = json.ErrorCode || json.errorCode || "";
      errorMessage = json.ErrorMessage || json.errorMessage || "";
    }

    if (!messageSid) {
      return NextResponse.json({ success: false, error: "Missing MessageSid" }, { status: 400 });
    }

    const adminDb = getSafeAdminDb();
    if (adminDb && messageSid) {
      const logSnap = await adminDb
        .collection("communication_delivery_logs")
        .where("providerMessageId", "==", messageSid)
        .limit(1)
        .get();

      if (!logSnap.empty) {
        const docRef = logSnap.docs[0].ref;
        const logData = logSnap.docs[0].data();

        const updateData: any = {
          status:
            messageStatus === "delivered" || messageStatus === "read"
              ? "delivered"
              : messageStatus === "failed" || messageStatus === "undelivered"
              ? "failed"
              : messageStatus,
          updatedAt: new Date().toISOString(),
        };

        if (messageStatus === "delivered" || messageStatus === "read") {
          updateData.deliveredAt = new Date().toISOString();
        }

        if (errorCode || errorMessage) {
          updateData.errorReason = `Twilio Error ${errorCode}: ${errorMessage}`.trim();
        }

        await docRef.update(updateData);

        if (logData.schoolId && logData.id) {
          await adminDb
            .collection("schools")
            .doc(logData.schoolId)
            .collection("communication_logs")
            .doc(logData.id)
            .update(updateData)
            .catch(() => {});
        }
      }
    }

    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.warn("[TwilioWebhook] Error processing callback:", err);
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
