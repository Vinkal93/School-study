import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { processFeeRefund } from "@/lib/services/fee-foundation.service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { FinancialRefund, PaymentMethod } from "@/types/fee-foundation";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");
    const paymentId = searchParams.get("paymentId");
    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) throw new Error("Database not connected");

    let q = query(
      collection(db, "financialRefunds"),
      where("schoolId", "==", targetSchoolId)
    );

    const snap = await getDocs(q);
    let refunds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialRefund));

    if (paymentId) {
      refunds = refunds.filter((r) => r.paymentId === paymentId);
    }

    refunds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      count: refunds.length,
      refunds,
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/refunds error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch refunds" },
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

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to process fee refunds." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      paymentId,
      amountRupees,
      reason,
      refundMethod,
      referenceNumber,
    } = body;

    const targetSchoolId =
      authResult.user.role === "super_admin"
        ? clientSchoolId || authResult.user.schoolId
        : authResult.user.schoolId;

    if (!targetSchoolId || !paymentId || amountRupees === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required refund fields (paymentId, amountRupees, reason)." },
        { status: 400 }
      );
    }

    const result = await processFeeRefund(targetSchoolId, {
      paymentId,
      amountRupees: Number(amountRupees),
      reason,
      refundMethod: refundMethod ? (refundMethod.toUpperCase() as PaymentMethod) : undefined,
      referenceNumber,
      actorId: authResult.user.uid,
      actorName: authResult.user.name || authResult.user.email || "Staff Admin",
    });

    return NextResponse.json({
      success: true,
      refundReceiptNumber: result.refund.refundReceiptNumber,
      refund: result.refund,
      updatedPayment: result.updatedPayment,
      updatedDemands: result.updatedDemands,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/refunds error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process refund" },
      { status: 400 }
    );
  }
}
