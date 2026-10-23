import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import type {
  CommunicationChannel,
  CommunicationDeliveryStatus,
  CommunicationLogEntry,
  CommunicationTemplate,
  FeeAutomationRule,
  GlobalCommunicationSettings,
  SchoolCommunicationAccess,
  SendMessagePayload,
  SendResult,
} from "@/types/communication";
import { createNotification } from "./notification.service";
import {
  DEFAULT_COMMUNICATION_TEMPLATES,
  resolveTemplateVariables,
} from "./communication-template.utils";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMasked,
} from "./communication-crypto";

// Collection Constants
const GLOBAL_CONTROLS_DOC = "siteSettings/communication_controls";
const GLOBAL_SECRETS_DOC = "siteSettings/communication_secrets";

export const DEFAULT_COMMUNICATION_SETTINGS: GlobalCommunicationSettings = {
  masterEnabled: true,
  channels: {
    whatsapp: true,
    email: true,
    in_app: true,
    automation: true,
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    fromNumber: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
    smsFromNumber: process.env.TWILIO_SMS_FROM || "",
    isConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER as any) || "none",
    apiKey: process.env.EMAIL_API_KEY || "",
    senderEmail: process.env.EMAIL_SENDER_ADDRESS || "notifications@schoolstudy.in",
    senderName: process.env.EMAIL_SENDER_NAME || "School Study Platform",
    isConfigured: Boolean(process.env.EMAIL_API_KEY || process.env.EMAIL_PROVIDER),
  },
  planAccess: {
    free: { whatsapp: false, email: false, in_app: true, automation: false },
    base: { whatsapp: false, email: false, in_app: true, automation: false },
    starter: { whatsapp: false, email: true, in_app: true, automation: false },
    growth: { whatsapp: true, email: true, in_app: true, automation: true },
    professional: { whatsapp: true, email: true, in_app: true, automation: true },
    enterprise: { whatsapp: true, email: true, in_app: true, automation: true },
  },
  schoolOverrides: {},
  updatedAt: new Date().toISOString(),
};

export { DEFAULT_COMMUNICATION_TEMPLATES, resolveTemplateVariables };

export const DEFAULT_FEE_AUTOMATION_RULES: FeeAutomationRule[] = [
  {
    id: "rule_before_3days",
    schoolId: "",
    name: "3 Days Before Due Date",
    type: "before_due",
    daysOffset: -3,
    channels: ["whatsapp", "in_app"],
    titleTemplate: "Upcoming Fee Reminder",
    bodyTemplate:
      "Dear {{parent_name}}, gentle reminder that fee of ₹{{amount}} for {{student_name}} (Class: {{class_name}}) is due on {{due_date}}. Please pay on time. - {{school_name}}",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_on_due",
    schoolId: "",
    name: "On Due Date Reminder",
    type: "on_due",
    daysOffset: 0,
    channels: ["whatsapp"],
    titleTemplate: "Fee Due Today",
    bodyTemplate:
      "Dear {{parent_name}}, today is the due date for {{student_name}}'s school fee of ₹{{amount}}. Kindly clear today to avoid late fees. - {{school_name}}",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_overdue_3days",
    schoolId: "",
    name: "3 Days Overdue Notice",
    type: "overdue",
    daysOffset: 3,
    channels: ["whatsapp", "email", "in_app"],
    titleTemplate: "Overdue Fee Notice",
    bodyTemplate:
      "Dear {{parent_name}}, the fee of ₹{{amount}} for {{student_name}} is now OVERDUE. Please clear the outstanding balance immediately. - {{school_name}}",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_late_fee",
    schoolId: "",
    name: "Late Fee Applied Notice",
    type: "late_fee",
    daysOffset: 7,
    channels: ["whatsapp", "in_app"],
    titleTemplate: "Late Fee Applied Notice",
    bodyTemplate:
      "Attention: Late fee penalty has been applied to {{student_name}}'s outstanding fee. Total balance: ₹{{amount}}. Settle immediately at school office. - {{school_name}}",
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Runtime fallback cache for dev / test environments when Admin SDK is unavailable
let runtimeControlsCache: Partial<GlobalCommunicationSettings> | null = null;
let runtimeEncryptedSecretsCache: Record<string, string> = {};

/**
 * Validates WhatsApp sender phone number format.
 * Accepts E.164 formatted WhatsApp numbers: whatsapp:+[1-9][0-9]{7,14}
 */
export function validateWhatsAppSender(sender: string): {
  isValid: boolean;
  formatted: string;
  isSandbox: boolean;
  error?: string;
} {
  if (!sender || typeof sender !== "string") {
    return { isValid: false, formatted: "", isSandbox: false, error: "Sender number is required" };
  }

  const trimmed = sender.trim();
  const normalized = trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
  const phonePart = normalized.replace(/^whatsapp:/, "");

  // Must follow E.164: + followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(phonePart)) {
    return {
      isValid: false,
      formatted: normalized,
      isSandbox: false,
      error: `Invalid WhatsApp sender format "${sender}". Must be formatted as whatsapp:+[country_code][number] (e.g. whatsapp:+14155238886).`,
    };
  }

  const isSandbox = phonePart === "+14155238886";

  return {
    isValid: true,
    formatted: normalized,
    isSandbox,
  };
}

/**
 * Validates optional SMS sender format.
 */
export function validateSmsSender(sender?: string | null): {
  isValid: boolean;
  formatted: string;
  error?: string;
} {
  if (!sender || !sender.trim()) {
    return { isValid: true, formatted: "" };
  }

  const trimmed = sender.trim();
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  const alphaNumericRegex = /^[a-zA-Z0-9]{2,11}$/;

  if (!e164Regex.test(trimmed) && !alphaNumericRegex.test(trimmed)) {
    return {
      isValid: false,
      formatted: trimmed,
      error: `Invalid SMS sender format "${sender}". Must be an E.164 phone number (e.g. +14155238886) or alphanumeric sender ID (2-11 alphanumeric characters).`,
    };
  }

  return {
    isValid: true,
    formatted: trimmed,
  };
}

/**
 * Validates Twilio credentials by calling Twilio Accounts API.
 * Saving credentials does NOT depend on successfully sending a WhatsApp message.
 */
export async function validateTwilioConnection(credentials: {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
  smsFromNumber?: string;
}): Promise<{
  success: boolean;
  statusCode: number;
  errorCode?: string | null;
  message: string;
  details?: any;
}> {
  const accountSid = credentials.accountSid?.trim();
  let authToken = credentials.authToken?.trim();
  const fromNumber = credentials.fromNumber?.trim() || "whatsapp:+14155238886";
  const smsFromNumber = credentials.smsFromNumber?.trim();

  if (!accountSid) {
    return {
      success: false,
      statusCode: 400,
      errorCode: "MISSING_ACCOUNT_SID",
      message: "Twilio Account SID is required.",
      details: "Enter a valid Twilio Account SID starting with AC.",
    };
  }

  if (!accountSid.startsWith("AC") || accountSid.length < 30) {
    return {
      success: false,
      statusCode: 400,
      errorCode: "INVALID_ACCOUNT_SID_FORMAT",
      message: "Invalid Twilio Account SID format.",
      details: "Twilio Account SID must start with 'AC' and be 34 characters long.",
    };
  }

  // If token is masked or missing, load from stored secret
  if (!authToken || isMasked(authToken)) {
    const stored = await getGlobalCommunicationSettings(false);
    authToken = stored.twilio.authToken;
  }

  if (!authToken || isMasked(authToken)) {
    return {
      success: false,
      statusCode: 400,
      errorCode: "MISSING_AUTH_TOKEN",
      message: "Twilio Auth Token is required.",
      details: "Enter your Twilio Auth Token from the Twilio Console.",
    };
  }

  const senderValidation = validateWhatsAppSender(fromNumber);
  if (!senderValidation.isValid) {
    return {
      success: false,
      statusCode: 400,
      errorCode: "INVALID_SENDER_FORMAT",
      message: senderValidation.error || "Invalid WhatsApp sender format.",
      details: senderValidation.error,
    };
  }

  if (smsFromNumber) {
    const smsValidation = validateSmsSender(smsFromNumber);
    if (!smsValidation.isValid) {
      return {
        success: false,
        statusCode: 400,
        errorCode: "INVALID_SMS_SENDER_FORMAT",
        message: smsValidation.error || "Invalid SMS sender format.",
        details: smsValidation.error,
      };
    }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authHeader}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const twilioCode = data.code || res.status;
      const twilioMsg = data.message || "Twilio authentication failed.";
      return {
        success: false,
        statusCode: res.status === 401 ? 401 : 400,
        errorCode: twilioCode === 20003 ? "AUTHENTICATION_FAILED" : "TWILIO_ERROR",
        message: `Twilio Connection Failed: ${twilioMsg} (Code ${twilioCode})`,
        details: `Twilio API returned HTTP ${res.status}. Check Account SID and Auth Token.`,
      };
    }

    if (data.status === "suspended") {
      return {
        success: false,
        statusCode: 403,
        errorCode: "ACCOUNT_SUSPENDED",
        message: "Twilio Account Suspended: Please check your billing status in Twilio Console.",
        details: "Account status is 'suspended'.",
      };
    }

    return {
      success: true,
      statusCode: 200,
      errorCode: null,
      message: "✓ Twilio Connected • WhatsApp Sender Ready",
      details: {
        accountSid: `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}`,
        accountName: data.friendly_name || "Twilio Account",
        accountStatus: data.status || "active",
        accountType: data.type || "Full",
        sender: senderValidation.formatted,
        senderType: senderValidation.isSandbox ? "Twilio WhatsApp Sandbox" : "Registered Business Sender",
        smsSender: smsFromNumber || undefined,
      },
    };
  } catch (netErr: any) {
    return {
      success: false,
      statusCode: 504,
      errorCode: "NETWORK_ERROR",
      message: `Network Error: Unable to reach Twilio API (${netErr.message})`,
      details: netErr.message,
    };
  }
}

/**
 * Retrieves authoritative global communication configuration.
 * Client safe flag masks sensitive credentials like Twilio AuthToken and Email API keys.
 */
export async function getGlobalCommunicationSettings(clientSafe = true): Promise<GlobalCommunicationSettings> {
  try {
    const adminDb = getSafeAdminDb();
    let controls: any = runtimeControlsCache || {};
    let secrets: any = runtimeEncryptedSecretsCache || {};

    if (adminDb) {
      try {
        const controlsSnap = await adminDb.doc(GLOBAL_CONTROLS_DOC).get();
        if (controlsSnap.exists) {
          controls = controlsSnap.data() || {};
        }

        const secretsSnap = await adminDb.doc(GLOBAL_SECRETS_DOC).get();
        if (secretsSnap.exists) {
          secrets = secretsSnap.data() || {};
        }
      } catch (dbReadErr) {
        console.warn("[CommunicationService] AdminDb read notice:", dbReadErr);
      }
    }

    // Decrypt encrypted secrets
    const rawTwilioToken = secrets?.twilioAuthToken
      ? decryptSecret(secrets.twilioAuthToken)
      : (controls?.twilio?.authToken ? decryptSecret(controls.twilio.authToken) : (process.env.TWILIO_AUTH_TOKEN || ""));

    const rawEmailKey = secrets?.emailApiKey
      ? decryptSecret(secrets.emailApiKey)
      : (controls?.email?.apiKey ? decryptSecret(controls.email.apiKey) : (process.env.EMAIL_API_KEY || ""));

    const accountSid =
      secrets?.twilioAccountSid ||
      controls?.twilio?.accountSid ||
      process.env.TWILIO_ACCOUNT_SID ||
      "";

    const isTwilioConfigured = Boolean(accountSid && rawTwilioToken);
    const isEmailConfigured = Boolean(rawEmailKey || controls?.email?.provider !== "none");

    const merged: GlobalCommunicationSettings = {
      masterEnabled: controls.masterEnabled ?? DEFAULT_COMMUNICATION_SETTINGS.masterEnabled,
      channels: {
        ...DEFAULT_COMMUNICATION_SETTINGS.channels,
        ...(controls.channels || {}),
      },
      twilio: {
        accountSid,
        authToken: clientSafe ? maskSecret(rawTwilioToken) : rawTwilioToken,
        fromNumber: controls?.twilio?.fromNumber || process.env.TWILIO_WHATSAPP_FROM || DEFAULT_COMMUNICATION_SETTINGS.twilio.fromNumber,
        smsFromNumber: controls?.twilio?.smsFromNumber || process.env.TWILIO_SMS_FROM || DEFAULT_COMMUNICATION_SETTINGS.twilio.smsFromNumber,
        isConfigured: isTwilioConfigured,
      },
      email: {
        provider: controls?.email?.provider || DEFAULT_COMMUNICATION_SETTINGS.email.provider,
        apiKey: clientSafe ? maskSecret(rawEmailKey) : rawEmailKey,
        senderEmail: controls?.email?.senderEmail || DEFAULT_COMMUNICATION_SETTINGS.email.senderEmail,
        senderName: controls?.email?.senderName || DEFAULT_COMMUNICATION_SETTINGS.email.senderName,
        isConfigured: isEmailConfigured,
      },
      planAccess: {
        ...DEFAULT_COMMUNICATION_SETTINGS.planAccess,
        ...(controls.planAccess || {}),
      },
      schoolOverrides: controls.schoolOverrides || {},
      updatedAt: controls.updatedAt || new Date().toISOString(),
      updatedBy: controls.updatedBy || "System",
    };

    return merged;
  } catch (err) {
    console.warn("[CommunicationService] Error reading communication controls:", err);
  }

  return DEFAULT_COMMUNICATION_SETTINGS;
}

/**
 * Super Admin updates global settings, plan permissions, or provider credentials.
 * Credentials are encrypted at rest with AES-256-GCM and stored in server-only secrets doc.
 */
export async function updateGlobalCommunicationSettings(
  payload: Partial<GlobalCommunicationSettings>,
  adminUser?: { uid: string; email: string; name: string }
): Promise<void> {
  const adminDb = getSafeAdminDb();
  const now = new Date().toISOString();

  const publicData: Record<string, any> = {
    updatedAt: now,
    updatedBy: adminUser?.name || adminUser?.email || "Super Admin",
  };

  if (payload.masterEnabled !== undefined) publicData.masterEnabled = payload.masterEnabled;
  if (payload.channels) publicData.channels = payload.channels;
  if (payload.planAccess) publicData.planAccess = payload.planAccess;
  if (payload.schoolOverrides) publicData.schoolOverrides = payload.schoolOverrides;

  // Clean twilio public metadata
  if (payload.twilio) {
    publicData.twilio = {
      accountSid: payload.twilio.accountSid || "",
      fromNumber: payload.twilio.fromNumber || "",
      smsFromNumber: payload.twilio.smsFromNumber || "",
      isConfigured: Boolean(payload.twilio.accountSid),
    };
  }

  // Clean email public metadata
  if (payload.email) {
    publicData.email = {
      provider: payload.email.provider,
      senderEmail: payload.email.senderEmail,
      senderName: payload.email.senderName,
      isConfigured: Boolean(payload.email.apiKey || payload.email.provider !== "none"),
    };
  }

  // Encrypted secrets data
  const secretsData: Record<string, any> = {
    updatedAt: now,
  };
  if (payload.twilio?.accountSid) {
    secretsData.twilioAccountSid = payload.twilio.accountSid.trim();
  }
  if (payload.twilio?.authToken && !isMasked(payload.twilio.authToken)) {
    secretsData.twilioAuthToken = encryptSecret(payload.twilio.authToken.trim());
  }
  if (payload.email?.apiKey && !isMasked(payload.email.apiKey)) {
    secretsData.emailApiKey = encryptSecret(payload.email.apiKey.trim());
  }

  // Always keep runtime cache updated
  runtimeControlsCache = {
    ...(runtimeControlsCache || {}),
    ...publicData,
    twilio: {
      ...((runtimeControlsCache as any)?.twilio || {}),
      ...(publicData.twilio || {}),
    },
    email: {
      ...((runtimeControlsCache as any)?.email || {}),
      ...(publicData.email || {}),
    },
  };

  runtimeEncryptedSecretsCache = {
    ...runtimeEncryptedSecretsCache,
    ...secretsData,
  };

  // Persist to Firestore via Admin SDK
  if (adminDb) {
    try {
      await adminDb.doc(GLOBAL_CONTROLS_DOC).set(publicData, { merge: true });
      if (Object.keys(secretsData).length > 1) {
        await adminDb.doc(GLOBAL_SECRETS_DOC).set(secretsData, { merge: true });
      }
    } catch (saveErr) {
      console.warn("[CommunicationService] Error saving settings to AdminDb:", saveErr);
      throw saveErr;
    }
  }
}

/**
 * Evaluates real-time communication access for a specific school.
 */
export async function getSchoolCommunicationAccess(schoolId: string): Promise<SchoolCommunicationAccess> {
  const globalSettings = await getGlobalCommunicationSettings(true);

  let schoolPlanSlug = "free";
  let schoolPlanName = "Free Plan";
  let schoolName = "School";

  try {
    const adminDb = getSafeAdminDb();
    if (adminDb && schoolId) {
      const sSnap = await adminDb.collection("schools").doc(schoolId).get();
      if (sSnap.exists) {
        const sData = sSnap.data() || {};
        schoolName = sData.name || "School";
        schoolPlanSlug = (sData.planSlug || sData.planId || "free").toLowerCase().replace(/^plan_/, "");
        schoolPlanName = sData.planName || schoolPlanSlug;
      }
    }
  } catch (err) {
    console.warn("[CommunicationService] Error resolving school plan:", err);
  }

  // 1. Plan baseline
  const planChannels =
    globalSettings.planAccess[schoolPlanSlug] ||
    globalSettings.planAccess.free || {
      whatsapp: false,
      email: false,
      in_app: true,
      automation: false,
    };

  // 2. Manual override
  const override = globalSettings.schoolOverrides?.[schoolId];
  const isOverridden = Boolean(override && typeof override.enabled === "boolean");
  const overrideEnabled = override?.enabled ?? true;

  let canWhatsApp =
    globalSettings.channels.whatsapp &&
    (override?.channels?.whatsapp ?? (planChannels.whatsapp && overrideEnabled));
  let canEmail =
    globalSettings.channels.email &&
    (override?.channels?.email ?? (planChannels.email && overrideEnabled));
  let canInApp = globalSettings.channels.in_app;
  let canAutomate =
    globalSettings.channels.automation &&
    (override?.channels?.automation ?? (planChannels.automation && overrideEnabled));

  if (!globalSettings.masterEnabled) {
    canWhatsApp = false;
    canEmail = false;
    canInApp = false;
    canAutomate = false;
  }

  // Generate clear lock reason
  let lockReason: string | undefined = undefined;
  if (!globalSettings.masterEnabled) {
    lockReason = "Communication features are temporarily paused system-wide by Super Admin.";
  } else if (isOverridden && !overrideEnabled) {
    lockReason = "Communication access has been manually disabled for your school by Super Admin.";
  } else if (!canWhatsApp && !canEmail) {
    lockReason = `WhatsApp & Email automation requires Growth or Professional Plan. Current: ${schoolPlanName}.`;
  }

  const monthlyUsage = {
    totalSent: 0,
    whatsappSent: 0,
    emailSent: 0,
    inAppSent: 0,
    failed: 0,
    limit: override?.monthlyLimit || 5000,
  };

  return {
    schoolId,
    schoolName,
    planSlug: schoolPlanSlug,
    planName: schoolPlanName,
    isGloballyEnabled: globalSettings.masterEnabled,
    canSendWhatsApp: Boolean(canWhatsApp),
    canSendEmail: Boolean(canEmail),
    canSendInApp: Boolean(canInApp),
    canAutomate: Boolean(canAutomate),
    isOverridden,
    overrideEnabled: override?.enabled,
    lockReason,
    monthlyUsage,
  };
}

/**
 * Dispatches a communication message through the Unified Notification Engine.
 */
export async function dispatchCommunicationMessage(
  payload: SendMessagePayload,
  triggeredBy: { uid: string; name: string; role: string }
): Promise<SendResult> {
  const { schoolId, channel, studentId, studentName, content } = payload;

  if (!schoolId) {
    return { success: false, logId: "", channel, status: "failed", error: "Missing schoolId" };
  }

  // 1. Verify School Access & Channel Entitlement
  const access = await getSchoolCommunicationAccess(schoolId);
  if (!access.isGloballyEnabled) {
    return { success: false, logId: "", channel, status: "failed", error: "Communication globally disabled" };
  }

  if (channel === "whatsapp" && !access.canSendWhatsApp) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      error: access.lockReason || "WhatsApp messaging locked for this school plan",
    };
  }

  if (channel === "email" && !access.canSendEmail) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      error: access.lockReason || "Email messaging locked for this school plan",
    };
  }

  // 2. Fetch full global configuration (with decrypted secrets)
  const fullConfig = await getGlobalCommunicationSettings(false);

  // 3. Prepare Log Entry
  const now = new Date().toISOString();
  const logId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logEntry: CommunicationLogEntry = {
    id: logId,
    schoolId,
    studentId,
    studentName,
    admissionNumber: payload.admissionNumber || "",
    className: payload.className || "",
    parentName: payload.parentName || "",
    recipient:
      (channel === "whatsapp"
        ? payload.recipientPhone
        : channel === "email"
        ? payload.recipientEmail
        : payload.userId) || "Student App",
    channel,
    templateId: payload.templateId,
    title: payload.title || "Notification",
    content,
    triggeredBy,
    triggerType: payload.triggerType,
    status: "processing",
    retryCount: 0,
    idempotencyKey: payload.idempotencyKey,
    metadata: payload.metadata || {},
    scheduledFor: payload.scheduledFor || null,
    createdAt: now,
  };

  // 4. Channel Execution
  let finalStatus: CommunicationDeliveryStatus = "sent";
  let providerMessageId: string | undefined;
  let errorReason: string | undefined;

  try {
    if (channel === "in_app") {
      // IN-APP: Always Free, 100% Guaranteed Native Notification
      const notifId = await createNotification(
        schoolId,
        {
          title: payload.title || "School Notification",
          message: content,
          type: "general",
          targetAudience: "user",
          targetUserId: payload.userId || studentId,
          idempotencyKey: payload.idempotencyKey,
          priority: "high",
          metadata: {
            ...payload.metadata,
            studentId,
            studentName,
            admissionNumber: payload.admissionNumber,
            commLogId: logId,
          },
        },
        triggeredBy
      );

      finalStatus = "delivered";
      providerMessageId = notifId || `inapp_${Date.now()}`;
    } else if (channel === "whatsapp") {
      // WHATSAPP: Twilio REST API
      const recipientPhone = payload.recipientPhone?.replace(/[^0-9]/g, "");
      if (!recipientPhone || recipientPhone.length < 10) {
        throw new Error("Invalid or missing 10-digit mobile number");
      }

      const formattedTo = recipientPhone.length === 10 ? `+91${recipientPhone}` : `+${recipientPhone}`;
      const twilioAccountSid = fullConfig.twilio.accountSid;
      const twilioAuthToken = fullConfig.twilio.authToken;
      const twilioFrom = fullConfig.twilio.fromNumber.startsWith("whatsapp:")
        ? fullConfig.twilio.fromNumber
        : `whatsapp:${fullConfig.twilio.fromNumber}`;

      if (twilioAccountSid && twilioAuthToken && !isMasked(twilioAuthToken)) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const bodyParams = new URLSearchParams();
        bodyParams.append("From", twilioFrom);
        bodyParams.append("To", `whatsapp:${formattedTo}`);
        bodyParams.append("Body", content);

        const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: bodyParams.toString(),
        });

        const twilioRes = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errCode = twilioRes.code;
          let userMsg = twilioRes.message || `Twilio dispatch failed (HTTP ${res.status})`;
          if (errCode === 21608) {
            userMsg = "Recipient has not joined Twilio WhatsApp Sandbox. Recipient must send join code first.";
          } else if (errCode === 21211) {
            userMsg = `Invalid phone number format: ${formattedTo}`;
          } else if (errCode === 20003) {
            userMsg = "Twilio authentication failed. Verify Account SID & Auth Token.";
          }
          throw new Error(userMsg);
        }

        finalStatus = "sent";
        providerMessageId = twilioRes.sid;
      } else {
        throw new Error("Twilio WhatsApp credentials not configured by Super Admin");
      }
    } else if (channel === "email") {
      // EMAIL: Resend / SendGrid API
      const recipientEmail = payload.recipientEmail?.trim();
      if (!recipientEmail || !recipientEmail.includes("@")) {
        throw new Error("Invalid or missing recipient email address");
      }

      if (fullConfig.email.provider === "resend" && fullConfig.email.apiKey && !isMasked(fullConfig.email.apiKey)) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${fullConfig.email.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fullConfig.email.senderName} <${fullConfig.email.senderEmail}>`,
            to: [recipientEmail],
            subject: payload.title || "School Study Notification",
            text: content,
          }),
        });

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(resData.message || `Resend Email error: ${res.status}`);
        }

        finalStatus = "sent";
        providerMessageId = resData.id;
      } else {
        throw new Error("Email provider credentials not configured by Super Admin");
      }
    }
  } catch (sendErr: any) {
    finalStatus = "failed";
    errorReason = sendErr.message || "Message dispatch failure";
    console.warn(`[CommunicationEngine] ${channel} dispatch error:`, errorReason);
  }

  // 5. Commit Delivery Log with Tenant Isolation
  logEntry.status = finalStatus;
  logEntry.providerMessageId = providerMessageId;
  logEntry.errorReason = errorReason;
  logEntry.sentAt = finalStatus === "sent" || finalStatus === "delivered" ? now : null;
  logEntry.deliveredAt = finalStatus === "delivered" ? now : null;

  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb.collection("schools").doc(schoolId).collection("communication_logs").doc(logId).set(logEntry);
      await adminDb.collection("communication_delivery_logs").doc(logId).set({
        ...logEntry,
        schoolName: access.schoolName,
      });
    }
  } catch (logErr) {
    console.warn("[CommunicationEngine] Failed to write delivery log:", logErr);
  }

  return {
    success: finalStatus === "sent" || finalStatus === "delivered",
    logId,
    channel,
    status: finalStatus,
    providerMessageId,
    error: errorReason,
  };
}

/**
 * Fetches communication logs for a specific school (strict tenant isolation).
 */
export async function getSchoolCommunicationLogs(
  schoolId: string,
  filterChannel?: CommunicationChannel,
  filterStatus?: CommunicationDeliveryStatus,
  maxLogs = 50
): Promise<CommunicationLogEntry[]> {
  if (!schoolId) return [];

  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      let q: any = adminDb.collection("schools").doc(schoolId).collection("communication_logs");
      if (filterChannel) q = q.where("channel", "==", filterChannel);
      if (filterStatus) q = q.where("status", "==", filterStatus);
      q = q.orderBy("createdAt", "desc").limit(maxLogs);

      const snap = await q.get();
      return snap.docs.map((d: any) => d.data() as CommunicationLogEntry);
    }
  } catch (err) {
    console.warn("[CommunicationService] Error fetching communication logs:", err);
  }

  return [];
}

/**
 * Retrieves all delivery logs across all schools for Super Admin platform visibility.
 */
export async function getAllPlatformCommunicationLogs(maxLogs = 100): Promise<CommunicationLogEntry[]> {
  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("communication_delivery_logs").orderBy("createdAt", "desc").limit(maxLogs).get();
      return snap.docs.map((d: any) => d.data() as CommunicationLogEntry);
    }
  } catch (err) {
    console.warn("[CommunicationService] Error fetching all platform logs:", err);
  }
  return [];
}
