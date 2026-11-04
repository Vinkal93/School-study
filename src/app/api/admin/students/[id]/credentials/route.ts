import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireSchoolAdmin } from "@/lib/auth/serverAuth";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { logAuditEvent } from "@/lib/services/audit.service";
import type { AuditAction, AuditTargetType } from "@/types/audit";

function generateSecureAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let token = "";
  const randomBytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    token += chars[randomBytes[i] % chars.length];
  }
  return `${token}!9X`;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const studentId = params.id;

    // Server-side authentication and tenant isolation check
    const authResult = await requireSchoolAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const schoolId = authUser.schoolId || "";

    // Load student document
    let studentData: any = null;
    let foundDocRef: any = null;
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      // 1. Primary: Subcollection schools/{schoolId}/students/{studentId}
      const snap = await adminDb
        .collection(COLLECTIONS.SCHOOLS)
        .doc(schoolId)
        .collection("students")
        .doc(studentId)
        .get();

      if (snap.exists) {
        studentData = snap.data();
        foundDocRef = snap.ref;
      } else {
        // 2. Fallback: Root students/{studentId} with schoolId match
        const rootSnap = await adminDb.collection("students").doc(studentId).get();
        if (rootSnap.exists && rootSnap.data()?.schoolId === schoolId) {
          studentData = rootSnap.data();
          foundDocRef = rootSnap.ref;
        }
      }
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const snap = await getDoc(doc(clientDb, COLLECTIONS.SCHOOLS, schoolId, "students", studentId));
        if (snap.exists()) {
          studentData = snap.data();
        } else {
          const rootSnap = await getDoc(doc(clientDb, "students", studentId));
          if (rootSnap.exists() && rootSnap.data()?.schoolId === schoolId) {
            studentData = rootSnap.data();
          }
        }
      }
    }

    if (!studentData) {
      return NextResponse.json(
        { success: false, error: "Student not found in your institution." },
        { status: 404 }
      );
    }

    const adminAuth = getSafeAdminAuth();
    let authUserRecord: any = null;
    let resolvedUserId = studentData.userId || null;

    if (adminAuth) {
      if (resolvedUserId) {
        try {
          const u = await adminAuth.getUser(resolvedUserId);
          authUserRecord = {
            uid: u.uid,
            email: u.email,
            disabled: u.disabled,
            emailVerified: u.emailVerified,
            creationTime: u.metadata?.creationTime,
            lastSignInTime: u.metadata?.lastSignInTime,
          };
        } catch {
          authUserRecord = null;
        }
      }

      // If userId wasn't in student record, check by email
      if (!authUserRecord && studentData.email) {
        try {
          const u = await adminAuth.getUserByEmail(studentData.email.trim().toLowerCase());
          resolvedUserId = u.uid;
          authUserRecord = {
            uid: u.uid,
            email: u.email,
            disabled: u.disabled,
            emailVerified: u.emailVerified,
            creationTime: u.metadata?.creationTime,
            lastSignInTime: u.metadata?.lastSignInTime,
          };

          // Auto-heal userId link in student doc
          if (foundDocRef) {
            await foundDocRef.update({ userId: u.uid }).catch(() => {});
          }
        } catch {
          // No auth record exists
        }
      }
    }

    const isPortalActive = (studentData.status ? String(studentData.status).toLowerCase() : "active") === "active";

    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        name: studentData.name || "Student",
        studentId: studentData.studentId || studentData.admissionNumber || studentId,
        admissionNumber: studentData.admissionNumber || studentData.studentId || "",
        className: studentData.className || "",
        sectionName: studentData.sectionName || "",
        email: studentData.email || "",
        phone: studentData.phone || "",
        guardianName: studentData.guardianName || studentData.fatherName || "Parent / Guardian",
        guardianPhone: studentData.guardianPhone || studentData.phone || "",
        status: studentData.status || "active",
        portalAccess: isPortalActive,
        lastPasswordResetAt: studentData.lastPasswordResetAt || null,
      },
      auth: {
        hasAuthAccount: Boolean(authUserRecord || resolvedUserId),
        uid: resolvedUserId,
        email: authUserRecord?.email || studentData.email || "",
        disabled: authUserRecord ? Boolean(authUserRecord.disabled) : !isPortalActive,
        emailVerified: authUserRecord ? Boolean(authUserRecord.emailVerified) : false,
        creationTime: authUserRecord?.creationTime || null,
        lastSignInTime: authUserRecord?.lastSignInTime || null,
      },
    });
  } catch (error: any) {
    console.error("[API: Student Credentials GET]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load credentials." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const studentId = params.id;

    // Server-side authentication and tenant isolation check
    const authResult = await requireSchoolAdmin(req);
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const authUser = authResult.user!;
    const schoolId = authUser.schoolId || "";
    const body = await req.json().catch(() => ({}));
    const action = body.action || "reset_password"; // "reset_password" | "generate_reset_link" | "disable" | "enable" | "provision"
    const nowIso = new Date().toISOString();

    // Load student
    const adminDb = getSafeAdminDb();
    const adminAuth = getSafeAdminAuth();
    let studentData: any = null;
    let studentRef: any = null;
    let rootStudentRef: any = null;

    if (adminDb) {
      studentRef = adminDb.collection(COLLECTIONS.SCHOOLS).doc(schoolId).collection("students").doc(studentId);
      const snap = await studentRef.get();
      if (snap.exists) {
        studentData = snap.data();
      } else {
        rootStudentRef = adminDb.collection("students").doc(studentId);
        const rootSnap = await rootStudentRef.get();
        if (rootSnap.exists && rootSnap.data()?.schoolId === schoolId) {
          studentData = rootSnap.data();
          studentRef = rootStudentRef;
        }
      }
    }

    if (!studentData) {
      return NextResponse.json(
        { success: false, error: "Student not found in your institution." },
        { status: 404 }
      );
    }

    const studentEmail = (studentData.email || "").trim().toLowerCase();
    let finalUserId = studentData.userId;

    // Resolve auth user by email if userId missing
    if (!finalUserId && adminAuth && studentEmail) {
      try {
        const existingAuth = await adminAuth.getUserByEmail(studentEmail);
        finalUserId = existingAuth.uid;
        if (studentRef) {
          await studentRef.update({ userId: finalUserId }).catch(() => {});
        }
      } catch {}
    }

    // ACTION: 1. RESET PASSWORD (ADMIN SETS NEW PASSWORD)
    if (action === "reset_password") {
      const newPassword = (body.newPassword || "").trim();
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (!studentEmail) {
        return NextResponse.json(
          { success: false, error: "Student does not have a registered email address for login." },
          { status: 400 }
        );
      }

      if (!adminAuth) {
        return NextResponse.json(
          { success: false, error: "Firebase Authentication service unavailable." },
          { status: 503 }
        );
      }

      if (finalUserId) {
        // Update password and ensure user is enabled
        await adminAuth.updateUser(finalUserId, {
          password: newPassword,
          disabled: false,
        });

        // Revoke all existing sessions so old password sessions immediately terminate
        await adminAuth.revokeRefreshTokens(finalUserId).catch(() => {});
      } else {
        // Provision new auth account with the given password
        const newAuth = await adminAuth.createUser({
          email: studentEmail,
          password: newPassword,
          displayName: studentData.name || "Student",
        });
        finalUserId = newAuth.uid;

        await adminAuth.setCustomUserClaims(finalUserId, {
          role: "student",
          schoolId,
        }).catch(() => {});

        if (studentRef) {
          await studentRef.update({ userId: finalUserId }).catch(() => {});
        }
      }

      // Sync users collection for immediate global access check & force re-login
      if (adminDb && finalUserId) {
        await adminDb.collection(COLLECTIONS.USERS).doc(finalUserId).set(
          {
            uid: finalUserId,
            email: studentEmail,
            name: studentData.name || "Student",
            role: "student",
            schoolId,
            studentId: studentData.studentId || studentData.admissionNumber || studentId,
            admissionNumber: studentData.admissionNumber || studentData.studentId || "",
            studentProfileId: studentId,
            status: "active",
            portalAccess: true,
            forceLogout: true,
            requireReLogin: true,
            forceLogoutAt: Date.now(),
            lastPasswordResetAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        ).catch(() => {});

        await studentRef.update({
          lastPasswordResetAt: nowIso,
          status: "active",
          portalAccess: true,
          updatedAt: nowIso,
        }).catch(() => {});
      }

      // Security Audit Log (Never log the password itself)
      await logAuditEvent({
        actorId: authUser.uid,
        actorName: authUser.name || "School Admin",
        actorEmail: authUser.email,
        actorRole: authUser.role as any,
        actorSchoolId: schoolId,
        targetUserId: finalUserId,
        targetUserName: studentData.name,
        targetSchoolId: schoolId,
        action: "STUDENT_PASSWORD_RESET" as AuditAction,
        entityType: "student" as AuditTargetType,
        entityId: studentId,
        reason: "Admin reset student portal password and revoked previous sessions.",
        metadata: {
          studentId,
          admissionNumber: studentData.admissionNumber || studentData.studentId,
          email: studentEmail,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Password for ${studentData.name} has been reset successfully. Previous sessions have been revoked.`,
        credentials: {
          studentName: studentData.name,
          loginId: studentData.studentId || studentData.admissionNumber || studentEmail,
          email: studentEmail,
          portalUrl: "/student/login",
          resetTimestamp: nowIso,
        },
      });
    }

    // ACTION: 2. GENERATE SECURE PASSWORD RESET LINK
    if (action === "generate_reset_link") {
      if (!studentEmail) {
        return NextResponse.json(
          { success: false, error: "Student does not have a registered email address to receive reset links." },
          { status: 400 }
        );
      }

      if (!adminAuth) {
        return NextResponse.json(
          { success: false, error: "Firebase Authentication service unavailable." },
          { status: 503 }
        );
      }

      // Ensure user account exists
      if (!finalUserId) {
        const initialPass = generateSecureAccessCode();
        const newAuth = await adminAuth.createUser({
          email: studentEmail,
          password: initialPass,
          displayName: studentData.name || "Student",
        });
        finalUserId = newAuth.uid;

        await adminAuth.setCustomUserClaims(finalUserId, {
          role: "student",
          schoolId,
        }).catch(() => {});

        if (studentRef) {
          await studentRef.update({ userId: finalUserId }).catch(() => {});
        }
      }

      const resetLink = await adminAuth.generatePasswordResetLink(studentEmail);

      // Audit Log
      await logAuditEvent({
        actorId: authUser.uid,
        actorName: authUser.name || "School Admin",
        actorEmail: authUser.email,
        actorRole: authUser.role as any,
        actorSchoolId: schoolId,
        targetUserId: finalUserId,
        targetUserName: studentData.name,
        targetSchoolId: schoolId,
        action: "STUDENT_RESET_LINK_GENERATED" as AuditAction,
        entityType: "student" as AuditTargetType,
        entityId: studentId,
        reason: "Generated secure one-time password setup/reset link.",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Secure password reset link generated successfully.",
        resetLink,
        email: studentEmail,
      });
    }

    // ACTION: 3. DISABLE / BLOCK PORTAL ACCESS
    if (action === "disable") {
      const reason = (body.reason || "Suspended by school administration").trim();

      if (adminAuth && finalUserId) {
        // Disable Firebase Auth account and revoke refresh tokens immediately
        await adminAuth.updateUser(finalUserId, { disabled: true }).catch(() => {});
        await adminAuth.revokeRefreshTokens(finalUserId).catch(() => {});
      }

      if (adminDb) {
        // Update user doc
        if (finalUserId) {
          await adminDb.collection(COLLECTIONS.USERS).doc(finalUserId).set(
            {
              status: "disabled",
              portalAccess: false,
              forceLogout: true,
              requireReLogin: true,
              forceLogoutAt: Date.now(),
              disabledReason: reason,
              disabledAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          ).catch(() => {});
        }

        // Update student doc
        if (studentRef) {
          await studentRef.update({
            status: "disabled",
            portalAccess: false,
            disabledReason: reason,
            disabledAt: nowIso,
            updatedAt: nowIso,
          }).catch(() => {});
        }
      }

      // Audit Log
      await logAuditEvent({
        actorId: authUser.uid,
        actorName: authUser.name || "School Admin",
        actorEmail: authUser.email,
        actorRole: authUser.role as any,
        actorSchoolId: schoolId,
        targetUserId: finalUserId,
        targetUserName: studentData.name,
        targetSchoolId: schoolId,
        action: "STUDENT_LOGIN_DISABLED" as AuditAction,
        entityType: "student" as AuditTargetType,
        entityId: studentId,
        reason: `Portal access disabled: ${reason}`,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Portal access for ${studentData.name} has been disabled. Active sessions have been invalidated.`,
        status: "disabled",
      });
    }

    // ACTION: 4. ENABLE / UNBLOCK PORTAL ACCESS
    if (action === "enable") {
      if (adminAuth && finalUserId) {
        await adminAuth.updateUser(finalUserId, { disabled: false }).catch(() => {});
      }

      if (adminDb) {
        if (finalUserId) {
          await adminDb.collection(COLLECTIONS.USERS).doc(finalUserId).set(
            {
              status: "active",
              portalAccess: true,
              forceLogout: false,
              requireReLogin: false,
              disabledReason: null,
              disabledAt: null,
              updatedAt: nowIso,
            },
            { merge: true }
          ).catch(() => {});
        }

        if (studentRef) {
          await studentRef.update({
            status: "active",
            portalAccess: true,
            disabledReason: null,
            disabledAt: null,
            updatedAt: nowIso,
          }).catch(() => {});
        }
      }

      // Audit Log
      await logAuditEvent({
        actorId: authUser.uid,
        actorName: authUser.name || "School Admin",
        actorEmail: authUser.email,
        actorRole: authUser.role as any,
        actorSchoolId: schoolId,
        targetUserId: finalUserId,
        targetUserName: studentData.name,
        targetSchoolId: schoolId,
        action: "STUDENT_LOGIN_ENABLED" as AuditAction,
        entityType: "student" as AuditTargetType,
        entityId: studentId,
        reason: "Portal access re-enabled by school administrator.",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Portal access for ${studentData.name} has been enabled.`,
        status: "active",
      });
    }

    // ACTION: 5. PROVISION AUTH ACCOUNT (IF NOT YET CREATED)
    if (action === "provision") {
      if (!studentEmail) {
        return NextResponse.json(
          { success: false, error: "A valid email address is required to provision student portal access." },
          { status: 400 }
        );
      }

      if (!adminAuth) {
        return NextResponse.json(
          { success: false, error: "Firebase Authentication service unavailable." },
          { status: 503 }
        );
      }

      const initialPassword = body.password?.trim() && body.password.trim().length >= 6
        ? body.password.trim()
        : generateSecureAccessCode();

      let authUserRecord: any = null;
      try {
        authUserRecord = await adminAuth.createUser({
          email: studentEmail,
          password: initialPassword,
          displayName: studentData.name || "Student",
        });
      } catch (createErr: any) {
        if (createErr?.code === "auth/email-already-exists") {
          authUserRecord = await adminAuth.getUserByEmail(studentEmail);
        } else {
          throw createErr;
        }
      }

      finalUserId = authUserRecord.uid;

      await adminAuth.setCustomUserClaims(finalUserId, {
        role: "student",
        schoolId,
      }).catch(() => {});

      if (adminDb) {
        await adminDb.collection(COLLECTIONS.USERS).doc(finalUserId).set(
          {
            uid: finalUserId,
            email: studentEmail,
            name: studentData.name || "Student",
            role: "student",
            schoolId,
            studentId: studentData.studentId || studentData.admissionNumber || studentId,
            admissionNumber: studentData.admissionNumber || studentData.studentId || "",
            studentProfileId: studentId,
            status: "active",
            portalAccess: true,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        ).catch(() => {});

        if (studentRef) {
          await studentRef.update({
            userId: finalUserId,
            status: "active",
            portalAccess: true,
            updatedAt: nowIso,
          }).catch(() => {});
        }
      }

      // Audit Log
      await logAuditEvent({
        actorId: authUser.uid,
        actorName: authUser.name || "School Admin",
        actorEmail: authUser.email,
        actorRole: authUser.role as any,
        actorSchoolId: schoolId,
        targetUserId: finalUserId,
        targetUserName: studentData.name,
        targetSchoolId: schoolId,
        action: "STUDENT_ACCOUNT_PROVISIONED" as AuditAction,
        entityType: "student" as AuditTargetType,
        entityId: studentId,
        reason: "Student portal account provisioned.",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Account for ${studentData.name} provisioned successfully.`,
        credentials: {
          studentName: studentData.name,
          loginId: studentData.studentId || studentData.admissionNumber || studentEmail,
          email: studentEmail,
          temporaryAccessKey: initialPassword,
          portalUrl: "/student/login",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action "${action}".` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API: Student Credentials POST]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update student credentials." },
      { status: 500 }
    );
  }
}
