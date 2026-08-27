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
 * Orphan Detection Tool: Scans for inconsistent financial records (Section 23).
 * Flags anomalies without modifying records.
 */
export async function detectFinancialOrphans() {
  const db = getFirebaseDb();
  if (!db) return [];

  const [ordersSnap, paymentsSnap, invSnap, txSnap] = await Promise.all([
    getDocs(collection(db, BILLING_COLLECTIONS.ORDERS || "orders")),
    getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments")),
    getDocs(collection(db, BILLING_COLLECTIONS.INVOICES || "invoices")),
    getDocs(collection(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS || "financeTransactions")),
  ]);

  const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder));
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentRecord));
  const invoices = invSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InvoiceRecord));
  const txs = txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinanceTransactionRecord));

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const payOrderMap = new Map(payments.map((p) => [p.orderId, p]));
  const anomalies: { type: string; description: string; recordId: string }[] = [];

  // Check 1: Captured payment without matching internal order
  for (const pay of payments) {
    if (!orderMap.has(pay.orderId)) {
      anomalies.push({
        type: "PAYMENT_WITHOUT_ORDER",
        description: `Payment ${pay.id} references non-existent order ${pay.orderId}`,
        recordId: pay.id,
      });
    }
  }

  // Check 2: Order marked PAID without captured payment record
  for (const ord of orders) {
    if (ord.status === "PAID" && !payOrderMap.has(ord.id)) {
      anomalies.push({
        type: "ORDER_PAID_WITHOUT_PAYMENT",
        description: `Order ${ord.id} is marked PAID but has no payment record`,
        recordId: ord.id,
      });
    }
  }

  return anomalies;
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
