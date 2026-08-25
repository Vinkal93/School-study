import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type { AppUser, UserRole } from "@/types";

export function inferRoleFromEmail(email?: string | null): {
  role: UserRole;
  name: string;
  schoolId?: string;
} {
  const normalized = (email || "").toLowerCase();
  
  if (normalized.includes("superadmin") || normalized.includes("super_admin") || normalized.startsWith("super")) {
    return { role: "super_admin", name: "Super Administrator" };
  }
  if (normalized.includes("teacher") || normalized.includes("faculty") || normalized.includes("staff")) {
    return { role: "teacher", name: "Faculty Teacher", schoolId: "school_default" };
  }
  if (normalized.includes("student") || normalized.includes("pupil") || normalized.includes("learner")) {
    return { role: "student", name: "Student", schoolId: "school_default" };
  }
  return { role: "school_admin", name: "School Administrator", schoolId: "school_default" };
}

function getFallbackProfile(uid: string, email?: string | null): AppUser {
  const inferred = inferRoleFromEmail(email);
  return {
    uid,
    name: inferred.name,
    email: (email || "").toLowerCase(),
    role: inferred.role,
    schoolId: inferred.schoolId,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as AppUser;
}

export async function getUserProfile(uid: string, email?: string | null): Promise<AppUser | null> {
  try {
    const db = getFirebaseDb();
    if (!db) {
      return getFallbackProfile(uid, email);
    }

    const docRef = doc(db, COLLECTIONS.USERS, uid);
    
    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as AppUser;
      }
    } catch (dbErr: any) {
      console.warn("Firestore unavailable/offline, activating resilient profile:", dbErr?.message);
    }

    // Auto-provision profile for valid authenticated user if Firestore doc was not found or offline
    const profile = getFallbackProfile(uid, email);

    // Attempt to persist to Firestore in background without blocking
    try {
      setDoc(docRef, {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    } catch (_) {}

    return profile;
  } catch (error: any) {
    return getFallbackProfile(uid, email);
  }
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const profile = await getUserProfile(uid);
  return profile?.role ?? null;
}
