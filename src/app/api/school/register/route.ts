import { NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const db = getSafeAdminDb(), auth = getSafeAdminAuth();
  if (!db || !auth) {
    const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
    return NextResponse.json({
      error: "School registration requires private Firebase Admin configuration.",
      code: "ADMIN_AUTH_NOT_CONFIGURED",
      diagnostics: {
        configured: false,
        hasClientEmail: Boolean(env?.FIREBASE_CLIENT_EMAIL || env?.FIREBASE_ADMIN_CLIENT_EMAIL),
        hasPrivateKey: Boolean(env?.FIREBASE_PRIVATE_KEY || env?.FIREBASE_ADMIN_PRIVATE_KEY),
        projectId: env?.FIREBASE_PROJECT_ID || env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991"
      }
    }, { status: 503 });
  }

  let createdUid: string | undefined;

  try {
    const input = await request.json().catch(() => ({}));
    if (![input.name, input.code, input.adminName, input.adminEmail, input.adminPassword].every((v) => typeof v === "string" && v.trim())) {
      return NextResponse.json({ error: "School and administrator details are required.", code: "INVALID_INPUT" }, { status: 400 });
    }

    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,30}$/.test(code) || input.adminPassword.length < 6) {
      return NextResponse.json({ error: "Use a valid school code and a password of at least six characters.", code: "INVALID_CREDENTIALS" }, { status: 400 });
    }

    // 1. Verify active zero-price registration plan exists
    const plan = await db.collection("plans").doc("plan_free").get();
    const isPlanDocExists = Boolean(
      (plan as any).exists === true ||
      (typeof (plan as any).exists === "function" && (plan as any).exists())
    );
    const versions = await db.collection("planVersions").where("planId", "==", "plan_free").where("status", "==", "ACTIVE").get();
    const version = versions.docs.sort((a, b) => b.data().version - a.data().version)[0];

    if (!isPlanDocExists || plan.data()?.status !== "ACTIVE" || !version || version.data().monthlyPrice !== 0 || version.data().annualPrice !== 0) {
      return NextResponse.json({
        error: "Publish an active free registration plan before accepting new schools.",
        code: "FREE_PLAN_NOT_PUBLISHED",
      }, { status: 503 });
    }

    // 2. Pre-verify school code availability
    const codeQuery = await db.collection("schools").where("code", "==", code).get();
    if (!codeQuery.empty) {
      return NextResponse.json({ error: "School code is already registered.", code: "CODE_ALREADY_EXISTS" }, { status: 409 });
    }

    const email = input.adminEmail.trim().toLowerCase();

    // 3. Provision administrator Auth account
    let user;
    try {
      user = await auth.createUser({
        email,
        password: input.adminPassword,
        displayName: input.adminName.trim(),
      });
    } catch (authCreateErr: any) {
      if (
        authCreateErr?.code === "auth/email-already-exists" ||
        authCreateErr?.code === "auth/email-already-in-use" ||
        authCreateErr?.message?.includes("already in use")
      ) {
        return NextResponse.json(
          { error: "This email is already registered. Please sign in or use a different email.", code: "EMAIL_ALREADY_EXISTS" },
          { status: 409 }
        );
      }
      throw authCreateErr;
    }

    createdUid = user.uid;
    const schoolRef = db.collection("schools").doc();
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 86400000).toISOString();

    await auth.setCustomUserClaims(user.uid, { role: "school_admin", schoolId: schoolRef.id });

    // 4. Atomically write school, admin user profile, and free subscription
    await db.runTransaction(async (tx) => {
      const codeRef = db.collection("schoolCodes").doc(code);
      const codeSnap = await tx.get(codeRef);
      const isCodeExists = Boolean(
        (codeSnap as any).exists === true ||
        (typeof (codeSnap as any).exists === "function" && (codeSnap as any).exists())
      );
      if (isCodeExists) {
        throw new Error("School code is already registered.");
      }

      tx.set(codeRef, { schoolId: schoolRef.id, createdAt: now });
      tx.set(schoolRef, {
        id: schoolRef.id,
        name: input.name.trim(),
        code,
        city: String(input.city || "India").trim(),
        state: String(input.state || "").trim(),
        phone: String(input.phone || "").trim(),
        email: String(input.email || "").trim(),
        status: "active",
        setupCompleted: false,
        setupStep: 1,
        adminUid: user.uid,
        adminName: input.adminName.trim(),
        adminEmail: email,
        planId: "plan_free",
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: end,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(db.collection("users").doc(user.uid), {
        uid: user.uid,
        name: input.adminName.trim(),
        email,
        role: "school_admin",
        schoolId: schoolRef.id,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      tx.set(db.collection("schoolSubscriptions").doc(schoolRef.id), {
        id: schoolRef.id,
        schoolId: schoolRef.id,
        planId: "plan_free",
        planVersionId: version.id,
        status: "TRIAL",
        billingCycle: "monthly",
        startsAt: now,
        expiresAt: end,
        graceEndsAt: new Date(Date.parse(end) + 7 * 86400000).toISOString(),
        source: "registration_trial",
        createdAt: now,
        updatedAt: now,
      });
    });

    createdUid = undefined;
    return NextResponse.json({ success: true, schoolId: schoolRef.id, adminUid: user.uid });
  } catch (error: any) {
    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() =>
        console.error("Registration compensation failed; administrator review required.")
      );
    }
    const isConflict = error?.message?.includes("already registered");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed.",
        code: isConflict ? "CODE_ALREADY_EXISTS" : "REGISTRATION_FAILED",
      },
      { status: isConflict ? 409 : 503 }
    );
  }
}
