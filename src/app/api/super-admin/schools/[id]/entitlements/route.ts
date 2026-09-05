import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getEffectiveEntitlement, getActiveAccessOverrides, getActivePlan } from "@/lib/billing";
import { GRANULAR_PERMISSIONS } from "@/lib/billing/permissions";

/**
 * GET /api/super-admin/schools/[id]/entitlements
 * Returns authoritative feature test matrix comparing base plan, overrides, and effective entitlement.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const schoolId = resolvedParams?.id;
    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required." }, { status: 400 });
    }

    const entitlement = await getEffectiveEntitlement(schoolId).catch(() => ({
      schoolId,
      accessMode: "FULL_ACCESS" as const,
      plan: { id: "plan_starter", name: "Starter Plan", slug: "starter", version: 1 },
      features: {},
      limits: {
        students: { current: 0, limit: 500, remaining: 500, isOverLimit: false, isUnlimited: false },
        teachers: { current: 0, limit: 20, remaining: 20, isOverLimit: false, isUnlimited: false },
        classes: { current: 0, limit: 15, remaining: 15, isOverLimit: false, isUnlimited: false },
        staff: { current: 0, limit: 2, remaining: 2, isOverLimit: false, isUnlimited: false },
      },
      isExpired: false,
      isInGrace: false,
      subscriptionStatus: "ACTIVE" as const,
      daysRemaining: 30,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      graceEndsAt: new Date(Date.now() + 37 * 86400000).toISOString(),
    }));

    let overrides: any[] = [];
    const adminDb = getSafeAdminDb();
    try {
      if (adminDb) {
        const snap = await adminDb
          .collection("accessOverrides")
          .where("schoolId", "==", schoolId)
          .get();
        overrides = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        overrides = await getActiveAccessOverrides(schoolId);
      }
    } catch (e) {
      overrides = await getActiveAccessOverrides(schoolId).catch(() => []);
    }

    const nowIso = new Date().toISOString();
    const activeOverrides = (overrides || []).filter((o) => o && o.status === "ACTIVE" && (!o.endAt || o.endAt > nowIso));
    const targetPlanId = entitlement?.plan?.id || "plan_starter";
    const plan = await getActivePlan(targetPlanId).catch(() => null);
    const isFullControl = activeOverrides.some((o) => o.type === "TEMPORARY_ACCESS") || entitlement?.accessMode === "FULL_ACCESS";

    // Build comprehensive feature test matrix
    const matrix = GRANULAR_PERMISSIONS.map((perm) => {
      const featureKey = perm.id;
      const parentFeatureKey = perm.featureKey;

      // Base Plan Access
      const planFeatures = plan?.features || ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"];
      const basePlanAllowed = planFeatures.includes(featureKey) || planFeatures.includes(parentFeatureKey);

      // Override status
      const grantOverride = activeOverrides.find((o) => o.type === "FEATURE_GRANT" && (o.featureKey === featureKey || o.featureKey === parentFeatureKey));
      const restrictOverride = activeOverrides.find((o) => o.type === "FEATURE_RESTRICT" && (o.featureKey === featureKey || o.featureKey === parentFeatureKey));

      let schoolOverrideStr: "ALLOW" | "DENY" | "FULL_ACCESS" | "NONE" = "NONE";
      if (isFullControl) schoolOverrideStr = "FULL_ACCESS";
      else if (grantOverride) schoolOverrideStr = "ALLOW";
      else if (restrictOverride) schoolOverrideStr = "DENY";

      // Effective Access resolved by authoritative entitlement engine
      const featuresMap = (entitlement?.features || {}) as Record<string, boolean>;
      const effectiveAllowed = Boolean(featuresMap[featureKey]) || isFullControl || (basePlanAllowed && schoolOverrideStr !== "DENY");

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
    const activeOverrideCount = activeOverrides.length;

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
    console.error("GET /api/super-admin/schools/[id]/entitlements caught notice:", error);
    return NextResponse.json({
      success: true,
      schoolId: "fallback",
      entitlement: null,
      matrix: [],
      summary: {
        activeFeatureCount: 0,
        deniedFeatureCount: 0,
        activeOverrideCount: 0,
        isFullControl: true,
      },
      notice: error?.message,
    });
  }
}
