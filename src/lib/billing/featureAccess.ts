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
};

import { getActiveAccessOverrides } from "./subscriptionAdjustmentEngine";

/**
 * Section 3: Resolves effective feature flags for a school as a Boolean dictionary.
 * Flow: Security/Suspension -> Manual Restrictions -> Subscription Status -> Plan Features -> Manual Grants
 */
import { GRANULAR_PERMISSIONS, getDefaultGranularPermissionsForPlan } from "./permissions";

export async function getPlanFeatures(schoolId: string): Promise<Record<string, boolean>> {
  const [summary, overrides] = await Promise.all([
    getSchoolAccess(schoolId),
    getActiveAccessOverrides(schoolId),
  ]);
  const permissions: Record<string, boolean> = {};

  const hasTempAccess = overrides.some((o) => o.type === "TEMPORARY_ACCESS");

  // Get plan default granular permissions
  const planSlug = summary.planId.replace("plan_", "") || "starter";
  const defaultGranular = getDefaultGranularPermissionsForPlan(planSlug);

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
    ])
  );

  for (const permKey of allKnownKeys) {
    // Find permission definition if it exists
    const def = GRANULAR_PERMISSIONS.find((p) => p.id === permKey);
    const parentFeatureKey = def ? def.featureKey : permKey;

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

    // 3. Temporary Access grants standard allowed features
    if (hasTempAccess && summary.status !== "SUSPENDED") {
      permissions[permKey] = true;
      continue;
    }

    // 4. Check parent feature status on plan
    const parentAllowed = isFeatureAllowedInList(parentFeatureKey, summary.allowedFeatures);

    // 5. Check granular permission default or plan setting
    const granularAllowed = defaultGranular[permKey] !== undefined ? defaultGranular[permKey] : parentAllowed;

    // Effective resolution: Access Mode must not be NO_ACCESS, parent must be allowed, and granular key must be allowed
    permissions[permKey] = summary.accessMode !== "NO_ACCESS" && parentAllowed && granularAllowed;
  }

  return permissions;
}

/**
 * Checks if a feature or its aliases exist in the allowed features list.
 */
function isFeatureAllowedInList(featureKey: string, allowedList: string[]): boolean {
  if (allowedList.includes(featureKey)) return true;
  const aliases = FEATURE_KEY_ALIASES[featureKey] || [];
  return aliases.some((a) => allowedList.includes(a));
}

/**
 * Verifies that all required parent feature dependencies are enabled.
 */
function checkDependencies(featureKey: string, allowedList: string[]): boolean {
  const deps = FEATURE_DEPENDENCIES[featureKey];
  if (!deps || deps.length === 0) return true;
  return deps.every((dep) => isFeatureAllowedInList(dep, allowedList));
}

/**
 * Section 4: Individual Feature Check.
 * Authoritatively verifies whether a school can access a specific feature.
 */
export async function canAccessFeature(
  schoolId: string,
  featureKey: string
): Promise<FeatureCheckResult> {
  try {
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

    // 3. Check if feature is included in the base plan
    const isIncludedInPlan = isFeatureAllowedInList(featureKey, summary.allowedFeatures);
    if (!isIncludedInPlan) {
      return {
        allowed: false,
        code: "FEATURE_NOT_INCLUDED",
        reason: "FEATURE_NOT_INCLUDED",
        feature: featureKey,
        message: `Feature "${featureKey}" is not included in your current plan. Please upgrade to access it.`,
        accessMode: summary.accessMode,
      };
    }

    // 4. Verify feature dependencies
    const dependenciesMet = checkDependencies(featureKey, summary.allowedFeatures);
    if (!dependenciesMet) {
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
