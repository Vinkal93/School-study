import { NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { BILLING_COLLECTIONS, createBillingAuditLog } from "@/lib/billing";
import { verifyRazorpayPaymentSignatureAsync } from "@/lib/payments/razorpay";
import { fulfillSuccessfulPayment, InternalOrder } from "@/lib/payments/fulfillment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required verification parameters (razorpay_payment_id, razorpay_order_id, razorpay_signature)." },
        { status: 400 }
      );
    }

    // 1. Verify HMAC-SHA256 signature using dynamic Super Admin keys
    const isValidSignature = await verifyRazorpayPaymentSignatureAsync({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      console.warn(`Payment signature verification failed for order ${razorpay_order_id}`);
      await createBillingAuditLog(
        "system",
        "system",
        "MANUAL_ACCESS_CHANGE",
        "schoolSubscription",
        razorpay_order_id,
        { actionType: "PAYMENT_SIGNATURE_FAILED", razorpay_order_id, razorpay_payment_id }
      );

      return NextResponse.json(
        { error: "Invalid payment signature. Payment verification failed." },
        { status: 400 }
      );
    }

    const db = getFirebaseDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
    }

    // 2. Fetch & Validate Internal Order (Section 11)
    const targetOrderId = orderId || razorpay_order_id;

    // Search by internal order id or razorpayOrderId
    const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", targetOrderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json(
        { error: `Internal order record '${targetOrderId}' not found.` },
        { status: 404 }
      );
    }

    const internalOrder = { id: orderSnap.id, ...orderSnap.data() } as InternalOrder;

    if (internalOrder.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json(
        { error: "Razorpay order ID does not match internal order record." },
        { status: 400 }
      );
    }

    // 3. Central Idempotent Payment Fulfillment Service (Section 25 & 26)
    const result = await fulfillSuccessfulPayment(
      internalOrder.id,
      razorpay_payment_id,
      "callback"
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated successfully.",
      orderId: result.order.id,
      paymentId: result.payment.id,
      invoiceNumber: result.invoice.invoiceNumber,
      expiresAt: result.subscription.expiresAt,
      alreadyFulfilled: result.alreadyFulfilled ?? false,
    });
  } catch (error: any) {
    console.error("API Payment Verification Error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment. " + (error.message || "") },
      { status: 500 }
    );
  }
}
