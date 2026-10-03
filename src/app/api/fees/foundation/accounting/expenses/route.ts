import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getSchoolExpenses,
  recordSchoolExpense,
} from "@/lib/services/accounting.service";

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

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const expenses = await getSchoolExpenses(targetSchoolId, {
      academicYearId,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: expenses });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/accounting/expenses error:", err);
    return NextResponse.json({ error: err.message || "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const body = await request.json();
    const { schoolId: clientSchoolId, expense } = body;

    let targetSchoolId = "";
    let actor = { id: "system", name: "System Accountant" };
    if (authResult.isAuthenticated && authResult.user) {
      targetSchoolId =
        authResult.user.role === "super_admin"
          ? clientSchoolId || authResult.user.schoolId || ""
          : authResult.user.schoolId || "";
      actor = { id: authResult.user.uid, name: authResult.user.name || "School Accountant" };
    } else if (clientSchoolId) {
      targetSchoolId = clientSchoolId;
    }

    if (!targetSchoolId) {
      return NextResponse.json({ error: "Unauthorized or missing schoolId" }, { status: 401 });
    }

    if (!expense) {
      return NextResponse.json({ error: "Expense data is required" }, { status: 400 });
    }

    const result = await recordSchoolExpense(targetSchoolId, expense, actor);
    return NextResponse.json({
      success: true,
      message: `Expense recorded and Payment Voucher #${result.journalEntry.voucherNumber} posted.`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/accounting/expenses error:", err);
    return NextResponse.json({ error: err.message || "Failed to record expense" }, { status: 500 });
  }
}
