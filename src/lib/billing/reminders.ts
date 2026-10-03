import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  SubscriptionNotificationTrack,
  SubscriptionReminderResult,
  ReminderThresholdConfig,
  AccessMode,
} from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { getSchoolSubscription } from "./subscriptions";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { calculateSubscriptionState } from "./accessEngine";

/**
 * Section 9 & 10: Reminder Deduplication & Frequency Control.
 * Checks notification history in subscriptionNotifications/{schoolId}_{reminderId}.
 */
export async function shouldShowNotificationTrack(
  schoolId: string,
  reminderId: string | number,
  frequency: string = "SHOW_DAILY",
  nowMs: number = Date.now()
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    if (!db) return true;

    const trackId = `${schoolId}_${reminderId}`;
    const trackRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_NOTIFICATIONS, trackId);
    const trackSnap = await getDoc(trackRef);

    if (!trackSnap.exists()) return true;

    const data = trackSnap.data() as SubscriptionNotificationTrack;

    if (frequency === "SHOW_ONCE" && data.shownAt) {
      return false;
    }

    if (frequency === "SHOW_DAILY" && data.lastShownAt) {
      const lastShownMs = new Date(data.lastShownAt).getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (nowMs - lastShownMs < twentyFourHoursMs) return false;
    }

    if (data.dismissedAt) {
      const dismissedMs = new Date(data.dismissedAt).getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (nowMs - dismissedMs < twelveHoursMs) return false;
    }

    return true;
  } catch (error) {
    return true;
  }
}

export const shouldShowNotification = shouldShowNotificationTrack;

/**
 * Records delivery of notification in subscriptionNotifications/{schoolId}_{reminderId}.
 */
export async function recordNotificationTrack(
  schoolId: string,
  subscriptionId: string,
  reminderId: string | number,
  thresholdDays: number
): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db) return;

    const trackId = `${schoolId}_${reminderId}`;
    const trackRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_NOTIFICATIONS, trackId);

    const now = new Date().toISOString();
    const trackData: SubscriptionNotificationTrack = {
      id: trackId,
      schoolId,
      subscriptionId,
      reminderId: String(reminderId),
      thresholdDays,
      shownAt: now,
      lastShownAt: now,
      dismissedAt: null,
      createdAt: now,
    };

    await setDoc(trackRef, trackData, { merge: true });
  } catch (error) {
    console.warn("Failed to record notification track:", error);
  }
}

/**
 * Records dismissal of reminder ("Remind Me Later").
 */
export async function dismissNotificationTrack(
  schoolId: string,
  reminderId: string | number
): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db) return;

    const trackId = `${schoolId}_${reminderId}`;
    const trackRef = doc(db, BILLING_COLLECTIONS.SUBSCRIPTION_NOTIFICATIONS, trackId);
    await setDoc(
      trackRef,
      {
        dismissedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Failed to dismiss notification track:", error);
  }
}

/**
 * Section 5 & 6: Centralized Backend Reminder Decision Engine (getSubscriptionReminder).
 * Calculates matching configured threshold using trusted server time.
 */
export async function getSubscriptionReminder(
  schoolId: string,
  userRole: string = "school_admin",
  nowMs: number = Date.now()
): Promise<SubscriptionReminderResult> {
  const [sub, policy] = await Promise.all([
    getSchoolSubscription(schoolId),
    getGlobalAccessPolicy(),
  ]);

  const state = calculateSubscriptionState(sub, policy, nowMs);
  const { daysRemaining, accessMode, isExpired, isInGrace } = state;
  const canRecharge = policy.showRechargeButton;

  // Target role filter (Section 7)
  const isRoleTargeted = policy.targetRoles?.includes(userRole as any) ?? userRole === "school_admin";

  if (sub.status === "CANCELLED") {
    return {
      shouldRemind: isRoleTargeted,
      daysRemaining: 0,
      severity: "expired",
      title: "Subscription Cancelled",
      message: "Your subscription has been cancelled. Recharge to reactivate your plan.",
      showPopup: isRoleTargeted,
      showBanner: isRoleTargeted,
      showRechargeButton: canRecharge,
      canRecharge,
      accessMode: "NO_ACCESS",
    };
  }

  // Lifetime / unlimited plan guard
  if ((sub.billingCycle as string) === "lifetime" || (sub as any).isLifetime) {
    return {
      shouldRemind: false,
      daysRemaining: 9999,
      severity: "info",
      title: "",
      message: "",
      showPopup: false,
      showBanner: false,
      showRechargeButton: false,
      canRecharge: false,
      accessMode,
    };
  }

  if (accessMode === "NO_ACCESS") {
    return {
      shouldRemind: isRoleTargeted,
      daysRemaining: 0,
      severity: "expired",
      title: "Access Suspended",
      message: "Your plan has expired and access is locked. Please recharge to restore service.",
      showPopup: isRoleTargeted,
      showBanner: isRoleTargeted,
      showRechargeButton: canRecharge,
      canRecharge,
      accessMode,
    };
  }

  if (isExpired || isInGrace || accessMode === "RESTRICTED_ACCESS" || accessMode === "GRACE_ACCESS") {
    return {
      shouldRemind: isRoleTargeted,
      daysRemaining: 0,
      severity: "expired",
      title: isInGrace ? "Plan Expired (Grace Period Active)" : "Plan Expired",
      message: isInGrace
        ? `Your plan has expired. Grace period active for ${state.graceRemaining} days. Recharge now.`
        : "Your plan has expired. Recharge to restore full access.",
      showPopup: isRoleTargeted,
      showBanner: isRoleTargeted,
      showRechargeButton: canRecharge,
      canRecharge,
      accessMode,
    };
  }

  // Super Admin Configurable Threshold Guard
  const configuredThreshold =
    typeof policy.renewalNoticeThresholdDays === "number"
      ? policy.renewalNoticeThresholdDays
      : policy.reminderDays && policy.reminderDays.length > 0
      ? Math.max(...policy.reminderDays)
      : 7;

  // If daysRemaining is higher than the threshold set by Super Admin, do not show any renewal notice
  if (daysRemaining > configuredThreshold || !isRoleTargeted) {
    return {
      shouldRemind: false,
      daysRemaining,
      severity: "info",
      title: "",
      message: "",
      showPopup: false,
      showBanner: false,
      showRechargeButton: canRecharge,
      canRecharge,
      accessMode,
    };
  }

  // Authoritative dynamic countdown formatting
  let dynamicTitle = "Subscription Renewal Notice";
  let dynamicMessage = "";

  if (daysRemaining === 0) {
    dynamicTitle = "Subscription Renewal Notice";
    dynamicMessage = "Your School Study plan expires today. Recharge now to keep your school running smoothly.";
  } else if (daysRemaining === 1) {
    dynamicTitle = "Subscription Renewal Notice";
    dynamicMessage = "Your School Study plan expires tomorrow. Recharge now to keep your school running smoothly.";
  } else {
    dynamicTitle = daysRemaining <= 3 ? "Urgent: Subscription Expiring" : "Subscription Renewal Notice";
    dynamicMessage = `Your School Study plan expires in ${daysRemaining} days. Recharge now to keep your school running smoothly.`;
  }

  const reminderId = `rem_${daysRemaining}d`;
  const severity: SubscriptionReminderResult["severity"] =
    daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "urgent" : "warning";

  // Check frequency deduplication
  const showPopupAllowed = await shouldShowNotificationTrack(
    schoolId,
    reminderId,
    daysRemaining <= 1 ? "SHOW_ON_LOGIN" : "SHOW_DAILY",
    nowMs
  );

  return {
    shouldRemind: true,
    reminderId,
    daysRemaining,
    severity,
    title: dynamicTitle,
    message: dynamicMessage,
    showPopup: daysRemaining <= 3 && showPopupAllowed,
    showBanner: true,
    showRechargeButton: canRecharge,
    canRecharge,
    accessMode,
  };
}
