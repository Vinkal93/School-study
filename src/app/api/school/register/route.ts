import { NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth, getFirebaseAdminDiagnostics } from "@/lib/firebase/admin";
import { captureApiException } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory rate limiting map: ip -> array of timestamps
const registrationRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REGISTRATIONS_PER_WINDOW = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = registrationRateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (validTimestamps.length >= MAX_REGISTRATIONS_PER_WINDOW) {
    registrationRateLimitMap.set(ip, validTimestamps);
    return false;
  }
  validTimestamps.push(now);
  registrationRateLimitMap.set(ip, validTimestamps);
  return true;
}

export async function POST(request: Request) {
  const requestId =
    request.headers.get("x-request-id") ||
    `reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Anti-abuse: Rate limit by client IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown-ip";

  if (!checkRateLimit(clientIp)) {
    console.warn(`[school-register] [${requestId}] Rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many registration attempts. Please wait 15 minutes before trying again.",
          requestId,
          retryable: true,
        },
        code: "RATE_LIMIT_EXCEEDED",
      },
      { status: 429 }
    );
  }

  const db = getSafeAdminDb();
  const auth = getSafeAdminAuth();

  // If Firebase Admin credentials are not configured on server
  if (!db || !auth) {
    const diagnostics = await getFirebaseAdminDiagnostics(false);
    console.error(`[school-register] [${requestId}] Firebase Admin not configured:`, {
      environmentScope: diagnostics.environmentScope,
      detectedSource: diagnostics.detectedSource,
      variables: diagnostics.variables,
      formatValidation: diagnostics.formatValidation,
      adminAppStatus: diagnostics.adminAppStatus,
    });

    const { referenceCode } = await captureApiException(
      new Error("Firebase Admin SDK is not configured for registration."),
      request,
      {
        errorCode: "ADMIN_AUTH_NOT_CONFIGURED",
        module: "school-registration",
        operation: "admin_init",
        severity: "critical",
        category: "system",
        httpStatus: 503,
        metadata: {
          environmentScope: diagnostics.environmentScope,
          detectedSource: diagnostics.detectedSource,
          hasClientEmail: diagnostics.variables.hasClientEmail,
          hasPrivateKey: diagnostics.variables.hasPrivateKey,
        },
      }
    );

    // STRICT SECURITY: Never expose internal server diagnostic data, email strings, or secrets in public payload
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ADMIN_AUTH_NOT_CONFIGURED",
          message:
            "School registration is temporarily unavailable. Please try again later or contact support.",
          requestId,
          referenceCode,
          retryable: false,
        },
        code: "ADMIN_AUTH_NOT_CONFIGURED",
        referenceCode,
      },
      { status: 503 }
    );
  }

  let createdUid: string | undefined;

  try {
    const input = await request.json().catch(() => ({}));

    // Input schema validation
    if (
      ![input.name, input.code, input.adminName, input.adminEmail, input.adminPassword].every(
        (v) => typeof v === "string" && v.trim()
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "School and administrator details are required.",
            requestId,
            retryable: false,
          },
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }

    const schoolName = String(input.name).trim();
    const adminName = String(input.adminName).trim();
    const adminEmail = String(input.adminEmail).trim().toLowerCase();
    const code = String(input.code).trim().toUpperCase();
    const password = String(input.adminPassword);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      schoolName.length < 2 ||
      schoolName.length > 100 ||
      adminName.length < 2 ||
      adminName.length > 100 ||
      !emailRegex.test(adminEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please provide valid school and administrator details.",
            requestId,
            retryable: false,
          },
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9_-]{2,30}$/.test(code) || password.length < 6 || password.length > 128) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Use a valid school code (2-30 alphanumeric characters) and a password between 6 and 128 characters.",
            requestId,
            retryable: false,
          },
          code: "INVALID_CREDENTIALS",
        },
        { status: 400 }
      );
    }

    // 1. Verify active zero-price registration plan exists
    const plan = await db.collection("plans").doc("plan_free").get();
    const isPlanDocExists = Boolean(
      (plan as any).exists === true ||
      (typeof (plan as any).exists === "function" && (plan as any).exists())
    );
    const versions = await db
      .collection("planVersions")
      .where("planId", "==", "plan_free")
      .where("status", "==", "ACTIVE")
      .get();
    const version = versions.docs.sort(
      (a, b) => (b.data().version || 0) - (a.data().version || 0)
    )[0];

    if (
      !isPlanDocExists ||
      plan.data()?.status !== "ACTIVE" ||
      !version ||
      version.data().monthlyPrice !== 0 ||
      version.data().annualPrice !== 0
    ) {
      console.warn(`[school-register] [${requestId}] Registration free plan inactive or unpublished.`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FREE_PLAN_NOT_PUBLISHED",
            message: "Publish an active free registration plan before accepting new schools.",
            requestId,
            retryable: false,
          },
          code: "FREE_PLAN_NOT_PUBLISHED",
        },
        { status: 503 }
      );
    }

    // 2. Pre-verify school code availability
    const codeQuery = await db.collection("schools").where("code", "==", code).get();
    if (!codeQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CODE_ALREADY_EXISTS",
            message: `School code "${code}" is already registered. Please choose a different code.`,
            requestId,
            retryable: false,
          },
          code: "CODE_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    // 3. Provision administrator Auth account
    let user;
    try {
      user = await auth.createUser({
        email: adminEmail,
        password,
        displayName: adminName,
      });
    } catch (authCreateErr: any) {
      if (
        authCreateErr?.code === "auth/email-already-exists" ||
        authCreateErr?.code === "auth/email-already-in-use" ||
        authCreateErr?.message?.includes("already in use")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "This email is already registered. Please sign in or use a different email.",
              requestId,
              retryable: false,
            },
            code: "EMAIL_ALREADY_EXISTS",
          },
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
        name: schoolName,
        code,
        address: String(input.address || "").trim(),
        city: String(input.city || "India").trim(),
        state: String(input.state || "").trim(),
        phone: String(input.phone || "").trim(),
        email: String(input.email || "").trim(),
        logoUrl: String(input.logoUrl || "").trim(),
        status: "active",
        setupCompleted: false,
        setupStep: 1,
        adminUid: user.uid,
        adminName,
        adminEmail,
        planId: "plan_free",
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: end,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(db.collection("users").doc(user.uid), {
        uid: user.uid,
        name: adminName,
        email: adminEmail,
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
      tx.set(db.collection("schoolUsage").doc(schoolRef.id), {
        schoolId: schoolRef.id,
        students: 0,
        teachers: 0,
        classes: 0,
        staff: 1,
        lastReconciledAt: now,
        updatedAt: now,
      });
    });

    // 5. Non-blocking audit record
    try {
      const auditCol = db.collection("auditLogs");
      if (typeof auditCol.doc === "function") {
        auditCol.doc().set({
          action: "SCHOOL_REGISTERED",
          schoolId: schoolRef.id,
          schoolCode: code,
          adminEmail,
          adminUid: user.uid,
          requestId,
          createdAt: now,
          source: "registration_api",
        });
      }
    } catch {}

    // Succeeded completely; clear rollback tracking
    createdUid = undefined;

    return NextResponse.json({
      success: true,
      schoolId: schoolRef.id,
      adminUid: user.uid,
      requestId,
    });
  } catch (error: any) {
    // Robust cross-system compensation rollback with retry
    if (createdUid) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await auth.deleteUser(createdUid);
          break;
        } catch (delErr) {
          if (attempt === 3) {
            console.error(`[school-register] [${requestId}] Auth compensation permanently failed for ${createdUid}:`, delErr);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
          }
        }
      }
    }

    console.error(`[school-register] [${requestId}] Registration error:`, error?.message || error);

    const isConflict = error?.message?.includes("already registered");
    const safeMessage = isConflict
      ? `School code is already registered. Please choose a different code.`
      : "Registration could not be completed at this time. Please try again.";

    const { referenceCode } = await captureApiException(error, request, {
      errorCode: isConflict ? "CODE_ALREADY_EXISTS" : "REGISTRATION_FAILED",
      module: "school-registration",
      operation: "register_school",
      severity: isConflict ? "medium" : "high",
      category: "api",
      httpStatus: isConflict ? 409 : 503,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: isConflict ? "CODE_ALREADY_EXISTS" : "REGISTRATION_FAILED",
          message: safeMessage,
          requestId,
          referenceCode,
          retryable: !isConflict,
        },
        code: isConflict ? "CODE_ALREADY_EXISTS" : "REGISTRATION_FAILED",
        referenceCode,
      },
      { status: isConflict ? 409 : 503 }
    );
  }
}
