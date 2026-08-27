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

  const defaultSub: SchoolSubscription = {
    id: schoolId,
    schoolId,
    planId: "plan_professional",
    planVersionId: "plan_professional_v1",
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

  try {
    const db = getFirebaseDb();
    if (!db) return defaultSub;

    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    const snap = await getDoc(subRef);

    if (snap.exists()) {
      const sub = { id: snap.id, ...snap.data() } as SchoolSubscription;
      const computedStatus = computeSubscriptionStatus(sub.expiresAt, sub.graceEndsAt, sub.status);

      if (computedStatus !== sub.status) {
        updateDoc(subRef, { status: computedStatus, updatedAt: new Date().toISOString() }).catch(() => {});
        sub.status = computedStatus;
      }
      return sub;
    }

    setDoc(subRef, defaultSub).catch(() => {});
    return defaultSub;
  } catch (error) {
    return defaultSub;
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
  const db = getFirebaseDb();
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

  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
  await setDoc(subRef, sub);

  await createBillingAuditLog(
    actorId,
    "super_admin",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    schoolId,
    { planId: input.planId, billingCycle: input.billingCycle, status: sub.status }
  );

  return sub;
}
