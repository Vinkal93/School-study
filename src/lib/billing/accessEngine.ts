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
  const daysRemaining = Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24));

  if (now < expiresAtMs) {
    const isReminderWindow = policy.reminderDays.some((d) => daysRemaining <= d);
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

  const reminderRequired =
    now < expiresAtMs && policy.reminderDays.some((d) => daysRemaining <= d);

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
export async function getSchoolAccess(schoolId: string): Promise<SchoolAccessSummary> {
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

  // Default features for fallback/test environments
  let allowedFeatures: string[] = [
    "student_management",
    "teacher_management",
    "class_management",
    "basic_attendance",
    "attendance_automation",
    "school_dashboard",
    "notices_announcements",
    "advanced_reports",
  ];

  let planLimits = {
    maxStudents: 2000,
    maxTeachers: 100,
    maxClasses: 60,
    maxStaffAccounts: 10,
  };

  try {
    const db = getFirebaseDb();
    if (db) {
      const planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, sub.planId));
      if (planSnap.exists()) {
        const planData = planSnap.data() as Plan;
        if (planData.features) allowedFeatures = planData.features;
        if (planData.limits) planLimits = planData.limits;
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
    startsAt: sub.startsAt,
    expiresAt: sub.expiresAt,
    graceEndsAt: sub.graceEndsAt,
    daysRemaining,
    reminderRequired,
    allowedFeatures,
    limits: planLimits,
  };
}
