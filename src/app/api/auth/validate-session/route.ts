import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { validateTenantMember, validateSchoolStatus } from "@/lib/auth/schoolValidation";

/**
 * POST /api/auth/validate-session
 *
 * Centralized endpoint to validate active authentication, user membership,
 * and authoritative school status.
 *
 * Denies access immediately if the school has been deleted, deleting, suspended,
 * or if the user account is inactive or missing.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);

    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json(
        {
          valid: false,
          code: "UNAUTHENTICATED",
          error: "Account not found. Please verify your credentials or contact support.",
        },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Super Admin platform access
    if (user.role === "super_admin" && !user.impersonatedBy) {
      return NextResponse.json({
        valid: true,
        user: {
          uid: user.uid,
          email: user.email,
          role: user.role,
          name: user.name,
          status: user.status,
        },
      });
    }

    // Validate membership and school status
    const tenantValidation = await validateTenantMember(user);

    if (!tenantValidation.valid) {
      return NextResponse.json(
        {
          valid: false,
          code: tenantValidation.code || "TENANT_ACCESS_DENIED",
          error: tenantValidation.error || "School Account Not Found. This school account no longer exists. Please contact support.",
        },
        { status: tenantValidation.statusHttp || 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        name: user.name,
        schoolId: user.schoolId,
        status: user.status,
      },
      school: tenantValidation.school,
    });
  } catch (error: any) {
    console.error("[validate-session] Error:", error);
    return NextResponse.json(
      {
        valid: false,
        code: "SERVER_ERROR",
        error: "Unable to validate session at this time. Please try again.",
      },
      { status: 500 }
    );
  }
}
