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
  if (!schoolId || schoolId === "school_default" || schoolId === "system") {
    return getDefaultSchoolUsage(schoolId || "school_default");
  }

  const db = getFirebaseDb();
  if (!db) {
    return getDefaultSchoolUsage(schoolId);
  }

  try {
    // 1. Query authoritative tenant subcollections first
    const [
      studentsSub,
      teachersSub,
      classesSub,
      usersSnap,
    ] = await Promise.all([
      getDocs(collection(db, "schools", schoolId, "students")).catch(() => ({ size: 0, docs: [] })),
      getDocs(collection(db, "schools", schoolId, "teachers")).catch(() => ({ size: 0, docs: [] })),
      getDocs(collection(db, "schools", schoolId, "classes")).catch(() => ({ size: 0, docs: [] })),
      getDocs(query(collection(db, "users"), where("schoolId", "==", schoolId))).catch(() => ({ size: 0, docs: [] })),
    ]);

    // 2. Fallback to legacy root collections ONLY if tenant subcollections are completely empty
    let studentsRoot: any = { size: 0, docs: [] };
    let teachersRoot: any = { size: 0, docs: [] };
    let classesRoot: any = { size: 0, docs: [] };

    if (!studentsSub || (studentsSub as any).size === 0) {
      studentsRoot = await getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId))).catch(() => ({ size: 0, docs: [] }));
    }
    if (!teachersSub || (teachersSub as any).size === 0) {
      teachersRoot = await getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId))).catch(() => ({ size: 0, docs: [] }));
    }
    if (!classesSub || (classesSub as any).size === 0) {
      classesRoot = await getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId))).catch(() => ({ size: 0, docs: [] }));
    }

    let staffCount = 0;
    if ((usersSnap as any).docs) {
      (usersSnap as any).docs.forEach((d: any) => {
        const r = d.data()?.role;
        if (r === "school_admin" || r === "admin" || r === "staff") staffCount++;
      });
    }

    // Collect and deduplicate students, strictly excluding deleted or archived records
    const studentMap = new Map<string, any>();
    if ((studentsSub as any).docs) {
      (studentsSub as any).docs.forEach((d: any) => studentMap.set(d.id, d.data()));
    }
    if ((studentsRoot as any).docs) {
      (studentsRoot as any).docs.forEach((d: any) => {
        if (!studentMap.has(d.id)) studentMap.set(d.id, d.data());
      });
    }

    let activeStudentsCount = 0;
    if (studentMap.size > 0) {
      studentMap.forEach((data) => {
        const s = (data?.status || "").toLowerCase();
        if (s !== "deleted" && s !== "archived") {
          activeStudentsCount++;
        }
      });
    } else {
      activeStudentsCount = Math.max(studentsSub.size || 0, studentsRoot.size || 0);
    }

    // Collect and deduplicate teachers, excluding deleted records
    const teacherMap = new Map<string, any>();
    if ((teachersSub as any).docs) {
      (teachersSub as any).docs.forEach((d: any) => teacherMap.set(d.id, d.data()));
    }
    if ((teachersRoot as any).docs) {
      (teachersRoot as any).docs.forEach((d: any) => {
        if (!teacherMap.has(d.id)) teacherMap.set(d.id, d.data());
      });
    }

    let activeTeachersCount = 0;
    if (teacherMap.size > 0) {
      teacherMap.forEach((data) => {
        const s = (data?.status || "").toLowerCase();
        if (s !== "deleted" && s !== "archived") {
          activeTeachersCount++;
        }
      });
    } else {
      activeTeachersCount = Math.max(teachersSub.size || 0, teachersRoot.size || 0);
    }

    // Deduplicate classes by canonical name, excluding deleted records
    const classMap = new Map<string, any>();
    if ((classesSub as any).docs) {
      (classesSub as any).docs.forEach((d: any) => {
        const name = (d.data()?.name || "").trim().toLowerCase();
        if (name && (d.data()?.status || "").toLowerCase() !== "deleted") {
          classMap.set(name, d.data());
        }
      });
    }
    if ((classesRoot as any).docs) {
      (classesRoot as any).docs.forEach((d: any) => {
        const name = (d.data()?.name || "").trim().toLowerCase();
        if (name && !classMap.has(name) && (d.data()?.status || "").toLowerCase() !== "deleted") {
          classMap.set(name, d.data());
        }
      });
    }
    const activeClassesCount = classMap.size || Math.max(classesSub.size || 0, classesRoot.size || 0);

    const now = new Date().toISOString();
    const usageData: SchoolUsage = {
      schoolId,
      students: activeStudentsCount,
      teachers: activeTeachersCount,
      classes: activeClassesCount,
      staff: Math.max(1, staffCount),
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
  if (typeof window === "undefined") {
    const { getSafeAdminDb } = await import("@/lib/firebase/admin");
    const db = getSafeAdminDb();
    if (!db || !schoolId) return getDefaultSchoolUsage(schoolId || "school_default");
    const snap = await db.collection(USAGE_COLLECTION).doc(schoolId).get();
    if (snap.exists) return {...getDefaultSchoolUsage(schoolId),...snap.data(),schoolId} as SchoolUsage;
    const [students,teachers,classes,staff] = await Promise.all([
      db.collection(`schools/${schoolId}/students`).get().catch(() => ({ docs: [], size: 0 })),
      db.collection(`schools/${schoolId}/teachers`).get().catch(() => ({ docs: [], size: 0 })),
      db.collection(`schools/${schoolId}/classes`).get().catch(() => ({ docs: [], size: 0 })),
      db.collection("users").where("schoolId","==",schoolId).where("role","==","school_admin").get().catch(() => ({ docs: [], size: 0 }))
    ]);
    const validStudents = (students.docs || []).filter((d: any) => {
      const s = (d.data()?.status || "").toLowerCase();
      return s !== "deleted" && s !== "archived";
    }).length;
    const validTeachers = (teachers.docs || []).filter((d: any) => {
      const s = (d.data()?.status || "").toLowerCase();
      return s !== "deleted" && s !== "archived";
    }).length;
    return {
      ...getDefaultSchoolUsage(schoolId),
      students: validStudents,
      teachers: validTeachers,
      classes: classes.size || 0,
      staff: Math.max(1, staff.size || 0)
    };
  }
  if (!schoolId || schoolId === "school_default" || schoolId === "system") {
    return getDefaultSchoolUsage(schoolId || "school_default");
  }

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
  if (typeof window === "undefined") {
    try {
      const { getSafeAdminDb } = await import("@/lib/firebase/admin");
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        const { FieldValue } = await import("firebase-admin/firestore");
        const usageRef = adminDb.collection(USAGE_COLLECTION).doc(schoolId);
        await usageRef.set(
          {
            schoolId,
            [resourceKey]: FieldValue.increment(amount),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return;
      }
    } catch (adminErr) {
      console.warn(`[usage] Admin incrementSchoolUsage fallback:`, adminErr);
    }
  }

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
  if (typeof window === "undefined") {
    try {
      const { getSafeAdminDb } = await import("@/lib/firebase/admin");
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        const usageRef = adminDb.collection(USAGE_COLLECTION).doc(schoolId);
        await adminDb.runTransaction(async (tx: any) => {
          const snap = await tx.get(usageRef);
          if (!snap.exists) return;
          const data = snap.data() || {};
          const currentVal = typeof data[resourceKey] === "number" ? data[resourceKey] : 0;
          const newVal = Math.max(0, currentVal - amount);
          tx.update(usageRef, {
            [resourceKey]: newVal,
            updatedAt: new Date().toISOString(),
          });
        });
        return;
      }
    } catch (adminErr) {
      console.warn(`[usage] Admin decrementSchoolUsage fallback:`, adminErr);
    }
  }

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
