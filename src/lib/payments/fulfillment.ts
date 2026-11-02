import type {
  SchoolSubscription,
} from "@/types";
import { BILLING_COLLECTIONS } from "@/lib/billing/plans";

export interface InternalOrder {
  id: string;
  schoolId: string;
  userId: string;
  planId: string;
  planVersionId: string;
  billingCycle: "monthly" | "annual";
  baseAmount: number; // Integer PAISE
  discountAmount: number; // Integer PAISE
  taxAmount: number; // Integer PAISE
  finalAmount: number; // Integer PAISE
  currency: string; // "INR"
  couponId?: string | null;
  status: "CREATED" | "PAYMENT_PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  razorpayOrderId: string;
  createdAt: string;
  expiresAt: string;
  updatedAt?: string;
  durationDays?: number;
  customOfferId?: string;
  subscriptionPeriodEnd?: string;
  razorpaySubscriptionId?: string;
}

export interface PaymentRecord {
  id: string;
  schoolId: string;
  userId: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number; // Integer PAISE
  currency: string;
  method?: string;
  refundedAmount?: number;
  status:
    | "CAPTURED"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED"
    | "DISPUTED"
    | "PAYMENT_PENDING"
    | "CANCELLED";
  planId: string;
  planVersionId: string;
  billingCycle: "monthly" | "annual";
  couponId?: string | null;
  discountAmount: number;
  createdAt: string;
  capturedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  schoolId: string;
  orderId: string;
  paymentId: string;
  planId: string;
  planVersionId: string;
  billingCycle: "monthly" | "annual";
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  issuedAt: string;
  status: "PAID" | "VOID";
}

export interface FinanceTransactionRecord {
  id: string;
  schoolId: string;
  orderId: string;
  paymentId: string;
  invoiceId: string;
  type?: "PAYMENT" | "REFUND" | "ADJUSTMENT";
  direction: "CREDIT" | "DEBIT" | "INCOME" | "EXPENSE";
  amount: number; // Integer PAISE
  currency: string;
  status: "SUCCESS" | "FAILED";
  description: string;
  createdAt: string;
}

export interface FulfillmentResult {
  success: boolean;
  order: InternalOrder;
  payment: PaymentRecord;
  subscription: SchoolSubscription;
  invoice: InvoiceRecord;
  financeTransaction: FinanceTransactionRecord;
  alreadyFulfilled?: boolean;
}

/** Callback and webhook share one atomic, idempotent financial commit. */
export async function fulfillSuccessfulPayment(orderId: string, razorpayPaymentId: string, source: "callback" | "webhook" = "callback", nowMs = Date.now()): Promise<FulfillmentResult> {
  const { getSafeAdminDb } = await import("@/lib/firebase/admin");
  const { getRazorpayClientAsync } = await import("@/lib/payments/razorpay/razorpayClient");
  const db = getSafeAdminDb();
  if (!db) throw new Error("Private Firebase Admin configuration is required.");
  const gateway = await getRazorpayClientAsync();
  const captured = await gateway.payments.fetch(razorpayPaymentId);
  const nowIso = new Date(nowMs).toISOString();
  const result = await db.runTransaction(async tx => {
    const orderRef = db.collection(BILLING_COLLECTIONS.ORDERS).doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new Error("Stored order not found.");
    const order = { ...orderSnap.data(), id: orderSnap.id } as InternalOrder;
    if (captured.id !== razorpayPaymentId || (captured.order_id || "") !== order.razorpayOrderId || captured.status !== "captured" || Number(captured.amount) !== order.finalAmount || captured.currency !== order.currency) throw new Error("Captured payment does not match the stored order.");
    const paymentId = `pay_${razorpayPaymentId}`, invoiceId = `inv_${order.id}`, txId = `tx_${order.id}`;
    const payRef = db.collection(BILLING_COLLECTIONS.PAYMENTS).doc(paymentId);
    const subRef = db.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(order.schoolId);
    const invRef = db.collection(BILLING_COLLECTIONS.INVOICES).doc(invoiceId);
    const financeRef = db.collection(BILLING_COLLECTIONS.FINANCE_TRANSACTIONS).doc(txId);
    const schoolRef = db.collection("schools").doc(order.schoolId);
    const [paySnap, subSnap, invSnap, financeSnap, schoolSnap, policySnap] = await Promise.all([tx.get(payRef), tx.get(subRef), tx.get(invRef), tx.get(financeRef), tx.get(schoolRef), tx.get(db.collection(BILLING_COLLECTIONS.ACCESS_POLICIES).doc("global"))]);
    const offerRef = order.customOfferId ? db.collection("customOffers").doc(order.customOfferId) : null;
    const offerSnap = offerRef ? await tx.get(offerRef) : null;
    const couponQuery = order.couponId ? db.collection("coupons").where("code","==",order.couponId) : null;
    const couponSnap = couponQuery ? await tx.get(couponQuery) : null;
    if (order.status === "PAID") {
      if (!paySnap.exists || !invSnap.exists || !financeSnap.exists || !subSnap.exists || paySnap.data()?.orderId !== order.id) throw new Error("Paid order has inconsistent financial records.");
      return { success: true, order, payment: paySnap.data() as PaymentRecord, subscription: subSnap.data() as SchoolSubscription, invoice: invSnap.data() as InvoiceRecord, financeTransaction: financeSnap.data() as FinanceTransactionRecord, alreadyFulfilled: true };
    }
    if (!["CREATED", "PAYMENT_PENDING"].includes(order.status) || paySnap.exists || !schoolSnap.exists) throw new Error("Order cannot be fulfilled.");
    const existing = subSnap.data() as SchoolSubscription | undefined;
    const expiry = existing ? Date.parse(existing.expiresAt) : 0;
    const extending = existing?.planId === order.planId && !["CANCELLED", "SUSPENDED"].includes(existing.status) && Number.isFinite(expiry) && expiry > nowMs;
    const basis = extending ? expiry : nowMs;
    const duration = order.durationDays ?? (order.billingCycle === "annual" ? 365 : 30);
    if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error("Invalid paid plan duration.");
    const periodEnd = order.subscriptionPeriodEnd ? Date.parse(order.subscriptionPeriodEnd) : basis + duration * 86400000;
    if (!Number.isFinite(periodEnd)) throw new Error("Invalid subscription billing period.");
    const expiresAt = new Date(order.subscriptionPeriodEnd ? Math.max(periodEnd, Number.isFinite(expiry) ? expiry : 0) : periodEnd).toISOString();
    const graceDays = policySnap.data()?.gracePeriodDays ?? 7;
    if (!Number.isSafeInteger(graceDays) || graceDays < 0) throw new Error("Invalid grace period configuration.");
    const subscription: SchoolSubscription = { id: order.schoolId, schoolId: order.schoolId, planId: order.planId, planVersionId: order.planVersionId, status: existing?.status === "SUSPENDED" ? "SUSPENDED" : Date.parse(expiresAt) > nowMs ? "ACTIVE" : Date.parse(expiresAt) + graceDays * 86400000 > nowMs ? "GRACE_PERIOD" : "EXPIRED", billingCycle: order.billingCycle, startsAt: extending ? existing!.startsAt : nowIso, expiresAt, graceEndsAt: new Date(Date.parse(expiresAt) + graceDays * 86400000).toISOString(), source: "self_onboarding", lastPaymentId: paymentId, lastOrderId: order.id, createdAt: existing?.createdAt || nowIso, updatedAt: nowIso };
    const payment: PaymentRecord = { id: paymentId, schoolId: order.schoolId, userId: order.userId, orderId: order.id, razorpayOrderId: order.razorpayOrderId, razorpayPaymentId, amount: order.finalAmount, currency: order.currency, status: "CAPTURED", method: "razorpay", planId: order.planId, planVersionId: order.planVersionId, billingCycle: order.billingCycle, couponId: order.couponId || null, discountAmount: order.discountAmount, createdAt: nowIso, capturedAt: nowIso };
    const invoice: InvoiceRecord = { id: invoiceId, invoiceNumber: `INV-${new Date(nowMs).getFullYear()}-${order.id.toUpperCase()}`, schoolId: order.schoolId, orderId: order.id, paymentId, planId: order.planId, planVersionId: order.planVersionId, billingCycle: order.billingCycle, subtotal: order.baseAmount, discount: order.discountAmount, tax: order.taxAmount, total: order.finalAmount, currency: order.currency, issuedAt: nowIso, status: "PAID" };
    const financeTransaction: FinanceTransactionRecord = { id: txId, schoolId: order.schoolId, orderId: order.id, paymentId, invoiceId, type: "PAYMENT", amount: order.finalAmount, currency: order.currency, direction: "CREDIT", status: "SUCCESS", description: `Subscription ${order.planId} (${order.billingCycle})`, createdAt: nowIso };
    // All reads precede writes. Firestore rolls back the whole fulfillment on failure.
    if (offerRef && offerSnap?.exists) tx.update(offerRef,{redeemedCount:Number(offerSnap.data()?.redeemedCount || 0)+1,updatedAt:nowIso});
    if (couponSnap && "docs" in couponSnap) for (const coupon of couponSnap.docs) tx.update(coupon.ref,{usedCount:Number(coupon.data()?.usedCount || 0)+1,updatedAt:nowIso});
    tx.update(orderRef, { status: "PAID", razorpayPaymentId, updatedAt: nowIso });
    tx.set(payRef, payment); tx.set(invRef, invoice); tx.set(financeRef, financeTransaction);
    tx.set(subRef, { ...subscription, ...(order.razorpaySubscriptionId ? { razorpaySubscriptionId: order.razorpaySubscriptionId, autoRenew: true } : {}) }, { merge: true });
    tx.update(schoolRef, { planId: order.planId, plan: order.planId, billingCycle: order.billingCycle, subscriptionStatus: subscription.status, subscriptionExpiresAt: expiresAt, updatedAt: nowIso });
    tx.set(db.collection(BILLING_COLLECTIONS.AUDIT_LOGS).doc(`fulfill_${order.id}`), { action: "PAYMENT_FULFILLED", schoolId: order.schoolId, orderId: order.id, paymentId, actorId: order.userId, source, createdAt: nowIso });
    return { success: true, order: { ...order, status: "PAID" as const }, payment, subscription, invoice, financeTransaction, alreadyFulfilled: false };
  });
  const { clearSubscriptionCache } = await import("@/lib/billing/subscriptions");
  clearSubscriptionCache(result.order.schoolId);
  return result;
}
