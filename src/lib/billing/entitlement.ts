import type {
  EffectiveEntitlement,
  ResourceLimitStatus,
  ResourceLimitKey,
} from "@/types";
import { getSchoolAccess } from "./accessEngine";
import { getSchoolUsage } from "./usage";
import { getPlanFeatures, getEffectiveFeatureAccessModes, getRequiredPlanForFeature } from "./featureAccess";
import { getActiveLimitOverrides, getActiveAccessOverrides } from "./subscriptionAdjustmentEngine";
import { getActivePlan, getAllPlans } from "./plans";

/**
 * Section 27 & Phase 12B: Authoritative Effective Entitlement Service.
 * Resolves: Security/Suspension -> Access Policy -> Manual Restrictions -> Subscription Status -> Plan Version -> Limits -> Limit Overrides -> Real Usage -> 3-Way Feature Access Modes.
 */
export async function getEffectiveEntitlement(schoolId: string, userToken?: string): Promise<EffectiveEntitlement> {
  const [summary, usage, featureAccessModes, limitOverrides, accessOverrides, catalog] = await Promise.all([
    getSchoolAccess(schoolId, userToken),
    getSchoolUsage(schoolId),
    getEffectiveFeatureAccessModes(schoolId),
    getActiveLimitOverrides(schoolId),
    getActiveAccessOverrides(schoolId),
    getAllPlans(),
  ]);
  const features = Object.fromEntries(Object.entries(featureAccessModes).map(([key, mode]) => [key, mode === "FULL_ACCESS"]));

  const planDoc = await getActivePlan(summary?.planId || "plan_starter");

  // Base plan limits
  const baseLimits = summary.limits || {
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
  };

  // Check temporary access override or FULL_CONTROL mode
  const hasTempAccess = accessOverrides.some((o) => o.type === "TEMPORARY_ACCESS");
  const isFullControl = summary.accessMode === "FULL_ACCESS" && (summary?.controlMode === "FULL_CONTROL" || hasTempAccess);
  const effectiveAccessMode = summary.accessMode;

  // Apply active Limit Overrides or FULL_CONTROL unlimited (-1)
  const effectiveMaxStudents = isFullControl ? -1 : (limitOverrides.find((o) => o.limitKey === "students")?.overrideValue ?? baseLimits.maxStudents ?? 500);
  const effectiveMaxTeachers = isFullControl ? -1 : (limitOverrides.find((o) => o.limitKey === "teachers")?.overrideValue ?? baseLimits.maxTeachers ?? 20);
  const effectiveMaxClasses = isFullControl ? -1 : (limitOverrides.find((o) => o.limitKey === "classes")?.overrideValue ?? baseLimits.maxClasses ?? 15);
  const effectiveMaxStaff = isFullControl ? -1 : (limitOverrides.find((o) => o.limitKey === "staff")?.overrideValue ?? baseLimits.maxStaffAccounts ?? 2);

  function buildLimitStatus(key: ResourceLimitKey, limitValue: number): ResourceLimitStatus {
    const current = usage[key] ?? 0;
    const isUnlimited = limitValue === -1;
    const isOverLimit = !isUnlimited && current > limitValue;
    const remaining = isUnlimited ? Infinity : Math.max(0, limitValue - current);

    return {
      current,
      limit: limitValue,
      remaining,
      isOverLimit,
      isUnlimited,
    };
  }

  const studentsLimit = buildLimitStatus("students", effectiveMaxStudents);
  const teachersLimit = buildLimitStatus("teachers", effectiveMaxTeachers);
  const classesLimit = buildLimitStatus("classes", effectiveMaxClasses);
  const staffLimit = buildLimitStatus("staff", effectiveMaxStaff);

  const planName =
    planDoc?.name ||
    (summary.planId === "plan_base"
      ? "Base Plan"
      : summary.planId === "plan_starter"
      ? "Starter Plan"
      : summary.planId === "plan_growth"
      ? "Growth Plan"
      : summary.planId === "plan_professional"
      ? "Professional Plan"
      : summary.planId === "plan_enterprise"
      ? "Enterprise Plan"
      : summary.planId === "plan_free"
      ? "Free Plan"
      : "Base Plan");
  const planSlug = planDoc?.slug || (summary.planId ? summary.planId.replace("plan_", "") : "base");

  const isExpired = effectiveAccessMode === "RESTRICTED_ACCESS" || effectiveAccessMode === "NO_ACCESS";
  const isInGrace = effectiveAccessMode === "GRACE_ACCESS";

  // Build availableFromMap for showcase/hidden features dynamically
  const availableFromMap: Record<string, string> = {};
  const featureKeysToCheck = Object.keys(featureAccessModes);
  await Promise.all(
    featureKeysToCheck.map(async (fKey) => {
      if (featureAccessModes[fKey] !== "FULL_ACCESS") {
        try {
          const req = await getRequiredPlanForFeature(fKey, summary.planId, catalog);
          availableFromMap[fKey] = req.planName;
        } catch {
          availableFromMap[fKey] = "Higher Plan Required";
        }
      }
    })
  );

  return {
    schoolId,
    subscriptionStatus: summary.status,
    accessMode: effectiveAccessMode,
    plan: {
      id: summary.planId,
      name: planName,
      slug: planSlug,
      version: planDoc?.version || 1,
    },
    features,
    featureAccessModes,
    availableFromMap,
    limits: {
      students: studentsLimit,
      teachers: teachersLimit,
      classes: classesLimit,
      staff: staffLimit,
    },
    isExpired,
    isInGrace,
    daysRemaining: summary.daysRemaining,
    expiresAt: summary.expiresAt,
    graceEndsAt: summary.graceEndsAt,
    controlMode: (summary.controlMode as any) || "PLAN_DEFAULT",
    allowedFeatures: summary.allowedFeatures || [],
  };
}

export interface EffectiveSchoolEntitlements extends EffectiveEntitlement {
  schoolName: string;
  isAuthorized: boolean;
  subscriptionType: "ACTIVE_PAID_PLAN" | "VALID_FREE_PLAN" | "EXPIRED_PLAN" | "SUSPENDED_PLAN" | "MISSING_SUBSCRIPTION" | "ERROR";
  capabilities: {
    manualWhatsApp: boolean;
    whatsappApi: boolean;
    smsApi: boolean;
    customTemplates: boolean;
    bulkSending: boolean;
    feeReminders: boolean;
    automatedReminders: boolean;
    deliveryTracking: boolean;
    scheduling: boolean;
    testMessages: boolean;
  };
  communication: import("@/types/communication").SchoolCommunicationAccess;
  twilioConfigured: boolean;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

/**
 * SINGLE AUTHORITATIVE SERVER-SIDE FUNCTION FOR SCHOOL ENTITLEMENTS
 * Single source of truth for Billing, Communication, Automations, and Protected API routes.
 */
export async function resolveEffectiveSchoolEntitlements(
  schoolId: string,
  userContext?: { uid?: string; role?: string; schoolId?: string | null; email?: string; token?: string }
): Promise<EffectiveSchoolEntitlements> {
  // 1. School ID validation
  if (!schoolId || schoolId === "system" || typeof schoolId !== "string" || !schoolId.trim()) {
    const err = new Error("A valid school ID is required to resolve entitlements.");
    (err as any).statusCode = 400;
    (err as any).code = "UNAUTHORIZED_SCHOOL";
    throw err;
  }

  // 2. Tenant isolation check
  if (userContext) {
    if (userContext.role !== "super_admin" && userContext.schoolId && userContext.schoolId !== schoolId) {
      const err = new Error("Tenant authorization mismatch. You cannot access entitlements of another school.");
      (err as any).statusCode = 403;
      (err as any).code = "TENANT_MISMATCH";
      throw err;
    }
  }

  // 3. Load base entitlement & subscription
  let entitlement: EffectiveEntitlement;
  try {
    entitlement = await getEffectiveEntitlement(schoolId, userContext?.token);
  } catch (err: any) {
    const isMissing = err.code === "MISSING_SUBSCRIPTION" || err.message?.includes("School subscription was not found") || err.message?.includes("not found");
    const errorObj = {
      code: isMissing ? "MISSING_SUBSCRIPTION" : "ENTITLEMENT_LOOKUP_FAILED",
      message: err.message || "Failed to resolve school subscription.",
      status: isMissing ? 404 : 500,
    };
    const typedErr = new Error(errorObj.message);
    (typedErr as any).statusCode = errorObj.status;
    (typedErr as any).code = errorObj.code;
    throw typedErr;
  }

  // 5. Resolve school name from school document or cache
  let schoolName = "School";
  try {
    const adminDb = (await import("@/lib/firebase/admin")).getSafeAdminDb();
    if (adminDb) {
      const schoolSnap = await adminDb.collection("schools").doc(schoolId).get();
      if (schoolSnap.exists) {
        schoolName = schoolSnap.data()?.name || schoolName;
      }
    }
  } catch {}

  // 6. Subscription Type classification
  const isSuspended = entitlement.subscriptionStatus === "SUSPENDED" || entitlement.subscriptionStatus === "CANCELLED";
  const isExpired = entitlement.isExpired;
  const isFreePlan = entitlement.plan.slug === "free" || entitlement.plan.slug === "base";

  let subscriptionType: EffectiveSchoolEntitlements["subscriptionType"] = "ACTIVE_PAID_PLAN";
  if (isSuspended) subscriptionType = "SUSPENDED_PLAN";
  else if (isExpired) subscriptionType = "EXPIRED_PLAN";
  else if (isFreePlan) subscriptionType = "VALID_FREE_PLAN";

  // 7. Load Super Admin Global Communication Settings
  const { getGlobalCommunicationSettings } = await import(
    "@/lib/services/communication.service"
  );
  const { DEFAULT_COMMUNICATION_PLAN_LIMITS } = await import(
    "@/types/communication"
  );
  const globalSettings = await getGlobalCommunicationSettings(true);

  // 8. Dynamic plan feature registry check
  const planSlug = (entitlement.plan.slug || "base").toLowerCase();
  const planChannels =
    globalSettings.planAccess[planSlug] ||
    globalSettings.planAccess.free || {
      whatsapp: false,
      sms: false,
      email: false,
      in_app: true,
      automation: false,
    };

  const planLimits =
    globalSettings.planLimits?.[planSlug] ||
    DEFAULT_COMMUNICATION_PLAN_LIMITS[planSlug] ||
    DEFAULT_COMMUNICATION_PLAN_LIMITS.free;

  // 9. Super Admin school-specific override
  const override = globalSettings.schoolOverrides?.[schoolId];
  const isOverridden = Boolean(override && typeof override.enabled === "boolean");
  const overrideEnabled = override?.enabled ?? true;

  // 10. Capability resolution: Evaluated strictly from plan matrix, Super Admin settings, and overrides
  const masterEnabled = globalSettings.masterEnabled ?? true;
  const channelsConfig = globalSettings.channels || { whatsapp: true, sms: true, email: true, in_app: true, automation: true };

  // Manual WhatsApp: Always available unless school is suspended or platform master disabled
  const canManualWhatsApp = !isSuspended && !isExpired && masterEnabled;

  // WhatsApp API & SMS: Granted if school is active, master enabled, channel enabled, and plan/override grants access
  const hasPlanWhatsApp = Boolean(planChannels.whatsapp || entitlement.features["communication_hub"] || entitlement.features["communication.whatsappApi"]);
  const hasPlanSms = Boolean(planChannels.sms || entitlement.features["communication_hub"] || entitlement.features["communication.smsApi"]);
  const hasPlanAutomation = Boolean(planChannels.automation || entitlement.features["communication_hub"] || entitlement.features["communication.automatedReminders"]);

  const canSendWhatsApp = Boolean(
    !isSuspended &&
    !isExpired &&
    masterEnabled &&
    channelsConfig.whatsapp &&
    (override?.channels?.whatsapp ?? (hasPlanWhatsApp && overrideEnabled))
  );

  const canSendSms = Boolean(
    !isSuspended &&
    !isExpired &&
    masterEnabled &&
    channelsConfig.sms &&
    (override?.channels?.sms ?? (hasPlanSms && overrideEnabled))
  );

  const canAutomate = Boolean(
    !isSuspended &&
    !isExpired &&
    masterEnabled &&
    channelsConfig.automation &&
    (override?.channels?.automation ?? (hasPlanAutomation && overrideEnabled))
  );

  const canBulkSend = canSendWhatsApp || canSendSms;
  const canSchedule = canSendWhatsApp || canSendSms;
  const canTestMessage = canSendWhatsApp || canSendSms || canManualWhatsApp;
  const canCustomTemplates = canSendWhatsApp || canSendSms || (planSlug !== "free" && planSlug !== "base");
  const canDeliveryTrack = true;

  // 11. Twilio provider readiness
  const twilioConfigured = Boolean(
    globalSettings.twilio?.accountSid &&
    globalSettings.twilio?.authToken &&
    globalSettings.twilio?.fromNumber
  );

  let twilioWarning: string | undefined = undefined;
  if ((canSendWhatsApp || canSendSms) && !twilioConfigured) {
    twilioWarning = "Twilio credentials are not configured in Super Admin settings. Automated WhatsApp/SMS messages cannot be dispatched until platform credentials are added.";
  }

  // 12. Lock reason generation (accurate and truthful)
  let lockReason: string | undefined = undefined;
  if (isSuspended) {
    lockReason = `Your school account is currently suspended (${entitlement.subscriptionStatus}). Communication features are locked.`;
  } else if (!masterEnabled) {
    lockReason = "Communication features are temporarily paused system-wide by platform administrator.";
  } else if (isOverridden && !overrideEnabled) {
    lockReason = "Communication access has been manually disabled for your school by Super Admin.";
  } else if (!canSendWhatsApp && !canSendSms) {
    lockReason = `Automated WhatsApp & SMS API messaging is not included in your current plan (${entitlement.plan.name}). You can use Zero-Cost Manual WhatsApp Mode or upgrade your plan.`;
  }

  // 13. Effective communication plan limits
  const effectiveLimits = {
    ...planLimits,
    ...(override?.limits || {}),
  };

  // 14. Monthly usage tracking
  let usage = {
    totalSent: 0,
    whatsappSent: 0,
    smsSent: 0,
    emailSent: 0,
    inAppSent: 0,
    manualOpened: 0,
    testsSent: 0,
    failed: 0,
    limit: effectiveLimits.monthlyWhatsAppAllowance,
  };

  try {
    const adminDb = (await import("@/lib/firebase/admin")).getSafeAdminDb();
    if (adminDb) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const logsSnap = await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("communication_logs")
        .where("createdAt", ">=", startOfMonth)
        .get();

      logsSnap.docs.forEach((d) => {
        const l = d.data();
        if (l.status === "failed") {
          usage.failed++;
        } else if (l.status === "manual_opened" || l.status === "manual_copied") {
          usage.manualOpened++;
        } else {
          if (l.channel === "whatsapp") usage.whatsappSent++;
          else if (l.channel === "sms") usage.smsSent++;
          else if (l.channel === "email") usage.emailSent++;
          else if (l.channel === "in_app") usage.inAppSent++;
        }
        if (l.triggerType === "test_message") {
          usage.testsSent++;
        }
      });
      usage.totalSent = usage.whatsappSent + usage.smsSent + usage.emailSent + usage.inAppSent;
    }
  } catch {}

  const communicationAccess = {
    schoolId,
    schoolName,
    planSlug: entitlement.plan.slug,
    planName: entitlement.plan.name,
    tierName: entitlement.plan.name,
    isGloballyEnabled: masterEnabled,
    canManualWhatsApp,
    canSendWhatsApp,
    canSendSms,
    canSendSMS: canSendSms,
    canSendEmail: Boolean(channelsConfig.email && (override?.channels?.email ?? planChannels.email)),
    canSendInApp: Boolean(channelsConfig.in_app),
    canAutomate,
    canBulkSend,
    canSchedule,
    canTestMessage,
    canCustomTemplates,
    canDeliveryTrack,
    isOverridden,
    overrideEnabled,
    lockReason,
    twilioReady: twilioConfigured,
    twilioWarning,
    limits: effectiveLimits,
    monthlyUsage: usage,
  };

  return {
    ...entitlement,
    schoolName,
    isAuthorized: true,
    subscriptionType,
    capabilities: {
      manualWhatsApp: canManualWhatsApp,
      whatsappApi: canSendWhatsApp,
      smsApi: canSendSms,
      customTemplates: canCustomTemplates,
      bulkSending: canBulkSend,
      feeReminders: canAutomate,
      automatedReminders: canAutomate,
      deliveryTracking: canDeliveryTrack,
      scheduling: canSchedule,
      testMessages: canTestMessage,
    },
    communication: communicationAccess,
    twilioConfigured,
  };
}
