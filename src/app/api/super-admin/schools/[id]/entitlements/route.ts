import { NextResponse } from "next/server";
import { getEffectiveEntitlement, getActiveAccessOverrides, getActivePlan } from "@/lib/billing";
import { GRANULAR_PERMISSIONS } from "@/lib/billing/permissions";

/**
 * GET /api/super-admin/schools/[id]/entitlements
 * Returns authoritative feature test matrix comparing base plan, overrides, and effective entitlement.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required." }, { status: 400 });
    }

    const entitlement = await getEffectiveEntitlement(schoolId);
    const overrides = await getActiveAccessOverrides(schoolId);
    const plan = await getActivePlan(entitlement.plan.id).catch(() => null);

    const isFullControl = overrides.some((o) => o.type === "TEMPORARY_ACCESS" && o.status === "ACTIVE");

    // Build comprehensive feature test matrix
    const matrix = GRANULAR_PERMISSIONS.map((perm) => {
      const featureKey = perm.id;
      const parentFeatureKey = perm.featureKey;

      // Base Plan Access
      const planFeatures = plan?.features || ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"];
      const basePlanAllowed = planFeatures.includes(featureKey) || planFeatures.includes(parentFeatureKey);

      // Override status
      const grantOverride = overrides.find((o) => o.type === "FEATURE_GRANT" && (o.featureKey === featureKey || o.featureKey === parentFeatureKey));
      const restrictOverride = overrides.find((o) => o.type === "FEATURE_RESTRICT" && (o.featureKey === featureKey || o.featureKey === parentFeatureKey));

      let schoolOverrideStr: "ALLOW" | "DENY" | "FULL_ACCESS" | "NONE" = "NONE";
      if (isFullControl) schoolOverrideStr = "FULL_ACCESS";
      else if (grantOverride) schoolOverrideStr = "ALLOW";
      else if (restrictOverride) schoolOverrideStr = "DENY";

      // Effective Access resolved by authoritative entitlement engine
      const effectiveAllowed = Boolean(entitlement.features[featureKey]);

      let status = "ACTIVE";
      if (!effectiveAllowed) status = "RESTRICTED";
      else if (schoolOverrideStr !== "NONE") status = "OVERRIDDEN";

      return {
        id: perm.id,
        name: perm.name,
        category: perm.category,
        featureKey: parentFeatureKey,
        basePlanAccess: basePlanAllowed ? "ALLOW" : "DENY",
        schoolOverride: schoolOverrideStr,
        effectiveAccess: effectiveAllowed ? "ALLOW" : "DENY",
        status,
      };
    });

    // Count summary metrics
    const activeFeatureCount = matrix.filter((m) => m.effectiveAccess === "ALLOW").length;
    const deniedFeatureCount = matrix.filter((m) => m.effectiveAccess === "DENY").length;
    const activeOverrideCount = overrides.length;

    return NextResponse.json({
      success: true,
      schoolId,
      entitlement,
      matrix,
      summary: {
        activeFeatureCount,
        deniedFeatureCount,
        activeOverrideCount,
        isFullControl,
      },
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools/[id]/entitlements error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to resolve school entitlement matrix." },
      { status: 500 }
    );
  }
}
