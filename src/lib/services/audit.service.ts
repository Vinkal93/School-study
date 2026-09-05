import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import type {
  AuditLogEntry,
  LoginLogEntry,
  ActiveSessionEntry,
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
  ACTIVE_SESSIONS: "active_sessions",
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

    // 1. If login succeeded, create/upsert active session record
    if (entry.status === "success" && entry.uid) {
      const sessionId = `sess_${entry.uid}_${Date.now()}`;
      await setDoc(doc(db, AUDIT_COLLECTIONS.ACTIVE_SESSIONS, sessionId), {
        sessionId,
        userId: entry.uid,
        userEmail: entry.email,
        role: entry.role || "student",
        schoolId: entry.schoolId || null,
        ipAddress: entry.ipAddress || "unknown",
        userAgent: entry.userAgent || "unknown",
        browser: entry.browser || "Unknown",
        platform: entry.platform || "Unknown",
        deviceType: entry.deviceType || "desktop",
        status: "active",
        startedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      }).catch((e) => console.warn("Notice: Active session creation notice:", e));
    }

    // 2. If login failed, automatically record a Security Event in audit_logs
    if (entry.status === "failed") {
      await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
        action: "LOGIN_FAILED",
        targetId: entry.uid || "unknown",
        targetType: "user",
        targetName: entry.email,
        targetEmail: entry.email,
        schoolId: entry.schoolId || null,
        performedBy: {
          uid: entry.uid || "anonymous",
          name: entry.email,
          email: entry.email,
          role: entry.role || "student",
        },
        reason: entry.failureReason || "Authentication attempt failed",
        ipAddress: entry.ipAddress || "unknown",
        userAgent: entry.userAgent || "unknown",
        timestamp: serverTimestamp(),
        metadata: {
          browser: entry.browser,
          platform: entry.platform,
          deviceType: entry.deviceType,
        },
      }).catch((e) => console.warn("Notice: Security audit failure notice:", e));
    }

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

    try {
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ActivityLogEntry, "id">),
      }));
    } catch (indexErr) {
      // Fallback: Query without composite orderBy and sort in memory
      let simpleQuery = query(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), limit(limitCount));
      if (filter?.userId) {
        simpleQuery = query(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), where("userId", "==", filter.userId), limit(limitCount));
      } else if (filter?.schoolId) {
        simpleQuery = query(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), where("schoolId", "==", filter.schoolId), limit(limitCount));
      }
      const snap = await getDocs(simpleQuery);
      const items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ActivityLogEntry, "id">),
      }));
      return items.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || (typeof a.timestamp === "string" ? new Date(a.timestamp).getTime() : 0);
        const tB = b.timestamp?.seconds || (typeof b.timestamp === "string" ? new Date(b.timestamp).getTime() : 0);
        return tB - tA;
      });
    }
  } catch (error) {
    console.warn("Could not fetch activity logs:", error);
    return [];
  }
}

/**
 * Realtime subscription to platform activity logs.
 */
export function subscribeToActivityLogs(
  callback: (logs: ActivityLogEntry[]) => void,
  limitCount = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ActivityLogEntry[];
      callback(logs);
    },
    (err) => console.warn("Activity logs subscription notice:", err)
  );
}

/**
 * Realtime subscription to login attempt logs.
 */
export function subscribeToLoginLogs(
  callback: (logs: LoginLogEntry[]) => void,
  limitCount = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as LoginLogEntry[];
      callback(logs);
    },
    (err) => console.warn("Login logs subscription notice:", err)
  );
}

/**
 * Realtime subscription to audit / security events.
 */
export function subscribeToAuditLogs(
  callback: (logs: AuditLogEntry[]) => void,
  limitCount = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const logs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AuditLogEntry[];
      callback(logs);
    },
    (err) => console.warn("Audit logs subscription notice:", err)
  );
}

/**
 * Realtime subscription to active sessions.
 */
export function subscribeToActiveSessions(
  callback: (sessions: ActiveSessionEntry[]) => void,
  limitCount = 50
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, AUDIT_COLLECTIONS.ACTIVE_SESSIONS),
    orderBy("startedAt", "desc"),
    limit(limitCount)
  );
  return onSnapshot(
    q,
    (snap) => {
      const sessions = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ActiveSessionEntry[];
      callback(sessions);
    },
    (err) => console.warn("Active sessions subscription notice:", err)
  );
}
