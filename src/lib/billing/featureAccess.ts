import type { FeatureCheckResult, PlanLimits, AccessMode, FeatureAccessMode } from "@/types";
import { getSchoolAccess } from "./accessEngine";
import { FEATURE_REGISTRY } from "@/lib/features/featureRegistry";
import { getActivePlan, getAllPlans } from "./plans";
import { getActiveAccessOverrides } from "./subscriptionAdjustmentEngine";
import {
  GRANULAR_PERMISSIONS,
  canonicalizeCapabilityKey,
  getParentFeatureKey,
  getParentCapabilityKey,
} from "./permissions";

/**
 * Feature Dependencies Map.
 * If feature B depends on feature A, feature B cannot be accessed unless feature A is also enabled.
 */
const FEATURE_DEPENDENCIES: Record<string, string[]> = {
  advanced_reports: ["reports", "school_dashboard"],
  attendance_automation: ["basic_attendance"],
};

/**
 * Feature key normalization alias map for legacy and dot-notation keys.
 */
const FEATURE_KEY_ALIASES: Record<string, string[]> = {
  student_management: ["student_management", "students", "student_portal"],
  students: ["student_management", "students", "student_portal"],
  teacher_management: ["teacher_management", "teachers", "teacher_portal"],
  teachers: ["teacher_management", "teachers", "teacher_portal"],
  class_management: ["class_management", "classes"],
  classes: ["class_management", "classes"],
  attendance: ["attendance", "attendance_automation", "basic_attendance"],
  attendance_automation: ["attendance_automation", "attendance", "basic_attendance"],
  basic_attendance: ["basic_attendance", "attendance"],
  reports: ["reports", "advanced_reports", "reports_export"],
  advanced_reports: ["advanced_reports", "reports", "reports_export"],
  notices: ["notices", "notices_announcements"],
  notices_announcements: ["notices_announcements", "notices"],
  dashboard: ["dashboard", "school_dashboard"],
  school_dashboard: ["school_dashboard", "dashboard"],
  timetable: ["timetable", "timetable_bells"],
  timetable_bells: ["timetable_bells", "timetable"],
  rules_policies: ["rules_policies", "rules"],
  rules: ["rules_policies", "rules"],
  billing: ["billing", "subscription_billing"],
  subscription_billing: ["subscription_billing", "billing"],
  fee_management: ["fee_management", "fees", "fee_collection_system"],
  fees: ["fees", "fee_management"],
  inquiries: ["inquiries", "inquiries_portal", "leads"],
  inquiries_portal: ["inquiries_portal", "inquiries", "leads"],
};

/**
 * Resolves all known keys from high-level Feature Registry, Granular Permissions, and dynamic plan features.
 */
function getAllKnownCapabilityKeys(
  planDoc?: { features?: string[]; featureAccess?: Record<string, FeatureAccessMode> } | null
): string[] {
  const keys = new Set<string>();
  for (const f of FEATURE_REGISTRY) {
    keys.add(f.key);
  }
  for (const p of GRANULAR_PERMISSIONS) {
    keys.add(p.id);
    if (p.aliases) {
      p.aliases.forEach((a) => keys.add(a));
    }
  }
  if (planDoc) {
    if (Array.isArray(planDoc.features)) {
      planDoc.features.forEach((k) => keys.add(k));
    }
    if (planDoc.featureAccess && typeof planDoc.featureAccess === "object") {
      Object.keys(planDoc.featureAccess).forEach((k) => keys.add(k));
    }
  }
  return Array.from(keys);
}

/**
 * Section 2A: Authoritative 3-Way Feature & Capability Access Mode Resolution.
 * Resolves each capability into FULL_ACCESS | SHOWCASE | HIDDEN for the school with recursive parent inheritance
 * and multi-level school custom overrides.
 */
export async function getEffectiveFeatureAccessModes(
  schoolId: string
): Promise<Record<string, FeatureAccessMode>> {
  if (!schoolId || schoolId === "system") {
    const allKnownKeys = getAllKnownCapabilityKeys();
    const defaultModes: Record<string, FeatureAccessMode> = {};
    for (const key of allKnownKeys) {
      defaultModes[key] = "FULL_ACCESS";
    }
    return defaultModes;
  }

  const [summary, overrides] = await Promise.all([
    getSchoolAccess(schoolId),
    getActiveAccessOverrides(schoolId),
  ]);

  const planDoc = await getActivePlan(summary.planId || "plan_starter");
  const allKnownKeys = getAllKnownCapabilityKeys(planDoc);
  const planFeatureAccess: Record<string, FeatureAccessMode> = planDoc?.featureAccess || {};
  const planFeaturesList: string[] = planDoc?.features || summary.allowedFeatures || [];

  const hasTempAccess = overrides.some((o) => o.type === "TEMPORARY_ACCESS");
  const isFullControl =
    summary.controlMode === "FULL_CONTROL" ||
    (hasTempAccess && summary.status !== "SUSPENDED" && summary.status !== "CANCELLED");

  const isSuspendedOrCancelled =
    summary.status === "SUSPENDED" || summary.status === "CANCELLED" || summary.accessMode === "NO_ACCESS";

  const resultModes: Record<string, FeatureAccessMode> = {};

  // Helper to check explicit configuration in plan.featureAccess
  const getExplicitPlanMode = (rawKey: string): FeatureAccessMode | undefined => {
    const canonical = canonicalizeCapabilityKey(rawKey);
    if (planFeatureAccess[rawKey]) return planFeatureAccess[rawKey];
    if (planFeatureAccess[canonical]) return planFeatureAccess[canonical];

    const aliases = FEATURE_KEY_ALIASES[rawKey] || FEATURE_KEY_ALIASES[canonical] || [];
    for (const alias of aliases) {
      if (planFeatureAccess[alias]) return planFeatureAccess[alias];
    }
    return undefined;
  };

  // Helper to resolve inherited mode by traversing up the parent chain in the plan matrix
  const resolveInheritedPlanMode = (rawKey: string): FeatureAccessMode => {
    const canonical = canonicalizeCapabilityKey(rawKey);

    // 1. Direct explicit configuration
    const direct = getExplicitPlanMode(canonical);
    if (direct) return direct;

    // 2. Direct parent in capability hierarchy
    let currentParentKey = getParentCapabilityKey(canonical);
    while (currentParentKey) {
      const parentMode = getExplicitPlanMode(currentParentKey);
      if (parentMode) return parentMode;
      currentParentKey = getParentCapabilityKey(currentParentKey);
    }

    // 3. Top-level module feature key
    const topFeatureKey = getParentFeatureKey(canonical);
    if (topFeatureKey && topFeatureKey !== canonical) {
      const topMode = getExplicitPlanMode(topFeatureKey);
      if (topMode) return topMode;
    }

    // 4. Fallback to legacy features array
    const isAllowedInLegacy =
      isFeatureAllowedInList(canonical, planFeaturesList) ||
      isFeatureAllowedInList(topFeatureKey, planFeaturesList);

    return isAllowedInLegacy ? "FULL_ACCESS" : "HIDDEN";
  };

  // Helper to find applicable school override by traversing up the capability ancestor chain
  const findSchoolOverrideMode = (rawKey: string): FeatureAccessMode | null => {
    const canonical = canonicalizeCapabilityKey(rawKey);
    const aliases = FEATURE_KEY_ALIASES[rawKey] || FEATURE_KEY_ALIASES[canonical] || [];

    // Helper to evaluate a single matching override record
    const matchOverride = (targetKey: string): FeatureAccessMode | null => {
      const matched = overrides.find(
        (o) => o.status === "ACTIVE" && (o.featureKey === targetKey || (targetKey === "all" && o.featureKey === "all"))
      );
      if (!matched) return null;

      if (matched.accessMode) return matched.accessMode;
      if (matched.type === "FEATURE_GRANT") return "FULL_ACCESS";
      if (matched.type === "FEATURE_RESTRICT") return "HIDDEN";
      if (matched.type === "FEATURE_SHOWCASE") return "SHOWCASE";
      if (matched.type === "TEMPORARY_ACCESS") return "FULL_ACCESS";
      return null;
    };

    // 1. Exact match on rawKey or canonical
    let mode = matchOverride(rawKey) || matchOverride(canonical);
    if (mode) return mode;

    // 2. Exact match on aliases
    for (const a of aliases) {
      mode = matchOverride(a);
      if (mode) return mode;
    }

    // 3. Ancestor traversal up the granular capability tree
    let parentCap = getParentCapabilityKey(canonical);
    while (parentCap) {
      mode = matchOverride(parentCap);
      if (mode) return mode;
      parentCap = getParentCapabilityKey(parentCap);
    }

    // 4. Top-level module key
    const parentModule = getParentFeatureKey(canonical);
    if (parentModule && parentModule !== canonical) {
      mode = matchOverride(parentModule);
      if (mode) return mode;
    }

    // 5. Global wildcard override
    mode = matchOverride("all");
    if (mode) return mode;

    return null;
  };

  for (const rawKey of allKnownKeys) {
    const canonical = canonicalizeCapabilityKey(rawKey);

    // 1. Check school custom overrides first (Explicit Super Admin override takes highest priority)
    const customOverride = findSchoolOverrideMode(canonical);
    if (customOverride !== null) {
      // If suspended or cancelled, even granted features are restricted
      if (isSuspendedOrCancelled && customOverride === "FULL_ACCESS") {
        resultModes[rawKey] = "SHOWCASE";
      } else {
        resultModes[rawKey] = customOverride;
      }
      continue;
    }

    // 2. Super Admin FULL_CONTROL Mode or Active Temporary Access
    if (isFullControl && !isSuspendedOrCancelled) {
      resultModes[rawKey] = "FULL_ACCESS";
      continue;
    }

    // 3. If suspended or cancelled, lock all features into SHOWCASE or HIDDEN
    if (isSuspendedOrCancelled) {
      const baseMode = resolveInheritedPlanMode(canonical);
      resultModes[rawKey] = baseMode === "HIDDEN" ? "HIDDEN" : "SHOWCASE";
      continue;
    }

    // 4. Plan-level deterministic hierarchical resolution (PLAN_DEFAULT / LIMITED_CONTROL)
    resultModes[rawKey] = resolveInheritedPlanMode(canonical);
  }

  return resultModes;
}

/**
 * Section 3: Resolves effective feature flags for a school as a Boolean dictionary.
 */
export async function getPlanFeatures(schoolId: string): Promise<Record<string, boolean>> {
  const modes = await getEffectiveFeatureAccessModes(schoolId);
  const permissions: Record<string, boolean> = {};

  for (const [key, mode] of Object.entries(modes)) {
    permissions[key] = mode === "FULL_ACCESS";
  }

  return permissions;
}

/**
 * Checks if a feature or its parent/aliases exist in the allowed features list.
 */
function isFeatureAllowedInList(featureKey: string, allowedList: string[]): boolean {
  if (!allowedList || allowedList.length === 0) return false;
  const canonical = canonicalizeCapabilityKey(featureKey);

  if (allowedList.includes(featureKey) || allowedList.includes(canonical)) return true;

  const parentKey = getParentFeatureKey(canonical);
  if (allowedList.includes(parentKey)) return true;

  const aliases = FEATURE_KEY_ALIASES[featureKey] || FEATURE_KEY_ALIASES[canonical] || [];
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
  const canonical = canonicalizeCapabilityKey(featureKey);
  const deps = FEATURE_DEPENDENCIES[canonical] || FEATURE_DEPENDENCIES[featureKey];
  if (!deps || deps.length === 0) return true;
  return deps.every((dep) => isFeatureAllowedInList(dep, allowedList));
}

/**
 * Section 28: Dynamic Required Plan Resolution Engine.
 * Dynamically scans active plans to find the lowest pricing plan that gives FULL_ACCESS to the target capability.
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

    const canonical = canonicalizeCapabilityKey(featureKey);
    const parentModuleKey = getParentFeatureKey(canonical);
    const parentCapKey = getParentCapabilityKey(canonical);

    // Filter only active, non-archived plans and sort by display order ascending
    const activePlans = plans
      .filter((p) => p.status === "ACTIVE" && !p.isArchived)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    let currentOrder = -1;
    if (currentPlanSlug) {
      const cleanSlug = currentPlanSlug.replace("plan_", "").trim().toLowerCase();
      const currentPlan = activePlans.find(
        (p) => p.slug?.toLowerCase() === cleanSlug || p.id?.toLowerCase() === currentPlanSlug.toLowerCase()
      );
      if (currentPlan) {
        currentOrder = currentPlan.displayOrder || 0;
      }
    }

    const checkPlanGivesFullAccess = (plan: typeof plans[0]): boolean => {
      if (plan.featureAccess) {
        // Direct key or canonical check
        if (plan.featureAccess[featureKey] === "FULL_ACCESS") return true;
        if (plan.featureAccess[canonical] === "FULL_ACCESS") return true;

        // If explicitly set to HIDDEN or SHOWCASE, do not elevate
        if (plan.featureAccess[featureKey] === "HIDDEN" || plan.featureAccess[featureKey] === "SHOWCASE") return false;
        if (plan.featureAccess[canonical] === "HIDDEN" || plan.featureAccess[canonical] === "SHOWCASE") return false;

        // Parent capability check
        if (parentCapKey && plan.featureAccess[parentCapKey] === "FULL_ACCESS") return true;

        // Parent module key check
        if (parentModuleKey && plan.featureAccess[parentModuleKey] === "FULL_ACCESS") return true;

        // Alias check
        const aliases = FEATURE_KEY_ALIASES[featureKey] || FEATURE_KEY_ALIASES[canonical] || [];
        for (const alias of aliases) {
          if (plan.featureAccess[alias] === "FULL_ACCESS") return true;
        }
      }

      if (Array.isArray(plan.features) && isFeatureAllowedInList(canonical, plan.features)) {
        return true;
      }

      return false;
    };

    // 1. Search for plans strictly HIGHER than currentPlan if currentOrder is set
    if (currentOrder >= 0) {
      for (const plan of activePlans) {
        if ((plan.displayOrder || 0) > currentOrder && checkPlanGivesFullAccess(plan)) {
          return { planName: plan.name, planSlug: plan.slug, isCustomAccess: false };
        }
      }
    }

    // 2. Search all active plans from lowest to highest
    for (const plan of activePlans) {
      if (checkPlanGivesFullAccess(plan)) {
        return { planName: plan.name, planSlug: plan.slug, isCustomAccess: false };
      }
    }

    return { planName: "Upgrade / Contact Administrator", planSlug: "custom", isCustomAccess: true };
  } catch (err) {
    return { planName: "Higher Plan Required", planSlug: "professional", isCustomAccess: false };
  }
}

/**
 * Section 4: Individual Feature & Capability Check.
 * Authoritatively verifies whether a school can access a specific feature or granular action.
 */
export async function canAccessFeature(
  schoolId: string,
  featureKey: string
): Promise<FeatureCheckResult> {
  if (!featureKey || !featureKey.trim()) {
    return {
      allowed: false,
      code: "INVALID_CAPABILITY",
      reason: "INVALID_CAPABILITY",
      feature: featureKey,
      message: "No capability key provided.",
      accessMode: "NO_ACCESS",
    };
  }

  const canonical = canonicalizeCapabilityKey(featureKey);

  if (!schoolId || schoolId === "system") {
    return {
      allowed: true,
      code: "ALLOWED",
      reason: "ALLOWED",
      feature: canonical,
      message: "Default access granted.",
      accessMode: "FULL_ACCESS",
    };
  }

  try {
    // 0. HIGHEST PRIORITY EVALUATION: Global & School Emergency Kill Switches
    const { resolveEmergencyAccess } = await import("@/lib/emergency/emergencyResolver");
    const emergencyRes = await resolveEmergencyAccess({ schoolId, featureKey: canonical });
    if (!emergencyRes.allowed) {
      return {
        allowed: false,
        code: emergencyRes.code || "EMERGENCY_RESTRICTED",
        reason: emergencyRes.reason || "EMERGENCY_RESTRICTED",
        feature: canonical,
        message: emergencyRes.message,
        accessMode: "NO_ACCESS",
      };
    }

    const [summary, effectiveModes] = await Promise.all([
      getSchoolAccess(schoolId),
      getEffectiveFeatureAccessModes(schoolId),
    ]);

    // 1. Check if subscription is SUSPENDED or CANCELLED
    if (summary.status === "SUSPENDED" || summary.status === "CANCELLED") {
      return {
        allowed: false,
        code: "SUBSCRIPTION_SUSPENDED",
        reason: "SUBSCRIPTION_SUSPENDED",
        feature: canonical,
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
        feature: canonical,
        message: "Your subscription has expired and access has been restricted. Please recharge to continue.",
        accessMode: summary.accessMode,
      };
    }

    // 3. Check 3-way access mode (check canonical, raw, or default to HIDDEN)
    const featureMode = effectiveModes[canonical] || effectiveModes[featureKey] || "HIDDEN";

    if (featureMode === "SHOWCASE") {
      const requiredPlan = await getRequiredPlanForFeature(canonical, summary.planId);
      return {
        allowed: false,
        code: "FEATURE_SHOWCASE",
        reason: "FEATURE_SHOWCASE",
        feature: canonical,
        message: `Capability "${featureKey}" is in showcase mode. Upgrade to ${requiredPlan.planName} to unlock full access.`,
        accessMode: summary.accessMode,
      };
    }

    if (featureMode === "HIDDEN") {
      const requiredPlan = await getRequiredPlanForFeature(canonical, summary.planId);
      return {
        allowed: false,
        code: "FEATURE_NOT_INCLUDED",
        reason: "FEATURE_NOT_INCLUDED",
        feature: canonical,
        message: `Capability "${featureKey}" is not included in your current plan (${summary.planId}). Upgrade to ${requiredPlan.planName} to unlock it.`,
        accessMode: summary.accessMode,
      };
    }

    // 4. Verify feature dependencies
    const isFullControl = summary.controlMode === "FULL_CONTROL";
    const dependenciesMet = checkDependencies(canonical, summary.allowedFeatures);
    if (!dependenciesMet && !isFullControl) {
      return {
        allowed: false,
        code: "FEATURE_DEPENDENCY_MISSING",
        reason: "FEATURE_NOT_INCLUDED",
        feature: canonical,
        message: `Capability "${featureKey}" requires prerequisite features not available on your plan.`,
        accessMode: summary.accessMode,
      };
    }

    // 5. Expiry Policy Enforcement: Check if feature is allowed during GRACE_ACCESS or RESTRICTED_ACCESS
    if (summary.accessMode === "GRACE_ACCESS" || summary.accessMode === "RESTRICTED_ACCESS") {
      if (featureMode !== "FULL_ACCESS") {
        return {
          allowed: false,
          code: "SUBSCRIPTION_RESTRICTED",
          reason: "SUBSCRIPTION_RESTRICTED",
          feature: canonical,
          message: "Your subscription is operating in restricted/grace mode.",
          accessMode: summary.accessMode,
        };
      }
    }

    return {
      allowed: true,
      code: "ALLOWED",
      reason: "ALLOWED",
      feature: canonical,
      message: "Access granted.",
      accessMode: summary.accessMode,
    };
  } catch (error: any) {
    console.warn(`canAccessFeature check failed for school "${schoolId}":`, error);
    return {
      allowed: false,
      code: "AUTHORIZATION_ERROR",
      reason: "PLAN_INACTIVE",
      feature: canonical,
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

/**
 * Granular capability access alias for requireFeatureAccess.
 */
export const requireCapabilityAccess = requireFeatureAccess;


/**
 * Section 6: Semantic Action-Level Permission Check.
 * Verifies whether a school has permission to perform a specific action, tab view, or data export.
 */
export async function canPerformAction(
  schoolId: string,
  actionKey: string
): Promise<FeatureCheckResult> {
  return canAccessFeature(schoolId, actionKey);
}

/**
 * Section 7: Semantic Action-Level Enforcement Guard.
 * Throws 403-equivalent structured Error if action is not permitted.
 */
export async function enforceActionAccess(
  schoolId: string,
  actionKey: string
): Promise<FeatureCheckResult> {
  return requireFeatureAccess(schoolId, actionKey);
}
