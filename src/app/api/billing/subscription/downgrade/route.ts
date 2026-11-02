import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
/** Automatic downgrade requires a gateway schedule processor; never claim a change was applied. */
export async function POST(request:Request) {
  const actor=await requireBillingActor(request); if(actor.error)return actor.error;
  const body=await request.json();
  const schoolId=String(body.schoolId || actor.user.schoolId || "");
  if(!schoolId || !ownsBillingSchool(actor.user,schoolId))return NextResponse.json({error:"School billing access denied."},{status:403});
  return NextResponse.json({code:"MANUAL_PLAN_CHANGE_REQUIRED",error:"Automatic scheduled downgrades are not enabled. Cancel automatic renewal, then choose the target plan and complete its checkout. Current paid access remains until expiry."},{status:409});
}
