import { NextResponse } from "next/server";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { isSuperAdminEmail } from "@/lib/services/user.service";
import { normalizeRole } from "@/lib/utils/redirect-by-role";
import type { AppUser } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const cookieHeader = request.headers.get("cookie") || "";

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:__session|auth_token)=([^;]+)/);
      if (match) token = match[1].trim();
    }

    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication token missing." }, { status: 401 });
    }

    const auth = getSafeAdminAuth();
    const adminDb = getSafeAdminDb();

    if (!auth || !adminDb) {
      return NextResponse.json({ success: false, error: "Auth service temporarily unavailable." }, { status: 503 });
    }

    const decoded = await auth.verifyIdToken(token, true).catch(() => null);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ success: false, error: "Invalid or expired token." }, { status: 401 });
    }

    const uid = decoded.uid;
    const email = (decoded.email || "").trim().toLowerCase();

    // 1. Super Admin Priority Check
    if (email && isSuperAdminEmail(email)) {
      const superProfile: AppUser = {
        uid,
        email,
        name: email.split("@")[0] || "Super Administrator",
        role: "super_admin",
        schoolId: "system",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as AppUser;

      await adminDb.collection("users").doc(uid).set(superProfile, { merge: true }).catch(() => {});
      await auth.setCustomUserClaims(uid, { role: "super_admin", schoolId: "system" }).catch(() => {});

      return NextResponse.json({ success: true, profile: superProfile });
    }

    // 2. Fetch authoritative user document from Firestore Admin DB
    const userDocSnap = await adminDb.collection("users").doc(uid).get();
    let userData = userDocSnap.exists ? (userDocSnap.data() as Partial<AppUser>) : null;

    // 3. Auto-Healing: If user doc missing, or role is not school_admin, check if this user is a school admin in schools collection
    let matchedSchoolId: string | null = null;
    let matchedSchoolName: string | null = null;
    let matchedAdminName: string | null = null;

    if (!userData || normalizeRole(userData.role) !== "school_admin") {
      // Query schools collection by adminUid or adminEmail
      let schoolsSnap = await adminDb.collection("schools").where("adminUid", "==", uid).limit(1).get();
      if (schoolsSnap.empty && email) {
        schoolsSnap = await adminDb.collection("schools").where("adminEmail", "==", email).limit(1).get();
      }

      if (!schoolsSnap.empty) {
        const sDoc = schoolsSnap.docs[0];
        const sData = sDoc.data();
        matchedSchoolId = sDoc.id;
        matchedSchoolName = sData.name || "School";
        matchedAdminName = sData.adminName || sData.name || email.split("@")[0] || "School Administrator";

        const healedProfile: AppUser = {
          uid,
          email,
          name: userData?.name || matchedAdminName,
          role: "school_admin",
          schoolId: matchedSchoolId,
          status: "active",
          createdAt: userData?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as AppUser;

        // Persist healed document in Admin DB
        await adminDb.collection("users").doc(uid).set(healedProfile, { merge: true }).catch(() => {});
        await auth.setCustomUserClaims(uid, { role: "school_admin", schoolId: matchedSchoolId }).catch(() => {});

        return NextResponse.json({ success: true, profile: healedProfile });
      }
    }

    // 4. If user doc exists, ensure role normalization and school association
    if (userData) {
      let role = normalizeRole(userData.role);
      let schoolId = userData.schoolId;

      if (role === "school_admin" && (!schoolId || schoolId === "school_default")) {
        let schoolsSnap = await adminDb.collection("schools").where("adminUid", "==", uid).limit(1).get();
        if (schoolsSnap.empty && email) {
          schoolsSnap = await adminDb.collection("schools").where("adminEmail", "==", email).limit(1).get();
        }
        if (!schoolsSnap.empty) {
          schoolId = schoolsSnap.docs[0].id;
          await adminDb.collection("users").doc(uid).update({ schoolId, role: "school_admin" }).catch(() => {});
        }
      }

      // Sync custom claims if not set
      if (decoded.role !== role || decoded.schoolId !== schoolId) {
        await auth.setCustomUserClaims(uid, { role, schoolId: schoolId || null }).catch(() => {});
      }

      const authoritativeProfile: AppUser = {
        uid,
        email: userData.email || email,
        name: userData.name || (email ? email.split("@")[0] : "User"),
        role,
        schoolId: schoolId || null,
        status: userData.status || "active",
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
        userId: userData.userId || userData.studentId || userData.teacherCode || userData.admissionNumber,
      } as unknown as AppUser;

      return NextResponse.json({ success: true, profile: authoritativeProfile });
    }

    // 5. Fallback if no matching user doc or school
    return NextResponse.json(
      { success: false, error: "User profile not found in authoritative database." },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to resolve authoritative user profile." },
      { status: 500 }
    );
  }
}
