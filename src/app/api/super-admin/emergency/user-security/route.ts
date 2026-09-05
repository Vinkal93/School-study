import { NextResponse } from "next/server";
import {
  updateUserSecurityControl,
  updateSchoolEmergencyControl,
  updateGlobalEmergencyControls,
  getUserSecurityControl,
  getGlobalEmergencyControls,
} from "@/lib/emergency/emergencyEngine";
import { createBillingAuditLog } from "@/lib/billing/audit";

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

/**
 * POST /api/super-admin/emergency/user-security
 * Handles high-risk security actions: Force Logout User, Force Logout School, Force Logout All Users, Account Suspension.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { actionType, userId, schoolId, reason, actorId = "super_admin" } = body || {};

    if (!actionType) {
      return NextResponse.json(
        { success: false, error: "actionType is required." },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "A mandatory justification reason is required for emergency security actions." },
        { status: 400 }
      );
    }

    const adminAuth = await getAdminAuthServerOnly();
    const adminDb = await getAdminDbServerOnly();

    // Resolve email to UID if target is an email address
    let resolvedUid = userId || "";
    if (resolvedUid && resolvedUid.includes("@")) {
      try {
        if (adminAuth) {
          const uRecord = await adminAuth.getUserByEmail(resolvedUid.trim().toLowerCase()).catch(() => null);
          if (uRecord) resolvedUid = uRecord.uid;
        }
        if (resolvedUid.includes("@") && adminDb) {
          const uSnap = await adminDb.collection("users").where("email", "==", resolvedUid.trim().toLowerCase()).limit(1).get().catch(() => null);
          if (uSnap && !uSnap.empty) {
            resolvedUid = uSnap.docs[0].id;
          }
        }
      } catch (lookupErr) {
        console.warn("User email lookup notice:", lookupErr);
      }
    }

    // 1. FORCE LOGOUT ONE USER
    if (actionType === "FORCE_LOGOUT_USER") {
      if (!resolvedUid) throw new Error("userId or valid email is required for FORCE_LOGOUT_USER.");

      const currentSecurity = await getUserSecurityControl(resolvedUid);
      const newVersion = (currentSecurity.securityVersion || 1) + 1;

      // Invalidate Firebase Refresh Tokens
      if (adminAuth) {
        await adminAuth.revokeRefreshTokens(resolvedUid).catch((err) => {
          console.warn(`[EmergencySecurity] Token revocation notice for ${resolvedUid}:`, err);
        });
      }

      const updated = await updateUserSecurityControl(
        resolvedUid,
        {
          securityVersion: newVersion,
          requireReLogin: true,
        },
        actorId,
        reason
      );

      return NextResponse.json({
        success: true,
        message: `Successfully force-logged out user "${userId}" (${resolvedUid}) and revoked active sessions.`,
        securityControl: updated,
      });
    }

    // 2. FORCE LOGOUT ALL USERS OF A SCHOOL
    if (actionType === "FORCE_LOGOUT_SCHOOL") {
      if (!schoolId) throw new Error("schoolId is required for FORCE_LOGOUT_SCHOOL.");

      let userCount = 0;
      if (adminDb) {
        const usersSnap = await adminDb.collection("users").where("schoolId", "==", schoolId).get();
        userCount = usersSnap.docs.length;

        for (const userDoc of usersSnap.docs) {
          const uid = userDoc.id;
          if (adminAuth) {
            await adminAuth.revokeRefreshTokens(uid).catch(() => {});
          }
          await updateUserSecurityControl(uid, { securityVersion: Date.now(), requireReLogin: true }, actorId, reason);
        }
      }

      await updateSchoolEmergencyControl(schoolId, { forceLogoutAll: true }, actorId, reason);

      return NextResponse.json({
        success: true,
        message: `Successfully force-logged out all ${userCount} users for school "${schoolId}".`,
      });
    }

    // 3. FORCE LOGOUT ALL USERS SYSTEM-WIDE (CRITICAL ACTION)
    if (actionType === "FORCE_LOGOUT_ALL") {
      const globalControls = await getGlobalEmergencyControls();
      const newGlobalVersion = (globalControls.globalSecurityVersion || 1) + 1;

      await updateGlobalEmergencyControls(
        {
          globalSecurityVersion: newGlobalVersion,
          forceReLogin: true,
        },
        actorId,
        reason
      );

      return NextResponse.json({
        success: true,
        message: "CRITICAL: System-wide session security version incremented. All user sessions invalidated.",
        globalSecurityVersion: newGlobalVersion,
      });
    }

    // 4. SUSPEND / RESUME USER
    if (actionType === "SUSPEND_USER" || actionType === "RESUME_USER") {
      if (!resolvedUid) throw new Error("userId or valid email is required.");
      const newStatus = actionType === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE";

      if (newStatus === "SUSPENDED" && adminAuth) {
        await adminAuth.revokeRefreshTokens(resolvedUid).catch(() => {});
      }

      if (adminDb) {
        await adminDb.collection("users").doc(resolvedUid).set(
          {
            status: newStatus === "SUSPENDED" ? "suspended" : "active",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }

      const updated = await updateUserSecurityControl(
        resolvedUid,
        {
          status: newStatus,
          securityVersion: Date.now(),
        },
        actorId,
        reason
      );

      return NextResponse.json({
        success: true,
        message: `User "${userId}" (${resolvedUid}) status updated to ${newStatus}.`,
        securityControl: updated,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown actionType "${actionType}".` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/super-admin/emergency/user-security error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute emergency security action." },
      { status: 500 }
    );
  }
}
