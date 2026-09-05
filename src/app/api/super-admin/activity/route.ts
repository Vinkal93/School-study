import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser } from "@/types";

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const logType = searchParams.get("type") || "activity";
    const schoolId = searchParams.get("schoolId");
    const role = searchParams.get("role");
    const action = searchParams.get("action");
    const status = searchParams.get("status");
    const timeRange = searchParams.get("timeRange"); // "today", "week", "month", "all"
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();
    const limitCount = parseInt(searchParams.get("limit") || "100", 10);

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    const db = getFirebaseDb();
    const adminDb = await getAdminDbServerOnly();

    // 1. Authoritative Super Admin Authorization Verification
    let performer: AppUser | null = null;
    if (adminDb) {
      const pSnap = await adminDb.collection(COLLECTIONS.USERS).doc(performerUid).get();
      if (pSnap.exists) performer = pSnap.data() as AppUser;
    } else if (db) {
      const pSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
      if (pSnap.exists()) performer = pSnap.data() as AppUser;
    }

    if (!performer || performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    // 2. Resolve Target Collection
    let targetCollection = AUDIT_COLLECTIONS.ACTIVITY_LOGS;
    if (logType === "logins") {
      targetCollection = AUDIT_COLLECTIONS.LOGIN_LOGS;
    } else if (logType === "sessions") {
      targetCollection = "active_sessions";
    } else if (logType === "security") {
      targetCollection = AUDIT_COLLECTIONS.AUDIT_LOGS;
    }

    let logs: any[] = [];

    if (logType === "all") {
      // Aggregate across activities, logins, and audit logs
      const [actSnap, loginSnap, auditSnap] = await Promise.all([
        adminDb
          ? adminDb.collection(AUDIT_COLLECTIONS.ACTIVITY_LOGS).orderBy("timestamp", "desc").limit(50).get()
          : getDocs(query(collection(db, AUDIT_COLLECTIONS.ACTIVITY_LOGS), orderBy("timestamp", "desc"), firestoreLimit(50))),
        adminDb
          ? adminDb.collection(AUDIT_COLLECTIONS.LOGIN_LOGS).orderBy("timestamp", "desc").limit(50).get()
          : getDocs(query(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), orderBy("timestamp", "desc"), firestoreLimit(50))),
        adminDb
          ? adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).orderBy("timestamp", "desc").limit(50).get()
          : getDocs(query(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), orderBy("timestamp", "desc"), firestoreLimit(50))),
      ]);

      const actDocs = actSnap.docs.map((d: any) => ({ id: d.id, logCategory: "activity", ...d.data() }));
      const loginDocs = loginSnap.docs.map((d: any) => ({
        id: d.id,
        logCategory: "login",
        action: d.data().status === "success" ? "LOGIN" : "LOGIN_FAILED",
        userId: d.data().uid,
        userName: d.data().email?.split("@")[0] || "User",
        userEmail: d.data().email,
        ...d.data(),
      }));
      const auditDocs = auditSnap.docs.map((d: any) => ({
        id: d.id,
        logCategory: "security",
        userId: d.data().targetId || d.data().performedBy?.uid,
        userName: d.data().targetName || d.data().performedBy?.name,
        userEmail: d.data().targetEmail || d.data().performedBy?.email,
        role: d.data().performedBy?.role,
        status: "success",
        ...d.data(),
      }));

      logs = [...actDocs, ...loginDocs, ...auditDocs].sort((a: any, b: any) => {
        const tA = getTimestampMs(a.timestamp);
        const tB = getTimestampMs(b.timestamp);
        return tB - tA;
      }).slice(0, limitCount);
    } else {
      if (adminDb) {
        const orderField = targetCollection === "active_sessions" ? "startedAt" : "timestamp";
        let q: any = adminDb.collection(targetCollection).orderBy(orderField, "desc").limit(limitCount);
        if (schoolId && schoolId !== "all") {
          q = adminDb.collection(targetCollection).where("schoolId", "==", schoolId).orderBy(orderField, "desc").limit(limitCount);
        }
        const snap = await q.get();
        logs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      } else if (db) {
        const orderField = targetCollection === "active_sessions" ? "startedAt" : "timestamp";
        let q = query(collection(db, targetCollection), orderBy(orderField, "desc"), firestoreLimit(limitCount));
        if (schoolId && schoolId !== "all") {
          q = query(collection(db, targetCollection), where("schoolId", "==", schoolId), orderBy(orderField, "desc"), firestoreLimit(limitCount));
        }
        const snap = await getDocs(q);
        logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    }

    // In-memory filters for compound querying
    if (role && role !== "all") {
      logs = logs.filter((l) => l.role === role || l.actorRole === role || l.performedBy?.role === role);
    }

    if (action && action !== "all") {
      logs = logs.filter((l) => l.action === action);
    }

    if (status && status !== "all") {
      logs = logs.filter((l) => l.status === status);
    }

    if (timeRange && timeRange !== "all") {
      const now = Date.now();
      logs = logs.filter((l) => {
        const ms = getTimestampMs(l.timestamp || l.startedAt);
        if (!ms) return true;
        if (timeRange === "today") return now - ms <= 24 * 60 * 60 * 1000;
        if (timeRange === "week") return now - ms <= 7 * 24 * 60 * 60 * 1000;
        if (timeRange === "month") return now - ms <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    if (searchQuery) {
      logs = logs.filter(
        (l) =>
          l.userName?.toLowerCase().includes(searchQuery) ||
          l.userEmail?.toLowerCase().includes(searchQuery) ||
          l.email?.toLowerCase().includes(searchQuery) ||
          l.userId?.toLowerCase().includes(searchQuery) ||
          l.uid?.toLowerCase().includes(searchQuery) ||
          l.targetId?.toLowerCase().includes(searchQuery) ||
          l.schoolName?.toLowerCase().includes(searchQuery) ||
          l.schoolId?.toLowerCase().includes(searchQuery) ||
          l.ipAddress?.toLowerCase().includes(searchQuery) ||
          l.action?.toLowerCase().includes(searchQuery)
      );
    }

    // 3. Authoritative Top 7 KPIs Computation
    let activeUsers = 0;
    let onlineNow = 0;
    let suspendedUsers = 0;
    let loginsToday = 0;
    let failedLogins = 0;
    let activeSessions = 0;
    let securityEvents = 0;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    // Users snapshot for KPIs
    try {
      const usersSnap = adminDb
        ? await adminDb.collection(COLLECTIONS.USERS).get()
        : await getDocs(collection(db, COLLECTIONS.USERS));

      usersSnap.forEach((d: any) => {
        const u = d.data();
        if (u.status === "active") activeUsers++;
        if (u.status === "suspended" || u.status === "blocked" || u.status === "disabled") suspendedUsers++;
        const activeMs = getTimestampMs(u.lastActiveAt || u.lastLoginAt || u.updatedAt);
        if (activeMs >= fifteenMinsAgo) onlineNow++;
      });
    } catch {}

    // Sessions & Logins for KPIs
    try {
      const sessionsSnap = adminDb
        ? await adminDb.collection("active_sessions").where("status", "==", "active").get()
        : await getDocs(query(collection(db, "active_sessions"), where("status", "==", "active")));
      activeSessions = sessionsSnap.size;
    } catch {}

    try {
      const loginsSnap = adminDb
        ? await adminDb.collection(AUDIT_COLLECTIONS.LOGIN_LOGS).limit(200).get()
        : await getDocs(query(collection(db, AUDIT_COLLECTIONS.LOGIN_LOGS), firestoreLimit(200)));

      loginsSnap.forEach((d: any) => {
        const l = d.data();
        const ms = getTimestampMs(l.timestamp);
        if (ms >= oneDayAgo) {
          if (l.status === "success") loginsToday++;
          if (l.status === "failed") failedLogins++;
        }
      });
    } catch {}

    try {
      const auditsSnap = adminDb
        ? await adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).limit(200).get()
        : await getDocs(query(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), firestoreLimit(200)));

      auditsSnap.forEach((d: any) => {
        const a = d.data();
        const ms = getTimestampMs(a.timestamp);
        if (ms >= oneDayAgo) securityEvents++;
      });
    } catch {}

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
      stats: {
        activeUsers,
        onlineNow,
        loginsToday,
        failedLogins,
        activeSessions,
        suspendedUsers,
        securityEvents,
      },
    });
  } catch (error: any) {
    console.error("Failed to query activity logs:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching activity logs" },
      { status: 500 }
    );
  }
}

function getTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val.toMillis) return val.toMillis();
  if (val.toDate) return val.toDate().getTime();
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
