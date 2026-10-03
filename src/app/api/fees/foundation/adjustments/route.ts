import { matchAcademicYear } from "@/lib/services/fee-foundation.service";
import { NextResponse } from "next/server";
import { requireFeeAccess as authenticateRequest } from "@/lib/fees/server-access";
import { applyFeeAdjustment } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: Only administrators can grant discounts or concessions." }, { status: 403 });
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      studentId,
      studentName,
      academicYearId,
      demandId,
      type,
      amountRupees,
      reason,
      approvedBy,
      idempotencyKey,
    } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId || !studentId || !demandId || !amountRupees || !type) {
      return NextResponse.json({ error: "Missing required adjustment fields" }, { status: 400 });
    }

    const result = await applyFeeAdjustment(
      targetSchoolId,
      {
        studentId,
        studentName: studentName || "Student",
        academicYearId: academicYearId || "ay_current",
        demandId,
        type,
        amountRupees: Number(amountRupees),
        reason,
        approvedBy: authResult.user.uid,
        idempotencyKey,
        actorId: authResult.user.uid,
      }
    );

    return NextResponse.json({
      success: true,
      adjustment: result.adjustment,
      updatedDemand: result.updatedDemand,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to apply fee adjustment" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const studentId = searchParams.get("studentId");
    const { getFirebaseDb } = await import("@/lib/fees/firestore");
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const db = getFirebaseDb();
    if (!db) return NextResponse.json({ success: true, adjustments: [] });

    let q = query(
      collection(db, "feeAdjustments"),
      where("schoolId", "==", targetSchoolId)
    );
    if (studentId) {
      q = query(q, where("studentId", "==", studentId));
    }
    const snap = await getDocs(q);
    let adjustments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as import("@/types/fee-foundation").FeeAdjustment));
    const year = searchParams.get("academicYearId");
    if (year && year !== "all") adjustments = adjustments.filter(a => matchAcademicYear(a.academicYearId, year));

    adjustments.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ success: true, adjustments });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/adjustments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

