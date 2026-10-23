import { NextRequest, NextResponse } from "next/server";
import { dispatchTestMessage } from "@/lib/services/communication.service";
import { resolveEffectiveSchoolEntitlements } from "@/lib/billing/entitlement";
import { normalizePhoneNumber } from "@/lib/services/phone-validation";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import type { CommunicationChannel } from "@/types/communication";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, channel, recipientPhone } = body;

    // 1. Request Input Validation
    if (!schoolId || typeof schoolId !== "string" || !schoolId.trim()) {
      return NextResponse.json(
        { success: false, errorCode: "MISSING_SCHOOL_ID", error: "School ID is required." },
        { status: 400 }
      );
    }

    if (!channel || (channel !== "whatsapp" && channel !== "sms")) {
      return NextResponse.json(
        { success: false, errorCode: "INVALID_CHANNEL", error: "Channel must be 'whatsapp' or 'sms'." },
        { status: 400 }
      );
    }

    if (!recipientPhone || typeof recipientPhone !== "string" || !recipientPhone.trim()) {
      return NextResponse.json(
        { success: false, errorCode: "INVALID_PHONE_NUMBER", error: "Recipient phone number is required." },
        { status: 400 }
      );
    }

    // 2. User-Friendly Phone Normalization (E.164 & India validation)
    const phoneRes = normalizePhoneNumber(recipientPhone);
    if (!phoneRes.isValid) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "INVALID_PHONE_NUMBER",
          error: phoneRes.error || "Invalid phone number format. Provide a valid 10-digit mobile number.",
          destination: phoneRes.masked,
        },
        { status: 400 }
      );
    }

    // 3. Multi-Tenant School Admin Authentication
    const authResult = await requireSchoolAdmin(req, schoolId);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const triggeredBy = {
      uid: authUser.uid,
      name: authUser.name || "School Admin",
      role: authUser.role,
      schoolId: authUser.schoolId,
    };

    // 4. Authoritative Entitlement Check (Single Source of Truth)
    let entitlements;
    try {
      entitlements = await resolveEffectiveSchoolEntitlements(schoolId, triggeredBy);
    } catch (entErr: any) {
      const isMissing = entErr.code === "MISSING_SUBSCRIPTION" || entErr.message?.includes("not found");
      return NextResponse.json(
        {
          success: false,
          errorCode: "SUBSCRIPTION_LOOKUP_FAILED",
          error: isMissing
            ? "No subscription document found for this school. Please contact support."
            : "Failed to verify school subscription entitlements.",
        },
        { status: isMissing ? 404 : 403 }
      );
    }

    // 5. Capability & Quota Checks
    if (!entitlements.capabilities.testMessages) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "FEATURE_NOT_ENABLED",
          error: entitlements.communication.lockReason || "Test message sending is not enabled for your plan.",
        },
        { status: 403 }
      );
    }

    if (channel === "whatsapp" && !entitlements.capabilities.whatsappApi) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "FEATURE_NOT_ENABLED",
          error: entitlements.communication.lockReason || `WhatsApp API messaging is not included in ${entitlements.plan.name}.`,
        },
        { status: 403 }
      );
    }

    if (channel === "sms" && !entitlements.capabilities.smsApi) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "FEATURE_NOT_ENABLED",
          error: entitlements.communication.lockReason || `SMS API messaging is not included in ${entitlements.plan.name}.`,
        },
        { status: 403 }
      );
    }

    // 6. Dispatch Genuine Test Message
    const result = await dispatchTestMessage(
      schoolId,
      channel as CommunicationChannel,
      phoneRes.normalized,
      triggeredBy
    );

    if (!result.success) {
      // Map error code to appropriate HTTP status
      const errCode = result.errorCode || "PROVIDER_REJECTED";
      let status = 502; // Bad Gateway / Provider failure by default

      if (errCode === "INVALID_PHONE_NUMBER") status = 400;
      else if (errCode === "FEATURE_NOT_ENABLED") status = 403;
      else if (errCode === "QUOTA_EXCEEDED") status = 429;
      else if (errCode === "TWILIO_NOT_CONFIGURED" || errCode === "SENDER_NOT_APPROVED") status = 503;
      else if (errCode === "TEMPLATE_NOT_APPROVED" || errCode === "RECIPIENT_NOT_ELIGIBLE") status = 400;
      else if (errCode === "INVALID_TWILIO_CREDENTIALS") status = 502;

      return NextResponse.json(
        {
          success: false,
          errorCode: errCode,
          error: result.error || "Failed to dispatch test message.",
          destination: phoneRes.masked,
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.logId,
      channel,
      status: "sent",
      destination: phoneRes.masked,
      schoolId,
      planName: entitlements.plan.name,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[API:communication:test] Unhandled Error:", err);
    return NextResponse.json(
      {
        success: false,
        errorCode: "SERVER_ERROR",
        error: err.message || "An unexpected error occurred while processing test message.",
      },
      { status: 500 }
    );
  }
}
