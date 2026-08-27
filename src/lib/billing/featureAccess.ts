import type { FeatureCheckResult, PlanLimits } from "@/types";
import { getSchoolAccess } from "./accessEngine";

export async function canAccessFeature(
  schoolId: string,
  featureKey: string,
  currentCount?: number
): Promise<FeatureCheckResult> {
  try {
    const summary = await getSchoolAccess(schoolId);

    // 1. NO_ACCESS (Suspended or Cancelled)
    if (summary.accessMode === "NO_ACCESS") {
      return {
        allowed: false,
        reason: "SUSPENDED",
        message:
          "Your platform access is currently suspended or cancelled. Please contact platform support.",
        accessMode: summary.accessMode,
      };
    }

    // 2. RESTRICTED_ACCESS (Grace period ended)
    if (summary.accessMode === "RESTRICTED_ACCESS") {
      const isAllowed = summary.allowedFeatures.includes(featureKey);
      if (!isAllowed) {
        return {
          allowed: false,
          reason: "PLAN_EXPIRED",
          message:
            "Your subscription and grace period have expired. Please recharge your plan to continue.",
          accessMode: summary.accessMode,
        };
      }
    }

    // 3. GRACE_ACCESS (Subscription expired, inside grace period)
    if (summary.accessMode === "GRACE_ACCESS") {
      const isAllowed = summary.allowedFeatures.includes(featureKey);
      if (!isAllowed) {
        return {
          allowed: false,
          reason: "IN_GRACE_PERIOD",
          message:
            "Your subscription has expired and is operating under grace period restriction. Please recharge.",
          accessMode: summary.accessMode,
        };
      }
    }

    // 4. Check if feature is included in the plan
    const isIncludedInPlan = summary.allowedFeatures.includes(featureKey);
    if (!isIncludedInPlan) {
      return {
        allowed: false,
        reason: "FEATURE_NOT_IN_PLAN",
        message: `Feature "${featureKey}" is not included in your current plan. Please upgrade your plan.`,
        accessMode: summary.accessMode,
      };
    }

    // 5. Evaluate Capacity Limit if currentCount is supplied
    if (typeof currentCount === "number") {
      const limitKeyMap: Record<string, keyof PlanLimits> = {
        student_management: "maxStudents",
        teacher_management: "maxTeachers",
        classes: "maxClasses",
      };

      const limitKey = limitKeyMap[featureKey];
      if (
        limitKey &&
        summary.limits &&
        typeof summary.limits[limitKey] === "number"
      ) {
        const maxLimit = summary.limits[limitKey];
        if (currentCount >= maxLimit) {
          return {
            allowed: false,
            reason: "LIMIT_EXCEEDED",
            message: `Plan capacity limit reached (${currentCount}/${maxLimit}). Upgrade plan to enroll more.`,
            accessMode: summary.accessMode,
            limitInfo: { maxLimit, currentCount },
          };
        }
      }
    }

    return {
      allowed: true,
      reason: "ALLOWED",
      message: "Access granted.",
      accessMode: summary.accessMode,
    };
  } catch (error: any) {
    console.warn("canAccessFeature error fallback:", error);
    return {
      allowed: true,
      reason: "ALLOWED",
      message: "Access granted by fallback.",
      accessMode: "FULL_ACCESS",
    };
  }
}

/**
 * Section 11: Reusable School Admin Access Middleware/Service.
 * Enforces feature access and throws a clean error if denied.
 */
export async function requireFeatureAccess(
  schoolId: string,
  featureKey: string
): Promise<FeatureCheckResult> {
  const result = await canAccessFeature(schoolId, featureKey);
  if (!result.allowed) {
    throw new Error(result.message);
  }
  return result;
}
