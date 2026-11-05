import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { normalizeRole } from "@/lib/utils/redirect-by-role";
import type { AppUser, UserRole } from "@/types";

export const KNOWN_SUPER_ADMIN_EMAILS = [
  "vinkal93041@gmail.com",
  "vinkalp041@gmail.com",
  "vinkal93@gmail.com",
  "sbci224234@gmail.com",
  "superadmin@schoolstudy.com",
  "admin@schoolstudy.com",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const configured = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPER_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS.split(",")
    : []
  ).map((e) => e.trim().toLowerCase()).filter(Boolean);

  return KNOWN_SUPER_ADMIN_EMAILS.includes(normalized) || configured.includes(normalized);
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
  
  if (isSuperAdminEmail(normalized)) {
    return { role: "super_admin", name: "Super Administrator", schoolId: "system" };
  }
  if (normalized.includes("teacher") || normalized.includes("faculty") || normalized.includes("staff")) {
    return { role: "teacher", name: "Faculty Teacher", schoolId: null };
  }
  if (
    normalized.includes("admin") ||
    normalized.includes("principal") ||
    normalized.includes("school") ||
    normalized.includes("manager") ||
    normalized.includes("head")
  ) {
    return { role: "school_admin", name: "School Administrator", schoolId: null };
  }
  return { role: "student", name: "User", schoolId: null };
}

function getFallbackProfile(uid: string, email?: string | null): AppUser {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("school_study_auth_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.uid === uid) {
          return {
            ...parsed,
            role: normalizeRole(parsed.role),
          } as AppUser;
        }
      }
    } catch {}
  }
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

/**
 * Resolves authoritative user profile via Firebase Auth claims, Firestore client SDK,
 * or Server-Side Admin API self-healing endpoint.
 */
export async function getUserProfile(uid: string, email?: string | null): Promise<AppUser | null> {
  const normalizedEmail = (email || "").trim().toLowerCase();

  // 1. Super Admin priority check
  if (normalizedEmail && isSuperAdminEmail(normalizedEmail)) {
    try {
      return await ensureSuperAdminProfile(uid, normalizedEmail);
    } catch (e) {
      console.warn("Could not ensure super admin profile, continuing:", e);
      return {
        uid,
        name: normalizedEmail.split("@")[0] || "Super Administrator",
        email: normalizedEmail,
        role: "super_admin",
        schoolId: "system",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as AppUser;
    }
  }

  // 2. Cryptographic Token Claims Priority:
  // If the user's Firebase Auth token holds role claims, never downgrade to student!
  let tokenRole: UserRole | null = null;
  let tokenSchoolId: string | null = null;
  let idToken: string | null = null;

  try {
    const auth = getFirebaseAuth();
    if (auth?.currentUser && auth.currentUser.uid === uid) {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      idToken = idTokenResult.token;
      if (idTokenResult.claims.role) {
        tokenRole = normalizeRole(idTokenResult.claims.role as string);
      }
      if (typeof idTokenResult.claims.schoolId === "string") {
        tokenSchoolId = idTokenResult.claims.schoolId;
      }
    }
  } catch (claimErr) {
    // Non-blocking claim inspection
  }

  try {
    const db = getFirebaseDb();
    if (db) {
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      let docSnap = await getDoc(docRef);

      // If document not found, retry up to 2 times for in-flight writes
      if (!docSnap.exists()) {
        for (let attempt = 0; attempt < 2; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          docSnap = await getDoc(docRef);
          if (docSnap.exists()) break;
        }
      }

      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AppUser>;
        let rawRole = data.role || tokenRole || "student";
        let canonicalRole = normalizeRole(rawRole);
        let schoolId = data.schoolId || tokenSchoolId || null;

        // Auto-heal school association: If user is school_admin and schoolId is missing, empty, or 'school_default',
        // look up the registered school where adminEmail matches user email or adminId matches uid.
        if (canonicalRole === "school_admin" && (!schoolId || schoolId === "school_default")) {
          try {
            const userEmail = (email || data.email || "").trim().toLowerCase();
            if (userEmail) {
              const { collection: fsCol, query: fsQ, where: fsW, getDocs: fsGetDocs, updateDoc: fsUpdateDoc } = await import("firebase/firestore");
              const schoolsQ = fsQ(
                fsCol(db, COLLECTIONS.SCHOOLS),
                fsW("adminEmail", "==", userEmail)
              );
              const schoolsSnap = await fsGetDocs(schoolsQ);
              if (!schoolsSnap.empty) {
                schoolId = schoolsSnap.docs[0].id;
                fsUpdateDoc(docRef, { schoolId, role: "school_admin" }).catch(() => {});
              } else {
                const idQ = fsQ(
                  fsCol(db, COLLECTIONS.SCHOOLS),
                  fsW("adminUid", "==", uid)
                );
                const idSnap = await fsGetDocs(idQ);
                if (!idSnap.empty) {
                  schoolId = idSnap.docs[0].id;
                  fsUpdateDoc(docRef, { schoolId, role: "school_admin" }).catch(() => {});
                }
              }
            }
          } catch (healErr) {
            console.warn("Notice: School admin self-healing notice:", healErr);
          }
        }

        return {
          uid: docSnap.id,
          ...data,
          role: canonicalRole,
          schoolId,
        } as AppUser;
      }
    }
  } catch (dbErr: any) {
    console.warn("Firestore client fetch notice, trying authoritative server profile:", dbErr?.message);
  }

  // 3. Authoritative Server Self-Healing Profile Call
  // If user document is missing or client SDK had permission issues,
  // request server-side profile resolution which runs privileged Admin SDK.
  if (typeof window !== "undefined" && idToken) {
    try {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.profile) {
          return {
            ...data.profile,
            role: normalizeRole(data.profile.role),
          } as AppUser;
        }
      }
    } catch (serverProfileErr) {
      console.warn("Server profile lookup notice:", serverProfileErr);
    }
  }

  // Check if an active registration is in flight with cached admin profile
  if (typeof window !== "undefined") {
    try {
      const cachedAdmin = sessionStorage.getItem(`pending_school_admin_${uid}`);
      if (cachedAdmin) {
        const parsed = JSON.parse(cachedAdmin);
        if (parsed && (parsed.role === "school_admin" || parsed.role === "admin")) {
          return {
            ...parsed,
            role: "school_admin",
          } as AppUser;
        }
      }
    } catch (e) {}
  }

  // If token role was school_admin, never return student!
  if (tokenRole === "school_admin") {
    return {
      uid,
      name: email ? email.split("@")[0] : "School Administrator",
      email: normalizedEmail,
      role: "school_admin",
      schoolId: tokenSchoolId || null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as AppUser;
  }

  // Fallback profile if user doc is not yet in Firestore (e.g. sync lag, offline, or transient error)
  return getFallbackProfile(uid, email);
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
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(
          docRef,
          {
            ...superAdminProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
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
