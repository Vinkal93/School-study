import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getStudentLedger,
  getStudentStatement,
} from "@/lib/services/fee-ledger.service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const clientSchoolId = searchParams.get("schoolId");

    let targetSchoolId = "";
    if (authResult.isAuthenticated && authResult.user) {
      targetSchoolId =
        authResult.user.role === "super_admin"
          ? clientSchoolId || authResult.user.schoolId || ""
          : authResult.user.schoolId || "";
    } else if (clientSchoolId) {
      targetSchoolId = clientSchoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Unauthorized or missing schoolId" }, { status: 401 });
    }

    const studentId = searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const feeHeadId = searchParams.get("feeHeadId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const isStatement = searchParams.get("statement") === "true";

    if (isStatement) {
      const statement = await getStudentStatement(targetSchoolId, studentId, {
        academicYearId,
        feeHeadId,
        startDate,
        endDate,
      });
      return NextResponse.json({ success: true, data: statement });
    }

    const ledger = await getStudentLedger(targetSchoolId, studentId, {
      academicYearId,
      feeHeadId,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: ledger });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/ledger/student error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch student ledger" },
      { status: 500 }
    );
  }
}
