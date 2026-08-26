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
import type { AppUser, AuditLogEntry } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const action = searchParams.get("action");
    const role = searchParams.get("role");
    const schoolId = searchParams.get("schoolId");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();
    const limitCount = parseInt(searchParams.get("limit") || "150", 10);

    if (!performerUid) {
      return NextResponse.json(
        { error: "Missing performerUid parameter" },
        { status: 401 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify Super Admin authorization
    const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
    if (!performerSnap.exists()) {
      return NextResponse.json({ error: "Performer account not found" }, { status: 403 });
    }

    const performer = performerSnap.data() as AppUser;
    if (performer.role !== "super_admin" || performer.status !== "active") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    // 2. Query Audit Logs
    const q = query(
      collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS),
      orderBy("timestamp", "desc"),
      firestoreLimit(limitCount)
    );

    const snap = await getDocs(q);
    let logs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AuditLogEntry[];

    // In-memory filters for compound search without index errors
    if (action && action !== "all") {
      logs = logs.filter((l) => l.action === action);
    }

    if (role && role !== "all") {
      logs = logs.filter(
        (l) => l.actorRole === role || l.performedBy?.role === role
      );
    }

    if (schoolId && schoolId !== "all") {
      logs = logs.filter(
        (l) =>
          l.actorSchoolId === schoolId ||
          l.targetSchoolId === schoolId ||
          l.performedBy?.schoolId === schoolId
      );
    }

    if (searchQuery) {
      logs = logs.filter(
        (l) =>
          l.actorName?.toLowerCase().includes(searchQuery) ||
          l.actorEmail?.toLowerCase().includes(searchQuery) ||
          l.performedBy?.name?.toLowerCase().includes(searchQuery) ||
          l.performedBy?.email?.toLowerCase().includes(searchQuery) ||
          l.targetUserName?.toLowerCase().includes(searchQuery) ||
          l.targetName?.toLowerCase().includes(searchQuery) ||
          l.reason?.toLowerCase().includes(searchQuery) ||
          l.action?.toLowerCase().includes(searchQuery) ||
          l.targetUserId?.toLowerCase().includes(searchQuery) ||
          l.targetId?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error("Failed to query audit logs:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching audit logs" },
      { status: 500 }
    );
  }
}
