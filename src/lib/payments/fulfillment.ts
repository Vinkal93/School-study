import { doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  SchoolSubscription,
  Plan,
  PlanVersion,
  GlobalAccessPolicy,
} from "@/types";
import { BILLING_COLLECTIONS, createBillingAuditLog, getGlobalAccessPolicy } from "@/lib/billing";
import { recordSubscriptionHistory } from "@/lib/billing/subscriptionEngine";

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

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : (adminModule.adminDb || null);
  } catch (e) {
    return null;
  }
}

// In-memory fallback stores for tests or serverless offline resilience
const g = globalThis as any;
if (!g.__BILLING_ORDERS_MAP__) g.__BILLING_ORDERS_MAP__ = new Map<string, InternalOrder>();
if (!g.__BILLING_PAYMENTS_MAP__) g.__BILLING_PAYMENTS_MAP__ = new Map<string, PaymentRecord>();
if (!g.__BILLING_SUBSCRIPTIONS_MAP__) g.__BILLING_SUBSCRIPTIONS_MAP__ = new Map<string, SchoolSubscription>();
if (!g.__BILLING_INVOICES_MAP__) g.__BILLING_INVOICES_MAP__ = new Map<string, InvoiceRecord>();
if (!g.__BILLING_TRANSACTIONS_MAP__) g.__BILLING_TRANSACTIONS_MAP__ = new Map<string, FinanceTransactionRecord>();

const memoryOrders: Map<string, InternalOrder> = g.__BILLING_ORDERS_MAP__;
const memoryPayments: Map<string, PaymentRecord> = g.__BILLING_PAYMENTS_MAP__;
const memorySubscriptions: Map<string, SchoolSubscription> = g.__BILLING_SUBSCRIPTIONS_MAP__;
const memoryInvoices: Map<string, InvoiceRecord> = g.__BILLING_INVOICES_MAP__;
const memoryTransactions: Map<string, FinanceTransactionRecord> = g.__BILLING_TRANSACTIONS_MAP__;

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
  const adminDb = await getAdminDbServerOnly();
  const db = getFirebaseDb();
  const nowIso = new Date(nowMs).toISOString();

  let order: InternalOrder | null = null;

  // Retrieve Order from Admin DB, Client DB or In-Memory Store
  if (adminDb) {
    try {
      const snap = await adminDb.collection(BILLING_COLLECTIONS.ORDERS || "orders").doc(orderId).get();
      if (snap.exists) {
        order = { id: snap.id, ...snap.data() } as InternalOrder;
      }
    } catch (err) {}
  }

  if (!order && db) {
    try {
      const orderRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        order = { id: orderSnap.id, ...orderSnap.data() } as InternalOrder;
      }
    } catch (err) {}
  }

  if (!order) {
    order = memoryOrders.get(orderId) || null;
  }

  if (!order) {
    throw new Error(`Order ${orderId} not found.`);
  }

  const paymentId = `pay_${razorpayPaymentId}`;
  const invoiceId = `inv_${order.id}`;
  const txId = `tx_${order.id}`;

  // Section 24 & 25: Idempotency Check — If order is already PAID, return existing fulfillment safely
  if (order.status === "PAID") {
    let existingPayment = memoryPayments.get(paymentId);
    let existingSub = memorySubscriptions.get(order.schoolId);
    let existingInv = memoryInvoices.get(invoiceId);
    let existingTx = memoryTransactions.get(txId);

    if (adminDb) {
      try {
        const [paySnap, subSnap, invSnap, txSnap] = await Promise.all([
          adminDb.collection(BILLING_COLLECTIONS.PAYMENTS || "payments").doc(paymentId).get(),
          adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(order.schoolId).get(),
          adminDb.collection(BILLING_COLLECTIONS.INVOICES || "invoices").doc(invoiceId).get(),
          adminDb.collection(BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions").doc(txId).get(),
        ]);
        if (paySnap.exists) existingPayment = { id: paySnap.id, ...paySnap.data() } as PaymentRecord;
        if (subSnap.exists) existingSub = { id: subSnap.id, ...subSnap.data() } as SchoolSubscription;
        if (invSnap.exists) existingInv = { id: invSnap.id, ...invSnap.data() } as InvoiceRecord;
        if (txSnap.exists) existingTx = { id: txSnap.id, ...txSnap.data() } as FinanceTransactionRecord;
      } catch (e) {}
    }

    return {
      success: true,
      order,
      payment: existingPayment || ({} as any),
      subscription: existingSub || ({} as any),
      invoice: existingInv || ({} as any),
      financeTransaction: existingTx || ({} as any),
      alreadyFulfilled: true,
    };
  }

  // 1. Mark Order as PAID
  order.status = "PAID";
  order.updatedAt = nowIso;
  memoryOrders.set(order.id, order);

  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.ORDERS || "orders").doc(order.id).set({ status: "PAID", updatedAt: nowIso }, { merge: true });
    } catch (e) {}
  } else if (db) {
    try {
      await setDoc(doc(db, BILLING_COLLECTIONS.ORDERS || "orders", order.id), { status: "PAID", updatedAt: nowIso }, { merge: true });
    } catch (e) {}
  }

  // 2. Create Payment Record
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
  memoryPayments.set(paymentId, paymentRecord);

  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.PAYMENTS || "payments").doc(paymentId).set(paymentRecord, { merge: true });
    } catch (e) {}
  } else if (db) {
    try {
      await setDoc(doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", paymentId), paymentRecord, { merge: true });
    } catch (e) {}
  }

  // 3. Subscription Activation / Renewal Extension (Section 17)
  let policy: Partial<GlobalAccessPolicy> = {};
  try {
    policy = await getGlobalAccessPolicy();
  } catch (e) {
    policy = { gracePeriodDays: 7 };
  }

  let existingSub: SchoolSubscription | null = memorySubscriptions.get(order.schoolId) || null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(order.schoolId).get();
      if (snap.exists) existingSub = { id: snap.id, ...snap.data() } as SchoolSubscription;
    } catch (e) {}
  } else if (db) {
    try {
      const snap = await getDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, order.schoolId));
      if (snap.exists()) existingSub = { id: snap.id, ...snap.data() } as SchoolSubscription;
    } catch (e) {}
  }

  let currentExpiresAtMs = 0;
  if (existingSub && existingSub.status === "ACTIVE") {
    const expMs = new Date(existingSub.expiresAt).getTime();
    if (expMs > nowMs) currentExpiresAtMs = expMs;
  }

  const durationDays = order.billingCycle === "annual" ? 365 : 30;
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const startBasisMs = currentExpiresAtMs > nowMs ? currentExpiresAtMs : nowMs;

  const newStartsAtMs = currentExpiresAtMs > nowMs ? new Date(existingSub?.startsAt || nowIso).getTime() : nowMs;
  const newExpiresAtMs = startBasisMs + durationMs;
  const gracePeriodMs = ((policy as any)?.gracePeriodDays || 7) * 24 * 60 * 60 * 1000;
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
    createdAt: existingSub ? existingSub.createdAt : nowIso,
    updatedAt: nowIso,
  };
  memorySubscriptions.set(order.schoolId, updatedSubscription);

  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS).doc(order.schoolId).set(updatedSubscription, { merge: true });
      await adminDb.collection("schools").doc(order.schoolId).set({
        planId: order.planId,
        plan: order.planId,
        billingCycle: order.billingCycle,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: new Date(newExpiresAtMs).toISOString(),
        updatedAt: nowIso,
      }, { merge: true }).catch(() => {});
    } catch (e) {}
  } else if (db) {
    try {
      await setDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, order.schoolId), updatedSubscription, { merge: true });
      await setDoc(doc(db, "schools", order.schoolId), {
        planId: order.planId,
        plan: order.planId,
        billingCycle: order.billingCycle,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: new Date(newExpiresAtMs).toISOString(),
        updatedAt: nowIso,
      }, { merge: true }).catch(() => {});
    } catch (e) {}
  }

  // Record Subscription History
  try {
    await recordSubscriptionHistory(order.schoolId, {
      subscriptionId: order.schoolId,
      schoolId: order.schoolId,
      action: existingSub ? "RENEWED" : "CREATED",
      newPlanId: order.planId,
      newPlanVersionId: order.planVersionId,
      oldStatus: existingSub ? existingSub.status : "NONE",
      newStatus: "ACTIVE",
      orderId: order.id,
      paymentId,
      actorId: order.userId || "system",
      actorRole: "user",
      reason: `Fulfilling payment for ${order.planId} (${order.billingCycle})`,
      timestamp: nowIso,
    });
  } catch (e) {}

  // 4. Generate Invoice (Section 19)
  const yearStr = new Date(nowMs).getFullYear();
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
  memoryInvoices.set(invoiceId, invoiceRecord);

  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.INVOICES || "invoices").doc(invoiceId).set(invoiceRecord, { merge: true });
    } catch (e) {}
  } else if (db) {
    try {
      await setDoc(doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", invoiceId), invoiceRecord, { merge: true });
    } catch (e) {}
  }

  // 5. Create Finance Transaction (Section 20)
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
  memoryTransactions.set(txId, financeTxRecord);

  if (adminDb) {
    try {
      await adminDb.collection(BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions").doc(txId).set(financeTxRecord, { merge: true });
    } catch (e) {}
  } else if (db) {
    try {
      await setDoc(doc(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions", txId), financeTxRecord, { merge: true });
    } catch (e) {}
  }

  // 5b. Concurrency-Safe Atomic Coupon Redemption if coupon was applied
  if (order.couponId) {
    try {
      const { executeAtomicCouponRedemption } = await import("@/lib/billing/offersPromotionsEngine");
      await executeAtomicCouponRedemption({
        couponCode: order.couponId,
        schoolId: order.schoolId,
        userId: order.userId,
        orderId: order.id,
        paymentId,
        invoiceId,
        planId: order.planId,
        planName: order.planId,
        billingCycle: order.billingCycle,
        baseAmountPaise: order.baseAmount,
        discountAmountPaise: order.discountAmount,
        taxAmountPaise: order.taxAmount,
        finalAmountPaise: order.finalAmount,
      });
    } catch (couponErr: any) {
      console.warn("[Fulfillment] Coupon atomic redemption notice:", couponErr?.message || couponErr);
    }
  }

  // 6. Audit Trail Logging (Section 28)
  try {
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
  } catch (e) {}

  return {
    success: true,
    order,
    payment: paymentRecord,
    subscription: updatedSubscription,
    invoice: invoiceRecord,
    financeTransaction: financeTxRecord,
  };
}
