import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import { collectFeePayment } from "@/lib/services/fee.service";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult.isAuthenticated && authResult.user) {
      const role = authResult.user.role;
      if (role === "student" || role === "parent" || role === "teacher") {
        return NextResponse.json({ error: "Forbidden: You are not authorized to collect fees." }, { status: 403 });
      }
    }

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

    let access = await canAccessFeature(schoolId, "fee_collection");
    if (!access.allowed) {
      const moduleAccess = await canAccessFeature(schoolId, "fee_management");
      if (moduleAccess.allowed) {
        access = moduleAccess;
      }
    }
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.message || "Fee collection feature is not enabled for your plan.", code: access.code || "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Authoritative Server Recalculation & Validation (Part 13)
    const { getStudentApplicableFee } = await import("@/lib/services/fee.service");
    const applicable = await getStudentApplicableFee(schoolId, studentId, academicYearId || "ay_current");
    if (!applicable.isConfigured && (!amountPaidRupees || amountPaidRupees <= 0)) {
      return NextResponse.json(
        { error: `Fee structure not configured for class "${applicable.className || className}". Please enter a valid payment amount.`, code: "FEE_UNCONFIGURED" },
        { status: 400 }
      );
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
    console.error("POST /api/fees/collect error:", err);
    return NextResponse.json({ error: err.message || "Failed to process fee payment" }, { status: 400 });
  }
}
