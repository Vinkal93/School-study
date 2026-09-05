import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { GlobalAccessPolicy, ReminderThresholdConfig } from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { createBillingAuditLog } from "./audit";

export const DEFAULT_REMINDER_THRESHOLDS: ReminderThresholdConfig[] = [
  {
    id: "rem_30d",
    daysBeforeExpiry: 30,
    enabled: false,
    priority: "low",
    title: "Subscription Renewal Notice",
    message: "Your School Study plan expires in ${daysRemaining} days.",
    showPopup: false,
    showBanner: true,
    showRechargeButton: true,
    frequency: "SHOW_ONCE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rem_15d",
    daysBeforeExpiry: 15,
    enabled: false,
    priority: "medium",
    title: "Plan Renewal Reminder",
    message: "Your plan expires in ${daysRemaining} days. Recharge early to avoid service interruption.",
    showPopup: false,
    showBanner: true,
    showRechargeButton: true,
    frequency: "SHOW_DAILY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rem_7d",
    daysBeforeExpiry: 7,
    enabled: true,
    priority: "high",
    title: "Subscription Renewal Notice",
    message: "Your plan expires in ${daysRemaining} days. Recharge now to keep your school running smoothly.",
    showPopup: true,
    showBanner: true,
    showRechargeButton: true,
    frequency: "SHOW_DAILY",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rem_3d",
    daysBeforeExpiry: 3,
    enabled: true,
    priority: "urgent",
    title: "Urgent: Subscription Expiring",
    message: "Your plan expires in ${daysRemaining} days. Recharge now to avoid service disruption.",
    showPopup: true,
    showBanner: true,
    showRechargeButton: true,
    frequency: "SHOW_ON_LOGIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rem_1d",
    daysBeforeExpiry: 1,
    enabled: true,
    priority: "urgent",
    title: "Subscription Renewal Notice",
    message: "Your plan expires tomorrow. Recharge immediately to retain full access.",
    showPopup: true,
    showBanner: true,
    showRechargeButton: true,
    frequency: "SHOW_ON_LOGIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_GLOBAL_ACCESS_POLICY: GlobalAccessPolicy = {
  id: "global",
  enabled: true,
  renewalNoticeThresholdDays: 7,
  reminderDays: [7, 3, 1],
  reminders: DEFAULT_REMINDER_THRESHOLDS,
  gracePeriodDays: 7,
  graceAccessMode: "FULL_ACCESS",
  restrictedAccessEnabled: true,
  expiredAccessMode: "RESTRICTED_ACCESS",
  allowedFeaturesDuringGrace: [
    "student_management",
    "teacher_management",
    "attendance_automation",
    "notices_announcements",
  ],
  allowedFeaturesWhenRestricted: [
    "dashboard",
    "billing",
    "pricing",
    "profile",
    "support",
  ],
  allowedFeaturesWhenExpired: [],
  showExpiryPopup: true,
  showRechargeButton: true,
  targetRoles: ["school_admin"],
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

/**
 * Fetches the Global Access Policy from Firestore (accessPolicies/global).
 * Initializes with default values if not present.
 */
export async function getGlobalAccessPolicy(): Promise<GlobalAccessPolicy> {
  try {
    const db = getFirebaseDb();
    if (!db) return DEFAULT_GLOBAL_ACCESS_POLICY;

    const policyRef = doc(db, BILLING_COLLECTIONS.ACCESS_POLICIES, "global");
    const policySnap = await getDoc(policyRef);

    if (policySnap.exists()) {
      const data = policySnap.data() as GlobalAccessPolicy;
      const effectiveThreshold =
        typeof data.renewalNoticeThresholdDays === "number"
          ? data.renewalNoticeThresholdDays
          : data.reminderDays && data.reminderDays.length > 0
          ? Math.max(...data.reminderDays)
          : 7;

      return {
        ...DEFAULT_GLOBAL_ACCESS_POLICY,
        ...data,
        renewalNoticeThresholdDays: effectiveThreshold,
        id: policySnap.id,
        reminders: data.reminders || DEFAULT_REMINDER_THRESHOLDS,
      };
    }

    // Auto-seed default global access policy
    setDoc(policyRef, DEFAULT_GLOBAL_ACCESS_POLICY).catch(() => {});
    return DEFAULT_GLOBAL_ACCESS_POLICY;
  } catch (error) {
    return DEFAULT_GLOBAL_ACCESS_POLICY;
  }
}

/**
 * Updates the Global Access Policy (Super Admin operation).
 */
export async function updateGlobalAccessPolicy(
  policyInput: Partial<GlobalAccessPolicy>,
  updatedBy: string
): Promise<GlobalAccessPolicy> {
  // Validate reminder thresholds (Section 4)
  if (policyInput.reminders) {
    const daysSeen = new Set<number>();
    for (const r of policyInput.reminders) {
      if (typeof r.daysBeforeExpiry !== "number" || r.daysBeforeExpiry < 0) {
        throw new Error("daysBeforeExpiry must be a non-negative integer.");
      }
      if (daysSeen.has(r.daysBeforeExpiry)) {
        throw new Error(`Duplicate reminder threshold value: ${r.daysBeforeExpiry} days.`);
      }
      daysSeen.add(r.daysBeforeExpiry);
    }
  }

  const db = getFirebaseDb();
  const policyRef = doc(db, BILLING_COLLECTIONS.ACCESS_POLICIES, "global");
  const current = await getGlobalAccessPolicy();

  const updated: GlobalAccessPolicy = {
    ...current,
    ...policyInput,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await setDoc(policyRef, updated, { merge: true });

  await createBillingAuditLog(
    updatedBy,
    "super_admin",
    "ACCESS_POLICY_UPDATED",
    "accessPolicy",
    "global",
    { updatedFields: Object.keys(policyInput) }
  );

  return updated;
}
