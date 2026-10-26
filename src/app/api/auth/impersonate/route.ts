import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  createImpersonationSession,
  verifyImpersonationToken,
  revokeImpersonationSession,
  type ImpersonationRole,
} from "@/lib/auth/impersonation";
import { getSafeAdminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller - must be platform Super Admin
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const { user } = authResult;
    if (user.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          errorCode: "FORBIDDEN_IMPERSONATION",
          error: "Access Denied. Only Platform Super Administrators are authorized to initialize impersonation sessions.",
        },
        { status: 403 }
      );
    }

    // 2. Parse and validate input payload
    const body = await req.json().catch(() => ({}));
    const {
      targetSchoolId,
      targetUserId,
      targetUserEmail,
      targetRole = "school_admin",
      allowedOperations,
      durationSeconds = 3600,
    } = body;

    if (!targetSchoolId || typeof targetSchoolId !== "string" || !targetSchoolId.trim()) {
      return NextResponse.json(
        { success: false, errorCode: "MISSING_SCHOOL_ID", error: "A valid target school ID is required for impersonation." },
        { status: 400 }
      );
    }

    // 3. Verify target school exists
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const schoolSnap = await adminDb.collection("schools").doc(targetSchoolId).get();
      if (!schoolSnap.exists) {
        return NextResponse.json(
          { success: false, errorCode: "SCHOOL_NOT_FOUND", error: `Target school '${targetSchoolId}' does not exist.` },
          { status: 404 }
        );
      }

      // If targetUserId provided, verify target user exists and belongs to school (or can be impersonated)
      if (targetUserId) {
        const userSnap = await adminDb.collection("users").doc(targetUserId).get();
        if (!userSnap.exists) {
          return NextResponse.json(
            { success: false, errorCode: "TARGET_USER_NOT_FOUND", error: `Target user '${targetUserId}' does not exist.` },
            { status: 404 }
          );
        }
      }
    }

    // 4. Capture telemetry
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // 5. Create authoritative signed session
    const { token, session } = await createImpersonationSession({
      superAdminUid: user.uid,
      superAdminEmail: user.email,
      targetSchoolId: targetSchoolId.trim(),
      targetRole: (targetRole as ImpersonationRole) || "school_admin",
      targetUserId,
      targetUserEmail,
      allowedOperations: Array.isArray(allowedOperations) && allowedOperations.length > 0
        ? allowedOperations
        : ["read", "test_message", "communication"],
      durationSeconds: Math.min(3600, Math.max(60, Number(durationSeconds) || 3600)),
      clientIp,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      token,
      session: {
        sessionId: session.sessionId,
        superAdminUid: session.superAdminUid,
        superAdminEmail: session.superAdminEmail,
        targetSchoolId: session.targetSchoolId,
        targetRole: session.targetRole,
        targetUserId: session.targetUserId,
        allowedOperations: session.allowedOperations,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err: any) {
    console.error("[API:auth:impersonate] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to initialize impersonation session." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionHeader = req.headers.get("x-impersonation-session");
    if (!sessionHeader) {
      return NextResponse.json({ success: true, message: "No active impersonation session found to terminate." });
    }

    const { isValid, session } = verifyImpersonationToken(sessionHeader);
    if (isValid && session) {
      await revokeImpersonationSession(session.sessionId, {
        superAdminUid: session.superAdminUid,
        superAdminEmail: session.superAdminEmail,
        targetSchoolId: session.targetSchoolId,
      });
    }

    return NextResponse.json({ success: true, message: "Impersonation session terminated successfully." });
  } catch (err: any) {
    console.error("[API:auth:impersonate:delete] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to terminate impersonation session." },
      { status: 500 }
    );
  }
}
