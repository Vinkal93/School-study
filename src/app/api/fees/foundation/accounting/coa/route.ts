import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getChartOfAccounts,
  initializeDefaultCOA,
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

    const coa = await getChartOfAccounts(targetSchoolId);
    return NextResponse.json({ success: true, data: coa });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/accounting/coa error:", err);
    return NextResponse.json({ error: err.message || "Failed to load Chart of Accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const body = await request.json();
    const { schoolId: clientSchoolId, action } = body;

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

    if (action === "initialize_defaults") {
      const coa = await initializeDefaultCOA(targetSchoolId);
      return NextResponse.json({ success: true, message: "Chart of accounts initialized", data: coa });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/accounting/coa error:", err);
    return NextResponse.json({ error: err.message || "Failed to update Chart of Accounts" }, { status: 500 });
  }
}
