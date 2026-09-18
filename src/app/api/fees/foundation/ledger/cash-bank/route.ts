import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getAccountLedger,
  getMultiAccountSummary,
} from "@/lib/services/fee-ledger.service";
import type { PaymentMethod } from "@/types/fee-foundation";

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
      // Fallback for client dashboard context
      targetSchoolId = clientSchoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Unauthorized or missing schoolId" }, { status: 401 });
    }

    const accountType = (searchParams.get("accountType") || "ALL").toUpperCase() as
      | PaymentMethod
      | "ALL";
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const summaryOnly = searchParams.get("summaryOnly") === "true";

    if (summaryOnly) {
      const summary = await getMultiAccountSummary(targetSchoolId, {
        academicYearId,
        startDate,
        endDate,
      });
      return NextResponse.json({ success: true, data: summary });
    }

    const [accountData, multiSummary] = await Promise.all([
      getAccountLedger(targetSchoolId, accountType, {
        academicYearId,
        startDate,
        endDate,
      }),
      getMultiAccountSummary(targetSchoolId, {
        academicYearId,
        startDate,
        endDate,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...accountData,
        multiAccountSummary: multiSummary,
      },
    });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/ledger/cash-bank error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch cash/bank ledger" },
      { status: 500 }
    );
  }
}
