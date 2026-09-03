import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  getCurrentSubscription,
  getActivePlan,
  getActivePlanVersion,
  BILLING_COLLECTIONS,
  adjustSubscriptionPeriod,
  suspendAccountSubscription,
  resumeAccountSubscription,
  createAccessOverride,
  getActiveAccessOverrides,
  createLimitOverride,
  getActiveLimitOverrides,
  createBillingAuditLog,
} from "@/lib/billing";
import type { BillingAuditAction } from "@/types";

/**
 * GET /api/super-admin/schools/[id]/subscription
 * Fetches target school subscription, active overrides, and audit history.
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

    const subscription = await getCurrentSubscription(schoolId);
    const plan = await getActivePlan(subscription.planId).catch(() => null);
    const planVersion = await getActivePlanVersion(subscription.planId).catch(() => null);
    const accessOverrides = await getActiveAccessOverrides(schoolId);
    const limitOverrides = await getActiveLimitOverrides(schoolId);

    // Load recent subscription audit events
    let auditLogs: any[] = [];
    try {
      const db = getFirebaseDb();
      if (db) {
        const q = query(
          collection(db, "audit_logs"),
          where("targetId", "==", schoolId)
        );
        const snap = await getDocs(q);
        auditLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        auditLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        auditLogs = auditLogs.slice(0, 20);
      }
    } catch (e) {
      console.warn("Audit logs lookup notice:", e);
    }

    // Determine current Control Mode
    const hasFullControl = accessOverrides.some((o) => o.type === "TEMPORARY_ACCESS" && o.status === "ACTIVE");
    const hasCustomOverrides = accessOverrides.some((o) => (o.type === "FEATURE_GRANT" || o.type === "FEATURE_RESTRICT") && o.status === "ACTIVE");
    
    let controlMode: "FULL_CONTROL" | "LIMITED_CONTROL" | "CUSTOM_ACCESS" = "LIMITED_CONTROL";
    if (hasFullControl) controlMode = "FULL_CONTROL";
    else if (hasCustomOverrides) controlMode = "CUSTOM_ACCESS";

    return NextResponse.json({
      success: true,
      subscription,
      plan,
      planVersion,
      controlMode,
      accessOverrides,
      limitOverrides,
      auditLogs,
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools/[id]/subscription error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch subscription control details." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/schools/[id]/subscription
 * Authoritative Super Admin endpoint to assign plan, adjust period, change status, and set feature overrides.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const body = await request.json();
    const {
      action,
      planId,
      billingCycle = "monthly",
      expiryDays,
      customExpiryDate,
      reason = "Super Admin manual adjustment",
      actorId = "super_admin",
      controlMode,
      featureOverrides,
      limitOverridesInput,
    } = body || {};

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required." }, { status: 400 });
    }

    const db = getFirebaseDb();
    const now = new Date();
    const subRef = db ? doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId) : null;
    let currentSub = await getCurrentSubscription(schoolId);
    let auditAction: BillingAuditAction = "SUBSCRIPTION_UPDATED";

    // 1. Action: ASSIGN_PLAN / CHANGE_PLAN
    if (action === "ASSIGN_PLAN" || action === "CHANGE_PLAN") {
      if (!planId) {
        return NextResponse.json({ success: false, error: "planId is required for plan assignment." }, { status: 400 });
      }

      const oldPlanId = currentSub.planId;
      currentSub.planId = planId;
      currentSub.planVersionId = `${planId}_v1`;
      currentSub.billingCycle = billingCycle;
      currentSub.source = "manual_admin";
      currentSub.updatedAt = now.toISOString();

      if (subRef) {
        await updateDoc(subRef, {
          planId,
          planVersionId: `${planId}_v1`,
          billingCycle,
          source: "manual_admin",
          updatedAt: now.toISOString(),
        }).catch(async () => {
          await setDoc(subRef, currentSub);
        });
      }

      auditAction = "SUBSCRIPTION_UPDATED";

      await createBillingAuditLog({
        actorId,
        actorRole: "super_admin",
        action: auditAction,
        targetType: "schoolSubscription",
        targetId: schoolId,
        metadata: {
          oldPlanId,
          newPlanId: planId,
          billingCycle,
          reason,
        },
      });
    }

    // 2. Action: ADJUST_EXPIRY / RENEW / EXTEND / REDUCE
    if (action === "ADJUST_EXPIRY" || action === "EXTEND_EXPIRY" || action === "REDUCE_EXPIRY") {
      let adjType: any = "CUSTOM_PERIOD_ADJUSTMENT";
      let val = expiryDays || 30;

      if (action === "EXTEND_EXPIRY") adjType = "ADD_DAYS";
      else if (action === "REDUCE_EXPIRY") adjType = "REMOVE_DAYS";

      await adjustSubscriptionPeriod(schoolId, {
        type: adjType,
        value: val,
        customDate: customExpiryDate,
        reason,
        actorId,
        actorRole: "super_admin",
      });

      currentSub = await getCurrentSubscription(schoolId);
    }

    // 3. Action: SUSPEND / RESUME
    if (action === "SUSPEND") {
      await suspendAccountSubscription(schoolId, { reason, actorId, actorRole: "super_admin" });
      currentSub = await getCurrentSubscription(schoolId);
    } else if (action === "RESUME") {
      await resumeAccountSubscription(schoolId, { reason, actorId, actorRole: "super_admin" });
      currentSub = await getCurrentSubscription(schoolId);
    }

    // 4. Action: SET_TRIAL / DEMO
    if (action === "SET_TRIAL") {
      const trialDays = expiryDays || 14;
      const trialEnd = new Date(now.getTime() + trialDays * 86400000);
      
      currentSub.status = "TRIAL";
      currentSub.expiresAt = trialEnd.toISOString();
      currentSub.currentPeriodEnd = trialEnd.toISOString();
      currentSub.graceEndsAt = new Date(trialEnd.getTime() + 7 * 86400000).toISOString();
      currentSub.source = "system_trial";
      currentSub.updatedAt = now.toISOString();

      if (subRef) {
        await updateDoc(subRef, {
          status: "TRIAL",
          expiresAt: currentSub.expiresAt,
          currentPeriodEnd: currentSub.currentPeriodEnd,
          graceEndsAt: currentSub.graceEndsAt,
          source: "system_trial",
          updatedAt: currentSub.updatedAt,
        });
      }

      await createBillingAuditLog({
        actorId,
        actorRole: "super_admin",
        action: "SUBSCRIPTION_UPDATED",
        targetType: "schoolSubscription",
        targetId: schoolId,
        metadata: { status: "TRIAL", trialDays, reason },
      });
    }

    // 5. Handle Control Mode & Granular Feature Overrides
    if (controlMode) {
      if (db) {
        const existingOverrides = await getActiveAccessOverrides(schoolId);
        for (const ovr of existingOverrides) {
          const docRef = doc(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES, ovr.id);
          await updateDoc(docRef, { status: "REVOKED", updatedAt: now.toISOString() }).catch(() => {});
        }
      }

      if (controlMode === "FULL_CONTROL") {
        await createAccessOverride(schoolId, {
          type: "TEMPORARY_ACCESS",
          durationDays: 365,
          reason: "Super Admin FULL CONTROL Mode Enabled",
          createdBy: actorId,
        });
        await createBillingAuditLog({
          actorId,
          actorRole: "super_admin",
          action: "TEMP_ACCESS_GRANTED",
          targetType: "schoolSubscription",
          targetId: schoolId,
          metadata: { controlMode: "FULL_CONTROL", reason },
        });
      } else if (controlMode === "CUSTOM_ACCESS" && Array.isArray(featureOverrides)) {
        for (const overrideItem of featureOverrides) {
          const { featureKey, allowed } = overrideItem;
          if (!featureKey) continue;

          await createAccessOverride(schoolId, {
            type: allowed ? "FEATURE_GRANT" : "FEATURE_RESTRICT",
            featureKey,
            durationDays: 365,
            reason: `Super Admin CUSTOM ACCESS override (${allowed ? "ALLOW" : "DENY"})`,
            createdBy: actorId,
          });

          await createBillingAuditLog({
            actorId,
            actorRole: "super_admin",
            action: allowed ? "FEATURE_ACCESS_GRANTED" : "FEATURE_ACCESS_RESTRICTED",
            targetType: "override",
            targetId: `${schoolId}_${featureKey}`,
            metadata: { featureKey, allowed, reason },
          });
        }
      } else if (controlMode === "RESET_TO_PLAN") {
        await createBillingAuditLog({
          actorId,
          actorRole: "super_admin",
          action: "FEATURE_ACCESS_RESTORED",
          targetType: "schoolSubscription",
          targetId: schoolId,
          metadata: { controlMode: "RESET_TO_PLAN", reason },
        });
      }
    }

    // 6. Handle Limit Overrides
    if (limitOverridesInput && typeof limitOverridesInput === "object") {
      const keys: Array<"students" | "teachers" | "classes" | "staff"> = ["students", "teachers", "classes", "staff"];
      for (const k of keys) {
        if (typeof limitOverridesInput[k] === "number") {
          await createLimitOverride(schoolId, {
            limitKey: k,
            overrideValue: limitOverridesInput[k] as number,
            durationDays: 365,
            reason: `Super Admin limit override for ${k}`,
            createdBy: actorId,
          });
        }
      }
    }

    const updatedSub = await getCurrentSubscription(schoolId);
    const updatedAccessOverrides = await getActiveAccessOverrides(schoolId);
    const updatedLimitOverrides = await getActiveLimitOverrides(schoolId);

    return NextResponse.json({
      success: true,
      message: `Subscription and entitlements updated successfully for school ${schoolId}.`,
      subscription: updatedSub,
      accessOverrides: updatedAccessOverrides,
      limitOverrides: updatedLimitOverrides,
    });
  } catch (error: any) {
    console.error("POST /api/super-admin/schools/[id]/subscription error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update school subscription control." },
      { status: 500 }
    );
  }
}
