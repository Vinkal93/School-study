import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  createFeeStructureDefinition,
  updateFeeStructureDefinition,
} from "@/lib/services/fee-foundation.service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, getDocs, query, where, deleteDoc, setDoc } from "firebase/firestore";
import type { FeeStructureDefinition } from "@/types/fee-foundation";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");

    const targetSchoolId = authResult.isAuthenticated && authResult.user
      ? (authResult.user.role === "super_admin" ? (requestedSchoolId || authResult.user.schoolId) : authResult.user.schoolId)
      : requestedSchoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Missing school identifier" }, { status: 400 });
    }

    const academicYearId = searchParams.get("academicYearId");
    const className = searchParams.get("className");

    const db = getFirebaseDb();
    if (!db) throw new Error("Database not connected");

    const q = query(
      collection(db, "feeStructures"),
      where("schoolId", "==", targetSchoolId)
    );

    const snap = await getDocs(q);
    let structures = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeStructureDefinition));

    if (academicYearId && academicYearId !== "all") {
      structures = structures.filter((s) => s.academicYearId === academicYearId);
    }
    if (className && className !== "all") {
      structures = structures.filter((s) => s.className === className || s.className === "all");
    }

    structures.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ success: true, structures });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/structures error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch fee structures" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden: You cannot configure fee structures." }, { status: 403 });
    }

    const body = await request.json();
    const {
      schoolId: clientSchoolId,
      academicYearId,
      academicYearName,
      feeHeadId,
      feeHeadName,
      className,
      sectionName,
      title,
      amountRupees,
      frequency,
      dueDayOfMonth,
      gracePeriodDays,
      lateFeeRule,
    } = body;

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Missing school identifier" }, { status: 400 });
    }

    const newStructure = await createFeeStructureDefinition(
      targetSchoolId,
      {
        academicYearId,
        academicYearName: academicYearName || academicYearId,
        feeHeadId,
        feeHeadName,
        className,
        sectionName,
        title,
        amountRupees: Number(amountRupees),
        frequency,
        dueDayOfMonth: Number(dueDayOfMonth) || 10,
        gracePeriodDays: Number(gracePeriodDays) || 5,
        lateFeeRule,
      },
      authResult.user.uid
    );

    return NextResponse.json({ success: true, structure: newStructure });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/structures error:", err);
    return NextResponse.json({ error: err.message || "Failed to create fee structure" }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin", "accountant"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, schoolId: clientSchoolId, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Structure ID is required" }, { status: 400 });
    }

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (clientSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    const updated = await updateFeeStructureDefinition(
      targetSchoolId,
      id,
      updates,
      authResult.user.uid
    );

    return NextResponse.json({ success: true, structure: updated });
  } catch (err: any) {
    console.error("PUT /api/fees/foundation/structures error:", err);
    return NextResponse.json({ error: err.message || "Failed to update fee structure" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["super_admin", "school_admin", "admin"];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get("id");
    const requestedSchoolId = searchParams.get("schoolId");

    const targetSchoolId = authResult.user.role === "super_admin"
      ? (requestedSchoolId || authResult.user.schoolId)
      : authResult.user.schoolId;

    if (!structureId || !targetSchoolId) {
      return NextResponse.json({ error: "Missing structureId or schoolId" }, { status: 400 });
    }

    const db = getFirebaseDb();
    if (!db) throw new Error("Database not connected");

    // Safety check: verify if demands have been issued for this structure
    const qDemands = query(
      collection(db, "feeDemands"),
      where("schoolId", "==", targetSchoolId),
      where("feeStructureId", "==", structureId)
    );
    const demandSnap = await getDocs(qDemands);

    const structRef = doc(db, "feeStructures", structureId);

    if (!demandSnap.empty) {
      // Demands exist: Do not hard delete to maintain historical financial audit integrity! Deactivate instead.
      await setDoc(structRef, { status: "INACTIVE", updatedAt: new Date().toISOString() }, { merge: true });
      return NextResponse.json({
        success: true,
        deactivated: true,
        message: "Fee structure deactivated. Historical demand records were preserved.",
      });
    }

    // No demands issued: Safe to delete
    await deleteDoc(structRef);
    return NextResponse.json({ success: true, deleted: true });
  } catch (err: any) {
    console.error("DELETE /api/fees/foundation/structures error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete fee structure" }, { status: 500 });
  }
}
