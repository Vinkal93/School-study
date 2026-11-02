import { collection, doc, getDoc, getDocs, query, where, runTransaction } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { getActivePlan, getActivePlanVersion } from "./plans";
import { clearSubscriptionCache, computeSubscriptionStatus } from "./subscriptions";
import type { BillingCycle, FeatureAccessMode } from "@/types";

export async function applySchoolPlanControl(schoolId: string, input: { action: string; planId: string; billingCycle: BillingCycle; controlMode: string; expiryDays: number; customExpiryDate?: string; reason: string; featureOverrides: { featureKey: string; accessMode: FeatureAccessMode }[]; limitOverrides: Record<string, number | null> }) {
  const db = getFirebaseDb(), user = getFirebaseAuth()?.currentUser;
  if (!db || !user) throw new Error("Sign in as super admin to save school access.");
  const actor = await getDoc(doc(db, "users", user.uid));
  if (actor.data()?.role !== "super_admin") throw new Error("Super admin access required.");
  if (!input.reason.trim()) throw new Error("Provide a reason for this change.");
  const [plan, version] = await Promise.all([getActivePlan(input.planId), getActivePlanVersion(input.planId)]);
  if (!plan || !version) throw new Error("Select an active configured plan.");
  const now = Date.now(), nowIso = new Date(now).toISOString();
  const [access, limits] = await Promise.all([getDocs(query(collection(db, "accessOverrides"), where("schoolId", "==", schoolId))), getDocs(query(collection(db, "limitOverrides"), where("schoolId", "==", schoolId)))]);
  await runTransaction(db, async tx => {
    const subRef = doc(db, "schoolSubscriptions", schoolId), schoolRef = doc(db, "schools", schoolId);
    const [subSnap, schoolSnap] = await Promise.all([tx.get(subRef), tx.get(schoolRef)]);
    if (!schoolSnap.exists()) throw new Error("School does not exist.");
    const current = subSnap.data() || {};
    let expiry = Date.parse(current.expiresAt || nowIso);
    if (input.action === "ASSIGN_PLAN") expiry = input.customExpiryDate ? Date.parse(input.customExpiryDate) : now + (input.billingCycle === "annual" ? 365 : 30) * 86400000;
    else if (input.action === "ADJUST_EXPIRY") expiry = Date.parse(input.customExpiryDate || "");
    else if (input.action === "EXTEND_EXPIRY" || input.action === "REDUCE_EXPIRY") {
      if (!Number.isSafeInteger(input.expiryDays) || input.expiryDays <= 0) throw new Error("Enter a positive whole number of days.");
      expiry += (input.action === "EXTEND_EXPIRY" ? 1 : -1) * input.expiryDays * 86400000;
    } else if (input.action !== "SET_CONTROL_MODE" && input.action !== "RESET_TO_PLAN") throw new Error("Unsupported school access action.");
    if (!Number.isFinite(expiry)) throw new Error("Enter a valid expiry date.");
    const expiresAt = new Date(expiry).toISOString(), graceEndsAt = new Date(expiry + 7 * 86400000).toISOString();
    const assigning = input.action === "ASSIGN_PLAN";
    const controlMode = input.action === "RESET_TO_PLAN" ? "PLAN_DEFAULT" : input.controlMode;
    const patch = {
      ...current, id: schoolId, schoolId, planId: assigning ? plan.id : current.planId || plan.id,
      planVersionId: assigning ? version.id : current.planVersionId || version.id,
      billingCycle: assigning ? input.billingCycle : current.billingCycle || input.billingCycle,
      startsAt: current.startsAt || nowIso, createdAt: current.createdAt || nowIso,
      expiresAt, currentPeriodEnd: expiresAt, graceEndsAt, controlMode,
      status: computeSubscriptionStatus(expiresAt, graceEndsAt, current.status),
      source: "manual_admin", updatedAt: nowIso,
    };
    tx.set(subRef, patch);
    tx.update(schoolRef, { planId: patch.planId, plan: patch.planId, planName: assigning ? plan.name : schoolSnap.data().planName || plan.name, subscriptionStatus: patch.status, subscriptionExpiresAt: expiresAt, billingCycle: patch.billingCycle, updatedAt: nowIso });
    if (input.action === "SET_CONTROL_MODE" || input.action === "RESET_TO_PLAN") {
      for (const d of access.docs) tx.update(d.ref, { status: "REVOKED", updatedAt: nowIso });
      for (const d of limits.docs) tx.update(d.ref, { status: "REVOKED", updatedAt: nowIso });
      if (input.action !== "RESET_TO_PLAN") {
        for (const o of input.featureOverrides) {
          const id = `${encodeURIComponent(schoolId)}_${encodeURIComponent(o.featureKey)}`;
          tx.set(doc(db, "accessOverrides", id), { id, schoolId, featureKey: o.featureKey, accessMode: o.accessMode, type: o.accessMode === "FULL_ACCESS" ? "FEATURE_GRANT" : o.accessMode === "SHOWCASE" ? "FEATURE_SHOWCASE" : "FEATURE_RESTRICT", enabled: o.accessMode !== "HIDDEN", startAt: nowIso, endAt: graceEndsAt, status: "ACTIVE", reason: input.reason, createdBy: user.uid, createdAt: nowIso });
        }
        for (const [key, value] of Object.entries(input.limitOverrides)) {
          if (value === null) continue;
          if (!Number.isSafeInteger(value) || value < -1) throw new Error("Limits must be whole numbers or -1 for unlimited.");
          const id = `${encodeURIComponent(schoolId)}_${key}`;
          tx.set(doc(db, "limitOverrides", id), { id, schoolId, limitKey: key, overrideValue: value, startAt: nowIso, endAt: graceEndsAt, status: "ACTIVE", reason: input.reason, createdBy: user.uid, createdAt: nowIso });
        }
      }
    }
    tx.set(doc(db, "audit_logs", crypto.randomUUID()), { action: input.action, schoolId, targetId: schoolId, actorId: user.uid, actorRole: "super_admin", reason: input.reason, createdAt: nowIso });
  });
  clearSubscriptionCache(schoolId);
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("school_study_realtime_sync"); channel.postMessage({ type: "SUBSCRIPTION_UPDATED", schoolId }); channel.close(); }
}
