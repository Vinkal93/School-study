import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment, InternalOrder, PaymentRecord } from "@/lib/payments/fulfillment";

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

    // 2. Webhook Idempotency Check (Section 14 & 29)
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

    const paymentEntity = payload.payload?.payment?.entity || {};
    const razorpayOrderId = paymentEntity.order_id || payload.payload?.order?.entity?.id;
    const razorpayPaymentId = paymentEntity.id || payload.payload?.payment?.entity?.id;

    // 3. Handle Payment Captured / Order Paid
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (razorpayOrderId && razorpayPaymentId) {
        const ordersRef = collection(db, BILLING_COLLECTIONS.ORDERS || "orders");
        const q = query(ordersRef, where("razorpayOrderId", "==", razorpayOrderId));
        const ordersSnap = await getDocs(q);

        if (!ordersSnap.empty) {
          const internalOrder = {
            id: ordersSnap.docs[0].id,
            ...ordersSnap.docs[0].data(),
          } as InternalOrder;

          await fulfillSuccessfulPayment(internalOrder.id, razorpayPaymentId, "webhook");
        }
      }
    }

    // 4. Handle Payment Failed (Section 3)
    else if (eventType === "payment.failed") {
      if (razorpayOrderId) {
        const ordersRef = collection(db, BILLING_COLLECTIONS.ORDERS || "orders");
        const q = query(ordersRef, where("razorpayOrderId", "==", razorpayOrderId));
        const ordersSnap = await getDocs(q);

        if (!ordersSnap.empty) {
          const orderDoc = ordersSnap.docs[0];
          await setDoc(
            doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderDoc.id),
            {
              status: "FAILED",
              failureCode: paymentEntity.error_code || "PAYMENT_FAILED",
              failureReason: paymentEntity.error_description || "Transaction declined by gateway/bank.",
              failedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    }

    // 5. Handle Refund Processed / Failed Webhooks (Section 29)
    else if (eventType === "refund.processed") {
      const refundEntity = payload.payload?.refund?.entity || {};
      const refundId = refundEntity.notes?.refundId || `ref_${refundEntity.id}`;
      const refundRef = doc(db, "refunds", refundId);
      await setDoc(
        refundRef,
        {
          razorpayRefundId: refundEntity.id,
          status: "PROCESSED",
          processedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 6. Handle Payment Dispute Created (Section 27)
    else if (eventType === "payment.dispute.created" || eventType === "dispute.created") {
      const disputeEntity = payload.payload?.dispute?.entity || {};
      const disputeId = `disp_${disputeEntity.id || Date.now()}`;
      await setDoc(doc(db, "disputes", disputeId), {
        id: disputeId,
        razorpayDisputeId: disputeEntity.id,
        paymentId: disputeEntity.payment_id,
        amount: disputeEntity.amount || 0,
        currency: disputeEntity.currency || "INR",
        status: "OPEN",
        reason: disputeEntity.reason_code || "Chargeback reported",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: "success", eventId });
  } catch (error: any) {
    console.error("Razorpay Webhook Handler Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed: " + (error.message || "") },
      { status: 500 }
    );
  }
}
