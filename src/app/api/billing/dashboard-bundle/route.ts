import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { getSchoolBillingDashboard } from "@/lib/billing/dashboard";
export async function GET(request:Request) {
  try {
    const actor=await requireBillingActor(request); if(actor.error)return actor.error;
    const schoolId=new URL(request.url).searchParams.get("schoolId") || actor.user.schoolId;
    if(!schoolId || !ownsBillingSchool(actor.user,schoolId))return NextResponse.json({error:"School billing access denied."},{status:403});
    const dashboard=await getSchoolBillingDashboard(schoolId);
    return NextResponse.json({success:true,...dashboard,history:[],code:"SUCCESS"});
  }catch(error){return NextResponse.json({error:error instanceof Error ? error.message : "Billing data unavailable."},{status:503});}
}
