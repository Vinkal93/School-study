import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser, UserRole } from "@/types";

export const KNOWN_SUPER_ADMIN_EMAILS = [
  "vinkal93041@gmail.com",
  "superadmin@schoolstudy.com",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return KNOWN_SUPER_ADMIN_EMAILS.includes(normalized);
}

export function isSuperAdminSession(_uid?: string | null): boolean {
  return false;
}

export function inferRoleFromEmail(email?: string | null): {
  role: UserRole;
  name: string;
  schoolId?: string | null;
} {
  const normalized = (email || "").trim().toLowerCase();
  
  if (normalized.includes("teacher") || normalized.includes("faculty") || normalized.includes("staff")) {
    return { role: "teacher", name: "Faculty Teacher", schoolId: null };
  }
  if (normalized.includes("admin") || normalized.includes("principal")) {
    return { role: "school_admin", name: "School Administrator", schoolId: null };
  }
  return { role: "student", name: "User", schoolId: null };
}

function getFallbackProfile(uid: string, email?: string | null): AppUser {
  const inferred = inferRoleFromEmail(email);
  return {
    uid,
    name: inferred.name,
    email: (email || "").trim().toLowerCase(),
    role: inferred.role,
    schoolId: inferred.schoolId || null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppUser;
}

export async function getUserProfile(uid: string, email?: string | null): Promise<AppUser | null> {
  const normalizedEmail = (email || "").trim().toLowerCase();

  try {
    const db = getFirebaseDb();
    if (!db) {
      return getFallbackProfile(uid, email);
    }

    const docRef = doc(db, COLLECTIONS.USERS, uid);
    
    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AppUser>;
        // AUTHORITATIVE ROLE: Use exactly what is saved in Firestore! Never overwrite!
        return { uid: docSnap.id, ...data } as AppUser;
      }
    } catch (dbErr: any) {
      console.warn("Firestore unavailable/offline, activating resilient profile:", dbErr?.message);
    }

    // Default safe fallback profile if document does not exist yet
    const fallbackProfile: AppUser = {
      uid,
      name: normalizedEmail ? normalizedEmail.split("@")[0] : "User",
      email: normalizedEmail,
      role: "student",
      schoolId: null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as AppUser;

    return fallbackProfile;
  } catch (error: any) {
    return getFallbackProfile(uid, email);
  }
}

/**
 * Guarantees that any manually created Firebase Auth user authenticating as Super Admin gets provisioned with super_admin role in Firestore.
 */
export async function ensureSuperAdminProfile(uid: string, email: string): Promise<AppUser> {
  const db = getFirebaseDb();
  const superAdminProfile: AppUser = {
    uid,
    name: email ? email.split("@")[0] : "Super Administrator",
    email: (email || "").trim().toLowerCase(),
    role: "super_admin",
    schoolId: "system",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppUser;

  if (db) {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    try {
      await setDoc(
        docRef,
        {
          ...superAdminProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e: any) {
      if (e?.code !== "permission-denied") {
        console.warn("Notice: super admin profile sync:", e?.message || e);
      }
    }
  }

  return superAdminProfile;
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const profile = await getUserProfile(uid);
  return profile?.role ?? null;
}
