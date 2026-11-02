import { NextResponse } from "next/server";
import { requireFeeAccess } from "@/lib/fees/server-access";
import { collectFeePayment } from "@/lib/services/fee.service";
export async function POST(request: Request) {
  try {
    const auth = await requireFeeAccess(request);
    if (!auth.user) return auth.errorResponse;
    const body = await request.json();
    const schoolId = auth.user.role === "super_admin" ? body.schoolId || auth.user.schoolId : auth.user.schoolId;
    if (!schoolId || !body.studentId || !body.academicYearId) return NextResponse.json({ error: "School, student and academic session are required." }, { status: 400 });
    return NextResponse.json(await collectFeePayment(schoolId, body, auth.user.uid));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment failed." }, { status: 400 });
  }
}
