import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  increment,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { SchoolUsage, ResourceLimitKey } from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { createBillingAuditLog } from "./audit";

export const USAGE_COLLECTION = "schoolUsage";

/**
 * Default initial usage structure.
 */
function getDefaultSchoolUsage(schoolId: string): SchoolUsage {
  const now = new Date().toISOString();
  return {
    schoolId,
    students: 0,
    teachers: 0,
    classes: 0,
    staff: 0,
    lastReconciledAt: now,
    updatedAt: now,
  };
}

/**
 * Reconciles authoritative document counts directly from Firestore collections.
 * Counts actual documents in:
 * - schools/{schoolId}/students
 * - schools/{schoolId}/teachers
 * - schools/{schoolId}/classes
 * - users where schoolId == schoolId && role == "school_admin"
 */
export async function reconcileSchoolUsage(
  schoolId: string,
  actorId: string = "system"
): Promise<SchoolUsage> {
  const db = getFirebaseDb();
  if (!db) {
    return getDefaultSchoolUsage(schoolId);
  }

  try {
    const [studentsSnap, teachersSnap, classesSnap, staffSnap] = await Promise.all([
      getDocs(collection(db, "schools", schoolId, "students")),
      getDocs(collection(db, "schools", schoolId, "teachers")),
      getDocs(collection(db, "schools", schoolId, "classes")),
      getDocs(
        query(
          collection(db, "users"),
          where("schoolId", "==", schoolId),
          where("role", "==", "school_admin")
        )
      ),
    ]);

    const now = new Date().toISOString();
    const usageData: SchoolUsage = {
      schoolId,
      students: studentsSnap.size,
      teachers: teachersSnap.size,
      classes: classesSnap.size,
      staff: staffSnap.size,
      lastReconciledAt: now,
      updatedAt: now,
    };

    const usageRef = doc(db, USAGE_COLLECTION, schoolId);
    await setDoc(usageRef, usageData, { merge: true });

    // Optional audit log for usage reconciliation
    await createBillingAuditLog(actorId, "system", "USAGE_RECONCILED", "schoolSubscription", schoolId, {
      students: usageData.students,
      teachers: usageData.teachers,
      classes: usageData.classes,
      staff: usageData.staff,
    });

    return usageData;
  } catch (error) {
    console.warn(`reconcileSchoolUsage failed for school "${schoolId}":`, error);
    return getDefaultSchoolUsage(schoolId);
  }
}

/**
 * Fetches current usage record from schoolUsage/{schoolId}.
 * If the record does not exist or has never been initialized, automatically triggers reconciliation.
 */
export async function getSchoolUsage(schoolId: string): Promise<SchoolUsage> {
  const db = getFirebaseDb();
  if (!db) {
    return getDefaultSchoolUsage(schoolId);
  }

  try {
    const usageRef = doc(db, USAGE_COLLECTION, schoolId);
    const snap = await getDoc(usageRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<SchoolUsage>;
      return {
        schoolId,
        students: typeof data.students === "number" ? Math.max(0, data.students) : 0,
        teachers: typeof data.teachers === "number" ? Math.max(0, data.teachers) : 0,
        classes: typeof data.classes === "number" ? Math.max(0, data.classes) : 0,
        staff: typeof data.staff === "number" ? Math.max(0, data.staff) : 0,
        lastReconciledAt: data.lastReconciledAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }

    // Initialize through full count reconciliation if document is missing
    return await reconcileSchoolUsage(schoolId, "initial_load");
  } catch (error) {
    console.warn(`getSchoolUsage fallback for school "${schoolId}":`, error);
    return getDefaultSchoolUsage(schoolId);
  }
}

/**
 * Atomically increments a usage counter.
 */
export async function incrementSchoolUsage(
  schoolId: string,
  resourceKey: ResourceLimitKey,
  amount: number = 1
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const usageRef = doc(db, USAGE_COLLECTION, schoolId);
    await setDoc(
      usageRef,
      {
        schoolId,
        [resourceKey]: increment(amount),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`incrementSchoolUsage failed for ${resourceKey}:`, error);
  }
}

/**
 * Atomically decrements a usage counter (clamped to 0).
 */
export async function decrementSchoolUsage(
  schoolId: string,
  resourceKey: ResourceLimitKey,
  amount: number = 1
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const usageRef = doc(db, USAGE_COLLECTION, schoolId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(usageRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const currentVal = typeof data[resourceKey] === "number" ? data[resourceKey] : 0;
      const newVal = Math.max(0, currentVal - amount);
      tx.update(usageRef, {
        [resourceKey]: newVal,
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.warn(`decrementSchoolUsage failed for ${resourceKey}:`, error);
  }
}
