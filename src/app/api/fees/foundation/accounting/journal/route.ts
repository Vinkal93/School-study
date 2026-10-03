import { NextResponse, NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import {
  getJournalEntries,
  syncPhase1to5JournalEntries,
  postJournalEntry,
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
    const accountId = searchParams.get("accountId") || undefined;
    const voucherType = (searchParams.get("voucherType") as any) || undefined;

    const entries = await getJournalEntries(targetSchoolId, {
      academicYearId,
      startDate,
      endDate,
      accountId,
      voucherType,
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (err: any) {
    console.error("GET /api/fees/foundation/accounting/journal error:", err);
    return NextResponse.json({ error: err.message || "Failed to load journal entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const body = await request.json();
    const { schoolId: clientSchoolId, action, academicYearId = "ay_2026_27", entry } = body;

    let targetSchoolId = "";
    let actor = { id: "system", name: "System User" };
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

    // Action 1: Sync historical Phase 1-5 transactions into vouchers
    if (action === "sync_history") {
      const result = await syncPhase1to5JournalEntries(targetSchoolId, academicYearId);
      return NextResponse.json({
        success: true,
        message: "Historical financial records reconciled and synced into double-entry journal vouchers.",
        data: result,
      });
    }

    // Action 2: Manual Journal Voucher Creation
    if (entry) {
      const created = await postJournalEntry(targetSchoolId, {
        ...entry,
        academicYearId: entry.academicYearId || academicYearId,
        createdBy: actor.id,
        createdByName: actor.name,
      });
      return NextResponse.json({ success: true, data: created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/fees/foundation/accounting/journal error:", err);
    return NextResponse.json({ error: err.message || "Failed to process journal entry" }, { status: 500 });
  }
}
