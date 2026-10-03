import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import type { School, SchoolStatus, CreateSchoolInput, AppUser } from "@/types";
import { isSuperAdminEmail } from "./user.service";

import { compressImageToBase64 } from "@/lib/utils/image-compression";

/**
 * Uploads a school logo with client-side compression and zero CORS requirements.
 */
export async function uploadSchoolLogo(
  file: File,
  schoolCode: string
): Promise<string> {
  return await compressImageToBase64(file, 400, 400, 0.8);
}

/**
 * Creates a new school and provisions its primary School Admin credentials.
 * Uses an isolated secondary Firebase App instance so Super Admin remains logged in.
 */
export async function createSchoolWithAdmin(
  input: CreateSchoolInput
): Promise<{ schoolId: string; adminUid: string }> {
  // 1. Attempt Server-Authoritative Registration (in browser)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/school/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.schoolId && data.adminUid) {
        return { schoolId: data.schoolId, adminUid: data.adminUid };
      }
      if (!res.ok && data.error && !data.fallbackToClient) {
        throw new Error(data.error);
      }
    } catch (apiErr: any) {
      if (apiErr?.message && !apiErr.message.includes("fetch") && !apiErr.message.includes("URL")) {
        throw apiErr;
      }
    }
  }

  throw new Error("School registration is unavailable. Configure the private Firebase Admin server before retrying.");
}

/**
 * Fetches all registered schools.
 */
export async function getAllSchools(): Promise<School[]> {
  const db = getFirebaseDb();
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SCHOOLS));
    const schools = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || data.schoolName || data.title || docSnap.id,
        ...data,
      };
    }) as School[];
    return schools.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch (err) {
    console.warn("getAllSchools fetch notice:", err);
    return [];
  }
}

/**
 * Real-time listener for all schools in the platform.
 * Automatically notifies when schools are registered or their setup progresses.
 */
export function subscribeToAllSchools(callback: (schools: School[]) => void): () => void {
  const db = getFirebaseDb();
  const colRef = collection(db, COLLECTIONS.SCHOOLS);

  let currentSchools: School[] = [];
  let subMap = new Map<string, any>();

  const emitMerged = () => {
    const enriched = currentSchools.map((s) => {
      const sub = subMap.get(s.id);
      return {
        ...s,
        planId: sub?.planId || s.planId || "plan_free",
        planName:
          sub?.planName ||
          s.planName ||
          (sub?.planId === "plan_enterprise"
            ? "Enterprise"
            : sub?.planId === "plan_growth"
            ? "Growth"
            : sub?.planId === "plan_starter"
            ? "Starter"
            : "Trial"),
        subscriptionStatus:
          sub?.status ||
          s.subscriptionStatus ||
          (s.status === "active" ? "ACTIVE" : "INACTIVE"),
        subscriptionExpiresAt: sub?.expiresAt || s.subscriptionExpiresAt,
      };
    });
    enriched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    callback(enriched);
  };

  const unsubSchools = onSnapshot(
    colRef,
    (snapshot) => {
      currentSchools = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || data.schoolName || data.title || docSnap.id,
          ...data,
        };
      }) as School[];
      emitMerged();
    },
    (err) => {
      console.error("subscribeToAllSchools snapshot error:", err);
    }
  );

  let unsubSubs: (() => void) | null = null;
  try {
    unsubSubs = onSnapshot(
      collection(db, "schoolSubscriptions"),
      (snap) => {
        subMap = new Map();
        snap.docs.forEach((doc) => subMap.set(doc.id, doc.data()));
        emitMerged();
      },
      (err) => {
        console.warn("schoolSubscriptions onSnapshot notice:", err);
      }
    );
  } catch (e) {
    console.warn("Subscriptions snapshot error:", e);
  }

  return () => {
    unsubSchools();
    if (unsubSubs) unsubSubs();
  };
}

/**
 * Fetches a single school by ID.
 */
export async function getSchoolById(schoolId: string): Promise<School | null> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as School;
}

/**
 * Updates a school's status (active / inactive / trial / suspended / expired / archived).
 */
export async function updateSchoolStatus(
  schoolId: string,
  status: SchoolStatus
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates a school document with partial data.
 */
export async function updateSchool(
  schoolId: string,
  data: Partial<School>
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates a school's operational status with optional audit note/reason.
 */
export async function updateSchoolOperationalStatus(
  schoolId: string,
  status: SchoolStatus,
  reason?: string
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const payload: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (reason) {
    payload.statusReason = reason;
  }
  await updateDoc(docRef, payload);
}

/**
 * Updates a school's verification badge (none / basic / gold / premium).
 */
export async function updateSchoolVerificationBadge(
  schoolId: string,
  verificationBadge: "none" | "basic" | "gold" | "premium"
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(docRef, {
    verificationBadge: verificationBadge === "none" ? null : verificationBadge,
    updatedAt: serverTimestamp(),
  });
}

export interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalUsers: number;
}

/**
 * Fetches platform stats for Super Admin Overview Dashboard.
 */
export async function getSuperAdminStats(): Promise<SuperAdminStats> {
  const db = getFirebaseDb();
  const schoolsSnapshot = await getDocs(collection(db, COLLECTIONS.SCHOOLS));
  const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

  let activeSchools = 0;
  let inactiveSchools = 0;

  schoolsSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status === "active") {
      activeSchools++;
    } else {
      inactiveSchools++;
    }
  });

  let totalStudents = 0;
  let totalTeachers = 0;

  usersSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.role === "student") totalStudents++;
    if (data.role === "teacher") totalTeachers++;
  });

  return {
    totalSchools: schoolsSnapshot.size,
    activeSchools,
    inactiveSchools,
    totalStudents,
    totalTeachers,
    totalUsers: usersSnapshot.size,
  };
}

/**
 * Fetches all platform users (for Super Admin user management).
 * Includes manually created, bulk imported, and all tenant records.
 */
export async function getAllUsers(): Promise<AppUser[]> {
  const { getComprehensiveGlobalUsers } = await import("./user-sync.service");
  return await getComprehensiveGlobalUsers();
}

/**
 * Realtime subscription to all platform users.
 * Combines real-time users collection with tenant directories.
 */
export function subscribeToAllUsers(callback: (users: AppUser[]) => void): () => void {
  const db = getFirebaseDb();
  let isCancelled = false;

  const loadAndEmit = async () => {
    try {
      const { getComprehensiveGlobalUsers } = await import("./user-sync.service");
      const all = await getComprehensiveGlobalUsers();
      if (!isCancelled) {
        callback(all);
      }
    } catch (e) {
      console.warn("[school.service] Comprehensive directory load notice:", e);
    }
  };

  // Immediate comprehensive load
  loadAndEmit();

  const q = query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(
    q,
    () => {
      loadAndEmit();
    },
    (error) => {
      console.error("Error listening to users collection:", error);
    }
  );

  return () => {
    isCancelled = true;
    unsubscribe();
  };
}

/**
 * Toggles a user's status between "active" and "disabled".
 */
export async function updateUserStatus(
  uid: string,
  status: "active" | "disabled"
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a user document completely from Firebase Firestore.
 */
export async function deleteUserFromSystem(user: AppUser): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, COLLECTIONS.USERS, user.uid));

  if (user.schoolId) {
    if (user.role === "student") {
      const sSnap = await getDocs(query(collection(db, "schools", user.schoolId, "students"), where("userId", "==", user.uid)));
      for (const d of sSnap.docs) {
        await deleteDoc(doc(db, "schools", user.schoolId, "students", d.id));
      }
    } else if (user.role === "teacher") {
      const tSnap = await getDocs(query(collection(db, "schools", user.schoolId, "teachers"), where("userId", "==", user.uid)));
      for (const d of tSnap.docs) {
        await deleteDoc(doc(db, "schools", user.schoolId, "teachers", d.id));
      }
    }
  }
}

/**
 * Deletes a school document from Firebase Firestore.
 */
export async function deleteSchoolFromSystem(schoolId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, COLLECTIONS.SCHOOLS, schoolId));
}
