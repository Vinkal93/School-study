import { NextResponse } from "next/server";
import { requireFeeAccess } from "@/lib/fees/server-access";
import { getFeeDemands, generateBulkFeeDemands } from "@/lib/services/fee-foundation.service";
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

export async function POST(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const body = await request.json();
    const schoolId = auth.user.role === "super_admin" ? body.schoolId || auth.user.schoolId : auth.user.schoolId;
    if (!schoolId || !body.studentId || !body.academicYearId || ["all","current","ay_current"].includes(body.academicYearId)) return NextResponse.json({ error:"Student and a specific academic session are required." },{status:400});
    const result = await generateBulkFeeDemands(schoolId,{academicYearId:body.academicYearId,studentIds:[body.studentId],actorId:auth.user.uid});
    if (result.errors.length) return NextResponse.json({success:false,error:result.errors.join("; ")},{status:400});
    return NextResponse.json({success:true,...result});
  } catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : "Invoice generation failed."},{status:500}); }
}
