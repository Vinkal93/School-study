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
  if (typeof window === "undefined") {
    throw new Error("createSchoolWithAdmin must be called from client context.");
  }

  const res = await fetch("/api/school/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok && data.success && data.schoolId && data.adminUid) {
    return { schoolId: data.schoolId, adminUid: data.adminUid };
  }

  const refCode = data?.referenceCode || data?.error?.referenceCode;

  // If validation error (400) or duplicate conflict (409), throw server message directly
  if (res.status === 400 || res.status === 409) {
    const msg =
      (typeof data.error === "object" ? data.error?.message : data.error) ||
      "Registration validation error.";
    const err = new Error(msg);
    if (refCode) (err as any).referenceCode = refCode;
    throw err;
  }

  // If server admin credentials are not configured (503)
  const errorCode = data?.error?.code || data?.code;
  if (errorCode === "ADMIN_AUTH_NOT_CONFIGURED") {
    const err = new Error(
      "School registration is temporarily unavailable. Please try again later or contact support."
    );
    (err as Error & { code: string }).code = errorCode;
    if (refCode) (err as any).referenceCode = refCode;
    throw err;
  }

  const errorMsg =
    (typeof data.error === "object" ? data.error?.message : data.error) ||
    data.message ||
    "Failed to register school. Please verify your connection and try again.";
  const genericErr = new Error(errorMsg);
  if (refCode) (genericErr as any).referenceCode = refCode;
  throw genericErr;
}

/**
 * Fetches all registered schools.
 */
export async function getAllSchools(): Promise<School[]> {
  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(collection(db, COLLECTIONS.SCHOOLS));
    if (snapshot && !snapshot.empty) {
      const schools = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || data.schoolName || data.title || docSnap.id,
          ...data,
        };
      }) as School[];
      return schools.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
  } catch (err) {
    console.warn("getAllSchools client notice, falling back to server API:", err);
  }

  // Graceful fallback to server API (/api/super-admin/schools) with Admin SDK authority
  if (typeof window !== "undefined") {
    try {
      let token = "";
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase/client");
        const auth = getFirebaseAuth();
        if (auth?.currentUser) token = await auth.currentUser.getIdToken().catch(() => "");
      } catch {}
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/super-admin/schools", { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.schools || [];
        if (list.length > 0) {
          return list.map((s: any) => ({
            id: s.id,
            name: s.name || s.schoolName || s.title || s.id,
            ...s,
          })).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        }
      }
    } catch (apiErr) {
      console.warn("getAllSchools server API fallback notice:", apiErr);
    }
  }

  return [];
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
      console.warn("subscribeToAllSchools snapshot notice:", err);
      // Fallback: load schools via server-aware API if realtime listener encounters permission latency
      getAllSchools().then((schools) => {
        if (schools && schools.length > 0) callback(schools);
      }).catch(() => {});
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
  let schoolsSnapshot: any = null;
  let usersSnapshot: any = null;

  try {
    const db = getFirebaseDb();
    [schoolsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.SCHOOLS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
    ]);
  } catch (directErr) {
    console.warn("getSuperAdminStats direct Firestore notice, attempting server API aggregation:", directErr);
  }

  if (schoolsSnapshot && !schoolsSnapshot.empty) {
    let activeSchools = 0;
    let inactiveSchools = 0;

    schoolsSnapshot.forEach((docSnap: any) => {
      const data = docSnap.data();
      if (data.status === "active") {
        activeSchools++;
      } else {
        inactiveSchools++;
      }
    });

    let totalStudents = 0;
    let totalTeachers = 0;

    if (usersSnapshot && !usersSnapshot.empty) {
      usersSnapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (data.role === "student") totalStudents++;
        if (data.role === "teacher") totalTeachers++;
      });
    }

    return {
      totalSchools: schoolsSnapshot.size,
      activeSchools,
      inactiveSchools,
      totalStudents,
      totalTeachers,
      totalUsers: usersSnapshot ? usersSnapshot.size : 0,
    };
  }

  // Graceful server API fallback (/api/super-admin/schools)
  if (typeof window !== "undefined") {
    try {
      let token = "";
      try {
        const { getFirebaseAuth } = await import("@/lib/firebase/client");
        const auth = getFirebaseAuth();
        if (auth?.currentUser) token = await auth.currentUser.getIdToken().catch(() => "");
      } catch {}
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/super-admin/schools", { headers });
      if (res.ok) {
        const data = await res.json();
        const schools = Array.isArray(data) ? data : data.schools || [];
        const active = schools.filter((s: any) => s.status === "active").length;
        return {
          totalSchools: schools.length,
          activeSchools: active,
          inactiveSchools: schools.length - active,
          totalStudents: 0,
          totalTeachers: 0,
          totalUsers: schools.length,
        };
      }
    } catch (apiErr) {
      console.warn("getSuperAdminStats server fallback notice:", apiErr);
    }
  }

  return {
    totalSchools: 0,
    activeSchools: 0,
    inactiveSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalUsers: 0,
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
 * Deletes a school tenant and all associated data safely and securely.
 */
export async function deleteSchoolFromSystem(schoolId: string): Promise<void> {
  const cleanId = (schoolId || "").trim();
  if (!cleanId) return;

  if (typeof window !== "undefined") {
    let token = "";
    try {
      const { getFirebaseAuth } = await import("@/lib/firebase/client");
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        token = await auth.currentUser.getIdToken().catch(() => "");
      }
    } catch {}

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/super-admin/schools/${cleanId}`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ reason: "School deleted via school.service" }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Failed to delete school "${cleanId}".`);
    }
    return;
  }

  // Server-side context
  const { deleteSchoolSecurely } = await import("./school-deletion.service");
  await deleteSchoolSecurely(cleanId, "system", "Server-side deleteSchoolFromSystem");
}
