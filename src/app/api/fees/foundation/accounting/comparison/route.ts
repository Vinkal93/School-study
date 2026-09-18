import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getFinancialStatementsComparison } from "@/lib/services/accounting.service";

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

    const baseYearId = searchParams.get("baseYearId") || "ay_2026_27";
    const compareYearId = searchParams.get("compareYearId") || "ay_2025_26";

    const comparison = await getFinancialStatementsComparison(
      targetSchoolId,
      baseYearId,
      compareYearId
    );

    return NextResponse.json({ success: true, data: comparison });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/accounting/comparison error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate multi-session comparison" },
      { status: 500 }
    );
  }
}
