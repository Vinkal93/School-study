import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { POST as createOrder } from "../../orders/route";
export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    if (!body.acceptTerms || !body.offerId || !ownsBillingSchool(actor.user,body.schoolId)) return NextResponse.json({error:"Offer terms and authorized school are required."},{status:403});
    const offer = (await actor.db.collection("customOffers").doc(String(body.offerId)).get()).data();
    if (!offer) return NextResponse.json({error:"Offer not found."},{status:404});
    const response = await createOrder(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify({...body,planId:offer.offerPlanId,billingCycle:offer.billingCycle || "monthly"})}));
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data,{status:response.status});
    return NextResponse.json({...data,internalOrderId:data.orderId,orderId:data.razorpayOrderId,keyId:data.key,amountPaise:data.amount,amountRupees:data.amount/100});
  } catch { return NextResponse.json({error:"Offer checkout unavailable."},{status:503}); }
}
