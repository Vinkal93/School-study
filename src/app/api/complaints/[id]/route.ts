import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin, requireTeacherOrAdmin } from "@/lib/auth/serverAuth";
import { updateComplaintStatus } from "@/lib/services/complaint.service";
import type { ComplaintStatus } from "@/types/complaint";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, deleteDoc } from "firebase/firestore";

/**
 * PATCH /api/complaints/[id]
 * 
 * Updates complaint status or resolution notes.
 * Authorized callers: Teachers and School Administrators only.
 * Students receive HTTP 403 Forbidden.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await context.params;
    const auth = await requireTeacherOrAdmin(req);
    if (auth.errorResponse || !auth.user) {
      return auth.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = auth;
    const body = await req.json().catch(() => ({}));
    const { status, notes } = body;

    const validStatuses: ComplaintStatus[] = ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const schoolId = user.schoolId || body.schoolId || "";
    if (!schoolId && user.role !== "super_admin") {
      return NextResponse.json({ error: "School context missing" }, { status: 403 });
    }

    await updateComplaintStatus(
      complaintId,
      schoolId,
      status || "OPEN",
      {
        uid: user.uid,
        name: user.name || "Administrator",
        role: user.role,
      },
      notes
    );

    return NextResponse.json({ success: true, message: "Complaint updated successfully." });
  } catch (error: any) {
    console.error("[API Complaints PATCH] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update complaint." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/complaints/[id]
 * 
 * Authorized callers: School Administrators and Super Admin only.
 * Students and Teachers receive HTTP 403 Forbidden.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: complaintId } = await context.params;
    const auth = await requireSchoolAdmin(req);
    if (auth.errorResponse || !auth.user) {
      return auth.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Try Admin SDK first
    try {
      const { getSafeAdminDb } = await import("@/lib/firebase/admin");
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        await adminDb.collection("studentComplaints").doc(complaintId).delete();
        return NextResponse.json({ success: true, message: "Complaint record deleted." });
      }
    } catch (e) {}

    // Fallback Client SDK
    const db = getFirebaseDb();
    if (db) {
      await deleteDoc(doc(db, "studentComplaints", complaintId));
    }

    return NextResponse.json({ success: true, message: "Complaint record deleted." });
  } catch (error: any) {
    console.error("[API Complaints DELETE] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete complaint." },
      { status: 500 }
    );
  }
}
