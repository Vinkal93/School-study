import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
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
import type { TeacherProfile, CreateTeacherInput } from "@/types";

/**
 * Fetches all teachers for a school.
 * Path: schools/{schoolId}/teachers
 */
export async function getTeachers(schoolId: string): Promise<TeacherProfile[]> {
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, "schools", schoolId, "teachers"),
      orderBy("name", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as TeacherProfile[];
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
  file: File,
  schoolId: string,
  teacherCode: string
): Promise<string> {
  return await compressImageToBase64(file, 400, 400, 0.75);
}

/**
 * Creates a new teacher, provisions their Firebase Auth account, and creates their user + teacher docs.
 */
export async function createTeacherWithAuth(
  schoolId: string,
  input: CreateTeacherInput
): Promise<{ teacherId: string; userId: string }> {
  const db = getFirebaseDb();

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

  const userDocRef = doc(db, COLLECTIONS.USERS, userId);
  await setDoc(userDocRef, {
    uid: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: "teacher",
    schoolId: schoolId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const teacherDocRef = doc(collection(db, "schools", schoolId, "teachers"));
  const teacherId = teacherDocRef.id;

  const teacherData: Omit<TeacherProfile, "createdAt" | "updatedAt"> = {
    id: teacherId,
    schoolId,
    userId,
    teacherCode: input.teacherCode.trim().toUpperCase(),
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

  return { teacherId, userId };
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
 * Deletes a teacher profile and user record from Firebase.
 */
export async function deleteTeacher(
  schoolId: string,
  teacherId: string,
  userId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "schools", schoolId, "teachers", teacherId));
  if (userId) {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  }
}
