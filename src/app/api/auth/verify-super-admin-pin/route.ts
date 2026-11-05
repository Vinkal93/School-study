import { NextRequest, NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
import { DEFAULT_SUPER_ADMIN_PIN } from "@/lib/services/security-pin.service";
import { COLLECTIONS } from "@/lib/utils/constants";
import { isSuperAdminEmail } from "@/lib/auth/serverAuth";
import { enforceRateLimit, RATE_LIMIT_PROFILES } from "@/lib/security/rate-limiter";
import { timingSafeEqualString } from "@/lib/security/timing-safe";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-super-admin-pin
 * 
 * Verifies the 6-digit Super Admin Security PIN and sets the user's role to super_admin
 * authoritatively on the server side using the Admin SDK.
 * 
 * Hardened with:
 * - Mandatory verified Firebase ID token (Bearer or cookie session)
 * - Rate limiting to prevent PIN brute-force attempts
 * - Strict whitelist check for Super Admin email addresses
 * - Timing-safe constant-time PIN comparison
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

    // 1. Anti-Brute-Force Rate Limiting (5 attempts / 15 minutes)
    const rateCheck = enforceRateLimit(req, RATE_LIMIT_PROFILES.SUPER_ADMIN_PIN, String(uid));
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }

    // 2. Strict Whitelist Verification: Caller email MUST be an authorized Super Admin email
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isSuperAdminEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Access Denied. This email address is not authorized for Super Administrator access." },
        { status: 403 }
      );
    }

    // 3. Mandatory Cryptographic Token Verification (Zero-Trust)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieHeader = req.headers.get("cookie") || "";
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:__session|auth_token)=([^;]+)/);
      if (match) token = match[1].trim();
    }

    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required to verify Super Admin privileges." },
        { status: 401 }
      );
    }

    const safeAuth = getSafeAdminAuth();
    if (safeAuth) {
      try {
        const decoded = await safeAuth.verifyIdToken(token, true);
        if (decoded.uid !== uid) {
          return NextResponse.json(
            { error: "Security Violation: Caller token does not match target UID." },
            { status: 403 }
          );
        }
        if (decoded.email && decoded.email.toLowerCase() !== normalizedEmail) {
          return NextResponse.json(
            { error: "Security Violation: Caller token does not match target email." },
            { status: 403 }
          );
        }
      } catch (tokenErr) {
        return NextResponse.json(
          { error: "Invalid or expired session token. Please re-authenticate." },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Firebase Admin Auth service is not configured." },
        { status: 503 }
      );
    }

    // 4. Resolve Authoritative Security PIN
    const trimmedPin = String(pin).trim();
    let expectedPin = process.env.SUPER_ADMIN_SECURITY_PIN || DEFAULT_SUPER_ADMIN_PIN;

    try {
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        const securitySnap = await adminDb.collection("system_settings").doc("security").get().catch(() => null);
        if (securitySnap && securitySnap.exists && securitySnap.data()?.pin) {
          expectedPin = String(securitySnap.data()?.pin).trim();
        }
      }
    } catch (err) {
      console.warn("Notice: Stored PIN lookup notice, using fallback:", err);
    }

    // 5. Timing-Safe Constant-Time PIN Comparison
    if (!timingSafeEqualString(trimmedPin, expectedPin)) {
      return NextResponse.json(
        { error: "Invalid Security PIN code. Please check your 6-digit PIN and try again." },
        { status: 401 }
      );
    }

    // 6. Grant Super Admin Profile & Custom User Claims
    const superAdminData = {
      uid,
      email: normalizedEmail,
      name: normalizedEmail.split("@")[0] || "Super Administrator",
      role: "super_admin",
      schoolId: "system",
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    const adminDb = getSafeAdminDb();
    if (adminDb) {
      await adminDb.collection(COLLECTIONS.USERS).doc(uid).set(superAdminData, { merge: true });
    }

    if (safeAuth) {
      try {
        await safeAuth.setCustomUserClaims(uid, {
          role: "super_admin",
          schoolId: "system",
        });
      } catch (claimsErr) {
        console.warn("Notice: Custom claims update notice:", claimsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Super Admin privileges verified successfully.",
      user: {
        uid,
        email: normalizedEmail,
        role: "super_admin",
      },
    });
  } catch (error: any) {
    console.error("PIN verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during verification." },
      { status: 500 }
    );
  }
}
