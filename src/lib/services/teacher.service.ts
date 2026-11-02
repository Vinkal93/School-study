import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import { configureAuthEmulator } from "@/lib/firebase/emulators";
import type { TeacherProfile, CreateTeacherInput } from "@/types";

/**
 * Fetches all teachers for a school.
 * Path: schools/{schoolId}/teachers
 */
/**
 * Authoritative Teacher Profile normalizer.
 * Guarantees that arrays, strings, and enum states conform to expected shapes,
 * completely preventing undefined .indexOf(), .join(), .includes() or .map() runtime exceptions.
 */
export function normalizeTeacherProfile(id: string, raw: any): TeacherProfile {
  const data = raw || {};
  let subjects: string[] = [];
  if (Array.isArray(data.subjects)) {
    subjects = data.subjects.map((s: any) => String(s || "").trim()).filter(Boolean);
  } else if (typeof data.subjects === "string" && data.subjects.trim()) {
    subjects = data.subjects.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  let assignedClasses: any[] = [];
  if (Array.isArray(data.assignedClasses)) {
    assignedClasses = data.assignedClasses.filter(Boolean);
  } else if (data.assignedClasses && typeof data.assignedClasses === "object") {
    assignedClasses = Object.values(data.assignedClasses).filter(Boolean);
  }

  return {
    id,
    schoolId: String(data.schoolId || ""),
    userId: String(data.userId || ""),
    teacherCode: String(data.teacherCode || data.code || data.employeeId || "").trim(),
    name: String(data.name || data.fullName || "Teacher").trim(),
    email: String(data.email || "").trim(),
    phone: String(data.phone || "").trim(),
    photoUrl: String(data.photoUrl || data.photo || data.avatar || "").trim(),
    joiningDate: String(data.joiningDate || "").trim(),
    assignedClassId: String(data.assignedClassId || "").trim(),
    assignedClassName: String(data.assignedClassName || "").trim(),
    assignedSectionId: String(data.assignedSectionId || "").trim(),
    assignedSectionName: String(data.assignedSectionName || "").trim(),
    assignedClasses,
    subjects,
    status: (data.status === "deleted" || data.status === "inactive") ? data.status : "active",
    ...(data.salaryConfig ? { salaryConfig: data.salaryConfig } : {}),
    ...(data.personalDetails ? { personalDetails: data.personalDetails } : {}),
    ...(data.professionalDetails ? { professionalDetails: data.professionalDetails } : {}),
    ...(data.performanceSummary ? { performanceSummary: data.performanceSummary } : {}),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as TeacherProfile;
}

export async function getTeachers(schoolId: string): Promise<TeacherProfile[]> {
  try {
    const db = getFirebaseDb();
    if (!db || !schoolId) return [];

    let snapshot = await getDocs(collection(db, "schools", schoolId, "teachers"));
    if (snapshot.empty) {
      snapshot = await getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId)));
    }

    const teachers = snapshot.docs.map((d) => normalizeTeacherProfile(d.id, d.data()));

    teachers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return teachers;
  } catch (error: any) {
    console.warn("Could not fetch teachers:", error?.message);
    return [];
  }
}

import { compressImageToBase64 } from "@/lib/utils/image-compression";

/**
 * Uploads a teacher profile photo with client-side compression and zero CORS requirements.
 */
export async function uploadTeacherPhoto(
  arg1: string | File,
  arg2?: string,
  arg3?: string | File
): Promise<string> {
  const file = arg1 instanceof File ? arg1 : (arg3 instanceof File ? arg3 : undefined);
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.75);
}

import {
  requireFeatureAccess,
  requirePlanLimit,
  incrementSchoolUsage,
  decrementSchoolUsage,
} from "@/lib/billing";

/**
 * Atomically generates the next unique Teacher ID scoped to the school.
 * Format: `${schoolCode}-T${sequence}` -> e.g. SBCI-T1, SBCI-T2, SBCI-T3...
 * 
 * Uses an atomic Firestore transaction on the school document.
 * - ID is 100% collision-free under concurrent registrations.
 * - Sequence is monotonically increasing and never decrements or reuses IDs upon deletion.
 */
export async function generateNextTeacherId(schoolId: string): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database offline.");

  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);

  return await runTransaction(db, async (tx) => {
    const schoolSnap = await tx.get(schoolRef);
    let schoolCode = "SBCI";

    if (schoolSnap.exists()) {
      const sData = schoolSnap.data();
      if (sData?.code && typeof sData.code === "string" && sData.code.trim().length > 0) {
        schoolCode = sData.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      }
    }

    const currentNumber = (schoolSnap.exists() && typeof schoolSnap.data()?.lastTeacherNumber === "number")
      ? schoolSnap.data().lastTeacherNumber
      : 0;

    const nextNumber = currentNumber + 1;

    // Update the counter on school doc atomically
    tx.set(schoolRef, { lastTeacherNumber: nextNumber }, { merge: true });

    return `${schoolCode}-T${nextNumber}`;
  });
}

/**
 * Creates a new teacher, provisions their Firebase Auth account, and creates their user + teacher docs.
 */
export async function createTeacherWithAuth(
  schoolId: string,
  input: CreateTeacherInput
): Promise<{ teacherId: string; userId: string; teacherCode: string }> {
  const db = getFirebaseDb();

  // 1. Authoritative Backend Check: Feature Access & Plan Limit
  await requireFeatureAccess(schoolId, "teacher_management");
  await requirePlanLimit(schoolId, "teachers");

  // 2. Resolve Unique Teacher Code (Auto-generate if not provided)
  const { generateAuthoritativeId, reserveUserIdentity } = await import("./identity.service");
  const finalTeacherCode = (input.teacherCode && input.teacherCode.trim().length > 0)
    ? input.teacherCode.trim().toUpperCase()
    : await generateAuthoritativeId("teacher", schoolId);

  const secondaryAppName = `teacher-auth-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseClientConfig, secondaryAppName);
  const secondaryAuth = configureAuthEmulator(getAuth(secondaryApp));

  let userId = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email.trim().toLowerCase(),
      input.password
    );
    userId = userCredential.user.uid;
    await signOut(secondaryAuth);
  } catch (authError: any) {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
    if (authError.code === "auth/email-already-in-use") {
      throw new Error(`Email "${input.email}" is already registered.`);
    }
    if (authError.code === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters.");
    }
    throw new Error(authError.message || "Failed to create teacher authentication account.");
  } finally {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
  }

  const teacherDocRef = doc(collection(db, "schools", schoolId, "teachers"));
  const teacherId = teacherDocRef.id;

  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  await setDoc(userDocRef, {
    uid: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: "teacher",
    schoolId: schoolId,
    userId: finalTeacherCode,
    teacherCode: finalTeacherCode,
    teacherId: teacherId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Register in authoritative unique identity registry
  await reserveUserIdentity(finalTeacherCode, {
    uid: userId,
    email: input.email.trim().toLowerCase(),
    role: "teacher",
    schoolId,
    name: input.name.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  }).catch((e) => console.warn("Teacher identity reservation notice:", e?.message));

  const teacherData: Omit<TeacherProfile, "createdAt" | "updatedAt"> = {
    id: teacherId,
    schoolId,
    userId,
    teacherCode: finalTeacherCode,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || "",
    photoUrl: input.photoUrl || "",
    joiningDate: input.joiningDate || new Date().toISOString().split("T")[0],
    assignedClassId: input.assignedClassId || "",
    assignedClassName: input.assignedClassName || "",
    assignedSectionId: input.assignedSectionId || "",
    assignedSectionName: input.assignedSectionName || "",
    subjects: input.subjects || [],
    status: "active",
  };

  await setDoc(teacherDocRef, {
    ...teacherData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. Increment usage count atomically
  await incrementSchoolUsage(schoolId, "teachers", 1);

  return { teacherId, userId, teacherCode: finalTeacherCode };
}

export async function updateTeacher(
  schoolId: string,
  teacherId: string,
  data: Partial<TeacherProfile>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !teacherId) throw new Error("Missing parameters for teacher update.");

  let canonicalId = teacherId;
  const subRef = doc(db, "schools", schoolId, "teachers", canonicalId);
  const rootRef = doc(db, "teachers", canonicalId);

  let targetSubSnap = await getDoc(subRef).catch(() => null);
  if (!targetSubSnap?.exists()) {
    const rootSnap = await getDoc(rootRef).catch(() => null);
    if (rootSnap?.exists()) canonicalId = rootSnap.id;
  }

  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "schools", schoolId, "teachers", canonicalId), payload, { merge: true });
  await setDoc(doc(db, "teachers", canonicalId), payload, { merge: true }).catch(() => {});

  const effectiveUserId = (data as any).userId || targetSubSnap?.data()?.userId || canonicalId;
  if (effectiveUserId && (data.name || data.email || data.phone || data.status)) {
    const userUpdate: any = { updatedAt: serverTimestamp() };
    if (data.name) userUpdate.name = data.name;
    if (data.email) userUpdate.email = data.email;
    if (data.phone) userUpdate.phone = data.phone;
    if (data.status) userUpdate.status = data.status === "active" ? "active" : "disabled";
    await updateDoc(doc(db, COLLECTIONS.USERS, effectiveUserId), userUpdate).catch(() => {});
  }
}

export async function toggleTeacherStatus(
  schoolId: string,
  teacherId: string,
  userId: string,
  status: "active" | "inactive"
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !teacherId) throw new Error("Missing parameters for teacher status toggle.");

  let canonicalId = teacherId;
  const subRef = doc(db, "schools", schoolId, "teachers", canonicalId);
  const rootRef = doc(db, "teachers", canonicalId);

  let targetSubSnap = await getDoc(subRef).catch(() => null);
  if (!targetSubSnap?.exists()) {
    const rootSnap = await getDoc(rootRef).catch(() => null);
    if (rootSnap?.exists()) canonicalId = rootSnap.id;
  }

  const payload = {
    status,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "schools", schoolId, "teachers", canonicalId), payload, { merge: true });
  await setDoc(doc(db, "teachers", canonicalId), payload, { merge: true }).catch(() => {});

  const effectiveUserId = userId || targetSubSnap?.data()?.userId || canonicalId;
  if (effectiveUserId) {
    await updateDoc(doc(db, COLLECTIONS.USERS, effectiveUserId), {
      status: status === "active" ? "active" : "disabled",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

export async function assignTeacherToClass(
  schoolId: string,
  teacherId: string,
  assignment: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const teacherSnap = await getDoc(teacherDocRef);
  const teacherName = teacherSnap?.data()?.name || "Teacher";

  const batch = writeBatch(db);

  // 1. Update target teacher
  batch.update(teacherDocRef, {
    assignedClassId: assignment.classId,
    assignedClassName: assignment.className,
    assignedSectionId: assignment.sectionId,
    assignedSectionName: assignment.sectionName,
    updatedAt: serverTimestamp(),
  });

  // 2. If assigning to a class, update class record and check previous teacher
  if (assignment.classId) {
    const classDocRef = doc(db, "schools", schoolId, "classes", assignment.classId);
    const classSnap = await getDoc(classDocRef).catch(() => null);
    if (classSnap && classSnap.exists()) {
      const prevTeacherId = classSnap.data()?.classTeacherId;
      if (prevTeacherId && prevTeacherId !== teacherId) {
        const prevTeacherRef = doc(db, "schools", schoolId, "teachers", prevTeacherId);
        batch.update(prevTeacherRef, {
          assignedClassId: "",
          assignedClassName: "",
          updatedAt: serverTimestamp(),
        });
      }
      batch.update(classDocRef, {
        classTeacherId: teacherId,
        classTeacherName: teacherName,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

/**
 * Soft deletes a teacher profile (preserves historical attendance and academic references)
 * and decrements usage count atomically.
 */
export async function deleteTeacher(
  schoolId: string,
  teacherId: string,
  userId?: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !schoolId || !teacherId) throw new Error("Missing parameters for teacher delete.");

  let canonicalId = teacherId;
  const subRef = doc(db, "schools", schoolId, "teachers", canonicalId);
  const rootRef = doc(db, "teachers", canonicalId);

  let targetSubSnap = await getDoc(subRef).catch(() => null);
  if (!targetSubSnap?.exists()) {
    const rootSnap = await getDoc(rootRef).catch(() => null);
    if (rootSnap?.exists()) canonicalId = rootSnap.id;
  }

  const nowIso = new Date().toISOString();
  const payload = {
    status: "deleted",
    deletedAt: nowIso,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "schools", schoolId, "teachers", canonicalId), payload, { merge: true });
  await setDoc(doc(db, "teachers", canonicalId), payload, { merge: true }).catch(() => {});

  const effectiveUserId = userId || targetSubSnap?.data()?.userId || canonicalId;
  if (effectiveUserId) {
    await updateDoc(doc(db, COLLECTIONS.USERS, effectiveUserId), {
      status: "disabled",
      disabledAt: nowIso,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Decrement usage count atomically
  await decrementSchoolUsage(schoolId, "teachers", 1);
}

/**
 * Restores a soft-deleted teacher profile back to active status.
 */
export async function restoreTeacher(
  schoolId: string,
  teacherId: string,
  userId?: string
): Promise<void> {
  // Check plan limit before restoring
  await requirePlanLimit(schoolId, "teachers");

  const db = getFirebaseDb();
  if (!db || !schoolId || !teacherId) throw new Error("Missing parameters for teacher restore.");

  let canonicalId = teacherId;
  const subRef = doc(db, "schools", schoolId, "teachers", canonicalId);
  const rootRef = doc(db, "teachers", canonicalId);

  let targetSubSnap = await getDoc(subRef).catch(() => null);
  if (!targetSubSnap?.exists()) {
    const rootSnap = await getDoc(rootRef).catch(() => null);
    if (rootSnap?.exists()) canonicalId = rootSnap.id;
  }

  const payload = {
    status: "active",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "schools", schoolId, "teachers", canonicalId), payload, { merge: true });
  await setDoc(doc(db, "teachers", canonicalId), payload, { merge: true }).catch(() => {});

  const effectiveUserId = userId || targetSubSnap?.data()?.userId || canonicalId;
  if (effectiveUserId) {
    await updateDoc(doc(db, COLLECTIONS.USERS, effectiveUserId), {
      status: "active",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Increment active usage count atomically
  await incrementSchoolUsage(schoolId, "teachers", 1);
}
