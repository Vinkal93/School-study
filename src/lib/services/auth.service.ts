import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser } from "@/types";

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (typeof window !== "undefined") {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.warn("Could not set browser local persistence:", e);
    }
  }
  const credential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function onAuthChanged(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export async function checkSuperAdminExists(): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "super_admin")
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.warn("Could not check super admin existence:", error);
    return false;
  }
}

export async function createInitialSuperAdmin(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    params.email.trim().toLowerCase(),
    params.password
  );

  const uid = userCredential.user.uid;

  // Create user profile in Firestore
  const superAdminProfile: Omit<AppUser, "createdAt" | "updatedAt"> & {
    createdAt: any;
    updatedAt: any;
  } = {
    uid,
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    role: "super_admin",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, COLLECTIONS.USERS, uid), superAdminProfile);

  return {
    ...superAdminProfile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppUser;
}
