import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import type { AppUser, UserStatus } from "@/types";

const VALID_STATUSES = new Set(["active", "inactive", "restricted", "suspended", "disabled"]);

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }
    const performer = authResult.user!;
    const performerUid = performer.uid;

    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.STANDARD_API, performerUid);
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    const body = await req.json();
    const { targetUid, status, reason } = body;

    if (!targetUid || !status) {
      return NextResponse.json(
        { error: "Missing required fields: targetUid, status" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(", ")}` },
        { status: 400 }
      );
    }

    // 1. Prevent self-lockout
    if (performerUid === targetUid && status !== "active") {
      return NextResponse.json(
        { error: "Super Admin cannot suspend, disable, or restrict their own account." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();

    // 2. Fetch Target User
    const targetDocRef = doc(db, COLLECTIONS.USERS, targetUid);
    const targetDocSnap = await getDoc(targetDocRef);
    if (!targetDocSnap.exists()) {
      return NextResponse.json(
        { error: "Target user not found." },
        { status: 404 }
      );
    }

    const targetUser = targetDocSnap.data() as AppUser;
    const previousStatus = targetUser.status;

    // 3. Update Target User Status in Firestore
    await updateDoc(targetDocRef, {
      status: status as UserStatus,
      updatedAt: serverTimestamp(),
    });

    // 4. Write Audit Log
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
      action: "USER_STATUS_CHANGE",
      targetId: targetUid,
      targetType: "user",
      targetName: targetUser.name || targetUser.email,
      performedBy: {
        uid: performer.uid,
        name: performer.name || "Super Admin",
        email: performer.email,
        role: performer.role,
      },
      previousState: { status: previousStatus },
      newState: { status: status },
      reason: reason || `Status updated to ${status} by Super Admin`,
      ipAddress,
      userAgent,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      targetUid,
      previousStatus,
      newStatus: status,
      message: `Account status updated to ${status}.`,
    });
  } catch (error: any) {
    console.error("Server-side user status change failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error performing user status change." },
      { status: 500 }
    );
  }
}
