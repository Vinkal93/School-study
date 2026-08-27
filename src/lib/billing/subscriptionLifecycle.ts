import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { SchoolSubscription } from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { computeSubscriptionStatus } from "./subscriptions";

export interface LifecycleTaskResult {
  processed: number;
  updated: number;
  errors: number;
  timestamp: string;
}

/**
 * Section 26 & 27: Idempotent Subscription Lifecycle Task.
 * Scans active subscriptions, updates expired/grace status idempotently,
 * and maintains system lifecycle state using deterministic execution logic.
 */
export async function runSubscriptionLifecycleTask(
  nowMs: number = Date.now()
): Promise<LifecycleTaskResult> {
  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    const db = getFirebaseDb();
    if (!db) {
      return { processed: 0, updated: 0, errors: 0, timestamp: new Date().toISOString() };
    }

    const subSnap = await getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS));

    for (const subDoc of subSnap.docs) {
      processed++;
      try {
        const sub = { id: subDoc.id, ...subDoc.data() } as SchoolSubscription;
        const calculatedStatus = computeSubscriptionStatus(
          sub.expiresAt,
          sub.graceEndsAt,
          sub.status,
          nowMs
        );

        if (calculatedStatus !== sub.status) {
          const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, sub.id);
          await setDoc(
            subRef,
            {
              status: calculatedStatus,
              updatedAt: new Date(nowMs).toISOString(),
            },
            { merge: true }
          );
          updated++;
        }
      } catch (err) {
        errors++;
      }
    }
  } catch (error) {
    errors++;
  }

  return {
    processed,
    updated,
    errors,
    timestamp: new Date(nowMs).toISOString(),
  };
}
