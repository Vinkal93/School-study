import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  Plan,
  SchoolSubscription,
  GlobalAccessPolicy,
  AccessMode,
  SchoolAccessSummary,
} from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { getSchoolSubscription, computeSubscriptionStatus } from "./subscriptions";
import { getGlobalAccessPolicy } from "./accessPolicy";

/**
 * Calculates current AccessMode dynamically from subscription state, expiration dates, and global access policy.
 */
export function calculateAccessMode(
  subscription: SchoolSubscription,
  policy: GlobalAccessPolicy,
  nowMs?: number
): AccessMode {
  if (subscription.status === "SUSPENDED" || subscription.status === "CANCELLED") {
    return "NO_ACCESS";
  }

  const now = nowMs || Date.now();
  const expiresAtMs = new Date(subscription.expiresAt).getTime();
  const graceEndsAtMs = new Date(subscription.graceEndsAt).getTime();
  const daysRemaining = Math.max(0, Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)));

  const effectiveThreshold =
    typeof policy.renewalNoticeThresholdDays === "number"
      ? policy.renewalNoticeThresholdDays
      : policy.reminderDays && policy.reminderDays.length > 0
      ? Math.max(...policy.reminderDays)
      : 7;

  if (now < expiresAtMs) {
    const isReminderWindow = daysRemaining <= effectiveThreshold;
    return isReminderWindow ? "EXPIRING" : "FULL_ACCESS";
  }

  if (now >= expiresAtMs && now < graceEndsAtMs) {
    return "GRACE_ACCESS";
  }

  return policy.expiredAccessMode || "RESTRICTED_ACCESS";
}

/**
 * Section 13: Centralized Subscription & Expiry Calculation Engine.
 * Calculates exact daysRemaining, graceRemaining, status, accessMode, and reminderRequired
 * using trusted server/backend time.
 */
export function calculateSubscriptionState(
  subscription: SchoolSubscription,
  policy: GlobalAccessPolicy,
  nowMs?: number
) {
  const now = nowMs || Date.now();
  const expiresAtMs = new Date(subscription.expiresAt).getTime();
  const graceEndsAtMs = new Date(subscription.graceEndsAt).getTime();

  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24))
  );
  const graceRemaining = Math.max(
    0,
    Math.ceil((graceEndsAtMs - now) / (1000 * 60 * 60 * 24))
  );

  const status = computeSubscriptionStatus(
    subscription.expiresAt,
    subscription.graceEndsAt,
    subscription.status,
    now
  );

  const accessMode = calculateAccessMode(subscription, policy, now);

  const effectiveThreshold =
    typeof policy.renewalNoticeThresholdDays === "number"
      ? policy.renewalNoticeThresholdDays
      : policy.reminderDays && policy.reminderDays.length > 0
      ? Math.max(...policy.reminderDays)
      : 7;

  const reminderRequired =
    now < expiresAtMs && daysRemaining <= effectiveThreshold;

  return {
    daysRemaining,
    graceRemaining,
    status,
    accessMode,
    reminderRequired,
    isExpired: now >= expiresAtMs,
    isInGrace: now >= expiresAtMs && now < graceEndsAtMs,
  };
}

/**
 * Reusable server-side function returning full calculated access summary for a school.
 */
export async function getSchoolAccess(schoolId: string): Promise<SchoolAccessSummary & { controlMode?: string }> {
  const [sub, policy] = await Promise.all([
    getSchoolSubscription(schoolId),
    getGlobalAccessPolicy(),
  ]);

  const now = Date.now();
  const expiresAtMs = new Date(sub.expiresAt).getTime();
  const daysRemaining = Math.max(0, Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)));
  const accessMode = calculateAccessMode(sub, policy, now);

  const reminderRequired =
    now < expiresAtMs && policy.reminderDays.some((d) => daysRemaining <= d);

  // Default features fallback according to planId
  let allowedFeatures: string[] = sub.planId === "plan_starter"
    ? ["student_management", "teacher_management", "class_management", "basic_attendance", "school_dashboard"]
    : ["student_management", "teacher_management", "class_management", "basic_attendance", "attendance_automation", "school_dashboard", "notices_announcements", "advanced_reports", "fee_management"];

  let planLimits = {
    maxStudents: sub.planId === "plan_starter" ? 500 : 2000,
    maxTeachers: sub.planId === "plan_starter" ? 20 : 100,
    maxClasses: sub.planId === "plan_starter" ? 15 : 60,
    maxStaffAccounts: sub.planId === "plan_starter" ? 2 : 10,
  };

  try {
    const db = getFirebaseDb();
    if (db) {
      let loaded = false;

      // 1. Attempt to fetch features from specific PlanVersion document if present
      if (sub.planVersionId) {
        const verSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, sub.planVersionId));
        if (verSnap.exists()) {
          const verData = verSnap.data();
          if (Array.isArray(verData.features) && verData.features.length > 0) {
            allowedFeatures = verData.features;
            loaded = true;
          }
          if (verData.limits) planLimits = verData.limits;
        }
      }

      // 2. Fallback to main Plan document in Firestore
      if (!loaded) {
        const planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, sub.planId));
        if (planSnap.exists()) {
          const planData = planSnap.data() as Plan;
          if (Array.isArray(planData.features) && planData.features.length > 0) {
            allowedFeatures = planData.features;
          }
          if (planData.limits) planLimits = planData.limits;
        }
      }
    }
  } catch (err) {
    // Graceful fallback for test runners
  }

  if (accessMode === "GRACE_ACCESS") {
    allowedFeatures = allowedFeatures.filter((f) =>
      policy.allowedFeaturesDuringGrace.includes(f)
    );
  } else if (accessMode === "RESTRICTED_ACCESS") {
    allowedFeatures = allowedFeatures.filter((f) =>
      policy.allowedFeaturesWhenRestricted.includes(f)
    );
  } else if (accessMode === "NO_ACCESS") {
    allowedFeatures = [];
  }

  return {
    schoolId,
    planId: sub.planId,
    planVersionId: sub.planVersionId,
    status: sub.status,
    accessMode,
    controlMode: (sub as any).controlMode,
    startsAt: sub.startsAt,
    expiresAt: sub.expiresAt,
    graceEndsAt: sub.graceEndsAt,
    daysRemaining,
    reminderRequired,
    allowedFeatures,
    limits: planLimits,
  };
}
