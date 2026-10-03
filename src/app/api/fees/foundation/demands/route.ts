import { NextResponse } from "next/server";
import { requireFeeAccess } from "@/lib/fees/server-access";
import { getFeeDemands } from "@/lib/services/fee-foundation.service";
export async function GET(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const params = new URL(request.url).searchParams;
    const schoolId = auth.user.role === "super_admin" ? params.get("schoolId") || auth.user.schoolId : auth.user.schoolId;
    if (!schoolId) return NextResponse.json({ error: "School required." }, { status: 400 });
    return NextResponse.json({ success: true, demands: await getFeeDemands(schoolId, params.get("studentId") || undefined, params.get("academicYearId") || undefined) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoices unavailable." }, { status: 500 });
  }
}
