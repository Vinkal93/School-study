import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { processPaymentReversal } from "@/lib/services/fee-foundation.service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to reverse payments." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schoolId: clientSchoolId, paymentId, reason } = body;

    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId || !paymentId || !reason) {
      return NextResponse.json(
        { error: "Missing required reversal fields (paymentId, reason)." },
        { status: 400 }
      );
    }

    const result = await processPaymentReversal(targetSchoolId, {
      paymentId,
      reason,
      actorId: authResult.user.uid,
      actorName: authResult.user.name || authResult.user.email || "Staff Admin",
    });

    return NextResponse.json({
      success: true,
      reversal: result.reversal,
      updatedPayment: result.updatedPayment,
      updatedDemands: result.updatedDemands,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/reversals error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process payment reversal" },
      { status: 400 }
    );
  }
}
