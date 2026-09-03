import { NextResponse } from "next/server";
import type { ResourceLimitKey } from "@/types";
import { requireFeatureAccess } from "./featureAccess";
import { requirePlanLimit } from "./limits";
import { getEffectiveEntitlement } from "./entitlement";

export interface EntitlementRequirementOptions {
  feature?: string;
  permission?: string;
  limit?: ResourceLimitKey;
}

/**
 * Section 28: Authoritative Server-Side Entitlement Validator.
 * Reusable backend check for API routes and Server Actions.
 */
export async function requireEntitlement(
  schoolId: string,
  options: EntitlementRequirementOptions & { userId?: string; userRole?: string; httpMethod?: string } = {}
) {
  if (!schoolId) {
    const error: any = new Error("Unauthorized: School ID is required.");
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  // 0. HIGHEST PRIORITY EVALUATION: Global & School Emergency Controls
  const { resolveEmergencyAccess } = await import("@/lib/emergency/emergencyResolver");
  const targetKey = options.permission || options.feature;
  const emergencyRes = await resolveEmergencyAccess({
    schoolId,
    userId: options.userId,
    userRole: options.userRole,
    featureKey: targetKey,
    httpMethod: options.httpMethod || "GET",
  });

  if (!emergencyRes.allowed) {
    const error: any = new Error(emergencyRes.message);
    error.status = emergencyRes.status || 503;
    error.code = emergencyRes.code || "EMERGENCY_RESTRICTED";
    error.feature = targetKey;
    throw error;
  }

  // 1. Verify Granular Permission or Feature Access if requested
  if (targetKey) {
    await requireFeatureAccess(schoolId, targetKey);
  }

  // 2. Verify Capacity Limit if requested
  if (options.limit) {
    await requirePlanLimit(schoolId, options.limit);
  }

  // 3. Return effective entitlement state
  return await getEffectiveEntitlement(schoolId);
}

/**
 * Helper to build standard structured JSON error responses for API routes.
 */
export function buildEntitlementErrorResponse(error: any): NextResponse {
  const status = error.status || 403;
  const code = error.code || "FORBIDDEN";
  const message = error.message || "You are not authorized to perform this action under your current plan.";

  return NextResponse.json(
    {
      error: message,
      code,
      feature: error.feature,
      limit: error.limit,
      current: error.current,
    },
    { status }
  );
}
