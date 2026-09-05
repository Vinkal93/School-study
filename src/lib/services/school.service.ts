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
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { firebaseClientConfig } from "@/lib/firebase/config";
import type { School, SchoolStatus, CreateSchoolInput, AppUser } from "@/types";

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
  const db = getFirebaseDb();
  const upperCode = input.code.trim().toUpperCase();

  // 1. Verify school code is unique
  const codeQuery = query(
    collection(db, COLLECTIONS.SCHOOLS),
    where("code", "==", upperCode)
  );
  const codeSnapshot = await getDocs(codeQuery);
  if (!codeSnapshot.empty) {
    throw new Error(`School code "${upperCode}" is already in use.`);
  }

  // 2. Create the Admin account using a secondary Firebase App instance
  const secondaryAppName = `secondary-auth-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseClientConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let adminUid = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.adminEmail.trim().toLowerCase(),
      input.adminPassword
    );
    adminUid = userCredential.user.uid;
    await signOut(secondaryAuth);
  } catch (authError: any) {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
    if (authError.code === "auth/email-already-in-use") {
      throw new Error(`Email "${input.adminEmail}" is already registered.`);
    }
    if (authError.code === "auth/weak-password") {
      throw new Error("Password should be at least 6 characters.");
    }
    throw new Error(authError.message || "Failed to create admin user account.");
  } finally {
    if (getApps().some((app) => app.name === secondaryAppName)) {
      await deleteApp(secondaryApp);
    }
  }

  // 3. Create School document in Firestore
  const schoolDocRef = doc(collection(db, COLLECTIONS.SCHOOLS));
  const schoolId = schoolDocRef.id;

  const schoolData = {
    id: schoolId,
    name: input.name.trim(),
    code: upperCode,
    address: input.address?.trim() || "",
    city: input.city?.trim() || "",
    state: input.state?.trim() || "",
    phone: input.phone?.trim() || "",
    email: input.email?.trim() || "",
    logoUrl: input.logoUrl || "",
    status: "active" as SchoolStatus,
    setupCompleted: false,
    setupStep: 1,
    adminUid,
    adminName: input.adminName.trim(),
    adminEmail: input.adminEmail.trim().toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(schoolDocRef, schoolData);

  // 4. Create User document for Admin in users/{adminUid}
  const userDocRef = doc(db, COLLECTIONS.USERS, adminUid);
  await setDoc(userDocRef, {
    uid: adminUid,
    name: input.adminName.trim(),
    email: input.adminEmail.trim().toLowerCase(),
    role: "school_admin",
    schoolId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 5. Authoritative default subscription document
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const graceEndsAt = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const subDocRef = doc(db, "schoolSubscriptions", schoolId);
  await setDoc(subDocRef, {
    id: schoolId,
    schoolId,
    planId: "plan_free",
    planVersionId: "plan_free_v1",
    status: "ACTIVE",
    billingCycle: "monthly",
    startsAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    graceEndsAt: graceEndsAt.toISOString(),
    source: "registration_trial",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }).catch(() => {});

  return { schoolId, adminUid };
}

/**
 * Fetches all registered schools.
 */
export async function getAllSchools(): Promise<School[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.SCHOOLS),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as School[];
}

/**
 * Real-time listener for all schools in the platform.
 * Automatically notifies when schools are registered or their setup progresses.
 */
export function subscribeToAllSchools(callback: (schools: School[]) => void): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.SCHOOLS),
    orderBy("name", "asc")
  );

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
    callback(enriched);
  };

  const unsubSchools = onSnapshot(
    q,
    (snapshot) => {
      currentSchools = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as School[];
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
 */
export async function getAllUsers(): Promise<AppUser[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  })) as AppUser[];
}

/**
 * Realtime subscription to all platform users.
 */
export function subscribeToAllUsers(callback: (users: AppUser[]) => void): () => void {
  const db = getFirebaseDb();
  const q = query(collection(db, COLLECTIONS.USERS), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...docSnap.data(),
      })) as AppUser[];
      callback(users);
    },
    (error) => {
      console.error("Error listening to users collection:", error);
    }
  );
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
