import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import type {
  SchoolSubscription,
  SubscriptionStatus,
  BillingCycle,
  AccessMode,
  Plan,
  PlanVersion,
} from "@/types";
import { BILLING_COLLECTIONS, getActivePlanVersion, getActivePlan } from "./plans";
import { calculateAccessMode } from "./accessEngine";
import { DEFAULT_GLOBAL_ACCESS_POLICY } from "./accessPolicy";
import { createBillingAuditLog } from "./audit";

export type SubscriptionHistoryAction =
  | "CREATED"
  | "RENEWED"
  | "UPGRADED"
  | "DOWNGRADE_SCHEDULED"
  | "DOWNGRADED"
  | "CANCELLED"
  | "REACTIVATED"
  | "EXPIRED"
  | "SUSPENDED"
  | "RESUMED"
  | "RENEWAL_FAILED";

export interface PendingSubscriptionChange {
  type: "DOWNGRADE" | "PLAN_CHANGE";
  targetPlanId: string;
  targetPlanVersionId: string;
  targetPlanName?: string;
  effectiveAt: string; // ISO String timestamp when current period ends
  createdBy: string;
  createdAt: string;
}

export interface SubscriptionHistoryRecord {
  id: string;
  subscriptionId: string;
  schoolId: string;
  action: SubscriptionHistoryAction;
  oldPlanId?: string;
  newPlanId?: string;
  oldPlanVersionId?: string;
  newPlanVersionId?: string;
  oldStatus?: string;
  newStatus?: string;
  orderId?: string | null;
  paymentId?: string | null;
  actorId: string;
  actorRole: string;
  reason?: string;
  timestamp: string;
}

export interface ResolvedSubscriptionState {
  status: SubscriptionStatus;
  accessMode: AccessMode;
  daysRemaining: number;
  isExpired: boolean;
  isInGrace: boolean;
  isRestricted: boolean;
  cancelAtPeriodEnd: boolean;
  pendingChange: PendingSubscriptionChange | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

/**
 * Single source of truth for resolving subscription lifecycle status.
 */
export function resolveSubscriptionStatus(
  sub: Partial<SchoolSubscription>,
  nowMs: number = Date.now()
): ResolvedSubscriptionState {
  const statusRaw = (sub.status || "ACTIVE").toUpperCase() as SubscriptionStatus;
  const cancelAtPeriodEnd = Boolean(sub.cancelAtPeriodEnd);
  const pendingChange = (sub.pendingChange as PendingSubscriptionChange) || null;

  const currentPeriodStart = sub.currentPeriodStart || sub.startsAt || new Date(nowMs).toISOString();
  const currentPeriodEnd = sub.currentPeriodEnd || sub.expiresAt || new Date(nowMs + 30 * 86400000).toISOString();
  const graceEndsAtIso = sub.graceEndsAt || new Date(new Date(currentPeriodEnd).getTime() + 7 * 86400000).toISOString();

  const periodEndMs = new Date(currentPeriodEnd).getTime();
  const graceEndMs = new Date(graceEndsAtIso).getTime();

  let resolvedStatus: SubscriptionStatus = statusRaw;
  let isExpired = false;
  let isInGrace = false;
  let isRestricted = false;

  // Evaluate temporal state if not suspended/cancelled
  if (statusRaw !== "SUSPENDED") {
    if (nowMs < periodEndMs) {
      const daysLeft = Math.ceil((periodEndMs - nowMs) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        resolvedStatus = "EXPIRING";
      } else {
        resolvedStatus = statusRaw === "TRIAL" ? "TRIAL" : "ACTIVE";
      }
    } else if (nowMs >= periodEndMs && nowMs < graceEndMs) {
      resolvedStatus = "GRACE_PERIOD";
      isInGrace = true;
    } else {
      resolvedStatus = "EXPIRED";
      isExpired = true;
    }
  }

  const daysRemaining = Math.max(0, Math.ceil((periodEndMs - nowMs) / (1000 * 60 * 60 * 24)));

  // Resolve access policy using Phase 3 access control
  const mockSchoolPolicy = {
    schoolId: sub.schoolId || "default",
    status: resolvedStatus,
    accessMode: (resolvedStatus === "SUSPENDED" ? "NO_ACCESS" : "FULL_ACCESS") as AccessMode,
    graceDaysRemaining: isInGrace ? Math.max(0, Math.ceil((graceEndMs - nowMs) / (1000 * 60 * 60 * 24))) : 0,
    features: [],
    limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
    updatedAt: new Date(nowMs).toISOString(),
  };

  const accessMode = calculateAccessMode(sub as any, DEFAULT_GLOBAL_ACCESS_POLICY, nowMs);
  if (accessMode === "RESTRICTED_ACCESS") isRestricted = true;

  return {
    status: resolvedStatus,
    accessMode,
    daysRemaining,
    isExpired,
    isInGrace,
    isRestricted,
    cancelAtPeriodEnd,
    pendingChange,
    currentPeriodStart,
    currentPeriodEnd,
  };
}

/**
 * Single source of truth to retrieve the current active subscription for a school.
 */
export async function getCurrentSubscription(schoolId: string): Promise<SchoolSubscription> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 86400000);
  const graceEndsAt = new Date(expiresAt.getTime() + 7 * 86400000);

  if (!schoolId) {
    return {
      id: "school_default",
      schoolId: "school_default",
      planId: "plan_starter",
      planVersionId: "plan_starter_v1",
      status: "ACTIVE",
      billingCycle: "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      cancelAtPeriodEnd: false,
      renewalStatus: "NONE",
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const g = globalThis as any;
  if (g.__BILLING_SUBSCRIPTIONS_MAP__ && g.__BILLING_SUBSCRIPTIONS_MAP__.has(schoolId)) {
    const cached = g.__BILLING_SUBSCRIPTIONS_MAP__.get(schoolId);
    if (cached && cached.planId) return cached;
  }

  try {
    let subData: any = null;
    let schoolData: any = null;

    // 1. Try server-side Admin SDK if running in Node.js
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
        // Fallback to client SDK
      }
    }

    // 2. Fallback to Client SDK
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
          // Client SDK notice
        }
      }
    }

    // Normalize plan ID from schoolSubscriptions or schools collection
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

      // Check if scheduled pending downgrade has reached its effective date
      if (sub.pendingChange && new Date(sub.pendingChange.effectiveAt).getTime() <= Date.now()) {
        try {
          const pending = sub.pendingChange;
          sub.planId = pending.targetPlanId;
          sub.planVersionId = pending.targetPlanVersionId;
          sub.pendingChange = undefined as any;
          const db = getFirebaseDb();
          if (db) {
            updateDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId), {
              planId: pending.targetPlanId,
              planVersionId: pending.targetPlanVersionId,
              pendingChange: null,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        } catch (e) {}
      }

      const resolved = resolveSubscriptionStatus(sub);
      if (resolved.status !== sub.status) {
        sub.status = resolved.status;
      }

      if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map();
      g.__BILLING_SUBSCRIPTIONS_MAP__.set(schoolId, sub);
      return sub;
    }

    // Persist default subscription if doc doesn't exist, adopting school's assigned plan
    const newDefaultSub: SchoolSubscription = {
      id: schoolId,
      schoolId,
      planId: normalizedPlan,
      planVersionId: `${normalizedPlan}_v1`,
      status: schoolData?.subscriptionStatus || "ACTIVE",
      billingCycle: schoolData?.billingCycle || "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      cancelAtPeriodEnd: false,
      renewalStatus: "NONE",
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const db = getFirebaseDb();
    if (db) {
      setDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId), newDefaultSub).catch(() => {});
    }

    if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map();
    g.__BILLING_SUBSCRIPTIONS_MAP__.set(schoolId, newDefaultSub);
    return newDefaultSub;
  } catch (error) {
    return {
      id: schoolId,
      schoolId,
      planId: "plan_starter",
      planVersionId: "plan_starter_v1",
      status: "ACTIVE",
      billingCycle: "monthly",
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: expiresAt.toISOString(),
      graceEndsAt: graceEndsAt.toISOString(),
      cancelAtPeriodEnd: false,
      renewalStatus: "NONE",
      source: "system_trial",
      lastPaymentId: null,
      lastOrderId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }
}

/**
 * Writes an immutable history record under subscriptions/{subscriptionId}/history/{historyId}
 */
export async function recordSubscriptionHistory(
  subscriptionId: string,
  record: Omit<SubscriptionHistoryRecord, "id">
): Promise<string> {
  const db = getFirebaseDb();
  const id = `his_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullRecord: SubscriptionHistoryRecord = {
    id,
    subscriptionId: record.subscriptionId || subscriptionId,
    schoolId: record.schoolId || subscriptionId,
    action: record.action,
    oldPlanId: record.oldPlanId,
    newPlanId: record.newPlanId,
    oldPlanVersionId: record.oldPlanVersionId,
    newPlanVersionId: record.newPlanVersionId,
    oldStatus: record.oldStatus,
    newStatus: record.newStatus,
    orderId: record.orderId,
    paymentId: record.paymentId,
    actorId: record.actorId,
    actorRole: record.actorRole,
    reason: record.reason,
    timestamp: record.timestamp || new Date().toISOString(),
  };

  if (db) {
    try {
      const ref = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, subscriptionId, "history", id);
      await setDoc(ref, fullRecord);
    } catch (err) {
      console.warn("Notice: Failed to record subscription history entry:", err);
    }
  }

  return id;
}

/**
 * Fetches subscription history records ordered by timestamp descending.
 */
export async function getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistoryRecord[]> {
  const db = getFirebaseDb();
  const history: SubscriptionHistoryRecord[] = [];
  if (!db) return history;

  try {
    const q = query(
      collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, subscriptionId, "history"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      history.push({ id: d.id, ...d.data() } as SubscriptionHistoryRecord);
    });
  } catch (e) {
    console.warn("Notice: Fetch subscription history notice:", e);
  }

  return history;
}
