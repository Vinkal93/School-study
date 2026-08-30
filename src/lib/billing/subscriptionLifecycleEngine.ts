import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import type { SchoolSubscription, SubscriptionStatus, BillingCycle } from "@/types";
import { BILLING_COLLECTIONS, getActivePlanVersion, getActivePlan } from "./plans";
import {
  getCurrentSubscription,
  recordSubscriptionHistory,
  resolveSubscriptionStatus,
} from "./subscriptionEngine";
import { createBillingAuditLog } from "./audit";

/**
 * Section 6, 7 & 29: Idempotent Subscription Renewal Fulfillment.
 * Preserves remaining period if purchased early (e.g. current expiry 30 Sep + 1 mo = 31 Oct).
 */
export async function renewSubscription(
  schoolId: string,
  input: {
    orderId: string;
    paymentId: string;
    billingCycle?: BillingCycle;
    actorId?: string;
  }
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const db = getFirebaseDb();
  const now = new Date();

  // If no DB connection, return safe mock
  if (!db) {
    const current = await getCurrentSubscription(schoolId);
    return { success: true, subscription: current };
  }

  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);

  const updatedSub = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(subRef);
    let sub: SchoolSubscription;

    if (!snap.exists()) {
      const expiresAt = new Date(now.getTime() + 30 * 86400000);
      sub = {
        id: schoolId,
        schoolId,
        planId: "plan_professional",
        planVersionId: "plan_professional_v1",
        status: "ACTIVE",
        billingCycle: input.billingCycle || "monthly",
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: expiresAt.toISOString(),
        graceEndsAt: new Date(expiresAt.getTime() + 7 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
        renewalStatus: "SUCCESS",
        source: "renewal_payment",
        lastOrderId: input.orderId,
        lastPaymentId: input.paymentId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } else {
      sub = { id: snap.id, ...snap.data() } as SchoolSubscription;

      // Idempotency Check (Section 29): Prevent double extension if same order fulfilled twice
      if (sub.lastOrderId === input.orderId && sub.renewalStatus === "SUCCESS") {
        return sub;
      }
    }

    // Determine current period end
    const cycle = input.billingCycle || sub.billingCycle || "monthly";
    const durationDays = cycle === "annual" ? 365 : 30;
    const durationMs = durationDays * 86400000;

    const currentPeriodEndMs = new Date(sub.currentPeriodEnd || sub.expiresAt || now.toISOString()).getTime();
    let newPeriodStartMs: number;
    let newPeriodEndMs: number;

    // Section 7: If renewed before expiry, preserve existing remaining period
    if (now.getTime() < currentPeriodEndMs) {
      newPeriodStartMs = currentPeriodEndMs;
      newPeriodEndMs = currentPeriodEndMs + durationMs;
    } else {
      // Section 8 & 9: If already expired or in grace, start new period from now
      newPeriodStartMs = now.getTime();
      newPeriodEndMs = now.getTime() + durationMs;
    }

    const graceEndsAtMs = newPeriodEndMs + 7 * 86400000;
    const oldStatus = sub.status;

    sub.status = "ACTIVE";
    sub.billingCycle = cycle;
    sub.currentPeriodStart = new Date(newPeriodStartMs).toISOString();
    sub.currentPeriodEnd = new Date(newPeriodEndMs).toISOString();
    sub.expiresAt = sub.currentPeriodEnd;
    sub.graceEndsAt = new Date(graceEndsAtMs).toISOString();
    sub.renewalStatus = "SUCCESS";
    sub.lastOrderId = input.orderId;
    sub.lastPaymentId = input.paymentId;
    sub.updatedAt = now.toISOString();

    transaction.set(subRef, sub, { merge: true });
    return sub;
  });

  // Record Subscription History
  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "RENEWED",
    newPlanId: updatedSub.planId,
    newPlanVersionId: updatedSub.planVersionId,
    oldStatus: "ACTIVE",
    newStatus: "ACTIVE",
    orderId: input.orderId,
    paymentId: input.paymentId,
    actorId: input.actorId || "system",
    actorRole: "user",
    reason: `Subscription renewed for ${updatedSub.billingCycle} billing cycle.`,
    timestamp: now.toISOString(),
  });

  // Record Audit Log
  await createBillingAuditLog(
    input.actorId || "system",
    "user",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    schoolId,
    { action: "RENEWED", orderId: input.orderId, paymentId: input.paymentId }
  );

  return { success: true, subscription: updatedSub };
}

/**
 * Section 12: Verified Upgrade Processing.
 * Upgrades plan immediately upon verified payment.
 */
export async function upgradeSubscription(
  schoolId: string,
  input: {
    targetPlanId: string;
    orderId: string;
    paymentId: string;
    billingCycle?: BillingCycle;
    actorId?: string;
  }
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const activeVersion = await getActivePlanVersion(input.targetPlanId);
  if (!activeVersion) throw new Error(`Active version for plan '${input.targetPlanId}' not found.`);

  const db = getFirebaseDb();
  const now = new Date();
  const current = await getCurrentSubscription(schoolId);

  const cycle = input.billingCycle || current.billingCycle || "monthly";
  const durationMs = (cycle === "annual" ? 365 : 30) * 86400000;
  const newPeriodEndMs = now.getTime() + durationMs;
  const graceEndsAtMs = newPeriodEndMs + 7 * 86400000;

  const oldPlanId = current.planId;
  const oldPlanVersionId = current.planVersionId;

  const updatedSub: SchoolSubscription = {
    ...current,
    planId: input.targetPlanId,
    planVersionId: activeVersion.id,
    billingCycle: cycle,
    status: "ACTIVE",
    startsAt: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: new Date(newPeriodEndMs).toISOString(),
    expiresAt: new Date(newPeriodEndMs).toISOString(),
    graceEndsAt: new Date(graceEndsAtMs).toISOString(),
    pendingChange: undefined as any, // Clear any pending downgrade
    lastOrderId: input.orderId,
    lastPaymentId: input.paymentId,
    updatedAt: now.toISOString(),
  };

  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, updatedSub, { merge: true });
  }

  // Record History
  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "UPGRADED",
    oldPlanId,
    newPlanId: input.targetPlanId,
    oldPlanVersionId,
    newPlanVersionId: activeVersion.id,
    orderId: input.orderId,
    paymentId: input.paymentId,
    actorId: input.actorId || "user",
    actorRole: "user",
    reason: `Upgraded plan from ${oldPlanId} to ${input.targetPlanId}`,
    timestamp: now.toISOString(),
  });

  // Record Audit Log
  await createBillingAuditLog(
    input.actorId || "user",
    "user",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    schoolId,
    { action: "UPGRADED", targetPlanId: input.targetPlanId, orderId: input.orderId }
  );

  return { success: true, subscription: updatedSub };
}

/**
 * Section 13 & 14: Scheduled Downgrade.
 * Validates usage against new plan limits and schedules downgrade at period end.
 */
export async function scheduleDowngrade(
  schoolId: string,
  input: {
    targetPlanId: string;
    currentStudentCount?: number;
    currentTeacherCount?: number;
    actorId?: string;
  }
): Promise<{ success: boolean; message: string; pendingChange: any }> {
  const targetPlan = await getActivePlan(input.targetPlanId);
  const targetVersion = await getActivePlanVersion(input.targetPlanId);
  if (!targetPlan || !targetVersion) throw new Error("Target downgrade plan not found");

  const currentSub = await getCurrentSubscription(schoolId);

  // Section 13: Limit validation check
  const maxStudentsAllowed = targetPlan.limits.maxStudents;
  if (maxStudentsAllowed > 0 && input.currentStudentCount && input.currentStudentCount > maxStudentsAllowed) {
    throw new Error(
      `Your current usage (${input.currentStudentCount} students) exceeds the target plan limit (${maxStudentsAllowed} students). Please reduce active student accounts before scheduling a downgrade.`
    );
  }

  const now = new Date();
  const pendingChange = {
    type: "DOWNGRADE" as const,
    targetPlanId: input.targetPlanId,
    targetPlanVersionId: targetVersion.id,
    targetPlanName: targetPlan.name,
    effectiveAt: currentSub.currentPeriodEnd || currentSub.expiresAt,
    createdBy: input.actorId || "school_admin",
    createdAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await updateDoc(subRef, {
      pendingChange,
      updatedAt: now.toISOString(),
    });
  }

  // Record History
  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "DOWNGRADE_SCHEDULED",
    oldPlanId: currentSub.planId,
    newPlanId: input.targetPlanId,
    actorId: input.actorId || "school_admin",
    actorRole: "school_admin",
    reason: `Downgrade to ${targetPlan.name} scheduled for ${pendingChange.effectiveAt}`,
    timestamp: now.toISOString(),
  });

  return {
    success: true,
    message: `Downgrade to ${targetPlan.name} scheduled successfully for period end (${new Date(pendingChange.effectiveAt).toLocaleDateString()}).`,
    pendingChange,
  };
}

/**
 * Section 16: Cancel Subscription at Period End.
 */
export async function cancelSubscriptionAtPeriodEnd(
  schoolId: string,
  actorId: string = "school_admin"
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const current = await getCurrentSubscription(schoolId);
  const now = new Date();

  const updatedSub: SchoolSubscription = {
    ...current,
    cancelAtPeriodEnd: true,
    cancelledAt: now.toISOString(),
    cancelledBy: actorId,
    updatedAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, updatedSub, { merge: true });
  }

  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "CANCELLED",
    actorId,
    actorRole: "school_admin",
    reason: "Subscription set to cancel at period end.",
    timestamp: now.toISOString(),
  });

  return { success: true, subscription: updatedSub };
}

/**
 * Section 17: Resume / Reactivate Cancelled Subscription.
 */
export async function resumeSubscription(
  schoolId: string,
  actorId: string = "school_admin"
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const current = await getCurrentSubscription(schoolId);
  const now = new Date();

  const updatedSub: SchoolSubscription = {
    ...current,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    cancelledBy: null,
    updatedAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, updatedSub, { merge: true });
  }

  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "REACTIVATED",
    actorId,
    actorRole: "school_admin",
    reason: "Cancelled subscription resumed by admin.",
    timestamp: now.toISOString(),
  });

  return { success: true, subscription: updatedSub };
}

/**
 * Section 34 & 35: Manual Emergency Suspension (Super Admin Only).
 */
export async function suspendSubscription(
  schoolId: string,
  reason: string,
  actorId: string = "super_admin"
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  if (!reason || reason.trim().length < 3) {
    throw new Error("A valid reason (at least 3 characters) is required for emergency suspension.");
  }

  const current = await getCurrentSubscription(schoolId);
  const now = new Date();

  const updatedSub: SchoolSubscription = {
    ...current,
    status: "SUSPENDED",
    suspendedAt: now.toISOString(),
    suspendedBy: actorId,
    suspensionReason: reason.trim(),
    updatedAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, updatedSub, { merge: true });
  }

  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "SUSPENDED",
    oldStatus: current.status,
    newStatus: "SUSPENDED",
    actorId,
    actorRole: "super_admin",
    reason: reason.trim(),
    timestamp: now.toISOString(),
  });

  await createBillingAuditLog(
    actorId,
    "super_admin",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    schoolId,
    { action: "SUSPENDED", reason: reason.trim() }
  );

  return { success: true, subscription: updatedSub };
}

/**
 * Section 35: Resume Suspended Subscription (Super Admin Only).
 */
export async function resumeSuspendedSubscription(
  schoolId: string,
  actorId: string = "super_admin"
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const current = await getCurrentSubscription(schoolId);
  const now = new Date();

  const updatedSub: SchoolSubscription = {
    ...current,
    status: "ACTIVE",
    suspendedAt: null,
    suspendedBy: null,
    suspensionReason: null,
    updatedAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
    await setDoc(subRef, updatedSub, { merge: true });
  }

  await recordSubscriptionHistory(schoolId, {
    subscriptionId: schoolId,
    schoolId,
    action: "RESUMED",
    oldStatus: "SUSPENDED",
    newStatus: "ACTIVE",
    actorId,
    actorRole: "super_admin",
    reason: "Suspension lifted by Super Admin.",
    timestamp: now.toISOString(),
  });

  return { success: true, subscription: updatedSub };
}
