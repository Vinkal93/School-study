import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { calculateSubscriptionState } from "./accessEngine";
import { BILLING_COLLECTIONS } from "./plans";
import { createNotification } from "@/lib/services/notification.service";
import type { SchoolSubscription, School } from "@/types";

export interface ExpiryNotificationSummary {
  checkedCount: number;
  expiringCount: number;
  notifiedCount: number;
  thresholdDays: number;
}

/**
 * Section 7 & 8: Super Admin Expiry Notifier.
 * Checks all active school subscriptions against the Super Admin configured renewal threshold.
 * For each expiring school, publishes an idempotent notification into 'schools/global/notifications'.
 */
export async function checkAndNotifyExpiringSchools(nowMs: number = Date.now()): Promise<ExpiryNotificationSummary> {
  const policy = await getGlobalAccessPolicy();
  const threshold =
    typeof policy.renewalNoticeThresholdDays === "number"
      ? policy.renewalNoticeThresholdDays
      : policy.reminderDays && policy.reminderDays.length > 0
      ? Math.max(...policy.reminderDays)
      : 7;

  let subscriptions: SchoolSubscription[] = [];
  const schoolsMap = new Map<string, string>();

  // 1. Fetch data with Admin SDK or Client SDK fallback
  try {
    const { getSafeAdminDb } = await import("@/lib/firebase/admin");
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const [subsSnap, schoolsSnap] = await Promise.all([
        adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).get(),
        adminDb.collection("schools").get(),
      ]);

      subsSnap.forEach((docSnap) => {
        subscriptions.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });

      schoolsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        schoolsMap.set(docSnap.id, data.name || data.schoolName || `School (${docSnap.id})`);
      });
    }
  } catch (e) {
    // Admin SDK not available, use client SDK
  }

  if (subscriptions.length === 0) {
    const db = getFirebaseDb();
    if (db) {
      try {
        const [subsSnap, schoolsSnap] = await Promise.all([
          getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)),
          getDocs(collection(db, "schools")),
        ]);

        subsSnap.forEach((docSnap) => {
          subscriptions.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        schoolsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          schoolsMap.set(docSnap.id, data.name || data.schoolName || `School (${docSnap.id})`);
        });
      } catch (clientErr) {
        console.warn("[ExpiryNotifier] Client Firestore fetch error:", clientErr);
      }
    }
  }

  let expiringCount = 0;
  let notifiedCount = 0;

  for (const sub of subscriptions) {
    // Ignore cancelled, suspended or lifetime subscriptions
    if (
      sub.status === "CANCELLED" ||
      sub.status === "SUSPENDED" ||
      (sub.billingCycle as string) === "lifetime" ||
      (sub as any).isLifetime
    ) {
      continue;
    }

    const state = calculateSubscriptionState(sub, policy, nowMs);

    // Check if within the configured renewal notification threshold
    if (!state.isExpired && state.daysRemaining <= threshold) {
      expiringCount++;
      const schoolName = schoolsMap.get(sub.schoolId) || `School (${sub.schoolId})`;
      const expiryIso = sub.expiresAt || new Date().toISOString();
      const expiryDateStr = expiryIso.split("T")[0];
      const planName = (sub.planId || "Professional Plan").replace(/^(plan_)/i, "").toUpperCase();

      let urgencyText = "";
      if (state.daysRemaining === 0) {
        urgencyText = "expires today";
      } else if (state.daysRemaining === 1) {
        urgencyText = "expires tomorrow";
      } else {
        urgencyText = `expires in ${state.daysRemaining} days`;
      }

      // Deterministic idempotency key: fires strictly ONCE per school, per day count, per expiry date
      const idempotencyKey = `superadmin_exp_${sub.schoolId}_${state.daysRemaining}d_${expiryDateStr}`;

      try {
        const notifId = await createNotification(
          "global",
          {
            title: `Plan Expiring: ${schoolName}`,
            message: `${schoolName}'s ${planName} subscription ${urgencyText} (${expiryDateStr}). Review billing status or extend access.`,
            type: "notice",
            targetAudience: "all",
            priority: state.daysRemaining <= 1 ? "urgent" : state.daysRemaining <= 3 ? "high" : "normal",
            link: `/super-admin/schools/${sub.schoolId}`,
            actionLabel: "View School",
            idempotencyKey,
            metadata: {
              schoolId: sub.schoolId,
              schoolName,
              planId: sub.planId,
              expiresAt: sub.expiresAt,
              daysRemaining: state.daysRemaining,
              targetType: "subscription_expiry",
            },
          },
          { uid: "system", name: "System Automation", role: "system" }
        );

        if (notifId) {
          notifiedCount++;
        }
      } catch (notifErr) {
        console.warn(`[ExpiryNotifier] Failed to post notification for ${sub.schoolId}:`, notifErr);
      }
    }
  }

  return {
    checkedCount: subscriptions.length,
    expiringCount,
    notifiedCount,
    thresholdDays: threshold,
  };
}
