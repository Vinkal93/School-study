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
import type { AuditLogEntry, LoginLogEntry, AuditAction, AuditTargetType } from "@/types";

export const AUDIT_COLLECTIONS = {
  AUDIT_LOGS: "audit_logs",
  LOGIN_LOGS: "login_logs",
};

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
    let q = query(
      collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    if (uid) {
      q = query(
        collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS),
        where("uid", "==", uid),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LoginLogEntry, "id">),
    }));
  } catch (error) {
    console.warn("Could not fetch login logs:", error);
    return [];
  }
}
