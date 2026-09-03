import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import type {
  SchoolSubscription,
  SubscriptionAdjustmentRecord,
  SubscriptionAdjustmentType,
  AccessOverrideRecord,
  LimitOverrideRecord,
  PenaltyRecord,
  FinancialAdjustmentRecord,
  BillingAuditAction,
} from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { getCurrentSubscription } from "./subscriptionEngine";
import { computeSubscriptionStatus } from "./subscriptions";
import { calculateAccessMode } from "./accessEngine";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { createBillingAuditLog } from "./audit";

// ==========================================
// 1. Calendar-Aware Date Arithmetic
// ==========================================

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function removeDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Calendar-aware month addition handling end-of-month boundaries safely.
 * (e.g. 31 Jan + 1 month -> 28/29 Feb, 31 Mar + 1 month -> 30 Apr)
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const expectedDay = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);

  // If day rolled over into next month (e.g. Jan 31 -> Mar 3), clamp to last day of target month
  if (result.getUTCDate() !== expectedDay) {
    result.setUTCDate(0); // Sets to last day of previous month
  }
  return result;
}

export function removeMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
}

// ==========================================
// 2. Transactional Subscription Adjustment
// ==========================================

export interface AdjustSubscriptionPeriodInput {
  type: SubscriptionAdjustmentType;
  value?: number;
  customDate?: string;
  reason: string;
  actorId: string;
  actorRole?: string;
  requestId?: string;
}

export async function adjustSubscriptionPeriod(
  schoolId: string,
  input: {
    type: SubscriptionAdjustmentType;
    value?: number;
    customDate?: string;
    reason: string;
    actorId: string;
    actorRole?: string;
    requestId?: string;
  }
): Promise<{ success: boolean; subscription: SchoolSubscription; adjustment: SubscriptionAdjustmentRecord }> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason (at least 3 characters) is required for subscription adjustments.");
  }

  const db = getFirebaseDb();
  const now = new Date();
  const actorRole = input.actorRole || "super_admin";

  // In-memory fallback if DB unavailable (e.g. initial test run)
  if (!db) {
    const current = await getCurrentSubscription(schoolId);
    const oldExpiresAt = new Date(current.expiresAt);
    let newExpiresAt = new Date(oldExpiresAt.getTime());

    if (input.type === "ADD_DAYS" && input.value) {
      newExpiresAt = addDays(oldExpiresAt, input.value);
    } else if (input.type === "REMOVE_DAYS" && input.value) {
      newExpiresAt = removeDays(oldExpiresAt, input.value);
    } else if (input.type === "ADD_MONTHS" && input.value) {
      newExpiresAt = addMonths(oldExpiresAt, input.value);
    } else if (input.type === "REMOVE_MONTHS" && input.value) {
      newExpiresAt = removeMonths(oldExpiresAt, input.value);
    } else if (input.type === "CUSTOM_PERIOD_ADJUSTMENT" && input.customDate) {
      newExpiresAt = new Date(input.customDate);
    }

    const adjustment: SubscriptionAdjustmentRecord = {
      id: `adj_${Date.now()}`,
      schoolId,
      subscriptionId: current.id,
      type: input.type,
      value: input.value,
      unit: input.type.includes("MONTH") ? "months" : input.type.includes("DAY") ? "days" : "date",
      previousEndAt: current.expiresAt,
      newEndAt: newExpiresAt.toISOString(),
      reason: input.reason,
      actorId: input.actorId,
      actorRole,
      status: "APPLIED",
      createdAt: now.toISOString(),
    };

    current.expiresAt = newExpiresAt.toISOString();
    current.currentPeriodEnd = newExpiresAt.toISOString();
    current.graceEndsAt = addDays(newExpiresAt, 7).toISOString();
    return { success: true, subscription: current, adjustment };
  }

  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
  const adjCol = collection(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS);

  // Execute safe atomic server transaction
  const result = await runTransaction(db, async (transaction) => {
    // Idempotency check if requestId is provided
    if (input.requestId) {
      const existingAdjRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS, input.requestId);
      const existingSnap = await transaction.get(existingAdjRef);
      if (existingSnap.exists()) {
        const snapSub = await transaction.get(subRef);
        const subData = snapSub.data() as SchoolSubscription;
        return {
          subscription: subData,
          adjustment: existingSnap.data() as SubscriptionAdjustmentRecord,
        };
      }
    }

    const subSnap = await transaction.get(subRef);
    if (!subSnap.exists()) {
      throw new Error(`School subscription for school "${schoolId}" was not found.`);
    }

    const sub = { id: subSnap.id, ...subSnap.data() } as SchoolSubscription;
    const oldExpiresAt = new Date(sub.expiresAt || sub.currentPeriodEnd || now.toISOString());
    let newExpiresAt: Date;

    switch (input.type) {
      case "ADD_DAYS":
        if (!input.value || input.value <= 0) throw new Error("Days to add must be greater than 0.");
        newExpiresAt = addDays(oldExpiresAt, input.value);
        break;
      case "REMOVE_DAYS":
        if (!input.value || input.value <= 0) throw new Error("Days to remove must be greater than 0.");
        newExpiresAt = removeDays(oldExpiresAt, input.value);
        break;
      case "ADD_MONTHS":
        if (!input.value || input.value <= 0) throw new Error("Months to add must be greater than 0.");
        newExpiresAt = addMonths(oldExpiresAt, input.value);
        break;
      case "REMOVE_MONTHS":
        if (!input.value || input.value <= 0) throw new Error("Months to remove must be greater than 0.");
        newExpiresAt = removeMonths(oldExpiresAt, input.value);
        break;
      case "CUSTOM_PERIOD_ADJUSTMENT":
        if (!input.customDate) throw new Error("A valid target end date is required for custom adjustments.");
        newExpiresAt = new Date(input.customDate);
        if (isNaN(newExpiresAt.getTime())) throw new Error("Invalid custom date format provided.");
        break;
      default:
        throw new Error(`Unsupported adjustment type: ${input.type}`);
    }

    // Validation: Expiry cannot be before subscription start
    const startsAtMs = new Date(sub.startsAt || now.toISOString()).getTime();
    if (newExpiresAt.getTime() < startsAtMs) {
      throw new Error(
        `Invalid Adjustment: New expiration date (${newExpiresAt.toISOString().split("T")[0]}) cannot be earlier than subscription start date (${new Date(startsAtMs).toISOString().split("T")[0]}).`
      );
    }

    const newGraceEndsAt = addDays(newExpiresAt, 7);
    const prevExpiresAtStr = sub.expiresAt;
    const newExpiresAtStr = newExpiresAt.toISOString();

    // Recalculate true status dynamically
    const newStatus = computeSubscriptionStatus(
      newExpiresAtStr,
      newGraceEndsAt.toISOString(),
      sub.status,
      now.getTime()
    );

    sub.expiresAt = newExpiresAtStr;
    sub.currentPeriodEnd = newExpiresAtStr;
    sub.graceEndsAt = newGraceEndsAt.toISOString();
    sub.status = newStatus;
    sub.updatedAt = now.toISOString();

    const adjId = input.requestId || `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const adjustmentRecord: SubscriptionAdjustmentRecord = {
      id: adjId,
      schoolId,
      subscriptionId: sub.id,
      type: input.type,
      value: input.value,
      unit: input.type.includes("MONTH") ? "months" : input.type.includes("DAY") ? "days" : "date",
      previousStartAt: sub.currentPeriodStart || sub.startsAt,
      previousEndAt: prevExpiresAtStr,
      newStartAt: sub.currentPeriodStart || sub.startsAt,
      newEndAt: newExpiresAtStr,
      reason: input.reason.trim(),
      actorId: input.actorId,
      actorRole,
      status: "APPLIED",
      createdAt: now.toISOString(),
      metadata: {
        previousStatus: subSnap.data().status,
        newStatus,
      },
    };

    const adjRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS, adjId);
    transaction.set(adjRef, adjustmentRecord);
    transaction.update(subRef, {
      expiresAt: sub.expiresAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      graceEndsAt: sub.graceEndsAt,
      status: sub.status,
      updatedAt: sub.updatedAt,
    });

    return { subscription: sub, adjustment: adjustmentRecord };
  });

  // Create audit log event
  let auditAction: BillingAuditAction = "SUBSCRIPTION_PERIOD_EXTENDED";
  if (input.type === "REMOVE_DAYS" || input.type === "REMOVE_MONTHS") {
    auditAction = "SUBSCRIPTION_PERIOD_REDUCED";
  } else if (input.type === "CUSTOM_PERIOD_ADJUSTMENT") {
    auditAction = "CUSTOM_PERIOD_ADJUSTED";
  }

  await createBillingAuditLog({
    actorId: input.actorId,
    actorRole,
    action: auditAction,
    targetType: "schoolSubscription",
    targetId: schoolId,
    metadata: {
      adjustmentId: result.adjustment.id,
      type: input.type,
      value: input.value,
      previousEndAt: result.adjustment.previousEndAt,
      newEndAt: result.adjustment.newEndAt,
      reason: input.reason,
    },
  });

  return { success: true, ...result };
}

// ==========================================
// 3. Account Suspension & Resumption
// ==========================================

export async function suspendAccountSubscription(
  schoolId: string,
  input: { reason: string; actorId: string; actorRole?: string }
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason is required to suspend an account.");
  }

  const db = getFirebaseDb();
  const now = new Date();
  const actorRole = input.actorRole || "super_admin";

  if (!db) {
    const current = await getCurrentSubscription(schoolId);
    current.status = "SUSPENDED";
    current.suspendedAt = now.toISOString();
    current.suspendedBy = input.actorId;
    current.suspensionReason = input.reason;
    return { success: true, subscription: current };
  }

  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
  const snap = await getDoc(subRef);
  if (!snap.exists()) throw new Error(`Subscription not found for school "${schoolId}".`);

  const sub = { id: snap.id, ...snap.data() } as SchoolSubscription;
  sub.status = "SUSPENDED";
  sub.suspendedAt = now.toISOString();
  sub.suspendedBy = input.actorId;
  sub.suspensionReason = input.reason;
  sub.updatedAt = now.toISOString();

  await updateDoc(subRef, {
    status: "SUSPENDED",
    suspendedAt: sub.suspendedAt,
    suspendedBy: sub.suspendedBy,
    suspensionReason: sub.suspensionReason,
    updatedAt: sub.updatedAt,
  });

  const adjId = `adj_susp_${Date.now()}`;
  const adjRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS, adjId);
  await setDoc(adjRef, {
    id: adjId,
    schoolId,
    subscriptionId: sub.id,
    type: "SUSPENSION",
    reason: input.reason,
    actorId: input.actorId,
    actorRole,
    status: "APPLIED",
    createdAt: now.toISOString(),
  });

  await createBillingAuditLog({
    actorId: input.actorId,
    actorRole,
    action: "SUBSCRIPTION_SUSPENDED",
    targetType: "schoolSubscription",
    targetId: schoolId,
    metadata: { reason: input.reason },
  });

  return { success: true, subscription: sub };
}

export async function resumeAccountSubscription(
  schoolId: string,
  input: { reason: string; actorId: string; actorRole?: string }
): Promise<{ success: boolean; subscription: SchoolSubscription }> {
  const db = getFirebaseDb();
  const now = new Date();
  const actorRole = input.actorRole || "super_admin";

  if (!db) {
    const current = await getCurrentSubscription(schoolId);
    const trueStatus = computeSubscriptionStatus(current.expiresAt, current.graceEndsAt, "ACTIVE", now.getTime());
    current.status = trueStatus;
    current.suspendedAt = null;
    current.suspendedBy = null;
    current.suspensionReason = null;
    return { success: true, subscription: current };
  }

  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
  const snap = await getDoc(subRef);
  if (!snap.exists()) throw new Error(`Subscription not found for school "${schoolId}".`);

  const sub = { id: snap.id, ...snap.data() } as SchoolSubscription;
  const trueStatus = computeSubscriptionStatus(sub.expiresAt, sub.graceEndsAt, "ACTIVE", now.getTime());

  sub.status = trueStatus;
  sub.suspendedAt = null;
  sub.suspendedBy = null;
  sub.suspensionReason = null;
  sub.updatedAt = now.toISOString();

  await updateDoc(subRef, {
    status: trueStatus,
    suspendedAt: null,
    suspendedBy: null,
    suspensionReason: null,
    updatedAt: sub.updatedAt,
  });

  const adjId = `adj_res_${Date.now()}`;
  const adjRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_ADJUSTMENTS, adjId);
  await setDoc(adjRef, {
    id: adjId,
    schoolId,
    subscriptionId: sub.id,
    type: "RESTORE_ACCESS",
    reason: input.reason || "Suspension removed by Super Admin.",
    actorId: input.actorId,
    actorRole,
    status: "APPLIED",
    createdAt: now.toISOString(),
  });

  await createBillingAuditLog({
    actorId: input.actorId,
    actorRole,
    action: "SUBSCRIPTION_RESUMED",
    targetType: "schoolSubscription",
    targetId: schoolId,
    metadata: { resolvedStatus: trueStatus, reason: input.reason },
  });

  return { success: true, subscription: sub };
}

// ==========================================
// 4. Access Overrides (Feature / Temporary Access)
// ==========================================

export async function createAccessOverride(
  schoolId: string,
  input: {
    type: "FEATURE_GRANT" | "FEATURE_RESTRICT" | "TEMPORARY_ACCESS";
    featureKey?: string;
    durationHours?: number;
    durationDays?: number;
    customEndAt?: string;
    reason: string;
    createdBy: string;
  }
): Promise<{ success: boolean; override: AccessOverrideRecord }> {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason is required for creating an access override.");
  }

  const now = new Date();
  let endAt: Date;

  if (input.customEndAt) {
    endAt = new Date(input.customEndAt);
  } else if (input.durationHours) {
    endAt = new Date(now.getTime() + input.durationHours * 3600000);
  } else if (input.durationDays) {
    endAt = addDays(now, input.durationDays);
  } else {
    endAt = addDays(now, 2); // default 48h
  }

  const overrideId = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const override: AccessOverrideRecord = {
    id: overrideId,
    schoolId,
    type: input.type,
    featureKey: input.featureKey,
    enabled: input.type !== "FEATURE_RESTRICT",
    startAt: now.toISOString(),
    endAt: endAt.toISOString(),
    reason: input.reason.trim(),
    createdBy: input.createdBy,
    status: "ACTIVE",
    createdAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES, overrideId);
    await setDoc(docRef, override);
  }

  let auditAction: BillingAuditAction = "TEMP_ACCESS_GRANTED";
  if (input.type === "FEATURE_GRANT") auditAction = "FEATURE_ACCESS_GRANTED";
  if (input.type === "FEATURE_RESTRICT") auditAction = "FEATURE_ACCESS_RESTRICTED";

  await createBillingAuditLog({
    actorId: input.createdBy,
    actorRole: "super_admin",
    action: auditAction,
    targetType: "override",
    targetId: overrideId,
    metadata: { schoolId, featureKey: input.featureKey, endAt: override.endAt, reason: input.reason },
  });

  return { success: true, override };
}

export async function revokeAccessOverride(
  overrideId: string,
  schoolId: string,
  actorId: string
): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES, overrideId);
    await updateDoc(docRef, { status: "REVOKED", updatedAt: new Date().toISOString() });
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "super_admin",
    action: "FEATURE_ACCESS_RESTORED",
    targetType: "override",
    targetId: overrideId,
    metadata: { schoolId },
  });

  return { success: true };
}

export async function getActiveAccessOverrides(schoolId: string): Promise<AccessOverrideRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const now = new Date().toISOString();
    const q = query(
      collection(db, BILLING_COLLECTIONS.ACCESS_OVERRIDES),
      where("schoolId", "==", schoolId)
    );

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessOverrideRecord));

    // Filter active and non-expired overrides in memory
    return list.filter((ovr) => ovr.status === "ACTIVE" && ovr.endAt > now);
  } catch (err) {
    console.warn("[SubscriptionAdjustmentEngine] Notice: getActiveAccessOverrides fallback:", err);
    return [];
  }
}

// ==========================================
// 5. Limit Overrides (Custom Resource Limits)
// ==========================================

export async function createLimitOverride(
  schoolId: string,
  input: {
    limitKey: "students" | "teachers" | "classes" | "staff";
    overrideValue: number;
    durationDays: number;
    reason: string;
    createdBy: string;
  }
): Promise<{ success: boolean; override: LimitOverrideRecord }> {
  if (input.overrideValue <= 0 && input.overrideValue !== -1) {
    throw new Error("Limit override value must be greater than 0 or -1 (unlimited).");
  }
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason is required for setting a resource limit override.");
  }

  const now = new Date();
  const endAt = addDays(now, input.durationDays || 30);
  const overrideId = `lim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const override: LimitOverrideRecord = {
    id: overrideId,
    schoolId,
    limitKey: input.limitKey,
    overrideValue: input.overrideValue,
    startAt: now.toISOString(),
    endAt: endAt.toISOString(),
    reason: input.reason.trim(),
    createdBy: input.createdBy,
    status: "ACTIVE",
    createdAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.LIMIT_OVERRIDES, overrideId);
    await setDoc(docRef, override);
  }

  await createBillingAuditLog({
    actorId: input.createdBy,
    actorRole: "super_admin",
    action: "LIMIT_OVERRIDE_CREATED",
    targetType: "override",
    targetId: overrideId,
    metadata: { schoolId, limitKey: input.limitKey, overrideValue: input.overrideValue, endAt: override.endAt, reason: input.reason },
  });

  return { success: true, override };
}

export async function revokeLimitOverride(
  overrideId: string,
  schoolId: string,
  actorId: string
): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.LIMIT_OVERRIDES, overrideId);
    await updateDoc(docRef, { status: "REVOKED", updatedAt: new Date().toISOString() });
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "super_admin",
    action: "LIMIT_OVERRIDE_REVOKED",
    targetType: "override",
    targetId: overrideId,
    metadata: { schoolId },
  });

  return { success: true };
}

export async function getActiveLimitOverrides(schoolId: string): Promise<LimitOverrideRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const now = new Date().toISOString();
    const q = query(
      collection(db, BILLING_COLLECTIONS.LIMIT_OVERRIDES),
      where("schoolId", "==", schoolId)
    );

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LimitOverrideRecord));
    return list.filter((lim) => lim.status === "ACTIVE" && lim.endAt > now);
  } catch (err) {
    console.warn("[SubscriptionAdjustmentEngine] Notice: getActiveLimitOverrides fallback:", err);
    return [];
  }
}

// ==========================================
// 6. Penalties & Manual Financial Credits
// ==========================================

export async function applyPenalty(
  schoolId: string,
  input: {
    amountPaise: number;
    currency?: string;
    reason: string;
    dueDays?: number;
    createdBy: string;
  }
): Promise<{ success: boolean; penalty: PenaltyRecord }> {
  if (input.amountPaise <= 0) {
    throw new Error("Penalty amount must be greater than 0 paise.");
  }
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason is required for creating a penalty.");
  }

  const now = new Date();
  const dueDate = addDays(now, input.dueDays || 14);
  const penaltyId = `pen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const penalty: PenaltyRecord = {
    id: penaltyId,
    schoolId,
    amount: input.amountPaise,
    currency: input.currency || "INR",
    reason: input.reason.trim(),
    dueDate: dueDate.toISOString(),
    status: "PENDING",
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.PENALTIES, penaltyId);
    await setDoc(docRef, penalty);

    // Also record financial event
    const finRef = doc(db, BILLING_COLLECTIONS.FINANCIAL_ADJUSTMENTS, penaltyId);
    await setDoc(finRef, {
      id: penaltyId,
      schoolId,
      type: "PENALTY",
      amount: input.amountPaise,
      currency: input.currency || "INR",
      reason: input.reason.trim(),
      actorId: input.createdBy,
      reference: penaltyId,
      createdAt: now.toISOString(),
    });
  }

  await createBillingAuditLog({
    actorId: input.createdBy,
    actorRole: "super_admin",
    action: "PENALTY_CREATED",
    targetType: "penalty",
    targetId: penaltyId,
    metadata: { schoolId, amount: input.amountPaise, reason: input.reason },
  });

  return { success: true, penalty };
}

export async function waivePenalty(
  penaltyId: string,
  schoolId: string,
  reason: string,
  actorId: string
): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.PENALTIES, penaltyId);
    await updateDoc(docRef, {
      status: "WAIVED",
      waivedReason: reason,
      waivedBy: actorId,
      updatedAt: new Date().toISOString(),
    });
  }

  await createBillingAuditLog({
    actorId,
    actorRole: "super_admin",
    action: "PENALTY_WAIVED",
    targetType: "penalty",
    targetId: penaltyId,
    metadata: { schoolId, reason },
  });

  return { success: true };
}

export async function applyManualCredit(
  schoolId: string,
  input: {
    amountPaise: number;
    currency?: string;
    reason: string;
    actorId: string;
    reference?: string;
  }
): Promise<{ success: boolean; credit: FinancialAdjustmentRecord }> {
  if (input.amountPaise <= 0) {
    throw new Error("Credit amount must be greater than 0 paise.");
  }
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error("A valid reason is required for applying manual credit.");
  }

  const now = new Date();
  const creditId = `crd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const credit: FinancialAdjustmentRecord = {
    id: creditId,
    schoolId,
    type: "MANUAL_CREDIT",
    amount: input.amountPaise,
    currency: input.currency || "INR",
    reason: input.reason.trim(),
    actorId: input.actorId,
    reference: input.reference || `CREDIT-${Date.now()}`,
    createdAt: now.toISOString(),
  };

  const db = getFirebaseDb();
  if (db) {
    const docRef = doc(db, BILLING_COLLECTIONS.FINANCIAL_ADJUSTMENTS, creditId);
    await setDoc(docRef, credit);
  }

  await createBillingAuditLog({
    actorId: input.actorId,
    actorRole: "super_admin",
    action: "MANUAL_CREDIT_CREATED",
    targetType: "financeReport",
    targetId: creditId,
    metadata: { schoolId, amount: input.amountPaise, reason: input.reason },
  });

  return { success: true, credit };
}
