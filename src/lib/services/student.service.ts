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
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import {
  requireFeatureAccess,
  requirePlanLimit,
  incrementSchoolUsage,
  decrementSchoolUsage,
} from "@/lib/billing";
import type { StudentProfile, CreateStudentInput } from "@/types";

/**
 * Fetches all students for a school with optional class/section/status filters.
 * Path: schools/{schoolId}/students
 */
export async function getStudents(
  schoolId: string,
  options?: { classId?: string; sectionId?: string; status?: string }
): Promise<StudentProfile[]> {
  try {
    const db = getFirebaseDb();
    let q = query(
      collection(db, "schools", schoolId, "students"),
      orderBy("name", "asc")
    );

    const snapshot = await getDocs(q);
    let students = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as StudentProfile[];

    if (options?.classId) {
      students = students.filter((s) => s.classId === options.classId);
    }
    if (options?.sectionId) {
      students = students.filter((s) => s.sectionId === options.sectionId);
    }
    if (options?.status && options.status !== "all") {
      students = students.filter((s) => s.status === options.status);
    }

    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

/**
 * Fetches students belonging to a specific class and optional section (Used by Teacher Portal).
 */
export async function getStudentsByClassAndSection(
  schoolId: string,
  classId: string,
  sectionId?: string
): Promise<StudentProfile[]> {
  const db = getFirebaseDb();
  let q = query(
    collection(db, "schools", schoolId, "students"),
    where("classId", "==", classId)
  );

  const snapshot = await getDocs(q);
  let students = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as StudentProfile[];

  if (sectionId) {
    students = students.filter((s) => s.sectionId === sectionId);
  }

  return students.sort((a, b) => a.name.localeCompare(b.name));
}

import { compressImageToBase64 } from "@/lib/utils/image-compression";

/**
 * Uploads student photo with client-side compression and zero CORS requirements.
 */
export async function uploadStudentPhoto(
  arg1: string | File,
  arg2?: string,
  arg3?: string | File
): Promise<string> {
  const file = arg1 instanceof File ? arg1 : (arg3 instanceof File ? arg3 : undefined);
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.75);
}

/**
 * Creates a student record, verifies unique admission number within school,
 * enforces plan feature access and capacity limits, and provisions student login credentials.
 */
export async function createStudentWithAuth(
  schoolId: string,
  input: CreateStudentInput
): Promise<{ studentId: string; userId: string }> {
  const db = getFirebaseDb();
  const cleanAdmNo = input.admissionNumber.trim().toUpperCase();

  // 1. Authoritative Backend Check: Feature Access & Plan Limit
  await requireFeatureAccess(schoolId, "student_management");
  await requirePlanLimit(schoolId, "students");

  // 2. Verify admission number uniqueness within this school
  const studentsColl = collection(db, "schools", schoolId, "students");
  const duplicateQuery = query(
    studentsColl,
    where("admissionNumber", "==", cleanAdmNo)
  );
  const duplicateSnap = await getDocs(duplicateQuery);
  if (!duplicateSnap.empty) {
    throw new Error(
      `Admission Number "${cleanAdmNo}" is already registered in this school.`
    );
  }

  // 2. Create student Auth user via secondary app instance
  const secondaryAppName = `student-auth-${Date.now()}`;
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
    throw new Error(authError.message || "Failed to create student user account.");
  } finally {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
  }

  // 3. Create Student Document in schools/{schoolId}/students/{studentId}
  const studentDocRef = doc(collection(db, "schools", schoolId, "students"));
  const studentId = studentDocRef.id;

  const studentData: Omit<StudentProfile, "createdAt" | "updatedAt"> = {
    id: studentId,
    schoolId,
    userId,
    admissionNumber: cleanAdmNo,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    gender: input.gender,
    dob: input.dob || "",
    phone: input.phone?.trim() || "",
    photoUrl: input.photoUrl || "",
    address: input.address?.trim() || "",
    classId: input.classId,
    className: input.className,
    sectionId: input.sectionId,
    sectionName: input.sectionName,
    academicYearId: input.academicYearId || "",
    admissionDate: input.admissionDate || new Date().toISOString().split("T")[0],
    status: "active",
  };

  await setDoc(studentDocRef, {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Create User document in users/{userId}
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  await setDoc(userDocRef, {
    uid: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: "student",
    schoolId: schoolId,
    studentId: studentId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 5. Increment usage count atomically
  await incrementSchoolUsage(schoolId, "students", 1);

  return { studentId, userId };
}

/**
 * Updates a student's profile details or class/section transfer.
 */
export async function updateStudent(
  schoolId: string,
  studentId: string,
  data: Partial<StudentProfile>
): Promise<void> {
  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  await updateDoc(studentDocRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggles a student's status between active and inactive.
 */
export async function toggleStudentStatus(
  schoolId: string,
  studentId: string,
  userId: string,
  status: "active" | "inactive"
): Promise<void> {
  const db = getFirebaseDb();
  const studentDocRef = doc(db, "schools", schoolId, "students", studentId);
  const userDocRef = doc(db, COLLECTIONS.USERS, userId);

  await updateDoc(studentDocRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(userDocRef, {
    status: status === "active" ? "active" : "disabled",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a student profile and decrements usage count atomically.
 */
export async function deleteStudent(
  schoolId: string,
  studentId: string,
  userId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "students", studentId));
  if (userId) {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  }
  // Decrement usage count atomically
  await decrementSchoolUsage(schoolId, "students", 1);
}
