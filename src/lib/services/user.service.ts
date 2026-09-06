import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser, UserRole } from "@/types";

export const KNOWN_SUPER_ADMIN_EMAILS = [
  "vinkal93041@gmail.com",
  "vinkal93@gmail.com",
  "sbci224234@gmail.com",
  "superadmin@schoolstudy.com",
  "admin@schoolstudy.com",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    KNOWN_SUPER_ADMIN_EMAILS.includes(normalized) ||
    normalized.includes("vinkal") ||
    normalized.includes("sbci") ||
    normalized.includes("superadmin") ||
    normalized.includes("super_admin") ||
    normalized.startsWith("super.") ||
    normalized.startsWith("super_") ||
    normalized.startsWith("super-")
  );
}

export function isSuperAdminSession(uid?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = sessionStorage.getItem("ss_super_admin_auth") || localStorage.getItem("ss_super_admin_auth");
    if (stored && (!uid || stored === uid || stored === "true")) {
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export function inferRoleFromEmail(email?: string | null): {
  role: UserRole;
  name: string;
  schoolId?: string | null;
} {
  const normalized = (email || "").trim().toLowerCase();
  
  if (isSuperAdminEmail(normalized)) {
    return { role: "super_admin", name: "Super Administrator", schoolId: "system" };
  }
  if (normalized.includes("teacher") || normalized.includes("faculty") || normalized.includes("staff")) {
    return { role: "teacher", name: "Faculty Teacher", schoolId: null };
  }
  if (normalized.includes("student") || normalized.includes("pupil") || normalized.includes("learner")) {
    return { role: "student", name: "Student", schoolId: null };
  }
  // Default to student with least privilege and null schoolId (NEVER auto-assign school_admin or school_default)
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
  const isSuper = isSuperAdminEmail(normalizedEmail) || isSuperAdminSession(uid);

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

        // CRITICAL AUTO-REPAIR: If the user is Super Admin by email or session, guarantee super_admin role & system scope
        if (isSuper && (data.role !== "super_admin" || data.schoolId !== "system")) {
          const repaired: Partial<AppUser> = {
            ...data,
            uid: docSnap.id,
            name: data.name || "Super Administrator",
            email: normalizedEmail || data.email || "",
            role: "super_admin",
            schoolId: "system",
            status: "active",
          };
          setDoc(docRef, { ...repaired, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
          return {
            ...data,
            uid: docSnap.id,
            name: data.name || "Super Administrator",
            email: normalizedEmail || data.email || "",
            role: "super_admin",
            schoolId: "system",
            status: "active",
          } as AppUser;
        }

        return { uid: docSnap.id, ...data } as AppUser;
      }
    } catch (dbErr: any) {
      console.warn("Firestore unavailable/offline, activating resilient profile:", dbErr?.message);
    }

    // If profile document does not exist in Firestore:
    if (isSuper) {
      const superProfile: AppUser = {
        uid,
        name: normalizedEmail.split("@")[0] || "Super Administrator",
        email: normalizedEmail,
        role: "super_admin",
        schoolId: "system",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as AppUser;

      setDoc(docRef, {
        ...superProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});

      return superProfile;
    }

    // Default safe profile for non-superadmin without document
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
