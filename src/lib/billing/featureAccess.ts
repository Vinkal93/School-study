import type { FeatureCheckResult, PlanLimits, AccessMode } from "@/types";
import { getSchoolAccess } from "./accessEngine";

/**
 * Feature Dependencies Map.
 * If feature B depends on feature A, feature B cannot be accessed unless feature A is also enabled.
 */
const FEATURE_DEPENDENCIES: Record<string, string[]> = {
  advanced_reports: ["reports", "school_dashboard"],
  attendance_automation: ["basic_attendance"],
};

/**
 * Feature key normalization alias map.
 */
const FEATURE_KEY_ALIASES: Record<string, string[]> = {
  student_management: ["student_management", "students"],
  teacher_management: ["teacher_management", "teachers"],
  class_management: ["class_management", "classes"],
  attendance: ["attendance", "attendance_automation", "basic_attendance"],
  attendance_automation: ["attendance_automation", "attendance"],
  basic_attendance: ["basic_attendance", "attendance"],
  reports: ["reports", "advanced_reports"],
  advanced_reports: ["advanced_reports", "reports"],
  notices: ["notices", "notices_announcements"],
  notices_announcements: ["notices_announcements", "notices"],
  dashboard: ["dashboard", "school_dashboard"],
  school_dashboard: ["school_dashboard", "dashboard"],
  student_portal: ["student_portal"],
  teacher_portal: ["teacher_portal"],
  billing: ["billing"],
  fee_management: ["fee_management", "fees", "fee_dashboard", "fee_structure", "fee_collection", "fee_transactions", "fee_reports", "fee_exports", "fee_discounts", "fee_receipts"],
  fees: ["fees", "fee_management"],
};

import { getActiveAccessOverrides } from "./subscriptionAdjustmentEngine";

/**
 * Section 3: Resolves effective feature flags for a school as a Boolean dictionary.
 * Flow: Security/Suspension -> Manual Restrictions -> Subscription Status -> Plan Features -> Manual Grants
 */
import { GRANULAR_PERMISSIONS, getParentFeatureKey } from "./permissions";

export async function getPlanFeatures(schoolId: string): Promise<Record<string, boolean>> {
  const [summary, overrides] = await Promise.all([
    getSchoolAccess(schoolId),
    getActiveAccessOverrides(schoolId),
  ]);
  const permissions: Record<string, boolean> = {};

  const hasTempAccess = overrides.some((o) => o.type === "TEMPORARY_ACCESS");
  const isFullControl = summary.controlMode === "FULL_CONTROL" || (hasTempAccess && summary.status !== "SUSPENDED");

  // List of all keys (granular IDs + legacy feature keys)
  const allKnownKeys = Array.from(
    new Set([
      ...GRANULAR_PERMISSIONS.map((p) => p.id),
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "reports_export",
      "student_portal",
      "teacher_portal",
      "billing",
      "reports",
      "notices",
      "fee_management",
      "fee_dashboard",
      "fee_structure",
      "fee_collection",
      "fee_transactions",
      "fee_reports",
      "fee_exports",
      "fee_discounts",
      "fee_receipts",
      "fees",
    ])
  );

  for (const permKey of allKnownKeys) {
    const parentFeatureKey = getParentFeatureKey(permKey);

    // 1. Check if explicitly restricted by Super Admin override (for this key or its parent feature)
    const isRestricted = overrides.some(
      (o) =>
        o.type === "FEATURE_RESTRICT" &&
        (o.featureKey === permKey || o.featureKey === parentFeatureKey || o.featureKey === "all")
    );
    if (isRestricted) {
      permissions[permKey] = false;
      continue;
    }

    // 2. Check if explicitly granted by Super Admin override (for this key or its parent feature)
    const isGranted = overrides.some(
      (o) =>
        o.type === "FEATURE_GRANT" &&
        (o.featureKey === permKey || o.featureKey === parentFeatureKey || o.featureKey === "all")
    );
    if (isGranted) {
      permissions[permKey] = true;
      continue;
    }

    // 3. Super Admin FULL_CONTROL Mode or Active Temporary Access
    if (isFullControl && summary.status !== "SUSPENDED" && summary.status !== "CANCELLED") {
      permissions[permKey] = true;
      continue;
    }

    // 4. Single Source of Truth: Check if permKey or its parent feature is present in the plan's saved features in Firestore
    const isAllowedInPlan = isFeatureAllowedInList(permKey, summary.allowedFeatures) || isFeatureAllowedInList(parentFeatureKey, summary.allowedFeatures);

    // Effective resolution: Access Mode must not be NO_ACCESS, and feature must be in plan
    permissions[permKey] = summary.accessMode !== "NO_ACCESS" && isAllowedInPlan;
  }

  return permissions;
}

/**
 * Checks if a feature or its parent/aliases exist in the allowed features list.
 */
function isFeatureAllowedInList(featureKey: string, allowedList: string[]): boolean {
  if (!allowedList || allowedList.length === 0) return false;
  if (allowedList.includes(featureKey)) return true;

  const parentKey = getParentFeatureKey(featureKey);
  if (allowedList.includes(parentKey)) return true;

  const aliases = FEATURE_KEY_ALIASES[featureKey] || [];
  for (const a of aliases) {
    if (allowedList.includes(a)) return true;
    const aliasParent = getParentFeatureKey(a);
    if (allowedList.includes(aliasParent)) return true;
  }

  return false;
}

/**
 * Verifies that all required parent feature dependencies are enabled.
 */
function checkDependencies(featureKey: string, allowedList: string[]): boolean {
  const deps = FEATURE_DEPENDENCIES[featureKey];
  if (!deps || deps.length === 0) return true;
  return deps.every((dep) => isFeatureAllowedInList(dep, allowedList));
}

import { getAllPlans } from "./plans";

/**
 * Section 28: Dynamic Required Plan Resolution Engine.
 * Dynamically determines the lowest pricing plan that contains the target feature.
 * If currentPlanSlug is provided, only searches plans higher than currentPlan.
 */
export async function getRequiredPlanForFeature(
  featureKey: string,
  currentPlanSlug?: string
): Promise<{ planName: string; planSlug: string; isCustomAccess: boolean }> {
  try {
    const plans = await getAllPlans();
    if (!plans || plans.length === 0) {
      return { planName: "Higher Plan Required", planSlug: "professional", isCustomAccess: false };
    }

    // Sort plans by display order ascending (lowest to highest)
    const sortedPlans = [...plans].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    let currentOrder = 0;
    if (currentPlanSlug) {
      const currentPlan = sortedPlans.find((p) => p.slug === currentPlanSlug.replace("plan_", ""));
      if (currentPlan) {
        currentOrder = currentPlan.displayOrder || 0;
      }
    }

    // 1. Search for HIGHER plans that contain the feature
    for (const plan of sortedPlans) {
      if ((plan.displayOrder || 0) > currentOrder && Array.isArray(plan.features) && isFeatureAllowedInList(featureKey, plan.features)) {
        return { planName: plan.name, planSlug: plan.slug, isCustomAccess: false };
      }
    }

    // 2. Search all plans if current order is 0
    if (currentOrder === 0) {
      for (const plan of sortedPlans) {
        if (Array.isArray(plan.features) && isFeatureAllowedInList(featureKey, plan.features)) {
          return { planName: plan.name, planSlug: plan.slug, isCustomAccess: false };
        }
      }
    }

    return { planName: "Custom Access Required", planSlug: "custom", isCustomAccess: true };
  } catch (err) {
    return { planName: "Higher Plan Required", planSlug: "professional", isCustomAccess: false };
  }
}

/**
 * Section 4: Individual Feature Check.
 * Authoritatively verifies whether a school can access a specific feature.
 */
export async function canAccessFeature(
  schoolId: string,
  featureKey: string
): Promise<FeatureCheckResult> {
  if (!schoolId || schoolId === "school_default" || schoolId === "system") {
    return {
      allowed: true,
      code: "ALLOWED",
      reason: "ALLOWED",
      feature: featureKey,
      message: "Default access granted.",
      accessMode: "FULL_ACCESS",
    };
  }

  try {
    // 0. HIGHEST PRIORITY EVALUATION: Global & School Emergency Kill Switches
    const { resolveEmergencyAccess } = await import("@/lib/emergency/emergencyResolver");
    const emergencyRes = await resolveEmergencyAccess({ schoolId, featureKey });
    if (!emergencyRes.allowed) {
      return {
        allowed: false,
        code: emergencyRes.code || "EMERGENCY_RESTRICTED",
        reason: emergencyRes.reason || "EMERGENCY_RESTRICTED",
        feature: featureKey,
        message: emergencyRes.message,
        accessMode: "NO_ACCESS",
      };
    }

    const summary = await getSchoolAccess(schoolId);

    // 1. Check if subscription is SUSPENDED or CANCELLED
    if (summary.status === "SUSPENDED" || summary.status === "CANCELLED") {
      return {
        allowed: false,
        code: "SUBSCRIPTION_SUSPENDED",
        reason: "SUBSCRIPTION_SUSPENDED",
        feature: featureKey,
        message: "Your platform access is currently suspended or cancelled. Please contact support.",
        accessMode: summary.accessMode,
      };
    }

    // 2. Check if subscription is in NO_ACCESS policy state
    if (summary.accessMode === "NO_ACCESS") {
      return {
        allowed: false,
        code: "SUBSCRIPTION_EXPIRED",
        reason: "SUBSCRIPTION_EXPIRED",
        feature: featureKey,
        message: "Your subscription has expired and access has been restricted. Please recharge to continue.",
        accessMode: summary.accessMode,
      };
    }

    // 3. Check if feature is included in the base plan or FULL_CONTROL mode
    const isFullControl = summary.controlMode === "FULL_CONTROL";
    const isIncludedInPlan = isFullControl || isFeatureAllowedInList(featureKey, summary.allowedFeatures);
    if (!isIncludedInPlan) {
      const requiredPlan = await getRequiredPlanForFeature(featureKey, summary.planId);
      return {
        allowed: false,
        code: "FEATURE_NOT_INCLUDED",
        reason: "FEATURE_NOT_INCLUDED",
        feature: featureKey,
        message: `Feature "${featureKey}" is not included in your current plan (${summary.planId}). Upgrade to ${requiredPlan.planName} to unlock it.`,
        accessMode: summary.accessMode,
      };
    }

    // 4. Verify feature dependencies
    const dependenciesMet = checkDependencies(featureKey, summary.allowedFeatures);
    if (!dependenciesMet && !isFullControl) {
      return {
        allowed: false,
        code: "FEATURE_DEPENDENCY_MISSING",
        reason: "FEATURE_NOT_INCLUDED",
        feature: featureKey,
        message: `Feature "${featureKey}" requires prerequisite features not available on your plan.`,
        accessMode: summary.accessMode,
      };
    }

    // 5. Expiry Policy Enforcement: Check if feature is allowed during GRACE_ACCESS
    if (summary.accessMode === "GRACE_ACCESS") {
      if (!isIncludedInPlan) {
        return {
          allowed: false,
          code: "SUBSCRIPTION_RESTRICTED",
          reason: "SUBSCRIPTION_RESTRICTED",
          feature: featureKey,
          message: "Your subscription is operating in grace period with limited feature access.",
          accessMode: summary.accessMode,
        };
      }
    }

    // 6. Expiry Policy Enforcement: Check if feature is allowed during RESTRICTED_ACCESS
    if (summary.accessMode === "RESTRICTED_ACCESS") {
      if (!isIncludedInPlan) {
        return {
          allowed: false,
          code: "SUBSCRIPTION_RESTRICTED",
          reason: "SUBSCRIPTION_RESTRICTED",
          feature: featureKey,
          message: "Your subscription has expired and is in restricted mode.",
          accessMode: summary.accessMode,
        };
      }
    }

    return {
      allowed: true,
      code: "ALLOWED",
      reason: "ALLOWED",
      feature: featureKey,
      message: "Access granted.",
      accessMode: summary.accessMode,
    };
  } catch (error: any) {
    console.warn(`canAccessFeature check failed for school "${schoolId}":`, error);
    return {
      allowed: false,
      code: "AUTHORIZATION_ERROR",
      reason: "PLAN_INACTIVE",
      feature: featureKey,
      message: "Unable to verify your plan access. Please try again.",
      accessMode: "NO_ACCESS",
    };
  }
}

/**
 * Section 5: Backend Enforcement Guard.
 * Throws 403-equivalent structured Error if access is denied.
 */
export async function requireFeatureAccess(
  schoolId: string,
  featureKey: string
): Promise<FeatureCheckResult> {
  const result = await canAccessFeature(schoolId, featureKey);
  if (!result.allowed) {
    const error: any = new Error(result.message);
    error.code = result.code || "FEATURE_NOT_INCLUDED";
    error.status = 403;
    error.feature = featureKey;
    throw error;
  }
  return result;
}
