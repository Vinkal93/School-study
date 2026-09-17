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
 * Resource Label Mapping for Standard User Messages.
 */
const RESOURCE_LABELS: Record<ResourceLimitKey, { singular: string; plural: string }> = {
  teachers: { singular: "Teacher", plural: "teachers" },
  students: { singular: "Student", plural: "students" },
  classes: { singular: "Class", plural: "classes" },
  staff: { singular: "Staff", plural: "staff members" },
};

/**
 * Section 7 & 9: Real Plan Limit Engine (checkPlanLimit).
 * 
 * Verifies usage against active plan version limits.
 * - Supports checking with an incoming quantity (quantityToCreate).
 * - Supports explicit UNLIMITED (-1).
 * - Standardizes error message across bulk import and manual add:
 *   "${Resource} limit reached. Your plan allows ${limit} ${resources}. You already have ${current}."
 * - Emits audit logs on limit reached or over-limit detection.
 */
export async function checkPlanLimit(
  schoolId: string,
  resourceType: ResourceLimitKey,
  quantityToCreate: number = 1
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
  const label = RESOURCE_LABELS[resourceType] || { singular: resourceType, plural: resourceType };

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

  // 2. Capacity Check with Incoming Quantity
  const qty = Math.max(1, quantityToCreate);
  const projectedTotal = currentCount + qty;
  const isOverLimit = currentCount > limit;
  const isLimitReached = currentCount >= limit || projectedTotal > limit;
  const remaining = Math.max(0, limit - currentCount);

  // Standard message matching user specification:
  // "Teacher limit reached. Your plan allows 20 teachers. You already have X."
  const standardLimitMessage = `${label.singular} limit reached. Your plan allows ${limit} ${label.plural}. You already have ${currentCount}.`;

  if (isOverLimit || isLimitReached) {
    // Log audit log for limit reached / over-limit
    createBillingAuditLog("system", "system", isOverLimit ? "OVER_LIMIT_DETECTED" : "LIMIT_REACHED", "schoolSubscription", schoolId, {
      resourceType,
      current: currentCount,
      limit,
      requestedQuantity: qty,
    }).catch(() => {});

    return {
      allowed: false,
      current: currentCount,
      limit,
      remaining,
      isOverLimit,
      isUnlimited: false,
      code: isOverLimit ? "OVER_LIMIT" : "LIMIT_REACHED",
      reason: isOverLimit ? "OVER_LIMIT" : "LIMIT_REACHED",
      message: standardLimitMessage,
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
 * Checks plan limit with a specific quantity (convenience alias).
 */
export async function checkPlanLimitQuantity(
  schoolId: string,
  resourceType: ResourceLimitKey,
  quantityToCreate: number
): Promise<PlanLimitCheckResult> {
  return checkPlanLimit(schoolId, resourceType, quantityToCreate);
}

/**
 * Server-side requirement helper. Throws 403-equivalent Error if plan limit is reached.
 */
export async function requirePlanLimit(
  schoolId: string,
  resourceType: ResourceLimitKey,
  quantityToCreate: number = 1
): Promise<PlanLimitCheckResult> {
  const result = await checkPlanLimit(schoolId, resourceType, quantityToCreate);
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

/**
 * Server-side requirement helper for multiple records (convenience alias).
 */
export async function requirePlanLimitQuantity(
  schoolId: string,
  resourceType: ResourceLimitKey,
  quantityToCreate: number
): Promise<PlanLimitCheckResult> {
  return requirePlanLimit(schoolId, resourceType, quantityToCreate);
}
