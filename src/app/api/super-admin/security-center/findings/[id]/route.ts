import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/serverAuth";
import {
  getSecurityFindings,
  updateSecurityFinding,
} from "@/lib/services/security-center.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const findings = await getSecurityFindings();
    const finding = findings.find((f) => f.id === id);

    if (!finding) {
      return NextResponse.json(
        { success: false, error: `Finding ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: finding,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch finding" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireSuperAdmin(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updated = await updateSecurityFinding(
      id,
      body,
      user?.uid || "super_admin"
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    const isLifecycleViolation = error.message && error.message.includes("Lifecycle violation");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update finding" },
      { status: isLifecycleViolation ? 400 : 500 }
    );
  }
}
