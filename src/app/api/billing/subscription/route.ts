import { GET as getDashboard } from "../dashboard-bundle/route";
import { NextResponse } from "next/server";
export async function GET(request:Request) {
  const response=await getDashboard(request);
  if(!response.ok)return response;
  const data=await response.json();
  return NextResponse.json({success:true,subscription:data.subscription,resolvedState:data.subState,plan:data.plan,planVersion:data.planVersion,history:data.history});
}
