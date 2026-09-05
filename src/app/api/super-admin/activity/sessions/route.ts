import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import { updateUserSecurityControl } from "@/lib/emergency/emergencyEngine";
import type { AppUser, ActiveSessionEntry } from "@/types";

async function getAdminAuthServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return adminModule.adminAuth || null;
  } catch (e) {
    return null;
  }
}

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
    const schoolId = searchParams.get("schoolId");
    const status = searchParams.get("status") || "active";
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

    // 2. Fetch Sessions
    let sessions: ActiveSessionEntry[] = [];
    if (adminDb) {
      let q: any = adminDb.collection("active_sessions").orderBy("startedAt", "desc").limit(limitCount);
      if (schoolId && schoolId !== "all") {
        q = adminDb.collection("active_sessions").where("schoolId", "==", schoolId).orderBy("startedAt", "desc").limit(limitCount);
      }
      const snap = await q.get();
      sessions = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else if (db) {
      let q = query(
        collection(db, "active_sessions"),
        orderBy("startedAt", "desc"),
        firestoreLimit(limitCount)
      );
      if (schoolId && schoolId !== "all") {
        q = query(
          collection(db, "active_sessions"),
          where("schoolId", "==", schoolId),
          orderBy("startedAt", "desc"),
          firestoreLimit(limitCount)
        );
      }
      const snap = await getDocs(q);
      sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ActiveSessionEntry[];
    }

    // Filter status and search in memory
    if (status && status !== "all") {
      sessions = sessions.filter((s) => s.status === status);
    }

    if (searchQuery) {
      sessions = sessions.filter(
        (s) =>
          s.userName?.toLowerCase().includes(searchQuery) ||
          s.userEmail?.toLowerCase().includes(searchQuery) ||
          s.userId?.toLowerCase().includes(searchQuery) ||
          s.sessionId?.toLowerCase().includes(searchQuery) ||
          s.schoolId?.toLowerCase().includes(searchQuery) ||
          s.ipAddress?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error: any) {
    console.error("Failed to query active sessions:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching active sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, performerUid, sessionId, targetUserId, reason } = body;

    if (!performerUid) {
      return NextResponse.json({ error: "Missing performerUid" }, { status: 401 });
    }

    const db = getFirebaseDb();
    const adminDb = await getAdminDbServerOnly();
    const adminAuth = await getAdminAuthServerOnly();

    // 1. Authorize Super Admin
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

    const mandatoryReason = reason?.trim() || "Super Admin administrative session revocation";
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ACTION: REVOKE_SESSION
    if (action === "REVOKE_SESSION") {
      if (!sessionId || !targetUserId) {
        return NextResponse.json(
          { error: "Both sessionId and targetUserId are required" },
          { status: 400 }
        );
      }

      // Mark session as revoked in active_sessions
      const sessionUpdate = {
        status: "revoked",
        revokedAt: new Date().toISOString(),
        revokedBy: performer.uid,
        revocationReason: mandatoryReason,
      };

      if (adminDb) {
        await adminDb.collection("active_sessions").doc(sessionId).set(sessionUpdate, { merge: true });
      } else if (db) {
        await updateDoc(doc(db, "active_sessions", sessionId), sessionUpdate);
      }

      // Invalidate Firebase Auth refresh tokens
      if (adminAuth) {
        await adminAuth.revokeRefreshTokens(targetUserId).catch((err) => {
          console.warn("adminAuth token revocation notice:", err);
        });
      }

      // Bump realtime security version on userSecurityControl
      await updateUserSecurityControl(
        targetUserId,
        {
          securityVersion: Date.now(),
          requireReLogin: true,
          reason: mandatoryReason,
        },
        performer.uid,
        mandatoryReason
      );

      // Audit Log
      const auditEntry = {
        action: "SESSION_REVOKED",
        targetId: targetUserId,
        targetType: "user",
        performedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
          role: performer.role,
        },
        previousState: { sessionId, status: "active" },
        newState: { sessionId, status: "revoked" },
        reason: mandatoryReason,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (adminDb) {
        await adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).add(auditEntry).catch(() => {});
      } else if (db) {
        await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
          ...auditEntry,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: "REVOKE_SESSION",
        sessionId,
        targetUserId,
        message: "Session revoked successfully and user security tokens invalidated.",
      });
    }

    // ACTION: FORCE_LOGOUT or REVOKE_ALL_SESSIONS
    else if (action === "FORCE_LOGOUT" || action === "REVOKE_ALL_SESSIONS") {
      if (!targetUserId) {
        return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
      }

      // Mark all user sessions as revoked in active_sessions
      if (adminDb) {
        const snap = await adminDb.collection("active_sessions").where("userId", "==", targetUserId).get();
        const batch = adminDb.batch();
        snap.forEach((d: any) => {
          batch.update(d.ref, {
            status: "revoked",
            revokedAt: new Date().toISOString(),
            revokedBy: performer.uid,
          });
        });
        await batch.commit().catch(() => {});
      } else if (db) {
        const snap = await getDocs(
          query(collection(db, "active_sessions"), where("userId", "==", targetUserId))
        );
        for (const d of snap.docs) {
          await updateDoc(d.ref, {
            status: "revoked",
            revokedAt: serverTimestamp(),
            revokedBy: performer.uid,
          }).catch(() => {});
        }
      }

      // Invalidate Firebase Auth refresh tokens
      if (adminAuth) {
        await adminAuth.revokeRefreshTokens(targetUserId).catch((err) => {
          console.warn("adminAuth token revocation notice:", err);
        });
      }

      // Bump realtime security version on userSecurityControl
      await updateUserSecurityControl(
        targetUserId,
        {
          securityVersion: Date.now(),
          requireReLogin: true,
          reason: mandatoryReason,
        },
        performer.uid,
        mandatoryReason
      );

      // Audit Log
      const auditEntry = {
        action: "FORCE_LOGOUT",
        targetId: targetUserId,
        targetType: "user",
        performedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
          role: performer.role,
        },
        previousState: { activeSessions: "active" },
        newState: { activeSessions: "revoked", forceLogout: true },
        reason: mandatoryReason,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (adminDb) {
        await adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).add(auditEntry).catch(() => {});
      } else if (db) {
        await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
          ...auditEntry,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: "FORCE_LOGOUT",
        targetUserId,
        message: "User forcibly logged out across all sessions with tokens invalidated.",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to execute session administrative action:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error executing session action" },
      { status: 500 }
    );
  }
}
