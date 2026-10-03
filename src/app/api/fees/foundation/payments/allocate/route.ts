import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { processFeePaymentWithAllocations } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to collect payments." }, { status: 403 });
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      academicYearId,
      amountPaidRupees,
      paymentMethod,
      targetDemandIds,
      referenceNumber,
      remarks,
      paymentDate,
    } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !studentId || !amountPaidRupees || !paymentMethod) {
      return NextResponse.json({ error: "Missing required payment fields" }, { status: 400 });
    }

    const result = await processFeePaymentWithAllocations(
      targetSchoolId,
      {
        studentId,
        studentName: studentName || "Student",
        admissionNumber: admissionNumber || studentId,
        className: className || "",
        sectionName: sectionName || "A",
        academicYearId: academicYearId || "ay_current",
        amountPaidRupees: Number(amountPaidRupees),
        paymentMethod: paymentMethod || "CASH",
        targetDemandIds,
        referenceNumber,
        remarks,
        paymentDate,
        actorId: authResult.user.uid,
        actorName: authResult.user.name || authResult.user.email || "Staff Accountant",
      }
    );

    return NextResponse.json({
      success: true,
      receiptNumber: result.payment.receiptNumber,
      payment: result.payment,
      allocations: result.allocations,
      updatedDemands: result.updatedDemands,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/payments/allocate error:", err);
    return NextResponse.json({ error: err.message || "Failed to process payment allocation" }, { status: 400 });
  }
}
