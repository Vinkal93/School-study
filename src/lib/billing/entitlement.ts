import type {
  EffectiveEntitlement,
  ResourceLimitStatus,
  ResourceLimitKey,
} from "@/types";
import { getSchoolAccess } from "./accessEngine";
import { getSchoolUsage } from "./usage";
import { getPlanFeatures } from "./featureAccess";
import { getActiveLimitOverrides, getActiveAccessOverrides } from "./subscriptionAdjustmentEngine";
import { getActivePlan } from "./plans";

/**
 * Section 27 & Phase 12B: Authoritative Effective Entitlement Service.
 * Resolves: Security/Suspension -> Access Policy -> Manual Restrictions -> Subscription Status -> Plan Version -> Limits -> Limit Overrides -> Real Usage.
 */
export async function getEffectiveEntitlement(schoolId: string): Promise<EffectiveEntitlement> {
  const [summary, usage, features, limitOverrides, accessOverrides] = await Promise.all([
    getSchoolAccess(schoolId),
    getSchoolUsage(schoolId),
    getPlanFeatures(schoolId),
    getActiveLimitOverrides(schoolId),
    getActiveAccessOverrides(schoolId),
  ]);

  const planDoc = await getActivePlan(summary?.planId || "plan_starter");

  // Base plan limits
  const baseLimits = summary.limits || {
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
  };

  // Apply active Limit Overrides (highest precedence for resource capacities)
  const effectiveMaxStudents = limitOverrides.find((o) => o.limitKey === "students")?.overrideValue ?? baseLimits.maxStudents ?? 500;
  const effectiveMaxTeachers = limitOverrides.find((o) => o.limitKey === "teachers")?.overrideValue ?? baseLimits.maxTeachers ?? 20;
  const effectiveMaxClasses = limitOverrides.find((o) => o.limitKey === "classes")?.overrideValue ?? baseLimits.maxClasses ?? 15;
  const effectiveMaxStaff = limitOverrides.find((o) => o.limitKey === "staff")?.overrideValue ?? baseLimits.maxStaffAccounts ?? 2;

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

  const planName = planDoc?.name || (summary.planId === "plan_professional" ? "Professional Plan" : summary.planId === "plan_enterprise" ? "Enterprise Plan" : "Starter Plan");
  const planSlug = planDoc?.slug || (summary.planId.replace("plan_", "") || "starter");

  // Check temporary access override
  const hasTempAccess = accessOverrides.some((o) => o.type === "TEMPORARY_ACCESS");
  const effectiveAccessMode = (hasTempAccess && summary.status !== "SUSPENDED") ? "FULL_ACCESS" : summary.accessMode;
  const isExpired = effectiveAccessMode === "RESTRICTED_ACCESS" || effectiveAccessMode === "NO_ACCESS";
  const isInGrace = effectiveAccessMode === "GRACE_ACCESS";

  return {
    schoolId,
    subscriptionStatus: summary.status,
    accessMode: effectiveAccessMode,
    plan: {
      id: summary.planId,
      name: planName,
      slug: planSlug,
      version: 1,
    },
    features,
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
  };
}
