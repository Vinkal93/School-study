import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment, InternalOrder } from "@/lib/payments/fulfillment";
import { updateSchoolSubscription } from "@/lib/billing/subscriptions";
import { createBillingAuditLog } from "@/lib/billing/audit";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-razorpay-signature") || "";

    // 1. Cryptographically Verify Webhook Signature (HMAC-SHA256)
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
      return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }

    // 2. Webhook Processing Idempotency Guarantee
    const eventRef = doc(db, BILLING_COLLECTIONS.WEBHOOK_EVENTS || "webhookEvents", eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      return NextResponse.json({ status: "already_processed", eventId });
    }

    // Lock event to prevent race conditions
    await setDoc(eventRef, {
      id: eventId,
      event: eventType,
      processedAt: new Date().toISOString(),
      status: "RECEIVED",
    });

    const subEntity = payload.payload?.subscription?.entity || {};
    const paymentEntity = payload.payload?.payment?.entity || {};
    const orderEntity = payload.payload?.order?.entity || {};

    const rzpSubId = subEntity.id || paymentEntity.subscription_id || "";
    const notes = subEntity.notes || paymentEntity.notes || orderEntity.notes || {};
    const schoolId = notes.schoolId || "";
    const planId = notes.planId || "plan_professional";
    const billingCycle = notes.billingCycle || "monthly";

    // 3. Handle Subscription Authenticated / Activated Events
    if (eventType === "subscription.authenticated" || eventType === "subscription.activated") {
      if (schoolId) {
        const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
        await setDoc(
          subRef,
          {
            status: "ACTIVE",
            razorpaySubscriptionId: rzpSubId,
            autoRenew: true,
            cancelAtPeriodEnd: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await createBillingAuditLog(
          notes.actorId || "system",
          "system",
          "SUBSCRIPTION_ACTIVATED",
          "schoolSubscription",
          schoolId,
          { rzpSubId, eventType }
        );
      }
    }

    // 4. Handle Subscription Charged / Payment Captured (Recurring Renewal Success)
    else if (
      eventType === "subscription.charged" ||
      eventType === "payment.captured" ||
      eventType === "order.paid"
    ) {
      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id || `pay_${Date.now()}`;
      const amountPaise = paymentEntity.amount || subEntity.charge_at || 199900;
      const amountRupees = Math.round(amountPaise / 100);

      if (schoolId) {
        // Idempotency check for payment record
        const payId = `pay_${razorpayPaymentId}`;
        const payRef = doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", payId);
        const paySnap = await getDoc(payRef);

        if (!paySnap.exists()) {
          // Calculate Next Billing & Expiry Dates
          const durationDays = billingCycle === "annual" ? 365 : billingCycle === "quarterly" ? 90 : 30;
          const nextExpiryMs = subEntity.current_end
            ? subEntity.current_end * 1000
            : Date.now() + durationDays * 86400000;
          const nextExpiryIso = new Date(nextExpiryMs).toISOString();

          // Update Subscription Tier & Period
          await updateSchoolSubscription(
            schoolId,
            {
              planId,
              billingCycle,
              durationDays,
              status: "ACTIVE",
            },
            "system"
          );

          const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
          await setDoc(
            subRef,
            {
              status: "ACTIVE",
              razorpaySubscriptionId: rzpSubId,
              autoRenew: true,
              cancelAtPeriodEnd: false,
              nextBillingDate: nextExpiryIso,
              expiresAt: nextExpiryIso,
              lastPaymentStatus: "SUCCESS",
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          // Create Payment Record
          await setDoc(payRef, {
            id: payId,
            schoolId,
            orderId: razorpayOrderId || `ord_${Date.now()}`,
            razorpayOrderId: razorpayOrderId || "",
            razorpayPaymentId,
            amount: amountPaise,
            currency: "INR",
            status: "CAPTURED",
            method: paymentEntity.method || "razorpay_recurring",
            planId,
            billingCycle,
            createdAt: new Date().toISOString(),
            capturedAt: new Date().toISOString(),
          });

          // Create Itemized Paid Tax Invoice
          const invId = `inv_${Date.now()}`;
          const invNum = `INV-${Date.now().toString().slice(-6)}`;
          await setDoc(doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", invId), {
            id: invId,
            invoiceNumber: invNum,
            schoolId,
            paymentId: payId,
            planId,
            amountPaise,
            amountRupees,
            status: "PAID",
            paymentMethod: paymentEntity.method || "Razorpay Recurring Autopay",
            billingPeriod: `Subscription Renewal (${billingCycle})`,
            createdAt: new Date().toISOString(),
          });

          // Write Audit Log
          await createBillingAuditLog(
            "system",
            "system",
            "RECURRING_PAYMENT_SUCCESSFUL",
            "schoolSubscription",
            schoolId,
            { amountRupees, rzpSubId, nextExpiryIso }
          );

          // Create In-App Admin Notification
          const notifRef = doc(collection(db, "notifications"));
          await setDoc(notifRef, {
            id: notifRef.id,
            schoolId,
            type: "SUBSCRIPTION_RENEWED",
            title: "Subscription Successfully Renewed",
            message: `Your ${planId.replace("plan_", "")} plan has renewed for ₹${amountRupees.toLocaleString("en-IN")}. Next billing: ${new Date(nextExpiryIso).toLocaleDateString("en-IN")}.`,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      } else if (razorpayOrderId) {
        // Fallback for standard checkout orders
        const ordersRef = collection(db, BILLING_COLLECTIONS.ORDERS || "orders");
        const q = query(ordersRef, where("razorpayOrderId", "==", razorpayOrderId));
        const ordersSnap = await getDocs(q);
        if (!ordersSnap.empty) {
          const internalOrder = { id: ordersSnap.docs[0].id, ...ordersSnap.docs[0].data() } as InternalOrder;
          await fulfillSuccessfulPayment(internalOrder.id, razorpayPaymentId, "webhook");
        }
      }
    }

    // 5. Handle Subscription Halted / Payment Failed
    else if (eventType === "subscription.halted" || eventType === "payment.failed") {
      if (schoolId) {
        const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
        await setDoc(
          subRef,
          {
            status: "HALTED", // Does NOT immediately revoke entitlement until expiry
            lastPaymentStatus: "FAILED",
            lastPaymentErrorCode: paymentEntity.error_code || "PAYMENT_FAILED",
            lastPaymentErrorReason: paymentEntity.error_description || "Recurring debit attempt failed.",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Record Failed Payment
        const failPayId = `pay_fail_${Date.now()}`;
        await setDoc(doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", failPayId), {
          id: failPayId,
          schoolId,
          amount: paymentEntity.amount || 0,
          status: "FAILED",
          failureCode: paymentEntity.error_code || "PAYMENT_FAILED",
          failureReason: paymentEntity.error_description || "Recurring mandate debit failed.",
          createdAt: new Date().toISOString(),
        });

        await createBillingAuditLog(
          "system",
          "system",
          "RECURRING_PAYMENT_FAILED",
          "schoolSubscription",
          schoolId,
          { rzpSubId, reason: paymentEntity.error_description }
        );
      }
    }

    // 6. Handle Subscription Cancelled
    else if (eventType === "subscription.cancelled") {
      if (schoolId) {
        const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId);
        await setDoc(
          subRef,
          {
            autoRenew: false,
            cancelAtPeriodEnd: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await createBillingAuditLog(
          "system",
          "system",
          "SUBSCRIPTION_CANCELLED",
          "schoolSubscription",
          schoolId,
          { rzpSubId }
        );
      }
    }

    return NextResponse.json({ status: "success", eventId });
  } catch (error: any) {
    console.error("Razorpay Webhook Handler Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed: " + (error.message || "") },
      { status: 500 }
    );
  }
}
