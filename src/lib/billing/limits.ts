import type { PlanLimits, PlanLimitCheckResult, ResourceLimitKey } from "@/types";
import { getSchoolAccess } from "./accessEngine";
import { getSchoolUsage } from "./usage";
import { createBillingAuditLog } from "./audit";

/**
 * Plan Limit Key Mapping.
 */
const LIMIT_KEY_MAP: Record<ResourceLimitKey, keyof PlanLimits> = {
  students: "maxStudents",
  teachers: "maxTeachers",
  classes: "maxClasses",
  staff: "maxStaffAccounts",
};

/**
 * Section 7 & 9: Real Plan Limit Engine (checkPlanLimit).
 * 
 * Verifies usage against active plan version limits.
 * - Supports explicit UNLIMITED (-1).
 * - Detects OVER_LIMIT states (where current > limit after plan downgrade or limit decrease).
 * - Emits audit logs on limit reached or over-limit detection.
 */
export async function checkPlanLimit(
  schoolId: string,
  resourceType: ResourceLimitKey
): Promise<PlanLimitCheckResult> {
  const [summary, usage] = await Promise.all([
    getSchoolAccess(schoolId),
    getSchoolUsage(schoolId),
  ]);

  const limitKey = LIMIT_KEY_MAP[resourceType];
  const limit =
    summary.limits && typeof summary.limits[limitKey] === "number"
      ? summary.limits[limitKey]
      : 500;

  const currentCount = usage[resourceType] ?? 0;

  // 1. Explicit UNLIMITED Capacity (-1)
  if (limit === -1) {
    return {
      allowed: true,
      current: currentCount,
      limit: -1,
      remaining: Infinity,
      isOverLimit: false,
      isUnlimited: true,
      code: "ALLOWED",
      message: "Unlimited capacity available.",
    };
  }

  // 2. Over-Limit State (e.g. 700 / 500 after downgrade)
  const isOverLimit = currentCount > limit;
  const isLimitReached = currentCount >= limit;
  const remaining = Math.max(0, limit - currentCount);

  if (isOverLimit) {
    // Log audit log for over-limit
    createBillingAuditLog("system", "system", "OVER_LIMIT_DETECTED", "schoolSubscription", schoolId, {
      resourceType,
      current: currentCount,
      limit,
    }).catch(() => {});

    return {
      allowed: false,
      current: currentCount,
      limit,
      remaining: 0,
      isOverLimit: true,
      isUnlimited: false,
      code: "OVER_LIMIT",
      reason: "OVER_LIMIT",
      message: `Your school currently has ${currentCount} ${resourceType}, which exceeds your plan limit of ${limit}. Please upgrade your plan to add more.`,
    };
  }

  if (isLimitReached) {
    // Log audit log for limit reached
    createBillingAuditLog("system", "system", "LIMIT_REACHED", "schoolSubscription", schoolId, {
      resourceType,
      current: currentCount,
      limit,
    }).catch(() => {});

    return {
      allowed: false,
      current: currentCount,
      limit,
      remaining: 0,
      isOverLimit: false,
      isUnlimited: false,
      code: "LIMIT_REACHED",
      reason: "LIMIT_REACHED",
      message: `Plan capacity limit reached (${currentCount}/${limit} ${resourceType}). Please upgrade your plan to add more.`,
    };
  }

  return {
    allowed: true,
    current: currentCount,
    limit,
    remaining,
    isOverLimit: false,
    isUnlimited: false,
    code: "ALLOWED",
    message: "Capacity available.",
  };
}

/**
 * Server-side requirement helper. Throws 403-equivalent Error if plan limit is reached.
 */
export async function requirePlanLimit(
  schoolId: string,
  resourceType: ResourceLimitKey
): Promise<PlanLimitCheckResult> {
  const result = await checkPlanLimit(schoolId, resourceType);
  if (!result.allowed) {
    const error: any = new Error(result.message);
    error.code = result.code || "LIMIT_EXCEEDED";
    error.status = 403;
    error.limit = result.limit;
    error.current = result.current;
    throw error;
  }
  return result;
}
