import { NextResponse } from "next/server";
import { requireBillingActor, ownsBillingSchool } from "@/lib/payments/server-access";
import { verifyRazorpayPaymentSignatureAsync } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfillment";
export async function POST(request: Request) {
  try {
    const actor = await requireBillingActor(request);
    if (actor.error) return actor.error;
    const body = await request.json();
    if (![body.orderId, body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature].every(value => typeof value === "string" && value.length > 0)) return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    const snap = await actor.db.collection("orders").doc(body.orderId).get();
    const order = snap.data();
    if (!order || !ownsBillingSchool(actor.user, order.schoolId) || (actor.user.role !== "super_admin" && order.userId !== actor.user.uid)) return NextResponse.json({ error: "Order access denied." }, { status: 403 });
    if (order.razorpayOrderId !== body.razorpay_order_id || !await verifyRazorpayPaymentSignatureAsync({ ...body, razorpay_order_id: order.razorpayOrderId })) return NextResponse.json({ error: "Invalid payment signature or order." }, { status: 400 });
    const result = await fulfillSuccessfulPayment(snap.id, body.razorpay_payment_id, "callback");
    return NextResponse.json({ success: true, orderId: result.order.id, paymentId: result.payment.id, invoiceNumber: result.invoice.invoiceNumber, expiresAt: result.subscription.expiresAt, alreadyFulfilled: result.alreadyFulfilled });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Payment verification unavailable." }, { status: 503 }); }
}
