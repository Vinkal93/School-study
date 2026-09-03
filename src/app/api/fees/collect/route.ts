import { NextResponse } from "next/server";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import { collectFeePayment } from "@/lib/services/fee.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      schoolId,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      academicYearId,
      feeType,
      periodMonths,
      amountPaidRupees,
      discountRupees,
      paymentMethod,
      transactionRef,
      remarks,
    } = body;

    if (!schoolId || !studentId || !amountPaidRupees || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fee payment fields" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee collection feature is not enabled for your plan." }, { status: 403 });
    }

    const result = await collectFeePayment(
      schoolId,
      {
        studentId,
        studentName: studentName || "Student",
        admissionNumber: admissionNumber || studentId,
        className: className || "Class 10",
        sectionName: sectionName || "A",
        academicYearId: academicYearId || "ay_current",
        feeType: feeType || "tuition",
        periodMonths: periodMonths || ["April 2026"],
        amountPaidRupees,
        discountRupees: discountRupees || 0,
        paymentMethod,
        transactionRef,
        remarks,
      },
      "admin"
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process fee payment" }, { status: 400 });
  }
}
