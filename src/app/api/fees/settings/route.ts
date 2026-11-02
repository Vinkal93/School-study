import { NextResponse } from "next/server";
import { requireFeeAccess } from "@/lib/fees/server-access";
import { getFeeSettings, updateFeeSettings } from "@/lib/services/fee.service";
export async function GET(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const schoolId = auth.user.role === "super_admin" ? new URL(request.url).searchParams.get("schoolId") || auth.user.schoolId : auth.user.schoolId;
    if (!schoolId) return NextResponse.json({ error: "School required." }, { status: 400 });
    return NextResponse.json({ success: true, settings: await getFeeSettings(schoolId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settings unavailable." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const body = await request.json();
    const schoolId = auth.user.role === "super_admin" ? body.schoolId || auth.user.schoolId : auth.user.schoolId;
    if (!schoolId || !body.settings) return NextResponse.json({ error: "School and settings required." }, { status: 400 });
    return NextResponse.json({ success: true, settings: await updateFeeSettings(schoolId, body.settings, auth.user.uid) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settings update failed." }, { status: 400 });
  }
}
