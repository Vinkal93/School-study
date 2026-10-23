import { NextResponse } from "next/server";
import { requireBillingActor } from "@/lib/payments/server-access";
import { POST as verifyPayment } from "../../verify/route";
export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    const orders = await actor.db.collection("orders").where("razorpayOrderId","==",String(body.razorpayOrderId || "")).get();
    const order = orders.docs.find(d=>d.data().customOfferId === body.offerId);
    if (!order) return NextResponse.json({error:"Stored offer order not found."},{status:404});
    return verifyPayment(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify({orderId:order.id,razorpay_order_id:body.razorpayOrderId,razorpay_payment_id:body.razorpayPaymentId,razorpay_signature:body.razorpaySignature})}));
  } catch { return NextResponse.json({error:"Offer verification unavailable."},{status:503}); }
}
