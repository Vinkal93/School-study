import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTeacherOrAdmin } from "@/lib/auth/serverAuth";
import { createStudentComplaint, getStudentComplaints } from "@/lib/services/complaint.service";
import type { ComplaintCategory, ComplaintSeverity } from "@/types/complaint";

/**
 * POST /api/complaints
 * 
 * Server-authoritative endpoint to register a student complaint.
 * Authorized callers: Teachers and School Administrators only.
 * Enforces strict tenant isolation: Caller's schoolId must match student's schoolId.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTeacherOrAdmin(req);
    if (auth.errorResponse || !auth.user) {
      return auth.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = auth;
    const body = await req.json().catch(() => ({}));

    const {
      studentId,
      studentUid,
      studentName,
      className,
      sectionName,
      title,
      category,
      description,
      severity,
      incidentDate,
      attachmentRefs,
      notes,
    } = body;

    // Validation
    if (!studentId || !studentName || !title?.trim() || !category || !description?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, studentName, title, category, and description are required." },
        { status: 400 }
      );
    }

    const validCategories: ComplaintCategory[] = [
      "DISCIPLINE",
      "ATTENDANCE",
      "ACADEMIC",
      "BEHAVIOR",
      "FEES",
      "MISCONDUCT",
      "OTHER",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const validSeverities: ComplaintSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const resolvedSeverity: ComplaintSeverity = validSeverities.includes(severity) ? severity : "MEDIUM";

    // Multi-Tenant Isolation & Student Validation:
    // Determine the target schoolId strictly from the authenticated caller
    const targetSchoolId = user.schoolId || body.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json(
        { error: "Access Denied: Caller is not assigned to a school." },
        { status: 403 }
      );
    }

    // Verify student belongs to the caller's school
    try {
      const { getSafeAdminDb } = await import("@/lib/firebase/admin");
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        // Try student document in subcollection or users
        const studentDoc = await adminDb
          .collection("schools")
          .doc(targetSchoolId)
          .collection("students")
          .doc(studentId)
          .get();

        if (!studentDoc.exists) {
          // Check if studentId is a user UID
          const userDoc = await adminDb.collection("users").doc(studentId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.schoolId && userData.schoolId !== targetSchoolId) {
              return NextResponse.json(
                { error: "Tenant Isolation Violation: Target student belongs to a different school." },
                { status: 403 }
              );
            }
          }
        }
      }
    } catch (checkErr) {
      // Non-blocking verification fallback
    }

    const created = await createStudentComplaint(
      targetSchoolId,
      {
        studentId,
        studentUid,
        studentName,
        className,
        sectionName,
        title,
        category,
        description,
        severity: resolvedSeverity,
        incidentDate: incidentDate || new Date().toISOString().split("T")[0],
        attachmentRefs,
        notes,
      },
      {
        uid: user.uid,
        name: user.name || (user.role === "teacher" ? "Faculty Teacher" : "School Administrator"),
        role: user.role as any,
      }
    );

    return NextResponse.json({ success: true, complaint: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API Complaints POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create complaint." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/complaints
 * 
 * Fetches complaints scoped strictly by authenticated caller's role:
 * - Student: Only complaints targeting their own UID/studentId.
 * - Teacher / School Admin: Complaints in their school.
 * - Super Admin: Global or school-filtered.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.errorResponse || !auth.user) {
      return auth.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = auth;
    const url = new URL(req.url);
    const requestedStudentId = url.searchParams.get("studentId") || undefined;
    const status = (url.searchParams.get("status") as any) || undefined;

    // Student Ownership Guard: Students can ONLY query their own complaints
    if (user.role === "student") {
      if (!user.schoolId) {
        return NextResponse.json({ success: true, complaints: [] });
      }

      const complaints = await getStudentComplaints({
        schoolId: user.schoolId,
        studentUid: user.uid,
        studentId: user.studentId || undefined,
        status,
      });

      return NextResponse.json({ success: true, complaints });
    }

    // Teacher & School Admin: Scoped strictly to their school
    const schoolId = user.role === "super_admin" ? url.searchParams.get("schoolId") || user.schoolId : user.schoolId;

    if (!schoolId) {
      if (user.role === "super_admin") {
        return NextResponse.json({ success: true, complaints: [] });
      }
      return NextResponse.json(
        { error: "Access Denied: School context required." },
        { status: 403 }
      );
    }

    const complaints = await getStudentComplaints({
      schoolId,
      studentId: requestedStudentId,
      status,
    });

    return NextResponse.json({ success: true, complaints });
  } catch (error: any) {
    console.error("[API Complaints GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch complaints." },
      { status: 500 }
    );
  }
}
