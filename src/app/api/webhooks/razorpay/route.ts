import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { loadRazorpayCredentials, verifyRazorpayWebhookSignature, getRazorpayClientAsync } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const credentials = await loadRazorpayCredentials();
    if (!credentials.webhookSecret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
    if (!verifyRazorpayWebhookSignature(raw, request.headers.get("x-razorpay-signature") || "", credentials.webhookSecret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    const db = getSafeAdminDb();
    if (!db) return NextResponse.json({ error: "Private Firebase Admin configuration is required." }, { status: 503 });
    const payload = JSON.parse(raw);
    const eventId = request.headers.get("x-razorpay-event-id") || createHash("sha256").update(raw).digest("hex");
    const eventRef = db.collection("webhookEvents").doc(createHash("sha256").update(eventId).digest("hex"));
    if ((await eventRef.get()).data()?.status === "PROCESSED") return NextResponse.json({ status: "already_processed", eventId });
    const payment = payload.payload?.payment?.entity;
    const subscription = payload.payload?.subscription?.entity;
    const event = payload.event;
    if (["payment.captured", "order.paid", "subscription.charged"].includes(event)) {
      if (!payment?.id) throw new Error("Captured payment entity is required.");
      const orderId = payment.order_id || payload.payload?.order?.entity?.id;
      const orders = orderId ? await db.collection("orders").where("razorpayOrderId", "==", orderId).get() : null;
      if (orders && !orders.empty) {
        // Checkout notes contain schoolId too; they must never select the recurring path.
        await fulfillSuccessfulPayment(orders.docs[0].id, payment.id, "webhook");
      } else if (subscription?.id || payment.subscription_id || payment.invoice_id) {
        const gateway = await getRazorpayClientAsync();
        const actualPayment = await gateway.payments.fetch(payment.id);
        if (!actualPayment.invoice_id) throw new Error("Recurring payment invoice is required.");
        const invoice: any = await gateway.invoices.fetch(actualPayment.invoice_id);
        const mandateId = invoice.subscription_id;
        if (!mandateId) throw new Error("Payment is not linked to a recurring mandate.");
        const [mandate, mapping] = await Promise.all([gateway.subscriptions.fetch(mandateId), db.collection("razorpaySubscriptions").doc(mandateId).get()]);
        const stored = mapping.data();
        if (!stored || Number(actualPayment.amount) !== stored.amountPaise || actualPayment.currency !== "INR" || mandate.plan_id !== stored.razorpayPlanId) throw new Error("Recurring payment does not match stored mandate.");
        const id = `rec_${payment.id}`;
        const orderRef = db.collection("orders").doc(id);
        await db.runTransaction(async tx => {
          const existing = await tx.get(orderRef);
          if (!existing.exists) tx.set(orderRef, { id, schoolId: stored.schoolId, userId: stored.userId, planId: stored.planId, planVersionId: stored.planVersionId, billingCycle: stored.billingCycle, baseAmount: stored.baseAmount, discountAmount: stored.discountAmount, taxAmount: stored.taxAmount, finalAmount: stored.amountPaise, currency: "INR", couponId: null, status: "CREATED", razorpayOrderId: actualPayment.order_id || "", razorpaySubscriptionId: mandateId, subscriptionPeriodEnd: new Date(Number(mandate.current_end) * 1000).toISOString(), createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() });
        });
        await fulfillSuccessfulPayment(id, payment.id, "webhook");
      } else {
        // Unknown payments may belong to another integration; do not invent a plan.
        return NextResponse.json({ status: "unrelated_payment", eventId });
      }
    } else if (subscription?.id) {
      const mapping = await db.collection("razorpaySubscriptions").doc(subscription.id).get();
      const stored = mapping.data();
      if (stored) {
        const ref = db.collection("schoolSubscriptions").doc(stored.schoolId);
        await db.runTransaction(async tx => {
          const current = await tx.get(ref);
          if (current.data()?.razorpaySubscriptionId !== subscription.id) return;
          // Mandate authentication is not proof of payment; failed/cancelled mandates keep paid expiry.
          if (event === "subscription.cancelled") tx.update(ref, { autoRenew: false, cancelAtPeriodEnd: true, updatedAt: new Date().toISOString() });
          else if (["subscription.halted", "payment.failed"].includes(event)) tx.update(ref, { lastPaymentStatus: "FAILED", updatedAt: new Date().toISOString() });
        });
      }
    }
    // A failed fulfillment stays retryable; only completed processing records PROCESSED.
    await eventRef.set({ id: eventId, event, status: "PROCESSED", processedAt: new Date().toISOString() });
    return NextResponse.json({ status: "success", eventId });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed; delivery can be retried." }, { status: 503 });
  }
}
