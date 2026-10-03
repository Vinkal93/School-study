import { NextResponse, NextRequest } from "next/server";
import { requireFeeAccess as authenticateRequest } from "@/lib/fees/server-access";
import { getBalanceSheet } from "@/lib/services/accounting.service";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.isAuthenticated || !authResult.user) return authResult.errorResponse || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const statement = await getBalanceSheet(targetSchoolId, {
      academicYearId,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: statement });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/accounting/balance-sheet error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate Balance Sheet statement" },
      { status: 500 }
    );
  }
}
