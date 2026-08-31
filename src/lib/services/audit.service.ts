import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type {
  AuditLogEntry,
  LoginLogEntry,
  AuditAction,
  AuditTargetType,
  ActivityLogEntry,
  ActivityAction,
  UserRole,
} from "@/types";

export const AUDIT_COLLECTIONS = {
  AUDIT_LOGS: "audit_logs",
  LOGIN_LOGS: "login_logs",
  ACTIVITY_LOGS: "activity_logs",
};

/**
 * Parses user agent string to extract basic device and browser info.
 */
export function parseUserAgentInfo(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: "Unknown",
      platform: "Unknown",
      deviceType: "desktop" as const,
    };
  }

  let browser = "Unknown";
  if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Safari/")) browser = "Safari";
  else if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) browser = "Internet Explorer";

  let platform = "Unknown";
  if (userAgent.includes("Windows")) platform = "Windows";
  else if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) platform = "macOS";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) platform = "iOS";
  else if (userAgent.includes("Android")) platform = "Android";
  else if (userAgent.includes("Linux")) platform = "Linux";

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (userAgent.includes("Mobile") || userAgent.includes("Android")) deviceType = "mobile";
  if (userAgent.includes("iPad") || userAgent.includes("Tablet")) deviceType = "tablet";

  return { browser, platform, deviceType };
}

/**
 * Writes an administrative audit log entry to Firestore.
 */
export async function logAuditEvent(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
      ...entry,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn("Failed to write audit log entry:", error);
    return "";
  }
}

/**
 * Writes a login attempt log entry to Firestore.
 */
export async function logLoginAttempt(
  entry: Omit<LoginLogEntry, "id" | "timestamp">
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), {
      ...entry,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn("Failed to record login log entry:", error);
    return "";
  }
}

/**
 * Writes a platform activity event to Firestore.
 */
export async function logActivityEvent(
  entry: Omit<ActivityLogEntry, "id" | "timestamp">
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const docRef = await addDoc(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), {
      ...entry,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.warn("Failed to record activity log:", error);
    return "";
  }
}

/**
 * Fetches recent audit logs for the Super Admin platform control center.
 */
export async function getAuditLogs(
  limitCount = 50,
  filter?: { targetId?: string; action?: AuditAction }
): Promise<AuditLogEntry[]> {
  try {
    const db = getFirebaseDb();
    let q = query(
      collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    if (filter?.targetId) {
      q = query(
        collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
        where("targetId", "==", filter.targetId),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<AuditLogEntry, "id">),
    }));
  } catch (error) {
    console.warn("Could not fetch audit logs:", error);
    return [];
  }
}

/**
 * Fetches login logs for a user or platform-wide.
 */
export async function getLoginLogs(
  limitCount = 50,
  uid?: string
): Promise<LoginLogEntry[]> {
  try {
    const db = getFirebaseDb();
    let q;

    try {
      if (uid) {
        q = query(
          collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
          where("uid", "==", uid),
          orderBy("timestamp", "desc"),
          limit(limitCount)
        );
      } else {
        q = query(
          collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
          orderBy("timestamp", "desc"),
          limit(limitCount)
        );
      }
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<LoginLogEntry, "id">),
      }));
    } catch (indexErr) {
      // Fallback: Query without orderBy and sort in memory
      const simpleQuery = uid
        ? query(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), where("uid", "==", uid), limit(limitCount))
        : query(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), limit(limitCount));
      const snap = await getDocs(simpleQuery);
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<LoginLogEntry, "id">),
      }));
      return items.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || (typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : 0);
        const tB = b.timestamp?.seconds || (typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : 0);
        return tB - tA;
      });
    }
  } catch (error) {
    console.warn("Could not fetch login logs:", error);
    return [];
  }
}

/**
 * Fetches user activity logs with optional filtering.
 */
export async function getActivityLogs(
  limitCount = 50,
  filter?: {
    userId?: string;
    schoolId?: string;
    role?: UserRole;
    action?: ActivityAction;
  }
): Promise<ActivityLogEntry[]> {
  try {
    const db = getFirebaseDb();
    let q = query(
      collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    if (filter?.userId) {
      q = query(
        collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
        where("userId", "==", filter.userId),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
    } else if (filter?.schoolId) {
      q = query(
        collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
        where("schoolId", "==", filter.schoolId),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ActivityLogEntry, "id">),
    }));
  } catch (error) {
    console.warn("Could not fetch activity logs:", error);
    return [];
  }
}
