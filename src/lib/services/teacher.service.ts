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
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import type { TeacherProfile, CreateTeacherInput } from "@/types";

/**
 * Fetches all teachers for a school.
 * Path: schools/{schoolId}/teachers
 */
export async function getTeachers(schoolId: string): Promise<TeacherProfile[]> {
  try {
    const db = getFirebaseDb();
    if (!db || !schoolId) return [];

    let snapshot = await getDocs(collection(db, "schools", schoolId, "teachers"));
    if (snapshot.empty) {
      snapshot = await getDocs(query(collection(db, "teachers"), where("schoolId", "==", schoolId)));
    }

    const teachers = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        name: data.name || data.fullName || "Teacher",
      };
    }) as TeacherProfile[];

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
  const finalTeacherCode = (input.teacherCode && input.teacherCode.trim().length > 0)
    ? input.teacherCode.trim().toUpperCase()
    : await generateNextTeacherId(schoolId);

  const secondaryAppName = `teacher-auth-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseClientConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

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
    teacherCode: finalTeacherCode,
    teacherId: teacherId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  await updateDoc(teacherDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleTeacherStatus(
  schoolId: string,
  teacherId: string,
  userId: string,
  status: "active" | "inactive"
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(teacherDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(userDocRef, {
    status: status === "active" ? "active" : "disabled",
    updatedAt: serverTimestamp(),
  });
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
  await updateDoc(teacherDocRef, {
    assignedClassId: assignment.classId,
    assignedClassName: assignment.className,
    assignedSectionId: assignment.sectionId,
    assignedSectionName: assignment.sectionName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Soft deletes a teacher profile (preserves historical attendance and academic references)
 * and decrements usage count atomically.
 */
export async function deleteTeacher(
  schoolId: string,
  teacherId: string,
  userId: string
): Promise<void> {
  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  const nowIso = new Date().toISOString();

  await updateDoc(teacherDocRef, {
    status: "deleted",
    deletedAt: nowIso,
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await updateDoc(userDocRef, {
      status: "disabled",
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
  userId: string
): Promise<void> {
  // Check plan limit before restoring
  await requirePlanLimit(schoolId, "teachers");

  const db = getFirebaseDb();
  const teacherDocRef = doc(db, "schools", schoolId, "teachers", teacherId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(teacherDocRef, {
    status: "active",
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });

  if (userId) {
    await updateDoc(userDocRef, {
      status: "active",
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Increment active usage count atomically
  await incrementSchoolUsage(schoolId, "teachers", 1);
}
