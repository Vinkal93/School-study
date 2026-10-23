import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { SchoolSubscription, SubscriptionStatus, BillingCycle } from "@/types";
import { BILLING_COLLECTIONS, getActivePlanVersion, normalizePlanId } from "./plans";
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
 * Updates in-memory subscription cache directly with authoritative data.
 */
export function updateInMemorySubscription(sub: Partial<SchoolSubscription> & { schoolId: string }): void {
  const existing = memorySubscriptions.get(sub.schoolId) || {};
  const merged = { ...existing, ...sub } as SchoolSubscription;
  memorySubscriptions.set(sub.schoolId, merged);
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

  const now = nowMs ?? Date.now();
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
  if (!schoolId || schoolId === "system") throw new Error("A valid school is required.");
  const cached = memorySubscriptions.get(schoolId);
  if (cached && typeof window !== "undefined") return { ...cached, status: computeSubscriptionStatus(cached.expiresAt, cached.graceEndsAt, cached.status) };
  let subData: any = null, schoolData: any = null;
  if (typeof window === "undefined") {
    const { getSafeAdminDb } = await import("@/lib/firebase/admin");
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const [sub, school] = await Promise.all([adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(schoolId).get(), adminDb.collection("schools").doc(schoolId).get()]);
      subData = sub.exists ? sub.data() : null;
      schoolData = school.exists ? school.data() : null;
    }
  }
  if (!subData && !schoolData) {
    const db = getFirebaseDb();
    if (!db) throw new Error("Subscription database unavailable.");
    const [sub, school] = await Promise.all([getDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId)), getDoc(doc(db, "schools", schoolId))]);
    subData = sub.exists() ? sub.data() : null;
    schoolData = school.exists() ? school.data() : null;
  }
  if (!subData && !schoolData) throw new Error("School subscription was not found.");
  const epoch = new Date(0).toISOString();

  const toIso = (value: any, fallback: string) => {
    const date = value?.toDate ? value.toDate() : new Date(value || fallback);
    return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
  };

  const planId = normalizePlanId(subData?.planId || schoolData?.planId || schoolData?.plan || "plan_base");
  // Legacy trials are anchored to school creation, never restarted on every read.
  const startsAt = toIso(subData?.startsAt || schoolData?.subscriptionStartsAt || schoolData?.createdAt, epoch);
  const legacyEnd = new Date(Date.parse(startsAt) + 30 * 86400000).toISOString();
  const expiresAt = toIso(subData?.expiresAt || schoolData?.subscriptionExpiresAt, legacyEnd);
  const graceEndsAt = toIso(subData?.graceEndsAt, new Date(Date.parse(expiresAt) + 7 * 86400000).toISOString());
  const sub = {
    ...(subData || {}), id: schoolId, schoolId, planId,
    planVersionId: subData?.planVersionId || `${planId}_v1`,
    status: computeSubscriptionStatus(expiresAt, graceEndsAt, subData?.status || schoolData?.subscriptionStatus),
    billingCycle: subData?.billingCycle || schoolData?.billingCycle || "monthly",
    startsAt, expiresAt, graceEndsAt,
    source: subData?.source || "manual_admin", lastPaymentId: subData?.lastPaymentId || null,
    lastOrderId: subData?.lastOrderId || null, createdAt: subData?.createdAt || startsAt,
    updatedAt: subData?.updatedAt || startsAt,
  } as SchoolSubscription;
  memorySubscriptions.set(schoolId, sub);
  return sub;
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
  const durationMs = (input.durationDays ?? (input.billingCycle === "annual" ? 365 : 30)) * 24 * 60 * 60 * 1000;
  const graceMs = (input.graceDays ?? 7) * 24 * 60 * 60 * 1000;

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

  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable; subscription was not saved.");
  await setDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId), sub);
  memorySubscriptions.set(schoolId, sub);

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
