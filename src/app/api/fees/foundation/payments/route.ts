import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  processFeePaymentWithAllocations,
  getFinancialPayments,
} from "@/lib/services/fee-foundation.service";
import type { PaymentMethod } from "@/types/fee-foundation";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const className = searchParams.get("className") || undefined;
    const sectionName = searchParams.get("sectionName") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const status = searchParams.get("status") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchQuery = searchParams.get("search") || undefined;
    const limitCount = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    const payments = await getFinancialPayments(targetSchoolId, {
      academicYearId,
      className,
      sectionName,
      studentId,
      paymentMethod,
      status,
      startDate,
      endDate,
      searchQuery,
      limitCount,
    });

    return NextResponse.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/payments error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch financial payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to collect fee payments." },
        { status: 403 }
      );
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
      idempotencyKey,
    } = body;

    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId || !studentId || amountPaidRupees === undefined || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required payment fields (schoolId, studentId, amountPaidRupees, paymentMethod)." },
        { status: 400 }
      );
    }

    const result = await processFeePaymentWithAllocations(targetSchoolId, {
      studentId,
      studentName: studentName || "Student",
      admissionNumber: admissionNumber || studentId,
      className: className || "",
      sectionName: sectionName || "A",
      academicYearId: academicYearId || "ay_current",
      amountPaidRupees: Number(amountPaidRupees),
      paymentMethod: (paymentMethod.toUpperCase() as PaymentMethod) || "CASH",
      targetDemandIds,
      referenceNumber,
      remarks,
      paymentDate,
      idempotencyKey,
      actorId: authResult.user.uid,
      actorName: authResult.user.name || authResult.user.email || "Staff Accountant",
    });

    return NextResponse.json({
      success: true,
      receiptNumber: result.payment.receiptNumber,
      payment: result.payment,
      allocations: result.allocations,
      updatedDemands: result.updatedDemands,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/payments error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process fee payment" },
      { status: 400 }
    );
  }
}
