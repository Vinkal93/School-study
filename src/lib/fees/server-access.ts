import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminAuth, getSafeAdminDb } from "@/lib/firebase/admin";
import { requireFeatureAccess } from "@/lib/billing/featureAccess";
import { configureFeeServerDatabase } from "./firestore";

type FeeAuthResult = Awaited<ReturnType<typeof authenticateRequest>>;

export async function requireFeeAccess(request: Request): Promise<FeeAuthResult> {
  const header = request.headers.get("authorization") || "";
  const cookie = request.headers.get("cookie") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : cookie.match(/(?:^|;\s*)(?:__session|auth_token)=([^;]+)/)?.[1];

  const adminAuth = getSafeAdminAuth();
  const adminDb = getSafeAdminDb();

  if (!adminAuth || !adminDb) {
    const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);
    return { isAuthenticated: false, errorResponse: NextResponse.json(
      {
        error: "Fee server is not configured. Add private Firebase Admin credentials on the server and restart.",
        code: "FEE_SERVER_NOT_CONFIGURED",
        diagnostics: {
          configured: false,
          hasClientEmail: Boolean(env?.FIREBASE_CLIENT_EMAIL || env?.FIREBASE_ADMIN_CLIENT_EMAIL),
          hasPrivateKey: Boolean(env?.FIREBASE_PRIVATE_KEY || env?.FIREBASE_ADMIN_PRIVATE_KEY),
          hasServiceAccountKey: Boolean(env?.FIREBASE_SERVICE_ACCOUNT_KEY || env?.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64),
          projectId: env?.FIREBASE_PROJECT_ID || env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "school-study-c8991"
        }
      },
      { status: 503 }
    ) };
  }
  if (!token) {
    return { isAuthenticated: false, errorResponse: NextResponse.json({ error: "Sign in to access fee management." }, { status: 401 }) };
  }
  try { await adminAuth.verifyIdToken(token, true); }
  catch {
    return { isAuthenticated: false, errorResponse: NextResponse.json({ error: "Sign in to access fee management." }, { status: 401 }) };
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

  if (auth.user.role !== "super_admin") {
    try { await requireFeatureAccess(auth.user.schoolId || "", "fee_management"); }
    catch (error) {
      return {isAuthenticated:false,errorResponse:NextResponse.json({error:error instanceof Error ? error.message : "Fee plan access denied."},{status:403})};
    }
  }

  configureFeeServerDatabase(adminDb);

  return auth;
}
