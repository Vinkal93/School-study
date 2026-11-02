import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getGlobalCommunicationSettings } from "@/lib/services/communication.service";
import { verifyTwilioWebhookSignature } from "@/lib/services/communication-provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-twilio-signature") || "";
    const contentType = req.headers.get("content-type") || "";

    let params: Record<string, string> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        params[key] = String(val);
      });
    } else {
      params = await req.json().catch(() => ({}));
    }

    const messageSid = params.MessageSid || params.SmsSid;
    const messageStatus = (params.MessageStatus || params.SmsStatus || "").toLowerCase();
    const errorCode = params.ErrorCode;
    const errorMessage = params.ErrorMessage;

    if (!messageSid) {
      return new NextResponse("<Response><Error>Missing MessageSid</Error></Response>", {
        status: 400,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Load Twilio AuthToken for HMAC verification if available
    const settings = await getGlobalCommunicationSettings(true);
    const authToken = settings.twilio?.authToken;

    if (authToken && signature) {
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("host") || "school.sbci.online";
      const fullUrl = `${protocol}://${host}/api/communication/webhook/twilio`;

      const isValid = verifyTwilioWebhookSignature(fullUrl, params, authToken, signature);
      if (!isValid) {
        console.warn("[TwilioWebhook] Signature verification failed for MessageSid:", messageSid);
      }
    }

    // Map Twilio status to internal status
    let mappedStatus: "pending" | "sent" | "delivered" | "read" | "failed" = "pending";
    if (messageStatus === "delivered") mappedStatus = "delivered";
    else if (messageStatus === "read") mappedStatus = "read";
    else if (messageStatus === "sent") mappedStatus = "sent";
    else if (messageStatus === "failed" || messageStatus === "undelivered") mappedStatus = "failed";

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      // Find matching log in collectionGroup "communication_logs"
      const snap = await adminDb
        .collectionGroup("communication_logs")
        .where("providerMessageId", "==", messageSid)
        .limit(1)
        .get();

      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const now = new Date().toISOString();

        const updateData: Record<string, any> = {
          status: mappedStatus,
          updatedAt: now,
          "deliveryReport.providerStatus": messageStatus,
          "deliveryReport.lastUpdated": now,
        };

        if (mappedStatus === "delivered") {
          updateData["deliveryReport.deliveredAt"] = now;
        } else if (mappedStatus === "read") {
          updateData["deliveryReport.readAt"] = now;
        } else if (mappedStatus === "failed") {
          updateData["deliveryReport.failedAt"] = now;
          if (errorCode) updateData["deliveryReport.errorCode"] = errorCode;
          if (errorMessage) updateData["deliveryReport.errorMessage"] = errorMessage;
        }

        await docRef.update(updateData);
      }
    }

    // Twilio expects a 200 OK TwiML response
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    console.error("[TwilioWebhook] Error handling callback:", err);
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
