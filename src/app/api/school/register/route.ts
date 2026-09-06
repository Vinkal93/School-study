import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/utils/constants";

/**
 * POST /api/school/register
 * 
 * Server-authoritative endpoint to register a new school tenant and its primary school admin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      code,
      city,
      state,
      phone,
      email,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!name || !code || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required fields: name, code, adminName, adminEmail, and adminPassword are required." },
        { status: 400 }
      );
    }

    const upperCode = String(code).trim().toUpperCase();
    const normalizedEmail = String(adminEmail).trim().toLowerCase();

    const adminDb = getSafeAdminDb();
    const adminAuth = getSafeAdminAuth();

    // If Admin SDK is fully configured with service account:
    if (adminDb && adminAuth) {
      // 1. Verify code uniqueness
      const codeSnap = await adminDb
        .collection(COLLECTIONS.SCHOOLS)
        .where("code", "==", upperCode)
        .get();

      if (!codeSnap.empty) {
        return NextResponse.json(
          { error: `School code "${upperCode}" is already in use.` },
          { status: 400 }
        );
      }

      // 2. Create Auth User
      let userRecord;
      try {
        userRecord = await adminAuth.createUser({
          email: normalizedEmail,
          password: adminPassword,
          displayName: adminName.trim(),
        });
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-exists") {
          return NextResponse.json(
            { error: `Email "${adminEmail}" is already registered.` },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: authErr.message || "Failed to create administrator account." },
          { status: 400 }
        );
      }

      const adminUid = userRecord.uid;
      const schoolRef = adminDb.collection(COLLECTIONS.SCHOOLS).doc();
      const schoolId = schoolRef.id;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const graceEndsAt = new Date(expiresAt.getTime() + 7 * 24 * 60 * 60 * 1000);

      // 3. Create School document
      await schoolRef.set({
        id: schoolId,
        name: name.trim(),
        code: upperCode,
        city: city?.trim() || "India",
        state: state?.trim() || "",
        phone: phone?.trim() || "",
        email: email?.trim() || "",
        status: "active",
        setupCompleted: false,
        setupStep: 1,
        adminUid,
        adminName: adminName.trim(),
        adminEmail: normalizedEmail,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // 4. Create User document
      await adminDb.collection(COLLECTIONS.USERS).doc(adminUid).set({
        uid: adminUid,
        name: adminName.trim(),
        email: normalizedEmail,
        role: "school_admin",
        schoolId,
        status: "active",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      // 5. Create default Subscription
      await adminDb.collection("schoolSubscriptions").doc(schoolId).set({
        id: schoolId,
        schoolId,
        planId: "plan_free",
        planVersionId: "plan_free_v1",
        status: "ACTIVE",
        billingCycle: "monthly",
        startsAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
        source: "registration_trial",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      try {
        await adminAuth.setCustomUserClaims(adminUid, {
          role: "school_admin",
          schoolId,
        });
      } catch (e) {
        // non-blocking
      }

      return NextResponse.json({
        success: true,
        schoolId,
        adminUid,
      });
    }

    // If Admin SDK credentials not available in environment, signal client fallback
    return NextResponse.json({
      fallbackToClient: true,
    });
  } catch (error: any) {
    console.error("school/register route error:", error);
    return NextResponse.json(
      { fallbackToClient: true },
      { status: 200 }
    );
  }
}
