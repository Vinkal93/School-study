import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
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

/**
 * Uploads a school logo to Firebase Storage and returns the public download URL.
 */
export async function uploadSchoolLogo(
  file: File,
  schoolCode: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const cleanCode = schoolCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const timestamp = Date.now();
  const storageRef = ref(storage, `school-logos/${cleanCode}_${timestamp}_${file.name}`);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
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
    // Sign out from secondary auth immediately
    await signOut(secondaryAuth);
  } catch (authError: any) {
    // If auth failed, clean up secondary app
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
    adminId: adminUid,
    adminEmail: input.adminEmail.trim().toLowerCase(),
    setupCompleted: false,
    setupStep: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(schoolDocRef, schoolData);

  // 4. Create User document in Firestore for the admin
  const userDocRef = doc(db, COLLECTIONS.USERS, adminUid);
  const userData = {
    uid: adminUid,
    name: input.adminName.trim(),
    email: input.adminEmail.trim().toLowerCase(),
    role: "school_admin",
    schoolId: schoolId,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userDocRef, userData);

  return { schoolId, adminUid };
}

/**
 * Fetches all schools ordered by creation date.
 */
export async function getAllSchools(): Promise<School[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, COLLECTIONS.SCHOOLS),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as School[];
}

/**
 * Fetches a single school by its ID.
 */
export async function getSchoolById(schoolId: string): Promise<School | null> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as School;
}

/**
 * Activates or deactivates a school.
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
 * Super Admin statistical aggregation.
 */
export interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalUsers: number;
}

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
