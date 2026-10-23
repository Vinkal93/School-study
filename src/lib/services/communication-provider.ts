import crypto from "crypto";
import { normalizePhoneNumber } from "./phone-validation";
import type {
  CommunicationChannel,
  CommunicationDeliveryStatus,
  TwilioConfig,
} from "@/types/communication";

export interface ProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  status: CommunicationDeliveryStatus;
  errorCode?: string | number;
  errorMessage?: string;
  userFriendlyError?: string;
}

export interface ProviderStatusResult {
  providerMessageId: string;
  status: CommunicationDeliveryStatus;
  errorCode?: string | number;
  errorMessage?: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
}

/**
 * Classifies Twilio error codes into clear, actionable guidance.
 */
export function classifyProviderError(
  errorCode?: string | number,
  rawMessage?: string
): string {
  const code = Number(errorCode);
  switch (code) {
    case 20003:
      return "Twilio Authentication Failed: Invalid Account SID or Auth Token. Verify credentials in Super Admin Settings.";
    case 21211:
      return "Invalid Mobile Number: The recipient phone number format is not a valid E.164 number.";
    case 21408:
      return "Permission Denied: Regional SMS permissions are not enabled for this country code in your Twilio Console.";
    case 21608:
      return "Twilio WhatsApp Sandbox: The recipient has not joined your WhatsApp sandbox. Recipient must send your join code first.";
    case 21610:
      return "Message Blocked: The recipient has opted out of SMS / WhatsApp communication from your sender number.";
    case 21614:
      return "Invalid Sender: The configured SMS sender number is not mobile-capable or not enabled for SMS dispatch.";
    case 63015:
    case 63032:
      return "Template not approved: The specified WhatsApp template has not been approved by Meta/Twilio. Please select an approved template.";
    case 63016:
      return "24-Hour Messaging Window Expired / Template not approved: Initiating a conversation outside the 24-hour window requires an approved WhatsApp Content Template (SID: HX...).";
    case 63018:
      return "24-hour messaging window or Unregistered WhatsApp Sender: Your Twilio number has not been provisioned on WhatsApp Business API or channel rate limit was reached.";
    case 30008:
      return "Unknown Destination Error: The mobile carrier failed to acknowledge or deliver the SMS.";
    default:
      return rawMessage || `Provider Error (${code || "NETWORK_OR_CONFIG"})`;
  }
}

/**
 * Validates Twilio status webhook signature (X-Twilio-Signature).
 * Protects against forged delivery callbacks.
 */
export function verifyTwilioWebhookSignature(
  url: string,
  params: Record<string, string>,
  authToken: string,
  signatureHeader?: string | null
): boolean {
  if (!signatureHeader || !authToken) return false;

  try {
    // 1. Sort all POST parameters alphabetically by key
    const sortedKeys = Object.keys(params).sort();
    let dataString = url;
    for (const key of sortedKeys) {
      dataString += `${key}${params[key]}`;
    }

    // 2. Compute HMAC-SHA1 using authToken as secret
    const hmac = crypto.createHmac("sha1", authToken);
    hmac.update(dataString, "utf8");
    const expectedSignature = hmac.digest("base64");

    // 3. Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch (err) {
    console.warn("[TwilioWebhook] Signature verification error:", err);
    return false;
  }
}

/**
 * Sends a WhatsApp message via Twilio Cloud API.
 */
export async function sendTwilioWhatsApp(
  toPhone: string,
  content: string,
  config: TwilioConfig,
  contentTemplateSid?: string
): Promise<ProviderSendResult> {
  const { accountSid, authToken, fromNumber } = config;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      status: "failed",
      errorMessage: "Twilio credentials not configured in Super Admin settings",
      userFriendlyError: "Twilio credentials not configured in Super Admin settings",
    };
  }

  // Normalize phone number (E.164 compliant)
  const phoneRes = normalizePhoneNumber(toPhone);
  if (!phoneRes.isValid) {
    return {
      success: false,
      status: "failed",
      errorMessage: phoneRes.error || "Invalid recipient mobile number",
      userFriendlyError: phoneRes.error || "Invalid recipient mobile number",
    };
  }

  const formattedTo = phoneRes.normalized;
  const formattedFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const bodyParams = new URLSearchParams();
    bodyParams.append("From", formattedFrom);
    bodyParams.append("To", `whatsapp:${formattedTo}`);

    if (contentTemplateSid && contentTemplateSid.startsWith("HX")) {
      bodyParams.append("ContentSid", contentTemplateSid);
    } else {
      bodyParams.append("Body", content);
    }

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const classified = classifyProviderError(data.code, data.message);
      return {
        success: false,
        status: "failed",
        errorCode: data.code || res.status,
        errorMessage: data.message || `Twilio HTTP ${res.status}`,
        userFriendlyError: classified,
      };
    }

    // Twilio initial status is usually "queued" or "sent"
    const initialStatus: CommunicationDeliveryStatus =
      data.status === "delivered" ? "delivered" : data.status === "sent" ? "sent" : "queued";

    return {
      success: true,
      providerMessageId: data.sid,
      status: initialStatus,
    };
  } catch (netErr: any) {
    return {
      success: false,
      status: "failed",
      errorMessage: netErr.message || "Network error contacting Twilio API",
      userFriendlyError: `Network connection to Twilio failed: ${netErr.message}`,
    };
  }
}

/**
 * Sends an SMS message via Twilio API.
 */
export async function sendTwilioSMS(
  toPhone: string,
  content: string,
  config: TwilioConfig
): Promise<ProviderSendResult> {
  const { accountSid, authToken, smsFromNumber, messagingServiceSid } = config;

  if (!accountSid || !authToken || (!smsFromNumber && !messagingServiceSid)) {
    return {
      success: false,
      status: "failed",
      errorMessage: "Twilio SMS sender or Messaging Service SID not configured in Super Admin settings",
      userFriendlyError: "Twilio SMS sender not configured in Super Admin settings",
    };
  }

  // Normalize phone number (E.164 compliant)
  const phoneRes = normalizePhoneNumber(toPhone);
  if (!phoneRes.isValid) {
    return {
      success: false,
      status: "failed",
      errorMessage: phoneRes.error || "Invalid recipient mobile number",
      userFriendlyError: phoneRes.error || "Invalid recipient mobile number",
    };
  }

  const formattedTo = phoneRes.normalized;

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const bodyParams = new URLSearchParams();
    if (messagingServiceSid) {
      bodyParams.append("MessagingServiceSid", messagingServiceSid);
    } else if (smsFromNumber) {
      bodyParams.append("From", smsFromNumber);
    }
    bodyParams.append("To", formattedTo);
    bodyParams.append("Body", content);

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const classified = classifyProviderError(data.code, data.message);
      return {
        success: false,
        status: "failed",
        errorCode: data.code || res.status,
        errorMessage: data.message || `Twilio HTTP ${res.status}`,
        userFriendlyError: classified,
      };
    }

    return {
      success: true,
      providerMessageId: data.sid,
      status: data.status === "delivered" ? "delivered" : data.status === "sent" ? "sent" : "queued",
    };
  } catch (netErr: any) {
    return {
      success: false,
      status: "failed",
      errorMessage: netErr.message,
      userFriendlyError: `Network connection to Twilio failed: ${netErr.message}`,
    };
  }
}

/**
 * Polls real-time delivery status for a specific provider message SID from Twilio.
 */
export async function fetchTwilioMessageStatus(
  providerMessageId: string,
  config: TwilioConfig
): Promise<ProviderStatusResult | null> {
  const { accountSid, authToken } = config;
  if (!accountSid || !authToken || !providerMessageId) return null;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${providerMessageId}.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));

    const twilioStatus = data.status;
    let mappedStatus: CommunicationDeliveryStatus = "processing";
    if (twilioStatus === "delivered" || twilioStatus === "read") {
      mappedStatus = twilioStatus === "read" ? "read" : "delivered";
    } else if (twilioStatus === "sent") {
      mappedStatus = "sent";
    } else if (twilioStatus === "failed" || twilioStatus === "undelivered") {
      mappedStatus = "failed";
    } else if (twilioStatus === "queued" || twilioStatus === "sending") {
      mappedStatus = twilioStatus === "sending" ? "sending" : "queued";
    }

    return {
      providerMessageId,
      status: mappedStatus,
      errorCode: data.error_code,
      errorMessage: data.error_message,
      sentAt: data.date_sent ? new Date(data.date_sent).toISOString() : null,
      deliveredAt:
        mappedStatus === "delivered" || mappedStatus === "read"
          ? data.date_updated
            ? new Date(data.date_updated).toISOString()
            : new Date().toISOString()
          : null,
    };
  } catch (err) {
    return null;
  }
}
