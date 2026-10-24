import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
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
  WhatsAppSendMode,
  CommunicationPlanLimits,
} from "@/types/communication";
import { DEFAULT_COMMUNICATION_PLAN_LIMITS } from "@/types/communication";
import { createNotification } from "./notification.service";
import {
  DEFAULT_COMMUNICATION_TEMPLATES,
  resolveTemplateVariables,
} from "./communication-template.utils";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  maskAccountSid,
  isMasked,
} from "./communication-crypto";
import {
  sendTwilioWhatsApp,
  sendTwilioSMS,
  fetchTwilioMessageStatus,
  classifyProviderError,
} from "./communication-provider";
import {
  resolveTemplateContent,
  type VariableResolutionContext,
} from "./communication-variables";
import { normalizePhoneNumber, maskPhoneNumber } from "./phone-validation";


// Server-side persistent backup helpers for encrypted credentials
function getLocalSecretsPath(): string | null {
  if (typeof window !== "undefined") return null;
  try {
    const fsMod = require("fs");
    const pathMod = require("path");
    const dir = pathMod.join(process.cwd(), ".data");
    if (!fsMod.existsSync(dir)) {
      try { fsMod.mkdirSync(dir, { recursive: true }); } catch {}
    }
    return pathMod.join(dir, "communication_secrets.enc");
  } catch {
    return null;
  }
}

function loadLocalEncryptedSecrets(): Record<string, string> | null {
  if (typeof window !== "undefined") return null;
  try {
    const fsMod = require("fs");
    const filePath = getLocalSecretsPath();
    if (filePath && fsMod.existsSync(filePath)) {
      const content = fsMod.readFileSync(filePath, "utf-8");
      if (content) {
        const decrypted = decryptSecret(content);
        if (decrypted) return JSON.parse(decrypted);
      }
    }
  } catch {}
  return null;
}

function saveLocalEncryptedSecrets(secrets: Record<string, string>): void {
  if (typeof window !== "undefined") return;
  try {
    const fsMod = require("fs");
    const filePath = getLocalSecretsPath();
    if (filePath) {
      const encrypted = encryptSecret(JSON.stringify(secrets));
      if (encrypted) {
        fsMod.writeFileSync(filePath, encrypted, "utf-8");
      }
    }
  } catch {}
}

// Collection Constants
const GLOBAL_CONTROLS_DOC = "siteSettings/communication_controls";
const GLOBAL_SECRETS_DOC = "siteSettings/communication_secrets";

export const DEFAULT_COMMUNICATION_SETTINGS: GlobalCommunicationSettings = {
  masterEnabled: true,
  channels: {
    whatsapp: true,
    sms: true,
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
    free: { whatsapp: false, sms: false, email: false, in_app: true, automation: false },
    base: { whatsapp: false, sms: false, email: false, in_app: true, automation: false },
    starter: { whatsapp: false, sms: false, email: true, in_app: true, automation: false },
    growth: { whatsapp: true, sms: true, email: true, in_app: true, automation: true },
    professional: { whatsapp: true, sms: true, email: true, in_app: true, automation: true },
    enterprise: { whatsapp: true, sms: true, email: true, in_app: true, automation: true },
  },
  planLimits: DEFAULT_COMMUNICATION_PLAN_LIMITS,
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
      "Dear {{parent_name}}, gentle reminder that fee of {{fee_amount}} for {{student_name}} (Class: {{class_name}}) is due on {{due_date}}. Please pay on time. - {{school_name}}",
    enabled: true,
    minOutstandingAmount: 100,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    maxRemindersPerInvoice: 2,
    excludeWaivedOrDisputed: true,
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
      "Dear {{parent_name}}, today is the due date for {{student_name}}'s school fee of {{outstanding_amount}}. Kindly clear today to avoid late fees. - {{school_name}}",
    enabled: true,
    minOutstandingAmount: 100,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    maxRemindersPerInvoice: 1,
    excludeWaivedOrDisputed: true,
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
      "Dear {{parent_name}}, the fee of {{outstanding_amount}} for {{student_name}} is now OVERDUE. Please clear the outstanding balance immediately. - {{school_name}}",
    enabled: true,
    minOutstandingAmount: 200,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    maxRemindersPerInvoice: 3,
    excludeWaivedOrDisputed: true,
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
      "Attention: Late fee penalty has been applied to {{student_name}}'s outstanding fee. Total balance: {{outstanding_amount}}. Settle immediately at school office. - {{school_name}}",
    enabled: false,
    minOutstandingAmount: 500,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    maxRemindersPerInvoice: 2,
    excludeWaivedOrDisputed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Runtime fallback cache for dev / test environments when Admin SDK is unavailable
let runtimeControlsCache: Partial<GlobalCommunicationSettings> | null = null;
let runtimeEncryptedSecretsCache: Record<string, string> = {};

/**
 * Validates WhatsApp sender phone number format.
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
 */
export async function getGlobalCommunicationSettings(clientSafe = true): Promise<GlobalCommunicationSettings> {
  try {
    const adminDb = getSafeAdminDb();
    let controls: any = runtimeControlsCache || {};
    let secrets: any = runtimeEncryptedSecretsCache || loadLocalEncryptedSecrets() || {};

    if (adminDb) {
      try {
        const controlsSnap = await adminDb.doc(GLOBAL_CONTROLS_DOC).get();
        if (controlsSnap.exists) {
          controls = controlsSnap.data() || {};
        }

        const secretsSnap = await adminDb.doc(GLOBAL_SECRETS_DOC).get();
        if (secretsSnap.exists) {
          secrets = secretsSnap.data() || {};
          saveLocalEncryptedSecrets(secrets);
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
        accountSid: clientSafe ? maskAccountSid(accountSid) : accountSid,
        authToken: clientSafe ? (rawTwilioToken ? "CONFIGURED" : "NOT_CONFIGURED") : rawTwilioToken,
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
      planLimits: controls.planLimits || DEFAULT_COMMUNICATION_PLAN_LIMITS,
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
 * Super Admin updates global settings, plan permissions, limits, or provider credentials.
 */
export async function updateGlobalCommunicationSettings(
  payload: Partial<GlobalCommunicationSettings> & { action?: string; clearTwilioCredentials?: boolean },
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
  if (payload.planLimits) publicData.planLimits = payload.planLimits;
  if (payload.schoolOverrides) publicData.schoolOverrides = payload.schoolOverrides;

  // Retrieve current existing credentials to preserve on partial edit
  const currentSaved = await getGlobalCommunicationSettings(false);
  const existingSid = runtimeEncryptedSecretsCache?.twilioAccountSid || currentSaved.twilio?.accountSid || "";
  const existingEncryptedToken = runtimeEncryptedSecretsCache?.twilioAuthToken || (currentSaved.twilio?.authToken ? encryptSecret(currentSaved.twilio.authToken) : "");

  const secretsData: Record<string, any> = {
    updatedAt: now,
  };

  const isRemoveAction = payload.action === "remove_twilio_credentials" || payload.clearTwilioCredentials === true || (payload.twilio as any)?.clearCredentials === true;

  if (isRemoveAction) {
    publicData.twilio = {
      accountSid: "",
      fromNumber: "",
      smsFromNumber: "",
      isConfigured: false,
    };
    secretsData.twilioAccountSid = "";
    secretsData.twilioAuthToken = "";
  } else if (payload.twilio) {
    const providedSid = payload.twilio.accountSid?.trim();
    const isSidMasked = isMasked(providedSid);
    const effectiveSid = (!providedSid || isSidMasked) ? existingSid : providedSid;

    const providedToken = payload.twilio.authToken?.trim();
    const isTokenBlankOrMasked = !providedToken || isMasked(providedToken) || providedToken === "CONFIGURED";

    if (effectiveSid) {
      secretsData.twilioAccountSid = effectiveSid;
    }
    if (!isTokenBlankOrMasked) {
      secretsData.twilioAuthToken = encryptSecret(providedToken);
    } else if (existingEncryptedToken) {
      secretsData.twilioAuthToken = existingEncryptedToken;
    }

    const hasSid = Boolean(effectiveSid);
    const hasToken = Boolean(secretsData.twilioAuthToken || existingEncryptedToken);

    publicData.twilio = {
      accountSid: effectiveSid,
      fromNumber: payload.twilio.fromNumber || runtimeControlsCache?.twilio?.fromNumber || currentSaved.twilio?.fromNumber || "",
      smsFromNumber: payload.twilio.smsFromNumber || runtimeControlsCache?.twilio?.smsFromNumber || currentSaved.twilio?.smsFromNumber || "",
      isConfigured: Boolean(hasSid && hasToken),
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

  saveLocalEncryptedSecrets(runtimeEncryptedSecretsCache);

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
 * Evaluates real-time communication access, limits, and quotas for a specific school.
 * Authoritatively powered by resolveEffectiveSchoolEntitlements (Single Source of Truth).
 */
export async function getSchoolCommunicationAccess(
  schoolId: string,
  userContext?: { uid?: string; role?: string; schoolId?: string | null; email?: string }
): Promise<SchoolCommunicationAccess> {
  const { resolveEffectiveSchoolEntitlements } = await import("@/lib/billing/entitlement");
  const entitlements = await resolveEffectiveSchoolEntitlements(schoolId, userContext);
  return entitlements.communication;
}

/**
 * Dispatches a communication message through the Unified Notification Engine.
 */
export async function dispatchCommunicationMessage(
  payload: SendMessagePayload,
  triggeredBy: { uid: string; name: string; role: string }
): Promise<SendResult> {
  const { schoolId, channel, studentId, studentName, content, sendMode = "api" } = payload;

  if (!schoolId) {
    return { success: false, logId: "", channel, status: "failed", error: "Missing schoolId" };
  }

  // 1. Verify School Access & Channel Entitlement
  const access = await getSchoolCommunicationAccess(schoolId, triggeredBy);
  if (!access.isGloballyEnabled) {
    return { success: false, logId: "", channel, status: "failed", error: "Communication globally disabled" };
  }

  // Manual WhatsApp mode check
  if (channel === "whatsapp" && sendMode === "manual") {
    if (!access.canManualWhatsApp) {
      return { success: false, logId: "", channel, status: "failed", error: access.lockReason || "Manual WhatsApp disabled for this school" };
    }

    const phoneRes = normalizePhoneNumber(payload.recipientPhone || "");
    if (!phoneRes.isValid) {
      return { success: false, logId: "", channel, status: "failed", error: phoneRes.error || "Invalid recipient mobile number" };
    }

    const formattedTo = phoneRes.normalized.replace(/^\+/, "");
    const waLink = `https://wa.me/${formattedTo}?text=${encodeURIComponent(content)}`;

    const logId = `comm_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logEntry: CommunicationLogEntry = {
      id: logId,
      schoolId,
      studentId,
      studentName,
      admissionNumber: payload.admissionNumber || "",
      className: payload.className || "",
      sectionName: payload.sectionName || "",
      parentName: payload.parentName || "",
      recipient: phoneRes.masked,
      channel: "whatsapp",
      sendMode: "manual",
      templateId: payload.templateId,
      title: payload.title || "Manual WhatsApp",
      content,
      triggeredBy,
      triggerType: payload.triggerType,
      status: "manual_opened",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Save log entry without touching API quotas
    try {
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        await adminDb.collection("schools").doc(schoolId).collection("communication_logs").doc(logId).set(logEntry);
      }
    } catch {}

    return {
      success: true,
      logId,
      channel: "whatsapp",
      status: "manual_opened",
      waLink,
    };
  }

  // API sending checks
  if (channel === "whatsapp" && !access.canSendWhatsApp) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      error: access.lockReason || "WhatsApp API messaging locked for this school plan",
    };
  }

  if (channel === "sms" && !access.canSendSms) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      error: access.lockReason || "SMS API messaging locked for this school plan",
    };
  }

  // Quota enforcement
  if (channel === "whatsapp" && access.limits.monthlyWhatsAppAllowance !== -1) {
    if (access.monthlyUsage.whatsappSent >= access.limits.monthlyWhatsAppAllowance) {
      return {
        success: false,
        logId: "",
        channel,
        status: "failed",
        error: `Monthly WhatsApp quota (${access.limits.monthlyWhatsAppAllowance} messages) reached for this billing cycle. Upgrade plan for higher limits.`,
      };
    }
  }

  if (channel === "sms" && access.limits.monthlySmsAllowance !== -1) {
    if (access.monthlyUsage.smsSent >= access.limits.monthlySmsAllowance) {
      return {
        success: false,
        logId: "",
        channel,
        status: "failed",
        error: `Monthly SMS quota (${access.limits.monthlySmsAllowance} messages) reached for this billing cycle. Upgrade plan for higher limits.`,
      };
    }
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
    sectionName: payload.sectionName || "",
    parentName: payload.parentName || "",
    recipient:
      (channel === "whatsapp" || channel === "sms"
        ? payload.recipientPhone
        : channel === "email"
        ? payload.recipientEmail
        : payload.userId) || "Student App",
    channel,
    sendMode: "api",
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
      const phoneRes = normalizePhoneNumber(payload.recipientPhone || "");
      if (!phoneRes.isValid) {
        throw new Error(phoneRes.error || "Invalid or missing mobile number");
      }

      const res = await sendTwilioWhatsApp(
        phoneRes.normalized,
        content,
        fullConfig.twilio,
        payload.templateId?.startsWith("HX") ? payload.templateId : undefined
      );

      if (!res.success) {
        throw new Error(res.userFriendlyError || res.errorMessage || "Twilio WhatsApp dispatch failed");
      }

      finalStatus = res.status;
      providerMessageId = res.providerMessageId;
    } else if (channel === "sms") {
      const phoneRes = normalizePhoneNumber(payload.recipientPhone || "");
      if (!phoneRes.isValid) {
        throw new Error(phoneRes.error || "Invalid or missing mobile number for SMS");
      }

      const res = await sendTwilioSMS(phoneRes.normalized, content, fullConfig.twilio);
      if (!res.success) {
        throw new Error(res.userFriendlyError || res.errorMessage || "Twilio SMS dispatch failed");
      }

      finalStatus = res.status;
      providerMessageId = res.providerMessageId;
    } else if (channel === "email") {
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
  logEntry.sentAt = finalStatus === "sent" || finalStatus === "delivered" || finalStatus === "queued" ? now : null;
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
    success: finalStatus === "sent" || finalStatus === "delivered" || finalStatus === "queued",
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

/**
 * Fetches all templates available to a school (System Defaults + School Custom Templates).
 */
export async function getSchoolTemplates(schoolId: string): Promise<CommunicationTemplate[]> {
  const templates: CommunicationTemplate[] = [...DEFAULT_COMMUNICATION_TEMPLATES];

  if (!schoolId) return templates;

  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("communication_templates")
        .where("status", "!=", "archived")
        .get();

      if (!snap.empty) {
        snap.docs.forEach((d) => {
          templates.unshift({ ...(d.data() as CommunicationTemplate), id: d.id, schoolId });
        });
      }
    }
  } catch (err) {
    console.warn("[CommunicationService] Error reading custom templates:", err);
  }

  return templates;
}

/**
 * Saves or updates a custom template for a school.
 */
export async function saveSchoolTemplate(
  schoolId: string,
  template: Partial<CommunicationTemplate>
): Promise<CommunicationTemplate> {
  const adminDb = getSafeAdminDb();
  const id = template.id || `tpl_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const toSave: CommunicationTemplate = {
    id,
    schoolId,
    name: template.name || "Custom Notification Template",
    category: template.category || "general",
    channel: template.channel || "whatsapp",
    titleTemplate: template.titleTemplate || "",
    bodyTemplate: template.bodyTemplate || "",
    variables: template.variables || [],
    status: template.status || "draft",
    whatsappTemplateSid: template.whatsappTemplateSid || undefined,
    whatsappLanguage: template.whatsappLanguage || "en_US",
    isSystemDefault: false,
    createdAt: template.createdAt || now,
    updatedAt: now,
  };

  if (adminDb) {
    await adminDb.collection("schools").doc(schoolId).collection("communication_templates").doc(id).set(toSave, { merge: true });
  }

  return toSave;
}

/**
 * Archives a custom template for a school.
 */
export async function archiveSchoolTemplate(schoolId: string, templateId: string): Promise<void> {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("communication_templates")
      .doc(templateId)
      .update({ status: "archived", updatedAt: new Date().toISOString() });
  }
}

/**
 * Records a manual WhatsApp action (e.g. copied text or opened wa.me link).
 */
export async function recordManualWhatsAppAction(
  schoolId: string,
  logId: string,
  action: "manual_copied" | "manual_opened" | "manual_sent"
): Promise<void> {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("communication_logs")
      .doc(logId)
      .update({ status: action, updatedAt: new Date().toISOString() })
      .catch(() => {});
  }
}

/**
 * Dispatches a genuine test message for School Admin.
 */
export async function dispatchTestMessage(
  schoolId: string,
  channel: CommunicationChannel,
  recipientPhone: string,
  triggeredBy: { uid: string; name: string; role: string }
): Promise<SendResult & { errorCode?: string; maskedPhone?: string }> {
  const { normalizePhoneNumber } = await import("./phone-validation");
  const phoneRes = normalizePhoneNumber(recipientPhone);
  if (!phoneRes.isValid) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "INVALID_PHONE_NUMBER",
      error: phoneRes.error || "Invalid phone number format.",
      maskedPhone: phoneRes.masked,
    };
  }

  const access = await getSchoolCommunicationAccess(schoolId, triggeredBy);
  if (!access.canTestMessage) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "FEATURE_NOT_ENABLED",
      error: access.lockReason || "Test message sending is not permitted on your plan.",
      maskedPhone: phoneRes.masked,
    };
  }

  if (channel === "whatsapp" && !access.canSendWhatsApp) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "FEATURE_NOT_ENABLED",
      error: access.lockReason || "WhatsApp API messaging is not included in your current plan.",
      maskedPhone: phoneRes.masked,
    };
  }

  if (channel === "sms" && !access.canSendSms) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "FEATURE_NOT_ENABLED",
      error: access.lockReason || "SMS API messaging is not included in your current plan.",
      maskedPhone: phoneRes.masked,
    };
  }

  if (access.limits.monthlyTestAllowance !== -1 && access.monthlyUsage.testsSent >= access.limits.monthlyTestAllowance) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "QUOTA_EXCEEDED",
      error: `Monthly test message allowance (${access.limits.monthlyTestAllowance}) reached.`,
      maskedPhone: phoneRes.masked,
    };
  }

  // Provider configuration validation
  const fullConfig = await getGlobalCommunicationSettings(false);
  if (!fullConfig.twilio?.accountSid || !fullConfig.twilio?.authToken) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "TWILIO_NOT_CONFIGURED",
      error: "Twilio provider is not configured. Please contact Super Admin to configure Twilio credentials.",
      maskedPhone: phoneRes.masked,
    };
  }

  if (channel === "whatsapp" && !fullConfig.twilio?.fromNumber) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "SENDER_NOT_APPROVED",
      error: "Twilio WhatsApp sender number is not configured in Super Admin settings.",
      maskedPhone: phoneRes.masked,
    };
  }

  if (channel === "sms" && !fullConfig.twilio?.smsFromNumber && !fullConfig.twilio?.fromNumber) {
    return {
      success: false,
      logId: "",
      channel,
      status: "failed",
      errorCode: "SENDER_NOT_APPROVED",
      error: "Twilio SMS sender number or Messaging Service is not configured.",
      maskedPhone: phoneRes.masked,
    };
  }

  const testContent = `[TEST MESSAGE] Hello from ${access.schoolName || "SBCI School ERP"}! Your ${channel.toUpperCase()} integration is working properly. Timestamp: ${new Date().toLocaleTimeString()}`;

  const sendResult = await dispatchCommunicationMessage(
    {
      schoolId,
      studentId: "test_recipient",
      studentName: "Authorized Test Recipient",
      recipientPhone: phoneRes.normalized,
      channel,
      sendMode: "api",
      title: "Test Message",
      content: testContent,
      triggerType: "test_message",
    },
    triggeredBy
  );

  return {
    ...sendResult,
    maskedPhone: phoneRes.masked,
  };
}
