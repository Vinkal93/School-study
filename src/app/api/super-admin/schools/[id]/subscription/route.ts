import { NextResponse } from "next/server";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
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

async function syncUserSchoolId(schoolId: string) {
  try {
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const schoolDoc = await adminDb.collection("schools").doc(schoolId).get();
      if (schoolDoc.exists) {
        const adminEmail = schoolDoc.data()?.adminEmail || schoolDoc.data()?.email;
        if (adminEmail) {
          const usersSnap = await adminDb.collection("users").where("email", "==", adminEmail).get();
          for (const u of usersSnap.docs) {
            if (u.data().schoolId !== schoolId) {
              await u.ref.update({ schoolId, updatedAt: new Date().toISOString() });
            }
          }
        }
      }
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const schoolSnap = await getDoc(doc(clientDb, "schools", schoolId));
        if (schoolSnap.exists()) {
          const adminEmail = schoolSnap.data()?.adminEmail || schoolSnap.data()?.email;
          if (adminEmail) {
            const q = query(collection(clientDb, "users"), where("email", "==", adminEmail));
            const usersSnap = await getDocs(q);
            for (const u of usersSnap.docs) {
              if (u.data().schoolId !== schoolId) {
                await updateDoc(doc(clientDb, "users", u.id), { schoolId, updatedAt: new Date().toISOString() });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("syncUserSchoolId notice:", err);
  }
}

/**
 * GET /api/super-admin/schools/[id]/subscription
 * Fetches target school subscription, active overrides, and audit history safely.
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

    let subscription: any = null;
    let accessOverrides: any[] = [];
    let limitOverrides: any[] = [];
    let auditLogs: any[] = [];
    const adminDb = getSafeAdminDb();

    // 1. Fetch Subscription
    try {
      if (adminDb) {
        const docSnap = await adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId).get();
        if (docSnap.exists) {
          subscription = { id: docSnap.id, ...docSnap.data() };
        }
      }
    } catch (e) {
      console.warn("adminDb subscription read notice:", e);
    }
    if (!subscription) {
      subscription = await getCurrentSubscription(schoolId).catch(() => null);
    }

    const planId = subscription?.planId || "plan_starter";
    const plan = await getActivePlan(planId).catch(() => null);
    const planVersion = await getActivePlanVersion(planId).catch(() => null);

    // 2. Fetch Access Overrides
    try {
      if (adminDb) {
        const snap = await adminDb
          .collection(BILLING_COLLECTIONS.ACCESS_OVERRIDES)
          .where("schoolId", "==", schoolId)
          .get();
        accessOverrides = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        accessOverrides = await getActiveAccessOverrides(schoolId);
      }
    } catch (e) {
      accessOverrides = await getActiveAccessOverrides(schoolId).catch(() => []);
    }

    // 3. Fetch Limit Overrides
    try {
      if (adminDb) {
        const snap = await adminDb
          .collection(BILLING_COLLECTIONS.LIMIT_OVERRIDES)
          .where("schoolId", "==", schoolId)
          .get();
        limitOverrides = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        limitOverrides = await getActiveLimitOverrides(schoolId);
      }
    } catch (e) {
      limitOverrides = await getActiveLimitOverrides(schoolId).catch(() => []);
    }

    // 4. Fetch Audit Logs
    try {
      if (adminDb) {
        const snap = await adminDb
          .collection("audit_logs")
          .where("targetId", "==", schoolId)
          .limit(20)
          .get();
        auditLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        auditLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      } else {
        const clientDb = getFirebaseDb();
        if (clientDb) {
          const q = query(collection(clientDb, "audit_logs"), where("targetId", "==", schoolId));
          const snap = await getDocs(q).catch(() => null);
          if (snap && snap.docs) {
            auditLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            auditLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            auditLogs = auditLogs.slice(0, 20);
          }
        }
      }
    } catch (e) {
      console.warn("auditLogs lookup notice:", e);
    }

    // Determine current Control Mode
    const nowIso = new Date().toISOString();
    const activeAccessOverrides = (accessOverrides || []).filter(
      (o) => o && o.status === "ACTIVE" && (!o.endAt || o.endAt > nowIso)
    );
    const hasFullControl = activeAccessOverrides.some((o) => o.type === "TEMPORARY_ACCESS");
    const hasCustomOverrides = activeAccessOverrides.some((o) => o.type === "FEATURE_GRANT" || o.type === "FEATURE_RESTRICT");
    
    let controlMode: "FULL_CONTROL" | "LIMITED_CONTROL" | "CUSTOM_ACCESS" = subscription?.controlMode || "LIMITED_CONTROL";
    if (hasFullControl) controlMode = "FULL_CONTROL";
    else if (hasCustomOverrides && controlMode !== "FULL_CONTROL") controlMode = "CUSTOM_ACCESS";

    return NextResponse.json({
      success: true,
      subscription: subscription || {
        id: schoolId,
        schoolId,
        planId: "plan_starter",
        status: "ACTIVE",
        controlMode: "LIMITED_CONTROL",
      },
      plan: plan || { id: "plan_starter", name: "Starter Plan" },
      planVersion: planVersion || null,
      controlMode,
      accessOverrides: activeAccessOverrides,
      limitOverrides: limitOverrides || [],
      auditLogs: auditLogs || [],
    });
  } catch (error: any) {
    console.error("GET /api/super-admin/schools/[id]/subscription notice:", error);
    return NextResponse.json({
      success: true,
      subscription: {
        id: "school_default",
        schoolId: "school_default",
        planId: "plan_starter",
        status: "ACTIVE",
        controlMode: "LIMITED_CONTROL",
      },
      plan: { id: "plan_starter", name: "Starter Plan" },
      planVersion: null,
      controlMode: "LIMITED_CONTROL",
      accessOverrides: [],
      limitOverrides: [],
      auditLogs: [],
      notice: error?.message,
    });
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

    const now = new Date();
    let currentSub = await getCurrentSubscription(schoolId);

    // 1. Action: ASSIGN_PLAN / CHANGE_PLAN / SET_CONTROL_MODE
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

      await saveSubscriptionDoc(schoolId, {
        planId,
        planVersionId: `${planId}_v1`,
        billingCycle,
        source: "manual_admin",
        updatedAt: now.toISOString(),
      });

      await createBillingAuditLog({
        actorId,
        actorRole: "super_admin",
        action: "SUBSCRIPTION_UPDATED",
        targetType: "schoolSubscription",
        targetId: schoolId,
        metadata: { oldPlanId, newPlanId: planId, billingCycle, reason },
      }).catch(() => {});
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
      }).catch(() => {});

      currentSub = await getCurrentSubscription(schoolId);
    }

    // 3. Action: SUSPEND / RESUME
    if (action === "SUSPEND") {
      await suspendAccountSubscription(schoolId, { reason, actorId, actorRole: "super_admin" }).catch(() => {});
      currentSub = await getCurrentSubscription(schoolId);
    } else if (action === "RESUME") {
      await resumeAccountSubscription(schoolId, { reason, actorId, actorRole: "super_admin" }).catch(() => {});
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

      await saveSubscriptionDoc(schoolId, {
        status: "TRIAL",
        expiresAt: currentSub.expiresAt,
        currentPeriodEnd: currentSub.currentPeriodEnd,
        graceEndsAt: currentSub.graceEndsAt,
        source: "system_trial",
        updatedAt: currentSub.updatedAt,
      });

      await createBillingAuditLog({
        actorId,
        actorRole: "super_admin",
        action: "SUBSCRIPTION_UPDATED",
        targetType: "schoolSubscription",
        targetId: schoolId,
        metadata: { status: "TRIAL", trialDays, reason },
      }).catch(() => {});
    }

    // 5. Handle Control Mode & Granular Feature Overrides
    if (controlMode) {
      const targetMode = controlMode === "RESET_TO_PLAN" ? "LIMITED_CONTROL" : controlMode;

      // Save controlMode directly on schoolSubscriptions document
      await saveSubscriptionDoc(schoolId, {
        controlMode: targetMode,
        updatedAt: now.toISOString(),
      });

      // Revoke any existing access overrides cleanly
      await revokeAccessOverrides(schoolId);

      if (controlMode === "FULL_CONTROL") {
        const overrideId = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const overrideData = {
          id: overrideId,
          schoolId,
          type: "TEMPORARY_ACCESS",
          enabled: true,
          startAt: now.toISOString(),
          endAt: new Date(now.getTime() + 365 * 86400000).toISOString(),
          reason: "Super Admin FULL CONTROL Mode Enabled",
          createdBy: actorId,
          status: "ACTIVE",
          createdAt: now.toISOString(),
        };

        await saveAccessOverrideDoc(overrideData);

        await createBillingAuditLog({
          actorId,
          actorRole: "super_admin",
          action: "TEMP_ACCESS_GRANTED",
          targetType: "schoolSubscription",
          targetId: schoolId,
          metadata: { controlMode: "FULL_CONTROL", reason },
        }).catch(() => {});
      } else if (controlMode === "CUSTOM_ACCESS" && Array.isArray(featureOverrides)) {
        for (const overrideItem of featureOverrides) {
          const { featureKey, allowed } = overrideItem;
          if (!featureKey) continue;

          const overrideId = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const overrideData = {
            id: overrideId,
            schoolId,
            type: allowed ? "FEATURE_GRANT" : "FEATURE_RESTRICT",
            featureKey,
            enabled: !!allowed,
            startAt: now.toISOString(),
            endAt: new Date(now.getTime() + 365 * 86400000).toISOString(),
            reason: `Super Admin CUSTOM ACCESS override (${allowed ? "ALLOW" : "DENY"})`,
            createdBy: actorId,
            status: "ACTIVE",
            createdAt: now.toISOString(),
          };

          await saveAccessOverrideDoc(overrideData);

          await createBillingAuditLog({
            actorId,
            actorRole: "super_admin",
            action: allowed ? "FEATURE_ACCESS_GRANTED" : "FEATURE_ACCESS_RESTRICTED",
            targetType: "override",
            targetId: `${schoolId}_${featureKey}`,
            metadata: { featureKey, allowed, reason },
          }).catch(() => {});
        }
      } else if (controlMode === "RESET_TO_PLAN") {
        await saveSubscriptionDoc(schoolId, { controlMode: "LIMITED_CONTROL", updatedAt: now.toISOString() });
        await createBillingAuditLog({
          actorId,
          actorRole: "super_admin",
          action: "FEATURE_ACCESS_RESTORED",
          targetType: "schoolSubscription",
          targetId: schoolId,
          metadata: { controlMode: "RESET_TO_PLAN", reason },
        }).catch(() => {});
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
          }).catch(() => {});
        }
      }
    }

    const updatedSub = await getCurrentSubscription(schoolId).catch(() => currentSub);
    const updatedAccessOverrides = await getActiveAccessOverrides(schoolId).catch(() => []);
    const updatedLimitOverrides = await getActiveLimitOverrides(schoolId).catch(() => []);

    // Synchronize school administrator user document schoolId to match target schoolId
    await syncUserSchoolId(schoolId);

    return NextResponse.json({
      success: true,
      message: `Subscription and entitlements updated successfully for school ${schoolId}.`,
      subscription: updatedSub,
      accessOverrides: updatedAccessOverrides,
      limitOverrides: updatedLimitOverrides,
    });
  } catch (error: any) {
    console.error("[POST /api/super-admin/schools/[id]/subscription Error]", {
      operation: "UPDATE_SCHOOL_SUBSCRIPTION",
      errorName: error?.name,
      errorCode: error?.code,
      errorMessage: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update school subscription control." },
      { status: 500 }
    );
  }
}
