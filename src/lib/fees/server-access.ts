import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { configureFeeServerDatabase } from "./firestore";
import { getFirebaseDb as getClientDb } from "@/lib/firebase/client";

type FeeAuthResult = Awaited<ReturnType<typeof authenticateRequest>>;

export async function requireFeeAccess(request: Request): Promise<FeeAuthResult> {
  const header = request.headers.get("authorization") || "";
  const cookie = request.headers.get("cookie") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : cookie.match(/(?:^|;\s*)(?:__session|auth_token)=([^;]+)/)?.[1];

  const adminAuth = getSafeAdminAuth();
  const adminDb = getSafeAdminDb();

  // If Admin Auth is configured, perform strict signature check
  if (adminAuth && token) {
    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return {
        isAuthenticated: false,
        errorResponse: NextResponse.json(
          { error: "Sign in to access fee management." },
          { status: 401 }
        ),
      };
    }
  }

  // Authoritative identity, tenant boundary and role check
  const auth = await authenticateRequest(request);
  if (!auth.isAuthenticated || !auth.user) {
    return auth;
  }

  const allowedRoles = ["super_admin", "admin", "school_admin", "accountant"];
  if (!allowedRoles.includes(auth.user.role)) {
    return {
      isAuthenticated: false,
      errorResponse: NextResponse.json(
        { error: "Fee management access is required." },
        { status: 403 }
      ),
    };
  }

  // Prefer Admin Firestore when configured; fall back to server client Firestore
  if (adminDb) {
    configureFeeServerDatabase(adminDb);
  } else {
    try {
      const fallbackDb = getClientDb();
      if (fallbackDb) {
        configureFeeServerDatabase(fallbackDb);
      }
    } catch (e) {
      console.warn("Could not configure fallback fee database:", e);
    }
  }

  return auth;
}
