import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getPaymentDetailWithAllocations } from "@/lib/services/fee-foundation.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: paymentId } = await params;
    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId || !paymentId) {
      return NextResponse.json({ error: "schoolId and paymentId are required" }, { status: 400 });
    }

    const detail = await getPaymentDetailWithAllocations(targetSchoolId, paymentId);
    if (!detail) {
      return NextResponse.json({ error: "Payment not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/payments/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}
