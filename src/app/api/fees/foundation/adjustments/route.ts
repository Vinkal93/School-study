import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { applyFeeAdjustment } from "@/lib/services/fee-foundation.service";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
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
        reason: reason || "Administrative concession",
        approvedBy: approvedBy || authResult.user.name || "Principal",
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
    const { getFirebaseDb } = await import("@/lib/firebase/client");
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
    const adjustments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    adjustments.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ success: true, adjustments });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/adjustments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

