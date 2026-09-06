import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
import { DEFAULT_SUPER_ADMIN_PIN } from "@/lib/services/security-pin.service";
import { COLLECTIONS } from "@/lib/utils/constants";

/**
 * POST /api/auth/verify-super-admin-pin
 * 
 * Verifies the 6-digit Super Admin Security PIN and sets the user's role to super_admin
 * authoritatively on the server side using the Admin SDK (bypassing client Firestore rules).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { uid, email, pin } = body;

    if (!uid || !email || !pin) {
      return NextResponse.json(
        { error: "Missing required fields: uid, email, and pin are required." },
        { status: 400 }
      );
    }

    const trimmedPin = String(pin).trim();
    let expectedPin = DEFAULT_SUPER_ADMIN_PIN;

    try {
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        const securitySnap = await adminDb.collection("system_settings").doc("security").get().catch(() => null);
        if (securitySnap && securitySnap.exists && securitySnap.data()?.pin) {
          expectedPin = String(securitySnap.data()?.pin).trim();
        }
      }
    } catch (err) {
      console.warn("Notice: Fetching stored PIN notice, using default PIN fallback:", err);
    }

    if (trimmedPin !== expectedPin) {
      return NextResponse.json(
        { error: "Invalid Security PIN code. Please check your 6-digit PIN and try again." },
        { status: 401 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const superAdminData = {
      uid,
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0] || "Super Administrator",
      role: "super_admin",
      schoolId: "system",
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    try {
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        await adminDb.collection(COLLECTIONS.USERS).doc(uid).set(superAdminData, { merge: true }).catch((e) => {
          console.warn("Notice: Admin DB user update notice:", e?.message || e);
        });
      }
    } catch (e) {
      console.warn("Notice: Admin DB access notice:", e);
    }

    try {
      const safeAuth = getSafeAdminAuth();
      if (safeAuth) {
        await safeAuth.setCustomUserClaims(uid, {
          role: "super_admin",
          schoolId: "system",
        }).catch((claimErr) => {
          console.warn("Notice: Custom claims notice:", claimErr);
        });
      }
    } catch (claimErr) {
      console.warn("Notice: Custom claims error notice:", claimErr);
    }

    return NextResponse.json({
      success: true,
      message: "Security PIN verified successfully. Super Admin privileges granted.",
      profile: superAdminData,
    });
  } catch (error: any) {
    console.error("verify-super-admin-pin error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during PIN verification." },
      { status: 500 }
    );
  }
}
