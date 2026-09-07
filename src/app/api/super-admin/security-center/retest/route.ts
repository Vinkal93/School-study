import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import { retestSecurityFinding } from "@/lib/services/security-center.service";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { findingId } = body;

    if (!findingId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: findingId" },
        { status: 400 }
      );
    }

    const result = await retestSecurityFinding(findingId, user?.uid || "super_admin");

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute retest" },
      { status: 500 }
    );
  }
}
