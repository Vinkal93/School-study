import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { SchoolSubscription, SubscriptionStatus, BillingCycle } from "@/types";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "./plans";
import { createBillingAuditLog } from "./audit";

// Server and Client universal DB handler
function getAdminDbServerOnly(): any {
  return null;
}

const g = globalThis as any;
if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map<string, SchoolSubscription>();
const memorySubscriptions: Map<string, SchoolSubscription> = g.__BILLING_SUBSCRIPTIONS_MAP__;

/**
 * Clears cached subscription data for a specific school (or all schools).
 * MUST be called before re-fetching entitlement after a plan change
 * to ensure the latest Firestore data is read instead of stale cache.
 */
export function clearSubscriptionCache(schoolId?: string): void {
  if (schoolId) {
    memorySubscriptions.delete(schoolId);
  } else {
    memorySubscriptions.clear();
  }
}

/**
 * Server-side calculation of subscription status based on current time and expiration dates.
 */
export function computeSubscriptionStatus(
  expiresAtIso: string,
  graceEndsAtIso: string,
  currentStatus?: SubscriptionStatus,
  nowMs?: number
): SubscriptionStatus {
  if (currentStatus === "SUSPENDED" || currentStatus === "CANCELLED") {
    return currentStatus;
  }

  const now = nowMs || Date.now();
  const expiresAtMs = new Date(expiresAtIso).getTime();
  const graceEndsAtMs = new Date(graceEndsAtIso).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (now < expiresAtMs) {
    if (expiresAtMs - now <= sevenDaysMs) {
      return "EXPIRING";
    }
    return currentStatus === "TRIAL" ? "TRIAL" : "ACTIVE";
  }

  if (now >= expiresAtMs && now < graceEndsAtMs) {
    return "GRACE_PERIOD";
  }

  return "EXPIRED";
}

/**
 * Fetches or provisions active subscription for a school.
 * Backward Compatibility (Section 22): Existing MVP schools without a subscription doc receive a 30-day Professional trial.
 */
export async function getSchoolSubscription(schoolId: string): Promise<SchoolSubscription> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
  const graceEndsAt = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days grace

  if (!schoolId || schoolId === "school_default" || schoolId === "system") {
    return {
      id: schoolId || "school_default",
      schoolId: schoolId || "school_default",
      planId: "plan_starter",
      planVersionId: "plan_starter_v1",
      status: "ACTIVE",
      billingCycle: "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const memSub = memorySubscriptions.get(schoolId);
  if (memSub && memSub.planId) {
    return memSub;
  }

  try {
    let subData: any = null;
    let schoolData: any = null;

    // 1. Server-side Admin DB lookup
    if (typeof window === "undefined") {
      try {
        const { getSafeAdminDb } = await import("@/lib/firebase/admin");
        const adminDb = getSafeAdminDb();
        if (adminDb) {
          const [subSnap, schoolSnap] = await Promise.all([
            adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId).get().catch(() => null),
            adminDb.collection("schools").doc(schoolId).get().catch(() => null),
          ]);
          if (subSnap?.exists) subData = { id: subSnap.id, ...subSnap.data() };
          if (schoolSnap?.exists) schoolData = { id: schoolSnap.id, ...schoolSnap.data() };
        }
      } catch (adminErr) {
        // Fallback
      }
    }

    // 2. Client SDK fallback
    if (!subData || !schoolData) {
      const db = getFirebaseDb();
      if (db) {
        try {
          const [subSnap, schoolSnap] = await Promise.all([
            !subData ? getDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId)).catch(() => null) : null,
            !schoolData ? getDoc(doc(db, "schools", schoolId)).catch(() => null) : null,
          ]);
          if (subSnap && (subSnap as any).exists?.()) subData = { id: (subSnap as any).id, ...(subSnap as any).data() };
          if (schoolSnap && (schoolSnap as any).exists?.()) schoolData = { id: (schoolSnap as any).id, ...(schoolSnap as any).data() };
        } catch (clientErr) {
          // Fallback
        }
      }
    }

    const rawPlan = subData?.planId || schoolData?.planId || schoolData?.plan || schoolData?.subscriptionPlan || "plan_starter";
    let normalizedPlan = rawPlan.toLowerCase().trim();
    if (!normalizedPlan.startsWith("plan_")) {
      normalizedPlan = `plan_${normalizedPlan}`;
    }

    if (subData) {
      const sub = {
        ...subData,
        id: schoolId,
        schoolId,
        planId: normalizedPlan,
        planVersionId: subData.planVersionId || `${normalizedPlan}_v1`,
        status: subData.status || schoolData?.subscriptionStatus || "ACTIVE",
        billingCycle: subData.billingCycle || schoolData?.billingCycle || "monthly",
      } as SchoolSubscription;

      const computedStatus = computeSubscriptionStatus(sub.expiresAt, sub.graceEndsAt, sub.status);
      if (computedStatus !== sub.status) {
        sub.status = computedStatus;
      }

      memorySubscriptions.set(schoolId, sub);
      return sub;
    }

    const defaultSub: SchoolSubscription = {
      id: schoolId,
      schoolId,
      planId: normalizedPlan,
      planVersionId: `${normalizedPlan}_v1`,
      status: schoolData?.subscriptionStatus || "ACTIVE",
      billingCycle: schoolData?.billingCycle || "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const db = getFirebaseDb();
    if (db) {
      setDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId), defaultSub).catch(() => {});
    }

    memorySubscriptions.set(schoolId, defaultSub);
    return defaultSub;
  } catch (error) {
    // Non-blocking fallback
    return {
      id: schoolId,
      schoolId,
      planId: "plan_starter",
      planVersionId: "plan_starter_v1",
      status: "ACTIVE",
      billingCycle: "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
}

/**
 * Provisions or updates a school subscription (Server-side Super Admin operation).
 */
export async function updateSchoolSubscription(
  schoolId: string,
  input: {
    planId: string;
    billingCycle: BillingCycle;
    durationDays?: number;
    graceDays?: number;
    status?: SubscriptionStatus;
  },
  actorId: string = "super_admin"
): Promise<SchoolSubscription> {
  const activeVersion = await getActivePlanVersion(input.planId);
  if (!activeVersion) throw new Error("Invalid or inactive plan");

  const now = new Date();
  const durationMs = (input.durationDays || 30) * 24 * 60 * 60 * 1000;
  const graceMs = (input.graceDays || 7) * 24 * 60 * 60 * 1000;

  const expiresAt = new Date(now.getTime() + durationMs);
  const graceEndsAt = new Date(expiresAt.getTime() + graceMs);

  const sub: SchoolSubscription = {
    id: schoolId,
    schoolId,
    planId: input.planId,
    planVersionId: activeVersion.id,
    status: input.status || "ACTIVE",
    billingCycle: input.billingCycle,
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    graceEndsAt: graceEndsAt.toISOString(),
    source: "manual_admin",
    lastPaymentId: null,
    lastOrderId: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  memorySubscriptions.set(schoolId, sub);

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId).set(sub);
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId), sub);
      }
    }
  } catch (e) {}

  await createBillingAuditLog(
    actorId,
    "super_admin",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    schoolId,
    {
      planId: input.planId,
      billingCycle: input.billingCycle,
      status: sub.status,
      expiresAt: sub.expiresAt,
    }
  ).catch(() => {});

  return sub;
}
