import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type { AppUser, AccountRestriction } from "@/types";

export const RESTRICTION_COLLECTION = "account_restrictions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, performerUid, targetUid, reason, duration, expiresAt } = body;

    if (!performerUid || !targetUid || !action) {
      return NextResponse.json(
        { error: "Missing required fields: action, performerUid, targetUid" },
        { status: 400 }
      );
    }

    if (action !== "RESTRICT" && action !== "UNRESTRICT") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'RESTRICT' or 'UNRESTRICT'." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();

    // 1. Verify Performer is active Super Admin
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

    // 2. Prevent Self-Lockout / Self-Restriction
    if (performerUid === targetUid) {
      return NextResponse.json(
        { error: "Super Admin cannot restrict or suspend their own account." },
        { status: 400 }
      );
    }

    // 3. Fetch Target User
    const targetRef = doc(db, COLLECTIONS.USERS, targetUid);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const targetUser = targetSnap.data() as AppUser;
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (action === "RESTRICT") {
      if (!reason) {
        return NextResponse.json(
          { error: "Restriction reason is required." },
          { status: 400 }
        );
      }

      // Create restriction document
      const expiresTimestamp =
        duration === "temporary" && expiresAt
          ? Timestamp.fromDate(new Date(expiresAt))
          : null;

      const restrictionDoc: Omit<AccountRestriction, "id"> = {
        userId: targetUid,
        userName: targetUser.name || "User",
        userEmail: targetUser.email,
        schoolId: targetUser.schoolId || null,
        status: "active",
        reason,
        duration: duration || "permanent",
        expiresAt: expiresTimestamp,
        restrictedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
        },
        createdAt: serverTimestamp() as any,
      };

      await addDoc(collection(db, RESTRICTION_COLLECTION), restrictionDoc);

      // Update Target User Status
      await updateDoc(targetRef, {
        status: "restricted",
        updatedAt: serverTimestamp(),
      });

      // Write Audit Log
      await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
        action: "USER_RESTRICT",
        targetId: targetUid,
        targetType: "user",
        targetName: targetUser.name,
        performedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
          role: performer.role,
        },
        previousState: { status: targetUser.status },
        newState: {
          status: "restricted",
          reason,
          duration: duration || "permanent",
          expiresAt: expiresAt || "permanent",
        },
        reason,
        ipAddress,
        userAgent,
        timestamp: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        targetUid,
        status: "restricted",
        message: `Account restricted: ${reason}`,
      });
    } else {
      // action === "UNRESTRICT"
      // Find active restrictions and revoke them
      const activeRestrictionsQuery = query(
        collection(db, RESTRICTION_COLLECTION),
        where("userId", "==", targetUid),
        where("status", "==", "active")
      );
      const activeSnaps = await getDocs(activeRestrictionsQuery);
      await Promise.all(
        activeSnaps.docs.map((d) =>
          updateDoc(d.ref, {
            status: "revoked",
            revokedAt: serverTimestamp(),
            revokedBy: {
              uid: performer.uid,
              name: performer.name || "Super Admin",
              email: performer.email,
            },
            revocationReason: reason || "Restriction removed by Super Admin",
          })
        )
      );

      // Restore User Status to Active
      await updateDoc(targetRef, {
        status: "active",
        updatedAt: serverTimestamp(),
      });

      // Write Audit Log
      await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
        action: "USER_UNRESTRICT",
        targetId: targetUid,
        targetType: "user",
        targetName: targetUser.name,
        performedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
          role: performer.role,
        },
        previousState: { status: targetUser.status },
        newState: { status: "active" },
        reason: reason || "Restriction removed by Super Admin",
        ipAddress,
        userAgent,
        timestamp: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        targetUid,
        status: "active",
        message: "Restriction removed successfully. Account restored to active.",
      });
    }
  } catch (error: any) {
    console.error("Account restriction operation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error processing restriction." },
      { status: 500 }
    );
  }
}
