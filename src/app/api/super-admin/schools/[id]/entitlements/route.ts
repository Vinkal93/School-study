import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  getEffectiveEntitlement,
  getActiveAccessOverrides,
  getActiveLimitOverrides,
  getActivePlan,
  getCurrentSubscription,
  createLimitOverride,
  createBillingAuditLog,
  resetSchoolEntitlements,
  BILLING_COLLECTIONS,
} from "@/lib/billing";
import { GRANULAR_PERMISSIONS, canonicalizeCapabilityKey, getParentFeatureKey, getParentCapabilityKey } from "@/lib/billing/permissions";

async function saveSubscriptionDoc(schoolId: string, data: any) {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId).set(data, { merge: true });
      return;
    } catch (e) {
      console.warn("adminDb subscription write notice, falling back to client SDK:", e);
    }
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    const subRef = doc(clientDb, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, data, { merge: true });
  }
}

async function saveAccessOverrideDoc(overrideData: any) {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.ACCESS_OVERRIDES).doc(overrideData.id).set(overrideData);
      return;
    } catch (e) {
      console.warn("adminDb accessOverride write notice, falling back to client SDK:", e);
    }
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    const overrideRef = doc(clientDb, BILLING_COLLECTIONS.ACCESS_OVERRIDES, overrideData.id);
    await setDoc(overrideRef, overrideData);
  }
}

async function revokeAccessOverrides(schoolId: string) {
  const nowIso = new Date().toISOString();
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection(BILLING_COLLECTIONS.ACCESS_OVERRIDES)
        .where("schoolId", "==", schoolId)
        .get();
      for (const d of snap.docs) {
        if (d.data().status === "ACTIVE") {
          await d.ref.update({ status: "REVOKED", updatedAt: nowIso });
        }
      }
      return;
    } catch (e) {
      console.warn("adminDb revoke notice, falling back to client SDK:", e);
    }
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      const q = query(
        collection(clientDb, BILLING_COLLECTIONS.ACCESS_OVERRIDES),
        where("schoolId", "==", schoolId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.data().status === "ACTIVE") {
          await updateDoc(doc(clientDb, BILLING_COLLECTIONS.ACCESS_OVERRIDES, d.id), {
            status: "REVOKED",
            updatedAt: nowIso,
          });
        }
      }
    } catch (e) {
      console.warn("clientDb revoke notice:", e);
    }
  }
}

/**
 * GET /api/super-admin/schools/[id]/entitlements
 * Returns authoritative 3-way feature test matrix comparing base plan, overrides, and effective entitlement.
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

    const [entitlement, sub] = await Promise.all([
      getEffectiveEntitlement(schoolId).catch(() => null),
      getCurrentSubscription(schoolId).catch(() => null),
    ]);

    let accessOverrides: any[] = [];
    let limitOverrides: any[] = [];
    const adminDb = getSafeAdminDb();

    try {
      if (adminDb) {
        const [accessSnap, limitSnap] = await Promise.all([
          adminDb.collection(BILLING_COLLECTIONS.ACCESS_OVERRIDES).where("schoolId", "==", schoolId).get(),
          adminDb.collection(BILLING_COLLECTIONS.LIMIT_OVERRIDES).where("schoolId", "==", schoolId).get(),
        ]);
        accessOverrides = accessSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        limitOverrides = limitSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        accessOverrides = await getActiveAccessOverrides(schoolId);
        limitOverrides = await getActiveLimitOverrides(schoolId);
      }
    } catch (e) {
      accessOverrides = await getActiveAccessOverrides(schoolId).catch(() => []);
      limitOverrides = await getActiveLimitOverrides(schoolId).catch(() => []);
    }

    const nowIso = new Date().toISOString();
    const activeAccessOverrides = (accessOverrides || []).filter(
      (o) => o && o.status === "ACTIVE" && (!o.endAt || o.endAt > nowIso)
    );
    const activeLimitOverrides = (limitOverrides || []).filter(
      (o) => o && o.status === "ACTIVE" && (!o.endAt || o.endAt > nowIso)
    );

    const targetPlanId = entitlement?.plan?.id || sub?.planId || "plan_starter";
    const plan = await getActivePlan(targetPlanId).catch(() => null);

    const isFullControl = sub?.controlMode === "FULL_CONTROL" || activeAccessOverrides.some((o) => o.type === "TEMPORARY_ACCESS");
    const controlMode = sub?.controlMode || (isFullControl ? "FULL_CONTROL" : activeAccessOverrides.length > 0 ? "CUSTOM_ACCESS" : "PLAN_DEFAULT");

    const planFeatureAccess = plan?.featureAccess || {};
    const planFeaturesList = plan?.features || ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"];

    // Build comprehensive 3-way feature test matrix
    const matrix = GRANULAR_PERMISSIONS.map((perm) => {
      const featureKey = perm.id;
      const canonical = canonicalizeCapabilityKey(featureKey);
      const parentModuleKey = getParentFeatureKey(canonical);
      const parentCapKey = getParentCapabilityKey(canonical);

      // 1. Base Plan Access Resolution
      let basePlanAccess: "ALLOW" | "DENY" | "SHOWCASE" = "DENY";
      if (planFeatureAccess[featureKey]) {
        basePlanAccess = planFeatureAccess[featureKey] === "FULL_ACCESS" ? "ALLOW" : planFeatureAccess[featureKey] === "SHOWCASE" ? "SHOWCASE" : "DENY";
      } else if (planFeatureAccess[canonical]) {
        basePlanAccess = planFeatureAccess[canonical] === "FULL_ACCESS" ? "ALLOW" : planFeatureAccess[canonical] === "SHOWCASE" ? "SHOWCASE" : "DENY";
      } else if (parentCapKey && planFeatureAccess[parentCapKey]) {
        basePlanAccess = planFeatureAccess[parentCapKey] === "FULL_ACCESS" ? "ALLOW" : planFeatureAccess[parentCapKey] === "SHOWCASE" ? "SHOWCASE" : "DENY";
      } else if (parentModuleKey && planFeatureAccess[parentModuleKey]) {
        basePlanAccess = planFeatureAccess[parentModuleKey] === "FULL_ACCESS" ? "ALLOW" : planFeatureAccess[parentModuleKey] === "SHOWCASE" ? "SHOWCASE" : "DENY";
      } else {
        const isAllowedInList = planFeaturesList.includes(featureKey) || planFeaturesList.includes(canonical) || planFeaturesList.includes(parentModuleKey);
        basePlanAccess = isAllowedInList ? "ALLOW" : "DENY";
      }

      // 2. School Override Resolution
      const matchedOverride = activeAccessOverrides.find((o) => {
        return (
          o.featureKey === featureKey ||
          o.featureKey === canonical ||
          o.featureKey === parentCapKey ||
          o.featureKey === parentModuleKey ||
          o.featureKey === "all"
        );
      });

      let schoolOverrideStr: "ALLOW" | "DENY" | "SHOWCASE" | "FULL_ACCESS" | "NONE" = "NONE";
      if (isFullControl) {
        schoolOverrideStr = "FULL_ACCESS";
      } else if (matchedOverride) {
        if (matchedOverride.accessMode === "FULL_ACCESS" || matchedOverride.type === "FEATURE_GRANT") schoolOverrideStr = "ALLOW";
        else if (matchedOverride.accessMode === "HIDDEN" || matchedOverride.type === "FEATURE_RESTRICT") schoolOverrideStr = "DENY";
        else if (matchedOverride.accessMode === "SHOWCASE" || matchedOverride.type === "FEATURE_SHOWCASE") schoolOverrideStr = "SHOWCASE";
        else schoolOverrideStr = "ALLOW";
      }

      // 3. Effective Access Resolution
      const effectiveModes = entitlement?.featureAccessModes || {};
      const effectiveMode = effectiveModes[canonical] || effectiveModes[featureKey] || (isFullControl ? "FULL_ACCESS" : schoolOverrideStr === "ALLOW" ? "FULL_ACCESS" : schoolOverrideStr === "DENY" ? "HIDDEN" : schoolOverrideStr === "SHOWCASE" ? "SHOWCASE" : basePlanAccess === "ALLOW" ? "FULL_ACCESS" : basePlanAccess === "SHOWCASE" ? "SHOWCASE" : "HIDDEN");

      let effectiveAccess: "ALLOW" | "DENY" | "SHOWCASE" = "DENY";
      if (effectiveMode === "FULL_ACCESS") effectiveAccess = "ALLOW";
      else if (effectiveMode === "SHOWCASE") effectiveAccess = "SHOWCASE";
      else effectiveAccess = "DENY";

      let status = "ACTIVE";
      if (effectiveAccess === "DENY") status = "RESTRICTED";
      else if (effectiveAccess === "SHOWCASE") status = "SHOWCASE";
      else if (schoolOverrideStr !== "NONE") status = "OVERRIDDEN";

      return {
        id: perm.id,
        name: perm.name,
        category: perm.category,
        featureKey: parentModuleKey,
        parentKey: perm.parentKey,
        description: perm.description,
        basePlanAccess,
        schoolOverride: schoolOverrideStr,
        effectiveAccess,
        status,
      };
    });

    // Summary metrics
    const activeFeatureCount = matrix.filter((m) => m.effectiveAccess === "ALLOW").length;
    const deniedFeatureCount = matrix.filter((m) => m.effectiveAccess === "DENY").length;
    const showcaseFeatureCount = matrix.filter((m) => m.effectiveAccess === "SHOWCASE").length;
    const activeOverrideCount = activeAccessOverrides.length;

    return NextResponse.json({
      success: true,
      schoolId,
      controlMode,
      subscription: sub,
      entitlement,
      matrix,
      limitOverrides: activeLimitOverrides,
      summary: {
        activeFeatureCount,
        deniedFeatureCount,
        showcaseFeatureCount,
        activeOverrideCount,
        isFullControl,
        controlMode,
      },
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools/[id]/entitlements caught notice:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to load entitlements matrix.",
    }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/schools/[id]/entitlements
 * Authoritative Super Admin endpoint to update control mode, feature overrides, and limit overrides.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params).catch(() => ({ id: "" }));
    const schoolId = resolvedParams?.id;
    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const {
      controlMode = "PLAN_DEFAULT",
      featureOverrides,
      limitOverrides,
      reason = "Super Admin entitlement matrix update",
      actorId = "super_admin",
    } = body || {};

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Reset to Plan Default Action
    if (controlMode === "RESET_TO_PLAN" || controlMode === "PLAN_DEFAULT" && (!featureOverrides || Object.keys(featureOverrides).length === 0)) {
      await resetSchoolEntitlements(schoolId, {
        actorId,
        actorRole: "super_admin",
        reason,
      });

      return NextResponse.json({
        success: true,
        message: `School ${schoolId} successfully reset to Plan Default.`,
        controlMode: "PLAN_DEFAULT",
      });
    }

    // 2. Set Control Mode on School Subscription
    await saveSubscriptionDoc(schoolId, {
      controlMode,
      updatedAt: nowIso,
    });

    await createBillingAuditLog({
      actorId,
      actorRole: "super_admin",
      action: "SCHOOL_CONTROL_MODE_CHANGED",
      targetType: "schoolSubscription",
      targetId: schoolId,
      metadata: { controlMode, reason },
    }).catch(() => {});

    // 3. Process Control Mode Specific Overrides
    if (controlMode === "FULL_CONTROL") {
      await revokeAccessOverrides(schoolId);
      const overrideId = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await saveAccessOverrideDoc({
        id: overrideId,
        schoolId,
        type: "TEMPORARY_ACCESS",
        accessMode: "FULL_ACCESS",
        enabled: true,
        startAt: nowIso,
        endAt: new Date(now.getTime() + 365 * 86400000).toISOString(),
        reason: "Super Admin FULL CONTROL Mode Enabled",
        createdBy: actorId,
        status: "ACTIVE",
        createdAt: nowIso,
      });
    } else if (controlMode === "CUSTOM_ACCESS" || (featureOverrides && Object.keys(featureOverrides).length > 0)) {
      await revokeAccessOverrides(schoolId);

      const itemsToOverride = Array.isArray(featureOverrides)
        ? featureOverrides
        : typeof featureOverrides === "object"
        ? Object.entries(featureOverrides).map(([featureKey, val]) => ({
            featureKey,
            allowed: val === true || val === "ALLOW" || val === "FULL_ACCESS",
            accessMode: typeof val === "string" ? (val === "SHOWCASE" ? "SHOWCASE" : val === "DENY" ? "HIDDEN" : "FULL_ACCESS") : val ? "FULL_ACCESS" : "HIDDEN",
          }))
        : [];

      for (const item of itemsToOverride) {
        const { featureKey, allowed, accessMode } = item;
        if (!featureKey) continue;

        let resolvedMode = accessMode;
        if (!resolvedMode) {
          resolvedMode = allowed ? "FULL_ACCESS" : "HIDDEN";
        }

        let type: "FEATURE_GRANT" | "FEATURE_RESTRICT" | "FEATURE_SHOWCASE" = "FEATURE_GRANT";
        if (resolvedMode === "HIDDEN") type = "FEATURE_RESTRICT";
        else if (resolvedMode === "SHOWCASE") type = "FEATURE_SHOWCASE";

        const overrideId = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await saveAccessOverrideDoc({
          id: overrideId,
          schoolId,
          type,
          featureKey,
          accessMode: resolvedMode,
          enabled: resolvedMode !== "HIDDEN",
          startAt: nowIso,
          endAt: new Date(now.getTime() + 365 * 86400000).toISOString(),
          reason: `Super Admin CUSTOM ACCESS override (${resolvedMode})`,
          createdBy: actorId,
          status: "ACTIVE",
          createdAt: nowIso,
        });

        await createBillingAuditLog({
          actorId,
          actorRole: "super_admin",
          action: "SCHOOL_FEATURE_OVERRIDE_CHANGED",
          targetType: "override",
          targetId: `${schoolId}_${featureKey}`,
          metadata: { featureKey, accessMode: resolvedMode, reason },
        }).catch(() => {});
      }
    } else if (controlMode === "LIMITED_CONTROL") {
      await revokeAccessOverrides(schoolId);
    }

    // 4. Process Limit Overrides
    if (limitOverrides && typeof limitOverrides === "object") {
      const keys: Array<"students" | "teachers" | "classes" | "staff"> = ["students", "teachers", "classes", "staff"];
      for (const k of keys) {
        if (typeof limitOverrides[k] === "number") {
          await createLimitOverride(schoolId, {
            limitKey: k,
            overrideValue: limitOverrides[k],
            durationDays: 365,
            reason: `Super Admin limit override for ${k}`,
            createdBy: actorId,
          }).catch(() => {});

          await createBillingAuditLog({
            actorId,
            actorRole: "super_admin",
            action: "SCHOOL_LIMIT_OVERRIDE_CHANGED",
            targetType: "override",
            targetId: `${schoolId}_${k}`,
            metadata: { limitKey: k, overrideValue: limitOverrides[k], reason },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Entitlements and control mode updated successfully for school ${schoolId}.`,
      controlMode,
    });
  } catch (error: any) {
    console.error("[POST /api/super-admin/schools/[id]/entitlements Error]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update school entitlements." },
      { status: 500 }
    );
  }
}
