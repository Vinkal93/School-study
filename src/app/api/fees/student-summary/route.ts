import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getStudentFeeSummary } from "@/lib/services/fee.service";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) {
      return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || user.schoolId;
    const studentId = searchParams.get("studentId");
    const studentName = searchParams.get("studentName") || "Student";
    const admissionNumber = searchParams.get("admissionNumber") || studentId || "";
    const className = searchParams.get("className") || "";
    const sectionName = searchParams.get("sectionName") || "A";

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: "Missing schoolId or studentId" }, { status: 400 });
    }

    // Tenant Isolation Check
    if (user.role !== "super_admin" && user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden: Cross-tenant access denied" }, { status: 403 });
    }

    // Student Access Control: A student can ONLY view their own fee data!
    if (user.role === "student") {
      let isOwner = user.uid === studentId || user.studentId === studentId || (user as any).admissionNumber === studentId;

      if (!isOwner) {
        // Resolve student profile to check ownership
        let studentDoc: any = null;
        const adminDb = getSafeAdminDb();
        if (adminDb) {
          const snap = await adminDb.collection("schools").doc(schoolId).collection("students").doc(studentId).get();
          if (snap.exists) studentDoc = snap.data();
        } else {
          const clientDb = getFirebaseDb();
          if (clientDb) {
            const snap = await getDoc(doc(clientDb, "schools", schoolId, "students", studentId));
            if (snap.exists()) studentDoc = snap.data();
          }
        }

        if (studentDoc && (studentDoc.userId === user.uid || studentDoc.email?.toLowerCase() === user.email?.toLowerCase())) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        return NextResponse.json(
          { error: "Forbidden: You are only authorized to view your own fee records." },
          { status: 403 }
        );
      }
    }

    const summary = await getStudentFeeSummary(schoolId, {
      id: studentId,
      name: studentName,
      admissionNumber,
      className,
      sectionName,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error("GET /api/fees/student-summary error:", err);
    return NextResponse.json({ error: err.message || "Failed to load student fee summary" }, { status: 500 });
  }
}
