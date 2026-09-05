import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  FinanceSummary,
  CashflowSummary,
  PlanRevenueSummary,
  SchoolRevenueSummary,
  SchoolSubscription,
} from "@/types";
import { BILLING_COLLECTIONS } from "./plans";
import { InternalOrder, PaymentRecord, InvoiceRecord, FinanceTransactionRecord } from "@/lib/payments/fulfillment";

export interface DateFilterInput {
  preset?: "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "this_year" | "custom";
  startDate?: string; // ISO String
  endDate?: string; // ISO String
  schoolId?: string;
  planId?: string;
  status?: string;
}

export function filterByDateRange<T extends { createdAt?: string; capturedAt?: string; issuedAt?: string }>(
  items: T[],
  filter?: DateFilterInput
): T[] {
  if (!filter || !filter.preset || filter.preset === "this_year") return items;

  const now = new Date();
  let startMs = 0;
  let endMs = Date.now();

  if (filter.preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startMs = start.getTime();
  } else if (filter.preset === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    startMs = start.getTime();
    endMs = end.getTime();
  } else if (filter.preset === "this_week") {
    const dayOfWeek = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    startMs = start.getTime();
  } else if (filter.preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    startMs = start.getTime();
  } else if (filter.preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    startMs = start.getTime();
    endMs = end.getTime();
  } else if (filter.preset === "custom" && filter.startDate && filter.endDate) {
    startMs = new Date(filter.startDate).getTime();
    endMs = new Date(filter.endDate).getTime();
  }

  return items.filter((item) => {
    const dateStr = item.capturedAt || item.createdAt || item.issuedAt;
    if (!dateStr) return false;
    const ms = new Date(dateStr).getTime();
    return ms >= startMs && ms <= endMs;
  });
}

/**
 * Calculates authoritative Gross, Discount, Refund, and Net Collected numbers (Sections 1, 3, 20).
 * All calculations use integer PAISE internally.
 */
export async function getFinanceSummary(filter?: DateFilterInput): Promise<FinanceSummary> {
  const db = getFirebaseDb();
  if (!db) {
    return {
      grossSales: 0,
      discountGiven: 0,
      refundedAmount: 0,
      netCollected: 0,
      successfulPaymentsCount: 0,
      pendingPaymentsCount: 0,
      failedPaymentsCount: 0,
      refundedPaymentsCount: 0,
    };
  }

  const [ordersSnap, paymentsSnap, txsSnap] = await Promise.all([
    getDocs(collection(db, BILLING_COLLECTIONS.ORDERS || "orders")),
    getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
    getDocs(collection(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions")),
  ]);

  const orders = filterByDateRange(
    ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder)),
    filter
  );

  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  );

  const txs = filterByDateRange(
    txsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceTransactionRecord)),
    filter
  );

  let grossSales = 0;
  let discountGiven = 0;
  let refundedAmount = 0;
  let successfulPaymentsCount = 0;
  let pendingPaymentsCount = 0;
  let failedPaymentsCount = 0;
  let refundedPaymentsCount = 0;

  // Process captured payments
  for (const pay of payments) {
    if (pay.status === "CAPTURED") {
      successfulPaymentsCount++;
      // Gross sales is amount + discount
      grossSales += (pay.amount + (pay.discountAmount || 0));
      discountGiven += (pay.discountAmount || 0);
    } else if (pay.status === "REFUNDED") {
      refundedPaymentsCount++;
      refundedAmount += pay.amount;
    } else if (pay.status === "FAILED") {
      failedPaymentsCount++;
    }
  }

  // Count pending orders
  for (const ord of orders) {
    if (ord.status === "PAYMENT_PENDING" || ord.status === "CREATED") {
      pendingPaymentsCount++;
    }
  }

  const netCollected = Math.max(0, grossSales - discountGiven - refundedAmount);

  return {
    grossSales,
    discountGiven,
    refundedAmount,
    netCollected,
    successfulPaymentsCount,
    pendingPaymentsCount,
    failedPaymentsCount,
    refundedPaymentsCount,
  };
}

/**
 * Calculates Cashflow Money In vs Money Out from financeTransactions ledger (Section 10 & 11).
 */
export async function getCashflowSummary(filter?: DateFilterInput): Promise<CashflowSummary> {
  const db = getFirebaseDb();
  if (!db) return { moneyIn: 0, moneyOut: 0, netCashflow: 0 };

  const txsSnap = await getDocs(collection(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions"));
  const txs = filterByDateRange(
    txsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceTransactionRecord)),
    filter
  );

  let moneyIn = 0;
  let moneyOut = 0;

  for (const tx of txs) {
    if (tx.status === "SUCCESS") {
      if (tx.direction === "CREDIT" || tx.type === "PAYMENT") {
        moneyIn += tx.amount;
      } else if (tx.direction === "DEBIT" || tx.type === "REFUND") {
        moneyOut += tx.amount;
      }
    }
  }

  return {
    moneyIn,
    moneyOut,
    netCashflow: moneyIn - moneyOut,
  };
}

/**
 * Generates real time-series chart data (daily/monthly) from actual verified transactions (Section 5).
 */
export async function getRevenueChartData(
  timeframe: "daily" | "monthly" = "daily",
  filter?: DateFilterInput
) {
  const db = getFirebaseDb();
  if (!db) return [];

  const paymentsSnap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"));
  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  ).filter((p) => p.status === "CAPTURED");

  const aggregated: Record<string, { label: string; amount: number; count: number }> = {};

  for (const pay of payments) {
    const dateObj = new Date(pay.capturedAt || pay.createdAt);
    const key =
      timeframe === "monthly"
        ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`
        : `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

    const label =
      timeframe === "monthly"
        ? dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    if (!aggregated[key]) {
      aggregated[key] = { label, amount: 0, count: 0 };
    }
    aggregated[key].amount += pay.amount;
    aggregated[key].count += 1;
  }

  return Object.keys(aggregated)
    .sort()
    .map((k) => ({
      key: k,
      label: aggregated[k].label,
      amountRupees: Math.round(aggregated[k].amount / 100),
      amountPaise: aggregated[k].amount,
      count: aggregated[k].count,
    }));
}

/**
 * Calculates plan-wise revenue breakdown using historical transaction amounts (Section 6 & 21).
 */
export async function getPlanWiseRevenue(filter?: DateFilterInput): Promise<PlanRevenueSummary[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const paymentsSnap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"));
  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  ).filter((p) => p.status === "CAPTURED");

  const planMap: Record<string, PlanRevenueSummary> = {};

  for (const pay of payments) {
    const pId = pay.planId || "starter";
    if (!planMap[pId]) {
      planMap[pId] = {
        planId: pId,
        planName: pId.charAt(0).toUpperCase() + pId.slice(1),
        transactionsCount: 0,
        grossRevenue: 0,
        discount: 0,
        refund: 0,
        netRevenue: 0,
      };
    }

    planMap[pId].transactionsCount += 1;
    planMap[pId].grossRevenue += (pay.amount + (pay.discountAmount || 0));
    planMap[pId].discount += (pay.discountAmount || 0);
    planMap[pId].netRevenue += pay.amount;
  }

  return Object.values(planMap);
}

/**
 * Calculates school-wise revenue breakdown (Section 16).
 */
export async function getSchoolWiseRevenue(filter?: DateFilterInput): Promise<SchoolRevenueSummary[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const [paymentsSnap, schoolsSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
    getDocs(collection(db, "schools")),
    getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)),
  ]);

  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  ).filter((p) => p.status === "CAPTURED");

  const schoolNameMap: Record<string, string> = {};
  for (const d of schoolsSnap.docs) {
    schoolNameMap[d.id] = (d.data() as any).name || d.id;
  }

  const subStatusMap: Record<string, { planId: string; status: any }> = {};
  for (const d of subsSnap.docs) {
    const data = d.data() as SchoolSubscription;
    subStatusMap[d.id] = { planId: data.planId, status: data.status };
  }

  const schoolMap: Record<string, SchoolRevenueSummary> = {};

  for (const pay of payments) {
    const sId = pay.schoolId;
    if (!schoolMap[sId]) {
      schoolMap[sId] = {
        schoolId: sId,
        schoolName: schoolNameMap[sId] || sId,
        totalPaymentsCount: 0,
        grossRevenue: 0,
        discount: 0,
        refunds: 0,
        netRevenue: 0,
        currentPlanId: subStatusMap[sId]?.planId || pay.planId,
        subscriptionStatus: subStatusMap[sId]?.status || "ACTIVE",
      };
    }

    schoolMap[sId].totalPaymentsCount += 1;
    schoolMap[sId].grossRevenue += (pay.amount + (pay.discountAmount || 0));
    schoolMap[sId].discount += (pay.discountAmount || 0);
    schoolMap[sId].netRevenue += pay.amount;
  }

  return Object.values(schoolMap);
}

/**
 * Section 9: Billing Cycle Analytics (Monthly vs Annual breakdown).
 */
export async function getBillingCycleAnalytics(filter?: DateFilterInput) {
  const db = getFirebaseDb();
  if (!db) {
    return {
      monthly: { count: 0, revenuePaise: 0, avgPaise: 0 },
      annual: { count: 0, revenuePaise: 0, avgPaise: 0 },
    };
  }

  const paymentsSnap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"));
  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  ).filter((p) => p.status === "CAPTURED");

  let monthlyCount = 0;
  let monthlyRev = 0;
  let annualCount = 0;
  let annualRev = 0;

  for (const pay of payments) {
    if (pay.billingCycle === "annual") {
      annualCount++;
      annualRev += pay.amount;
    } else {
      monthlyCount++;
      monthlyRev += pay.amount;
    }
  }

  return {
    monthly: {
      count: monthlyCount,
      revenuePaise: monthlyRev,
      avgPaise: monthlyCount > 0 ? Math.round(monthlyRev / monthlyCount) : 0,
    },
    annual: {
      count: annualCount,
      revenuePaise: annualRev,
      avgPaise: annualCount > 0 ? Math.round(annualRev / annualCount) : 0,
    },
  };
}

/**
 * Section 10: Real Coupon Impact Analysis.
 */
export async function getCouponImpactAnalytics(filter?: DateFilterInput) {
  const db = getFirebaseDb();
  if (!db) {
    return {
      totalCouponsUsed: 0,
      totalDiscountGiven: 0,
      revenueBeforeDiscount: 0,
      revenueAfterDiscount: 0,
      topCoupons: [],
    };
  }

  const paymentsSnap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"));
  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  ).filter((p) => p.status === "CAPTURED");

  let totalCouponsUsed = 0;
  let totalDiscountGiven = 0;
  let revenueAfterDiscount = 0;
  const couponMap: Record<string, { code: string; count: number; totalDiscount: number; totalRevenue: number }> = {};

  for (const pay of payments) {
    revenueAfterDiscount += pay.amount;
    const discount = pay.discountAmount || 0;
    const coupon = pay.couponId;

    if (discount > 0 || coupon) {
      totalCouponsUsed++;
      totalDiscountGiven += discount;
      const code = coupon || "PROMO";
      if (!couponMap[code]) {
        couponMap[code] = { code, count: 0, totalDiscount: 0, totalRevenue: 0 };
      }
      couponMap[code].count++;
      couponMap[code].totalDiscount += discount;
      couponMap[code].totalRevenue += pay.amount;
    }
  }

  const revenueBeforeDiscount = revenueAfterDiscount + totalDiscountGiven;
  const topCoupons = Object.values(couponMap).sort((a, b) => b.totalDiscount - a.totalDiscount);

  return {
    totalCouponsUsed,
    totalDiscountGiven,
    revenueBeforeDiscount,
    revenueAfterDiscount,
    topCoupons,
  };
}

/**
 * Section 5: Payment Health & Success Rate Metrics.
 */
export async function getPaymentHealthStats(filter?: DateFilterInput) {
  const db = getFirebaseDb();
  if (!db) {
    return {
      successful: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
      totalAttempts: 0,
      successRatePct: 0,
    };
  }

  const [paymentsSnap, ordersSnap] = await Promise.all([
    getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
    getDocs(collection(db, BILLING_COLLECTIONS.ORDERS || "orders")),
  ]);

  const payments = filterByDateRange(
    paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord)),
    filter
  );

  const orders = filterByDateRange(
    ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder)),
    filter
  );

  let succCount = 0;
  let succAmt = 0;
  let failCount = 0;
  let failAmt = 0;
  let refCount = 0;
  let refAmt = 0;
  let pendCount = 0;
  let pendAmt = 0;

  for (const p of payments) {
    if (p.status === "CAPTURED") {
      succCount++;
      succAmt += p.amount;
    } else if (p.status === "FAILED") {
      failCount++;
      failAmt += p.amount;
    } else if (p.status === "REFUNDED") {
      refCount++;
      refAmt += p.amount;
    }
  }

  for (const o of orders) {
    if (o.status === "CREATED" || o.status === "PAYMENT_PENDING") {
      pendCount++;
      pendAmt += o.finalAmount;
    }
  }

  const totalAttempts = succCount + failCount + pendCount;
  const successRatePct = totalAttempts > 0 ? Math.round((succCount / totalAttempts) * 100) : 0;

  return {
    successful: { count: succCount, amount: succAmt },
    failed: { count: failCount, amount: failAmt },
    pending: { count: pendCount, amount: pendAmt },
    refunded: { count: refCount, amount: refAmt },
    totalAttempts,
    successRatePct,
  };
}

export interface FinancialAnomaly {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  entityType: "payment" | "order" | "invoice" | "subscription" | "transaction";
  entityId: string;
  description: string;
  detectedAt: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "IGNORED";
}

/**
 * Section 14 & 15: Reconciliation Center Anomaly Detector.
 * Scans all collections and identifies data integrity issues.
 */
export async function detectFinancialAnomalies(): Promise<FinancialAnomaly[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  const [ordersSnap, paymentsSnap, invSnap, txSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, BILLING_COLLECTIONS.ORDERS || "orders")).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, BILLING_COLLECTIONS.INVOICES || "invoices")).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions")).catch(() => ({ docs: [] } as any)),
    getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)).catch(() => ({ docs: [] } as any)),
  ]);

  const orders = (ordersSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as InternalOrder));
  const payments = (paymentsSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as PaymentRecord));
  const invoices = (invSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as InvoiceRecord));
  const txs = (txSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as FinanceTransactionRecord));
  const subs = (subsSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as SchoolSubscription));

  const orderMap = new Map(orders.map((o: InternalOrder) => [o.id, o]));
  const payOrderMap = new Map(payments.map((p: PaymentRecord) => [p.orderId, p]));
  const invPayMap = new Map(invoices.map((i: InvoiceRecord) => [i.paymentId, i]));
  const invOrderMap = new Map(invoices.map((i: InvoiceRecord) => [i.orderId, i]));
  const txOrderMap = new Map(txs.map((t: FinanceTransactionRecord) => [t.orderId, t]));

  const anomalies: FinancialAnomaly[] = [];
  const nowIso = new Date().toISOString();

  // 1. Check: Captured payment without matching internal order
  for (const pay of payments) {
    if (!orderMap.has(pay.orderId)) {
      anomalies.push({
        id: `anom_pay_no_order_${pay.id}`,
        type: "PAYMENT_WITHOUT_ORDER",
        severity: "CRITICAL",
        entityType: "payment",
        entityId: pay.id,
        description: `Payment ${pay.id} references non-existent internal order ${pay.orderId}`,
        detectedAt: nowIso,
        status: "OPEN",
      });
    }

    // 2. Check: Payment without invoice
    if (!invPayMap.has(pay.id) && !invOrderMap.has(pay.orderId)) {
      anomalies.push({
        id: `anom_pay_no_inv_${pay.id}`,
        type: "PAYMENT_WITHOUT_INVOICE",
        severity: "WARNING",
        entityType: "payment",
        entityId: pay.id,
        description: `Captured payment ${pay.id} has no corresponding tax invoice`,
        detectedAt: nowIso,
        status: "OPEN",
      });
    }

    // 3. Check: Payment without finance transaction ledger entry
    if (!txOrderMap.has(pay.orderId)) {
      anomalies.push({
        id: `anom_pay_no_tx_${pay.id}`,
        type: "PAYMENT_WITHOUT_FINANCE_TX",
        severity: "WARNING",
        entityType: "payment",
        entityId: pay.id,
        description: `Payment ${pay.id} for order ${pay.orderId} is missing ledger finance transaction`,
        detectedAt: nowIso,
        status: "OPEN",
      });
    }
  }

  // 4. Check: Order marked PAID without captured payment record
  for (const ord of orders) {
    if (ord.status === "PAID" && !payOrderMap.has(ord.id)) {
      anomalies.push({
        id: `anom_order_paid_no_pay_${ord.id}`,
        type: "ORDER_PAID_WITHOUT_PAYMENT",
        severity: "CRITICAL",
        entityType: "order",
        entityId: ord.id,
        description: `Order ${ord.id} is marked PAID but has no verified captured payment record`,
        detectedAt: nowIso,
        status: "OPEN",
      });
    }
  }

  // 5. Check: Duplicate payments for same order
  const orderPaymentCounts: Record<string, number> = {};
  for (const p of payments) {
    orderPaymentCounts[p.orderId] = (orderPaymentCounts[p.orderId] || 0) + 1;
    if (orderPaymentCounts[p.orderId] > 1) {
      anomalies.push({
        id: `anom_dup_pay_${p.orderId}_${p.id}`,
        type: "DUPLICATE_PAYMENT_DETECTED",
        severity: "CRITICAL",
        entityType: "payment",
        entityId: p.id,
        description: `Order ${p.orderId} has multiple captured payment records`,
        detectedAt: nowIso,
        status: "OPEN",
      });
    }
  }

  // 6. Check: Refund Integrity Anomaly Checks (Phase 10 Section 28)
  try {
    const refundsSnap = await getDocs(collection(db, "refunds")).catch(() => ({ docs: [] } as any));
    const refundsList = (refundsSnap?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as any));
    const payMap = new Map(payments.map((p: any) => [p.id, p]));

    for (const ref of refundsList) {
      if (ref.status === "PROCESSED") {
        const matchingPay = payMap.get(ref.paymentId);
        if (!matchingPay) {
          anomalies.push({
            id: `anom_ref_no_pay_${ref.id}`,
            type: "REFUND_WITHOUT_PAYMENT",
            severity: "CRITICAL",
            entityType: "transaction",
            entityId: ref.id,
            description: `Processed refund ${ref.id} references non-existent payment ${ref.paymentId}`,
            detectedAt: nowIso,
            status: "OPEN",
          });
        }
      }
    }
  } catch (err) {
    // Non-blocking
  }

  return anomalies;
}

export const detectFinancialOrphans = detectFinancialAnomalies;

/**
 * Section 12 & 13: Complete End-to-End Financial Trace Resolver.
 */
export async function getTransactionTrace(transactionId: string) {
  const db = getFirebaseDb();
  if (!db) return null;

  // Search in payments first
  const payRef = doc(db, BILLING_COLLECTIONS.PAYMENTS || "payments", transactionId);
  let paySnap = await getDoc(payRef);

  let payment: PaymentRecord | null = null;
  let orderId = transactionId;

  if (paySnap.exists()) {
    payment = { id: paySnap.id, ...paySnap.data() } as PaymentRecord;
    orderId = payment.orderId;
  } else {
    // Search in orders
    const ordRef = doc(db, BILLING_COLLECTIONS.ORDERS || "orders", transactionId);
    const ordSnap = await getDoc(ordRef);
    if (ordSnap.exists()) {
      orderId = ordSnap.id;
    }
  }

  // Fetch all related entities by orderId
  const [ordSnap, invSnap, txSnap] = await Promise.all([
    getDoc(doc(db, BILLING_COLLECTIONS.ORDERS || "orders", orderId)),
    getDoc(doc(db, BILLING_COLLECTIONS.INVOICES || "invoices", `inv_${orderId}`)),
    getDoc(doc(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions", `tx_${orderId}`)),
  ]);

  const order = ordSnap.exists() ? ({ id: ordSnap.id, ...ordSnap.data() } as InternalOrder) : null;
  const invoice = invSnap.exists() ? ({ id: invSnap.id, ...invSnap.data() } as InvoiceRecord) : null;
  const financeTx = txSnap.exists() ? ({ id: txSnap.id, ...txSnap.data() } as FinanceTransactionRecord) : null;

  let school: any = null;
  let subscription: SchoolSubscription | null = null;

  const schoolId = payment?.schoolId || order?.schoolId;
  if (schoolId) {
    const [schoolSnap, subSnap] = await Promise.all([
      getDoc(doc(db, "schools", schoolId)),
      getDoc(doc(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS, schoolId)),
    ]);
    if (schoolSnap.exists()) school = { id: schoolSnap.id, ...schoolSnap.data() };
    if (subSnap.exists()) subscription = subSnap.data() as SchoolSubscription;
  }

  return {
    orderId,
    payment,
    order,
    invoice,
    financeTx,
    school,
    subscription,
    hasReconciliationIssue: !payment || !order || !invoice || !financeTx,
  };
}

/**
 * Server-Side CSV Export Generator for Finance Transactions (Section 19).
 */
export function generateTransactionsCSV(
  transactions: {
    createdAt: string;
    schoolName?: string;
    schoolId: string;
    planId: string;
    billingCycle: string;
    amountPaise: number;
    discountPaise: number;
    status: string;
    paymentId: string;
    invoiceNumber: string;
  }[]
): string {
  const headers = ["Date", "School", "Plan", "Billing Cycle", "Amount (INR)", "Discount (INR)", "Status", "Payment ID", "Invoice Number"];
  const rows = transactions.map((t) => [
    new Date(t.createdAt).toLocaleDateString("en-IN"),
    `"${(t.schoolName || t.schoolId).replace(/"/g, '""')}"`,
    t.planId,
    t.billingCycle,
    (t.amountPaise / 100).toFixed(2),
    (t.discountPaise / 100).toFixed(2),
    t.status,
    t.paymentId,
    t.invoiceNumber,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
