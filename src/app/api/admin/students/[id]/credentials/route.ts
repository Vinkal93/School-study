import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updatePassword, signOut } from "firebase/auth";
import { firebaseClientConfig } from "@/lib/firebase/config";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    if (user.role !== "school_admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const params = await context.params;
    const studentId = params.id;
    const schoolId = user.schoolId || "";

    // Load student document
    let studentData: any = null;
    const adminDb = getSafeAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
      if (snap.exists) studentData = snap.data();
    } else {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const snap = await getDoc(doc(clientDb, "schools", schoolId, "students", studentId));
        if (snap.exists()) studentData = snap.data();
      }
    }

    if (!studentData) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const adminAuth = getSafeAdminAuth();
    let authUser: any = null;

    if (adminAuth && studentData.userId) {
      try {
        const u = await adminAuth.getUser(studentData.userId);
        authUser = {
          uid: u.uid,
          email: u.email,
          disabled: u.disabled,
          emailVerified: u.emailVerified,
          creationTime: u.metadata?.creationTime,
          lastSignInTime: u.metadata?.lastSignInTime,
        };
      } catch (authErr) {
        // Auth user not created yet or deleted
        authUser = null;
      }
    }

    return NextResponse.json({
      success: true,
      hasAuthAccount: Boolean(authUser || studentData.userId),
      email: studentData.email,
      studentId: studentData.studentId || studentData.admissionNumber,
      authUser,
    });
  } catch (error: any) {
    console.error("[API: Student Credentials GET]", error);
    return NextResponse.json({ error: error.message || "Failed to load credentials" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    if (user.role !== "school_admin" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const params = await context.params;
    const studentId = params.id;
    const schoolId = user.schoolId || "";
    const body = await req.json().catch(() => ({}));
    const action = body.action || "reset_password"; // "reset_password" | "create_account"

    // Load student
    const adminDb = getSafeAdminDb();
    const clientDb = getFirebaseDb();
    let studentData: any = null;
    let studentRef: any = null;

    if (adminDb) {
      studentRef = adminDb.collection("schools").doc(schoolId).collection("students").doc(studentId);
      const snap = await studentRef.get();
      if (snap.exists) studentData = snap.data();
    } else if (clientDb) {
      studentRef = doc(clientDb, "schools", schoolId, "students", studentId);
      const snap = await getDoc(studentRef);
      if (snap.exists()) studentData = snap.data();
    }

    if (!studentData) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const email = (studentData.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Student profile does not have a registered email." }, { status: 400 });
    }

    // Generate secure temporary password if not provided
    const tempPassword =
      body.newPassword && body.newPassword.trim().length >= 6
        ? body.newPassword.trim()
        : `Stu@${Math.floor(100000 + Math.random() * 900000)}`;

    const adminAuth = getSafeAdminAuth();
    let finalUserId = studentData.userId;

    if (adminAuth) {
      if (finalUserId) {
        // Update existing auth user password
        await adminAuth.updateUser(finalUserId, {
          password: tempPassword,
          disabled: false,
        });
      } else {
        // Create new user in Firebase Auth
        const newAuth = await adminAuth.createUser({
          email,
          password: tempPassword,
          displayName: studentData.name,
        });
        finalUserId = newAuth.uid;

        // Update student doc with userId
        if (adminDb) {
          await studentRef.update({ userId: finalUserId });
        } else if (clientDb) {
          await updateDoc(studentRef, { userId: finalUserId });
        }
      }
    } else {
      // Fallback using secondary client Auth instance
      const secondaryAppName = `admin-pass-reset-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseClientConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      try {
        if (!finalUserId) {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
          finalUserId = userCred.user.uid;
          if (clientDb) {
            await updateDoc(studentRef, { userId: finalUserId });
          }
        }
        await signOut(secondaryAuth);
      } finally {
        if (getApps().some((app) => app.name === secondaryAppName)) {
          await deleteApp(secondaryApp);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: action === "create_account" ? "Student login account created successfully!" : "Password reset successfully!",
      credentials: {
        studentName: studentData.name,
        admissionNumber: studentData.admissionNumber || studentData.studentId,
        email,
        temporaryPassword: tempPassword,
        portalUrl: "/student/login",
      },
    });
  } catch (error: any) {
    console.error("[API: Student Credentials POST]", error);
    return NextResponse.json({ error: error.message || "Failed to update credentials" }, { status: 500 });
  }
}
