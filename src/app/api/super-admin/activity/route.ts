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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");
    const logType = searchParams.get("type") || "activity";
    const schoolId = searchParams.get("schoolId");
    const role = searchParams.get("role");
    const action = searchParams.get("action");
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();
    const limitCount = parseInt(searchParams.get("limit") || "100", 10);

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

    // 2. Query target collection
    const targetCollection =
      logType === "logins"
        ? AUDIT_COLLECTIONS.LOGIN_LOGS
        : AUDIT_COLLECTIONS.ACTIVITY_LOGS;

    let q = query(
      collection(db, targetCollection),
      orderBy("timestamp", "desc"),
      firestoreLimit(limitCount)
    );

    if (schoolId && schoolId !== "all") {
      q = query(
        collection(db, targetCollection),
        where("schoolId", "==", schoolId),
        orderBy("timestamp", "desc"),
        firestoreLimit(limitCount)
      );
    }

    const snap = await getDocs(q);
    let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    // In-memory filters for multi-dimensional compound filtering without index conflicts
    if (role && role !== "all") {
      logs = logs.filter((l) => l.role === role);
    }

    if (action && action !== "all") {
      logs = logs.filter((l) => l.action === action);
    }

    if (status && status !== "all") {
      logs = logs.filter((l) => l.status === status);
    }

    if (searchQuery) {
      logs = logs.filter(
        (l) =>
          l.userName?.toLowerCase().includes(searchQuery) ||
          l.userEmail?.toLowerCase().includes(searchQuery) ||
          l.email?.toLowerCase().includes(searchQuery) ||
          l.userId?.toLowerCase().includes(searchQuery) ||
          l.uid?.toLowerCase().includes(searchQuery) ||
          l.schoolName?.toLowerCase().includes(searchQuery) ||
          l.schoolId?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error("Failed to query activity logs:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching activity logs" },
      { status: 500 }
    );
  }
}
