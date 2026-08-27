import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  SchoolSubscription,
  Plan,
  PlanVersion,
  GlobalAccessPolicy,
} from "@/types";
import { BILLING_COLLECTIONS, createBillingAuditLog, getGlobalAccessPolicy } from "@/lib/billing";

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
  status: "CAPTURED" | "FAILED" | "REFUNDED";
  method: string;
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

/**
 * Section 25 & 26: Central Idempotent Payment Fulfillment Service.
 * Single source of truth for payment verification, status updates, subscription extensions,
 * invoice generation, finance entries, and audit logging.
 */
export async function fulfillSuccessfulPayment(
  orderId: string,
  razorpayPaymentId: string,
  source: "callback" | "webhook" = "callback",
  nowMs: number = Date.now()
): Promise<FulfillmentResult> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Database uninitialized during payment fulfillment.");
  }

  const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error(`Order ${orderId} not found.`);
  }

  let order = { id: orderSnap.id, ...orderSnap.data() } as InternalOrder;
  const nowIso = new Date(nowMs).toISOString();

  // Section 24 & 25: Idempotency Check — If order is already PAID, return existing fulfillment safely
  if (order.status === "PAID") {
    const paymentId = `pay_${razorpayPaymentId}`;
    const paymentRef = doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", paymentId);
    const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, order.schoolId);
    const invoiceId = `inv_${order.id}`;
    const invoiceRef = doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", invoiceId);
    const txId = `tx_${order.id}`;
    const txRef = doc(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions", txId);

    const [paySnap, subSnap, invSnap, txSnap] = await Promise.all([
      getDoc(paymentRef),
      getDoc(subRef),
      getDoc(invoiceRef),
      getDoc(txRef),
    ]);

    return {
      success: true,
      order,
      payment: paySnap.data() as PaymentRecord,
      subscription: subSnap.data() as SchoolSubscription,
      invoice: invSnap.data() as InvoiceRecord,
      financeTransaction: txSnap.data() as FinanceTransactionRecord,
      alreadyFulfilled: true,
    };
  }

  // 1. Mark Order as PAID
  order.status = "PAID";
  order.updatedAt = nowIso;
  await setDoc(orderRef, { status: "PAID", updatedAt: nowIso }, { merge: true });

  // 2. Create Payment Record
  const paymentId = `pay_${razorpayPaymentId}`;
  const paymentRecord: PaymentRecord = {
    id: paymentId,
    schoolId: order.schoolId,
    userId: order.userId,
    orderId: order.id,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId,
    amount: order.finalAmount,
    currency: order.currency || "INR",
    status: "CAPTURED",
    method: "razorpay",
    planId: order.planId,
    planVersionId: order.planVersionId,
    billingCycle: order.billingCycle,
    couponId: order.couponId,
    discountAmount: order.discountAmount,
    createdAt: nowIso,
    capturedAt: nowIso,
  };
  const paymentRef = doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", paymentId);
  await setDoc(paymentRef, paymentRecord, { merge: true });

  // 3. Subscription Activation / Renewal Extension (Section 17)
  const policy = await getGlobalAccessPolicy();
  const subRef = doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, order.schoolId);
  const subSnap = await getDoc(subRef);

  let currentExpiresAtMs = 0;
  if (subSnap.exists()) {
    const existingSub = subSnap.data() as SchoolSubscription;
    if (existingSub.status === "ACTIVE") {
      const expMs = new Date(existingSub.expiresAt).getTime();
      if (expMs > nowMs) currentExpiresAtMs = expMs;
    }
  }

  const durationDays = order.billingCycle === "annual" ? 365 : 30;
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const startBasisMs = currentExpiresAtMs > nowMs ? currentExpiresAtMs : nowMs;

  const newStartsAtMs = currentExpiresAtMs > nowMs ? new Date(subSnap.data()?.startsAt || nowIso).getTime() : nowMs;
  const newExpiresAtMs = startBasisMs + durationMs;
  const gracePeriodMs = (policy.gracePeriodDays || 7) * 24 * 60 * 60 * 1000;
  const newGraceEndsAtMs = newExpiresAtMs + gracePeriodMs;

  const updatedSubscription: SchoolSubscription = {
    id: order.schoolId,
    schoolId: order.schoolId,
    planId: order.planId,
    planVersionId: order.planVersionId,
    status: "ACTIVE",
    billingCycle: order.billingCycle,
    startsAt: new Date(newStartsAtMs).toISOString(),
    expiresAt: new Date(newExpiresAtMs).toISOString(),
    graceEndsAt: new Date(newGraceEndsAtMs).toISOString(),
    source: "self_onboarding",
    lastPaymentId: paymentId,
    lastOrderId: order.id,
    createdAt: subSnap.exists() ? (subSnap.data() as any).createdAt : nowIso,
    updatedAt: nowIso,
  };
  await setDoc(subRef, updatedSubscription, { merge: true });

  // 4. Generate Invoice (Section 19)
  const yearStr = new Date(nowMs).getFullYear();
  const invoiceId = `inv_${order.id}`;
  const invoiceNumber = `INV-${yearStr}-${order.id.slice(-6).toUpperCase()}`;

  const invoiceRecord: InvoiceRecord = {
    id: invoiceId,
    invoiceNumber,
    schoolId: order.schoolId,
    orderId: order.id,
    paymentId,
    planId: order.planId,
    planVersionId: order.planVersionId,
    billingCycle: order.billingCycle,
    subtotal: order.baseAmount,
    discount: order.discountAmount,
    tax: order.taxAmount,
    total: order.finalAmount,
    currency: order.currency || "INR",
    issuedAt: nowIso,
    status: "PAID",
  };
  const invoiceRef = doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", invoiceId);
  await setDoc(invoiceRef, invoiceRecord, { merge: true });

  // 5. Create Finance Transaction (Section 20)
  const txId = `tx_${order.id}`;
  const financeTxRecord: FinanceTransactionRecord = {
    id: txId,
    schoolId: order.schoolId,
    orderId: order.id,
    paymentId,
    invoiceId,
    type: "PAYMENT",
    amount: order.finalAmount,
    currency: order.currency || "INR",
    direction: "CREDIT",
    status: "SUCCESS",
    description: `Subscription Payment - Plan ${order.planId} (${order.billingCycle})`,
    createdAt: nowIso,
  };
  const txRef = doc(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions", txId);
  await setDoc(txRef, financeTxRecord, { merge: true });

  // 6. Audit Trail Logging (Section 28)
  await createBillingAuditLog(
    order.userId,
    "system",
    "SUBSCRIPTION_UPDATED",
    "schoolSubscription",
    order.schoolId,
    {
      actionType: "PAYMENT_FULFILLED",
      source,
      orderId: order.id,
      paymentId,
      amount: order.finalAmount,
      planId: order.planId,
      billingCycle: order.billingCycle,
      expiresAt: updatedSubscription.expiresAt,
    }
  );

  return {
    success: true,
    order,
    payment: paymentRecord,
    subscription: updatedSubscription,
    invoice: invoiceRecord,
    financeTransaction: financeTxRecord,
  };
}
