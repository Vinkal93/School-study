import { NextResponse } from "next/server";
import type { ResourceLimitKey } from "@/types";
import { requireFeatureAccess } from "./featureAccess";
import { requirePlanLimit } from "./limits";
import { getEffectiveEntitlement } from "./entitlement";

export interface EntitlementRequirementOptions {
  feature?: string;
  limit?: ResourceLimitKey;
}

/**
 * Section 28: Authoritative Server-Side Entitlement Validator.
 * Reusable backend check for API routes and Server Actions.
 */
export async function requireEntitlement(
  schoolId: string,
  options: EntitlementRequirementOptions
) {
  if (!schoolId) {
    const error: any = new Error("Unauthorized: School ID is required.");
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  // 1. Verify Feature Access if requested
  if (options.feature) {
    await requireFeatureAccess(schoolId, options.feature);
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
