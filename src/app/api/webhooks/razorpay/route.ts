import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment, InternalOrder } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-razorpay-signature") || "";

    // 1. Verify Webhook HMAC-SHA256 Signature using raw body (Section 13)
    const isValid = verifyRazorpayWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn("Razorpay Webhook: Invalid signature received.");
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || "";

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    // 2. Webhook Idempotency Check (Section 15)
    const eventRef = doc(db, BILLING_COLLECTIONS.WEBHOOK_EVENTS || "webhookEvents", eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      return NextResponse.json({ status: "already_processed", eventId });
    }

    // Record webhook event to guarantee idempotency
    await setDoc(eventRef, {
      id: eventId,
      event: eventType,
      processedAt: new Date().toISOString(),
      status: "RECEIVED",
    });

    // 3. Process Relevant Payment Lifecycle Events (Section 14)
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id || payload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity.id || payload.payload?.payment?.entity?.id;

      if (razorpayOrderId && razorpayPaymentId) {
        // Find internal order by razorpayOrderId
        const ordersRef = collection(db, BILLING_COLLECTIONS.ORDERS || "orders");
        const q = query(ordersRef, where("razorpayOrderId", "==", razorpayOrderId));
        const ordersSnap = await getDocs(q);

        if (!ordersSnap.empty) {
          const internalOrder = {
            id: ordersSnap.docs[0].id,
            ...ordersSnap.docs[0].data(),
          } as InternalOrder;

          // Call central idempotent fulfillment service (Section 25 & 26)
          await fulfillSuccessfulPayment(internalOrder.id, razorpayPaymentId, "webhook");
        }
      }
    }

    return NextResponse.json({ status: "success", eventId });
  } catch (error: any) {
    console.error("Razorpay Webhook Handler Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed. " + (error.message || "") },
      { status: 500 }
    );
  }
}
