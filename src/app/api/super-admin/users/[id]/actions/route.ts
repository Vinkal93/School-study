import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import { updateUserSecurityControl } from "@/lib/emergency/emergencyEngine";
import type { AppUser, UserRole, UserStatus } from "@/types";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await req.json();
    const {
      action,
      performerUid,
      reason,
      newRole,
      newSchoolId,
      newStatus,
      newPassword,
      profileUpdates,
    } = body;

    if (!performerUid) {
      return NextResponse.json({ error: "Missing performerUid parameter" }, { status: 401 });
    }

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    const db = getFirebaseDb();
    const adminDb = await getAdminDbServerOnly();
    const adminAuth = await getAdminAuthServerOnly();

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
        { error: "Unauthorized. Active Super Admin permission required." },
        { status: 403 }
      );
    }

    // 2. Fetch Target User Document
    let targetUser: AppUser | null = null;
    if (adminDb) {
      const uSnap = await adminDb.collection(COLLECTIONS.USERS).doc(targetUserId).get();
      if (uSnap.exists) targetUser = { uid: uSnap.id, ...uSnap.data() } as AppUser;
    } else if (db) {
      const uSnap = await getDoc(doc(db, COLLECTIONS.USERS, targetUserId));
      if (uSnap.exists()) targetUser = { uid: uSnap.id, ...uSnap.data() } as AppUser;
    }

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const mandatoryReason = reason && reason.trim() ? reason.trim() : "Super Admin administrative action";
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    let auditAction = "USER_UPDATED";
    let previousState: any = {};
    let newState: any = {};
    const userUpdates: Record<string, any> = { updatedAt: new Date() };

    // ACTION A: CHANGE ROLE
    if (action === "CHANGE_ROLE") {
      if (!newRole || !["super_admin", "school_admin", "teacher", "student"].includes(newRole)) {
        return NextResponse.json({ error: "Valid newRole is required" }, { status: 400 });
      }

      auditAction = "ROLE_CHANGED";
      previousState = { role: targetUser.role };
      newState = { role: newRole };
      userUpdates.role = newRole;

      // Increment security version so new role takes effect upon session refresh
      await updateUserSecurityControl(
        targetUserId,
        { securityVersion: Date.now(), requireReLogin: true },
        performer.uid,
        mandatoryReason
      );
    }

    // ACTION B: CHANGE SCHOOL (MOVE USER TO ANOTHER TENANT)
    else if (action === "CHANGE_SCHOOL") {
      if (!newSchoolId) {
        return NextResponse.json({ error: "Valid newSchoolId is required" }, { status: 400 });
      }

      auditAction = "SCHOOL_CHANGED";
      previousState = { schoolId: targetUser.schoolId };
      newState = { schoolId: newSchoolId };
      userUpdates.schoolId = newSchoolId;

      await updateUserSecurityControl(
        targetUserId,
        { securityVersion: Date.now(), requireReLogin: true },
        performer.uid,
        mandatoryReason
      );
    }

    // ACTION C: UPDATE STATUS (ACTIVATE / SUSPEND / BLOCK / DISABLE)
    else if (action === "UPDATE_STATUS") {
      if (!newStatus || !["active", "suspended", "blocked", "disabled"].includes(newStatus)) {
        return NextResponse.json({ error: "Valid newStatus is required" }, { status: 400 });
      }

      const isSuspendOrBlock = newStatus === "suspended" || newStatus === "blocked" || newStatus === "disabled";
      auditAction = isSuspendOrBlock
        ? newStatus === "blocked"
          ? "USER_BLOCKED"
          : "USER_SUSPENDED"
        : "USER_ACTIVATED";

      previousState = { status: targetUser.status };
      newState = { status: newStatus };
      userUpdates.status = newStatus;

      // If suspending or blocking, immediately terminate active sessions and revoke tokens
      if (isSuspendOrBlock) {
        if (adminAuth) {
          await adminAuth.revokeRefreshTokens(targetUserId).catch((err) => {
            console.warn("Token revocation notice:", err);
          });
        }
        await updateUserSecurityControl(
          targetUserId,
          {
            status: newStatus === "blocked" ? "BLOCKED" : "SUSPENDED",
            securityVersion: Date.now(),
            requireReLogin: true,
            reason: mandatoryReason,
          },
          performer.uid,
          mandatoryReason
        );
      } else {
        await updateUserSecurityControl(
          targetUserId,
          {
            status: "ACTIVE",
            requireReLogin: false,
            reason: mandatoryReason,
          },
          performer.uid,
          mandatoryReason
        );
      }
    }

    // ACTION D: FORCE LOGOUT / REVOKE SESSIONS
    else if (action === "FORCE_LOGOUT" || action === "REVOKE_SESSIONS") {
      auditAction = action === "FORCE_LOGOUT" ? "FORCE_LOGOUT" : "SESSION_REVOKED";
      previousState = { activeSessionRevocation: false };
      newState = { activeSessionRevocation: true };

      if (adminAuth) {
        await adminAuth.revokeRefreshTokens(targetUserId).catch((err) => {
          console.warn("Token revocation notice:", err);
        });
      }

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
    }

    // ACTION E: RESET PASSWORD TRIGGER
    else if (action === "RESET_PASSWORD") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      auditAction = "PASSWORD_RESET_TRIGGERED";
      previousState = { passwordReset: false };
      newState = { passwordReset: true };

      if (adminAuth) {
        await adminAuth.updateUser(targetUserId, { password: newPassword });
        await adminAuth.revokeRefreshTokens(targetUserId).catch(() => {});
      }

      userUpdates.passwordResetAt = new Date().toISOString();

      await updateUserSecurityControl(
        targetUserId,
        {
          securityVersion: Date.now(),
          requireReLogin: true,
          requirePasswordReset: false,
          reason: mandatoryReason,
        },
        performer.uid,
        mandatoryReason
      );
    }

    // ACTION F: REQUIRE RE-LOGIN
    else if (action === "REQUIRE_RE_LOGIN") {
      auditAction = "REQUIRE_RE_LOGIN";
      previousState = { requireReLogin: false };
      newState = { requireReLogin: true };

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
    }

    // ACTION G: DELETE USER
    else if (action === "DELETE_USER") {
      if (targetUser.role === "super_admin") {
        return NextResponse.json({ error: "Cannot delete a Super Admin account" }, { status: 403 });
      }

      auditAction = "USER_DELETED";
      previousState = { ...targetUser };
      newState = { deleted: true };

      // Revoke sessions and auth record
      if (adminAuth) {
        await adminAuth.revokeRefreshTokens(targetUserId).catch(() => {});
        await adminAuth.deleteUser(targetUserId).catch((err) => {
          console.warn("adminAuth delete error:", err);
        });
      }

      // Delete from Firestore
      if (adminDb) {
        await adminDb.collection(COLLECTIONS.USERS).doc(targetUserId).delete();
      } else if (db) {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, COLLECTIONS.USERS, targetUserId));
      }

      // Log audit
      const auditPayload = {
        action: auditAction,
        targetId: targetUserId,
        targetType: "user",
        targetName: targetUser.name || targetUser.email,
        targetEmail: targetUser.email,
        schoolId: targetUser.schoolId || null,
        performedBy: {
          uid: performer.uid,
          name: performer.name || "Super Admin",
          email: performer.email,
          role: performer.role,
        },
        previousState,
        newState,
        reason: mandatoryReason,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      };

      if (adminDb) {
        await adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).add(auditPayload).catch(() => {});
      } else if (db) {
        await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
          ...auditPayload,
          timestamp: serverTimestamp(),
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: "DELETE_USER",
        targetUserId,
        message: `Successfully deleted user "${targetUser.name || targetUser.email}".`,
      });
    }

    // ACTION H: UPDATE PROFILE
    else if (action === "UPDATE_PROFILE") {
      auditAction = "USER_UPDATED";
      previousState = { ...targetUser };
      const allowed = ["name", "phone", "address", "gender", "dob", "className", "sectionName", "email"];
      if (profileUpdates && typeof profileUpdates === "object") {
        for (const k of allowed) {
          if (profileUpdates[k] !== undefined) {
            userUpdates[k] = profileUpdates[k];
          }
        }
      }
      newState = { ...userUpdates };
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // 3. Persist Updates to Authoritative Firestore Record
    if (adminDb) {
      await adminDb.collection(COLLECTIONS.USERS).doc(targetUserId).set(userUpdates, { merge: true });
    } else if (db) {
      await updateDoc(doc(db, COLLECTIONS.USERS, targetUserId), {
        ...userUpdates,
        updatedAt: serverTimestamp(),
      });
    }

    // 4. Create Audit Log
    const auditPayload = {
      action: auditAction,
      targetId: targetUserId,
      targetType: "user",
      targetName: userUpdates.name || targetUser.name || targetUser.email,
      targetEmail: targetUser.email,
      schoolId: userUpdates.schoolId || targetUser.schoolId || null,
      performedBy: {
        uid: performer.uid,
        name: performer.name || "Super Admin",
        email: performer.email,
        role: performer.role,
      },
      previousState,
      newState,
      reason: mandatoryReason,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    if (adminDb) {
      await adminDb.collection(AUDIT_COLLECTIONS.AUDIT_LOGS).add(auditPayload).catch(() => {});
    } else if (db) {
      await addDoc(collection(db, AUDIT_COLLECTIONS.AUDIT_LOGS), {
        ...auditPayload,
        timestamp: serverTimestamp(),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      updatedFields: userUpdates,
      message: `Successfully executed ${action} for user "${targetUser.name || targetUser.email}".`,
    });
  } catch (error: any) {
    console.error("Super Admin User Action Failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute user action." },
      { status: 500 }
    );
  }
}
