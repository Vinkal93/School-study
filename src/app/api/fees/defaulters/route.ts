import { requireFeeAccess } from "@/lib/fees/server-access";
import { NextResponse } from "next/server";
import { canAccessFeature } from "@/lib/billing/featureAccess";
import { getDefaultersList } from "@/lib/services/fee.service";

export async function GET(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const { searchParams } = new URL(request.url);
    const schoolId = auth.user.role === "super_admin" ? searchParams.get("schoolId") || auth.user.schoolId : auth.user.schoolId;
    const className = searchParams.get("className") || undefined;

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 });
    }

    const access = await canAccessFeature(schoolId, "fee_management");
    if (!access.allowed) {
      return NextResponse.json({ error: "Fee management feature locked" }, { status: 403 });
    }

    const defaulters = await getDefaultersList(schoolId, className);
    return NextResponse.json({ success: true, defaulters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch defaulters" }, { status: 500 });
  }
}
