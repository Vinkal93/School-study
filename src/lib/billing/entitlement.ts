import type {
  EffectiveEntitlement,
  ResourceLimitStatus,
  ResourceLimitKey,
} from "@/types";
import { getSchoolAccess } from "./accessEngine";
import { getSchoolUsage } from "./usage";
import { getPlanFeatures } from "./featureAccess";
import { getActivePlan } from "./plans";

/**
 * Section 27: Authoritative Effective Entitlement Service.
 * Resolves subscription -> plan version -> features -> limits -> real usage -> access policy.
 */
export async function getEffectiveEntitlement(schoolId: string): Promise<EffectiveEntitlement> {
  const [summary, usage, features] = await Promise.all([
    getSchoolAccess(schoolId),
    getSchoolUsage(schoolId),
    getPlanFeatures(schoolId),
  ]);

  const planDoc = await getActivePlan(summary?.planId || "plan_starter");

  const limitsConfig = summary.limits || {
    maxStudents: 500,
    maxTeachers: 20,
    maxClasses: 15,
    maxStaffAccounts: 2,
  };

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

  const studentsLimit = buildLimitStatus("students", limitsConfig.maxStudents ?? 500);
  const teachersLimit = buildLimitStatus("teachers", limitsConfig.maxTeachers ?? 20);
  const classesLimit = buildLimitStatus("classes", limitsConfig.maxClasses ?? 15);
  const staffLimit = buildLimitStatus("staff", limitsConfig.maxStaffAccounts ?? 2);

  const planName = planDoc?.name || (summary.planId === "plan_professional" ? "Professional Plan" : summary.planId === "plan_enterprise" ? "Enterprise Plan" : "Starter Plan");
  const planSlug = planDoc?.slug || (summary.planId.replace("plan_", "") || "starter");

  return {
    schoolId,
    subscriptionStatus: summary.status,
    accessMode: summary.accessMode,
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
    isExpired: summary.accessMode === "RESTRICTED_ACCESS" || summary.accessMode === "NO_ACCESS",
    isInGrace: summary.accessMode === "GRACE_ACCESS",
    daysRemaining: summary.daysRemaining,
    expiresAt: summary.expiresAt,
    graceEndsAt: summary.graceEndsAt,
  };
}
