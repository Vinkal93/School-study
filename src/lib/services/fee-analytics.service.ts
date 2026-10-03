import { postedPayment, normalizePaymentMethod } from "@/lib/fees/finance-core";
/**
 * PHASE 4 — CENTRAL FEE ANALYTICS & REPORTING SERVICE
 * Single Source of Truth for Fee Dashboard, Defaulters, Analytics, and Reports.
 *
 * Powered by authoritative Firestore entities:
 * - feeDemands
 * - financialPayments
 * - paymentAllocations
 * - financialRefunds
 * - paymentReversals
 * - feeAdjustments
 *
 * Strict multi-tenant isolation, integer-paise precision, Indian session (Apr-Mar) aware.
 */

import { getFirebaseDb } from "@/lib/fees/firestore";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "@/lib/fees/firestore";
import type {
  FeeDemand,
  FinancialPayment,
  PaymentAllocation,
  FinancialRefund,
  PaymentReversal,
  FeeAdjustment,
  PaymentMethod,
} from "@/types/fee-foundation";
import {
  paiseToRupees,
  rupeesToPaise,
  formatINR,
  calculateInvoiceBalance,
  deriveInvoiceStatus,
  getAcademicYearPeriods,
  matchAcademicYear,
} from "@/lib/services/fee-foundation.service";

// ==========================================
// 1. TYPES FOR DASHBOARD & REPORTS
// ==========================================

export interface DashboardFilterOptions {
  academicYearId?: string; // e.g. "ay_2026_27"
  month?: string; // e.g. "September" or "September 2026" or "all"
  className?: string; // "all" or specific class
  sectionName?: string; // "all" or specific section
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  searchQuery?: string; // Student search query (name, admission number)
  paymentStatusFilter?: "all" | "pending" | "paid" | "overdue"; // Payment status filter
}

export interface FeeDashboardSummary {
  // Core KPI metrics
  totalExpectedPaise: number;
  totalCollectedPaise: number;
  totalOutstandingPaise: number;
  totalRefundedPaise: number;
  netCollectedPaise: number;
  collectionRate: number; // 0-100, handled safely (no NaN)

  totalExpectedRupees: number;
  totalCollectedRupees: number;
  totalOutstandingRupees: number;
  totalRefundedRupees: number;
  netCollectedRupees: number;

  // Today's performance
  todayCollectionPaise: number;
  todayCollectionRupees: number;
  todayPaymentsCount: number;

  // Counts
  totalDemandsCount: number;
  paidDemandsCount: number;
  partialDemandsCount: number;
  overdueDemandsCount: number;
  totalTransactionsCount: number;
  defaultersCount: number;

  // Chart: 12 Academic Months (April -> March)
  collectionTrend: Array<{
    monthName: string;
    periodKey: string;
    sequence: number;
    expectedPaise: number;
    collectedPaise: number;
    outstandingPaise: number;
    expectedRupees: number;
    collectedRupees: number;
    outstandingRupees: number;
    collectionRate: number;
  }>;

  // Chart: Payment Method Breakdown
  paymentMethodSummary: Array<{
    method: string;
    amountPaise: number;
    amountRupees: number;
    count: number;
    percentage: number;
    color: string;
  }>;

  // Payment Follow-Up Breakdown
  paymentFollowUp: {
    criticalCount: number; // >30 days overdue
    overdueCount: number; // 8-30 days overdue
    dueSoonCount: number; // 1-7 days until due
    onTrackCount: number; // cleared dues
    criticalAmountPaise: number;
    overdueAmountPaise: number;
    dueSoonAmountPaise: number;
  };

  // Top Defaulters (real students with outstanding balance)
  topDefaulters: Array<DefaulterRecord>;
  allDefaulters?: Array<DefaulterRecord>;

  // Recent Collections
  recentCollections: Array<FinancialPayment>;

  // Selected Month Focus
  selectedMonthSummary: {
    month: string;
    expectedRupees: number;
    collectedRupees: number;
    dueRupees: number;
    collectionRate: number;
  };

  // Monthly Class Overview (Matrix heatmap)
  monthlyClassOverview: Array<{
    className: string;
    rates: (number | null)[];
  }>;
}

export interface DefaulterRecord {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  phone?: string;
  fatherName?: string;
  totalOutstandingPaise: number;
  totalOutstandingRupees: number;
  oldestDueDate: string;
  daysOverdue: number;
  lastPaymentDate?: string;
  lastPaymentAmountPaise?: number;
  lastPaymentAmountRupees?: number;
  status: "CRITICAL" | "OVERDUE" | "DUE_SOON" | "CURRENT";
  dueDemandsCount: number;
  unpaidDemands: Array<{
    demandId: string;
    feeHeadName: string;
    period: string;
    dueDate: string;
    balanceAmountPaise: number;
  }>;
}

export interface ClassCollectionRow {
  className: string;
  academicYearId: string;
  studentCount: number;
  expectedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  expectedRupees: number;
  collectedRupees: number;
  outstandingRupees: number;
  collectionRate: number;
  paidStudentsCount: number;
  partialStudentsCount: number;
  dueStudentsCount: number;
}

export interface FeeHeadCollectionRow {
  feeHeadId: string;
  feeHeadName: string;
  expectedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  expectedRupees: number;
  collectedRupees: number;
  outstandingRupees: number;
  collectionRate: number;
}

// Helper colors for payment methods
const METHOD_COLORS: Record<string, string> = {
  UPI: "#10B981", // Emerald
  Cash: "#3B82F6", // Blue
  "Bank Transfer": "#8B5CF6", // Purple
  Cheque: "#F59E0B", // Amber
  Card: "#EC4899", // Pink
  Other: "#64748B", // Slate
};

// ==========================================
// 2. CENTRAL DASHBOARD SUMMARY QUERY
// ==========================================

export async function getFeeDashboardSummary(
  schoolId: string,
  filter?: DashboardFilterOptions
): Promise<FeeDashboardSummary> {
  const db = getFirebaseDb();
  if (!db || !schoolId) {
    throw new Error("schoolId is required to fetch fee dashboard summary.");
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const selectedYear =
    filter?.academicYearId && filter.academicYearId !== "all"
      ? filter.academicYearId.trim()
      : null;
  const selectedClass =
    filter?.className && filter.className !== "all"
      ? filter.className.trim()
      : null;
  const selectedSection =
    filter?.sectionName && filter.sectionName !== "all"
      ? filter.sectionName.trim()
      : null;
  const selectedMonth =
    filter?.month && filter.month !== "all" ? filter.month.trim() : null;
  const searchQuery =
    filter?.searchQuery && filter.searchQuery.trim() !== ""
      ? filter.searchQuery.trim().toLowerCase()
      : null;
  const paymentStatusFilter =
    filter?.paymentStatusFilter && filter.paymentStatusFilter !== "all"
      ? filter.paymentStatusFilter
      : null;

  // Helper to extract paise amount safely across schema variations
  const getDemandNetPaise = (d: any) =>
    Number(d.netAmountPaise ?? d.netPayablePaise ?? d.amountPaise ?? d.grossAmountPaise ?? 0);
  const getDemandBalancePaise = (d: any) =>
    Number(d.balanceAmountPaise ?? d.dueAmountPaise ?? Math.max(0, getDemandNetPaise(d) - Number(d.paidAmountPaise ?? d.amountPaidPaise ?? 0)));
  const getDemandPaidPaise = (d: any) =>
    Number(d.paidAmountPaise ?? d.amountPaidPaise ?? Math.max(0, getDemandNetPaise(d) - getDemandBalancePaise(d)));
  const getPaymentAmountPaise = (p: any) =>
    Number(p.amountPaise ?? p.amountPaidPaise ?? (typeof p.amount === "number" ? Math.round(p.amount * 100) : 0));

  // 1. Fetch Demands for school (with resilient fallback matching)
  const seenDemandIds = new Set<string>();
  let allDemands: FeeDemand[] = [];

  try {
    const rootSnap = await getDocs(
      query(collection(db, "feeDemands"), where("schoolId", "==", schoolId))
    );
    for (const d of rootSnap.docs) {
      seenDemandIds.add(d.id);
      allDemands.push({ id: d.id, ...d.data() } as FeeDemand);
    }
  } catch {}

  try {
    const subSnap = await getDocs(
      collection(db, "schools", schoolId, "feeDemands")
    );
    for (const d of subSnap.docs) {
      if (!seenDemandIds.has(d.id)) {
        seenDemandIds.add(d.id);
        allDemands.push({ id: d.id, ...d.data() } as FeeDemand);
      }
    }
  } catch (e) {
    console.warn("Subcollection feeDemands query notice:", e);
  }

  // Filter demands by academic year if specified
  if (selectedYear) {
    const matched = allDemands.filter((d) =>
      matchAcademicYear(d.academicYearId || d.academicYearName, selectedYear)
    );
    allDemands = matched;
  }

  // Resilient fallback: If no explicit feeDemands exist, synthesize demands from studentFeeAssignments
  if (allDemands.length === 0) {
    try {
      const assignSnap = await getDocs(
        query(collection(db, "studentFeeAssignments"), where("schoolId", "==", schoolId))
      );
      if (!assignSnap.empty) {
        assignSnap.docs.forEach((docSnap) => {
          const assign = docSnap.data() as any;
          if (selectedYear && !matchAcademicYear(assign.academicYearId, selectedYear)) return;
          if (assign.monthLedger && Array.isArray(assign.monthLedger)) {
            assign.monthLedger.forEach((mItem: any, idx: number) => {
              if (mItem.amountPaise > 0) {
                const admStr = String(assign.admissionNumber || docSnap.id);
                allDemands.push({
                  id: `${docSnap.id}_${idx}`,
                  demandNumber: `DEM-${admStr.slice(-4)}-${idx}`,
                  schoolId,
                  studentId: assign.studentId,
                  studentName: assign.studentName,
                  admissionNumber: assign.admissionNumber,
                  className: assign.className,
                  sectionName: assign.sectionName || "A",
                  academicYearId: assign.academicYearId || "ay_current",
                  academicYearName: assign.academicYearName,
                  period: mItem.month,
                  dueDate: mItem.dueDate,
                  grossAmountPaise: mItem.amountPaise,
                  netAmountPaise: mItem.amountPaise - (mItem.discountPaise || 0),
                  paidAmountPaise: mItem.paidAmountPaise || 0,
                  balanceAmountPaise: mItem.pendingAmountPaise ?? Math.max(0, mItem.amountPaise - (mItem.paidAmountPaise || 0)),
                  status: mItem.status === "PAID" ? "PAID" : (mItem.paidAmountPaise || 0) > 0 ? "PARTIAL" : "PENDING",
                  isOverdue: new Date(mItem.dueDate).getTime() < now.getTime() && (mItem.pendingAmountPaise > 0),
                  createdAt: assign.updatedAt || now.toISOString(),
                } as any);
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn("Virtual demands synthesis notice:", e);
    }
  }

  // Filter out cancelled demands
  allDemands = allDemands.filter((d) => d.status !== "CANCELLED");

  // Apply Class and Section filters to Demands
  if (selectedClass) {
    allDemands = allDemands.filter(
      (d) => d.className?.toLowerCase() === selectedClass.toLowerCase()
    );
  }
  if (selectedSection) {
    allDemands = allDemands.filter(
      (d) => d.sectionName?.toLowerCase() === selectedSection.toLowerCase()
    );
  }

  // Apply search query filter to Demands (student name or admission number)
  if (searchQuery) {
    allDemands = allDemands.filter(
      (d) =>
        d.studentName?.toLowerCase().includes(searchQuery) ||
        d.admissionNumber?.toLowerCase().includes(searchQuery)
    );
  }

  // 2. Fetch Payments for school (merging financialPayments AND feePayments)
  const seenPayIds = new Set<string>();
  const seenReceipts = new Set<string>();
  let allPayments: FinancialPayment[] = [];

  // A. financialPayments (root & subcollection)
  try {
    let fpQuery = query(collection(db, "financialPayments"), where("schoolId", "==", schoolId));
    let fpSnap = await getDocs(fpQuery);
    for (const d of fpSnap.docs) {
      seenPayIds.add(d.id);
      const data = d.data();
      if (data.receiptNumber) seenReceipts.add(data.receiptNumber);
      allPayments.push({ id: d.id, ...data } as FinancialPayment);
    }
    // Also check subcollection
    try {
      const subFps = await getDocs(collection(db, "schools", schoolId, "financialPayments"));
      for (const d of subFps.docs) {
        if (seenPayIds.has(d.id)) continue;
        const data = d.data();
        const rec = data.receiptNumber || d.id;
        if (rec && seenReceipts.has(rec)) continue;
        seenPayIds.add(d.id);
        if (rec) seenReceipts.add(rec);
        allPayments.push({ id: d.id, ...data } as FinancialPayment);
      }
    } catch {}
  } catch (e) {
    console.warn("financialPayments fetch in feeDashboardSummary:", e);
  }

  // B. feePayments (root & subcollection)
  try {
    const feePayQuery = query(collection(db, "feePayments"), where("schoolId", "==", schoolId));
    const feePaySnap = await getDocs(feePayQuery);
    for (const d of feePaySnap.docs) {
      if (seenPayIds.has(d.id)) continue;
      const data = d.data();
      const rec = data.receiptNumber || d.id;
      if (rec && seenReceipts.has(rec)) continue;

      seenPayIds.add(d.id);
      if (rec) seenReceipts.add(rec);

      const rawMethod = (data.paymentMethod || "CASH").toUpperCase();
      const methodDisplay =
        normalizePaymentMethod(rawMethod);

      allPayments.push({
        id: d.id,
        receiptNumber: rec,
        schoolId,
        studentId: data.studentId || "",
        studentName: data.studentName || "",
        admissionNumber: data.admissionNumber || "",
        className: data.className || "",
        sectionName: data.sectionName || "",
        academicYearId: data.academicYearId || "",
        amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
        paymentDate: data.paymentDate || data.createdAt || now.toISOString(),
        paymentMethod: methodDisplay as any,
        referenceNumber: data.transactionRef || "",
        collectedBy: data.collectedBy || "",
        collectedByName: data.collectedByName || "",
        status: (data.status || "SUCCESS") as FinancialPayment["status"],
        remarks: data.remarks || "",
        allocatedTotalPaise: data.amountPaidPaise || 0,
        unallocatedPaise: 0,
        allocationCount: 1,
        periodMonths: Array.isArray(data.periodMonths) ? data.periodMonths : [],
        remainingDuePaise: data.remainingDuePaise,
        createdAt: data.createdAt || now.toISOString(),
        updatedAt: data.updatedAt || data.createdAt || now.toISOString(),
      });
    }

    // Also check subcollection for feePayments
    try {
      const subFeeSnap = await getDocs(collection(db, "schools", schoolId, "feePayments"));
      for (const d of subFeeSnap.docs) {
        if (seenPayIds.has(d.id)) continue;
        const data = d.data();
        const rec = data.receiptNumber || d.id;
        if (rec && seenReceipts.has(rec)) continue;

        seenPayIds.add(d.id);
        if (rec) seenReceipts.add(rec);

        const rawMethod = (data.paymentMethod || "CASH").toUpperCase();
        const methodDisplay =
          normalizePaymentMethod(rawMethod);

        allPayments.push({
          id: d.id,
          receiptNumber: rec,
          schoolId,
          studentId: data.studentId || "",
          studentName: data.studentName || "",
          admissionNumber: data.admissionNumber || "",
          className: data.className || "",
          sectionName: data.sectionName || "",
          academicYearId: data.academicYearId || "",
          amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
          paymentDate: data.paymentDate || data.createdAt || now.toISOString(),
          paymentMethod: methodDisplay as any,
          referenceNumber: data.transactionRef || "",
          collectedBy: data.collectedBy || "",
          collectedByName: data.collectedByName || "",
          status: (data.status || "SUCCESS") as FinancialPayment["status"],
          remarks: data.remarks || "",
          allocatedTotalPaise: data.amountPaidPaise || 0,
          unallocatedPaise: 0,
          allocationCount: 1,
          periodMonths: Array.isArray(data.periodMonths) ? data.periodMonths : [],
          remainingDuePaise: data.remainingDuePaise,
          createdAt: data.createdAt || now.toISOString(),
          updatedAt: data.updatedAt || data.createdAt || now.toISOString(),
        });
      }
    } catch {}
  } catch (e) {
    console.warn("feePayments fetch in feeDashboardSummary:", e);
  }

  // Apply Academic Year filter to Payments
  if (selectedYear) {
    allPayments = allPayments.filter((p) => matchAcademicYear(p.academicYearId, selectedYear));
  }

  // Apply Class and Section filters to Payments
  if (selectedClass) {
    allPayments = allPayments.filter(
      (p) => p.className?.toLowerCase() === selectedClass.toLowerCase()
    );
  }
  if (selectedSection) {
    allPayments = allPayments.filter(
      (p) => p.sectionName?.toLowerCase() === selectedSection.toLowerCase()
    );
  }

  // Apply search query filter to Payments
  if (searchQuery) {
    allPayments = allPayments.filter(
      (p) =>
        p.studentName?.toLowerCase().includes(searchQuery) ||
        p.admissionNumber?.toLowerCase().includes(searchQuery) ||
        p.receiptNumber?.toLowerCase().includes(searchQuery)
    );
  }

  // Apply payment status filter to Payments
  if (paymentStatusFilter) {
    const statusMap: Record<string, string[]> = {
      pending: ["PENDING", "PARTIAL"],
      paid: ["PAID", "SUCCESS", "PARTIALLY_REFUNDED"],
      overdue: ["OVERDUE", "OVERDUE_PARTIAL"],
    };
    const allowedStatuses = statusMap[paymentStatusFilter] || [];
    if (allowedStatuses.length > 0) {
      allPayments = allPayments.filter((p) =>
        allowedStatuses.includes(p.status?.toUpperCase() || "")
      );
    }
  }

  // 3. Fetch Allocations (for exact fee-head and period matching)
  const allocSnap = await getDocs(
    query(
      collection(db, "paymentAllocations"),
      where("schoolId", "==", schoolId)
    )
  );
  const allAllocations = allocSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as PaymentAllocation
  );

  // 4. Fetch Refunds
  const refundSnap = await getDocs(
    query(collection(db, "financialRefunds"), where("schoolId", "==", schoolId))
  );
  const allRefunds = refundSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as FinancialRefund
  );

  // 5. Active Target Demands for Selected Month filter
  const activeDemands = selectedMonth
    ? allDemands.filter((d) => {
        const periodStr = (d.period || "").toLowerCase();
        const selMonth = selectedMonth.toLowerCase();
        return periodStr.includes(selMonth) || selMonth.includes(periodStr);
      })
    : allDemands;

  // 6. Aggregate Total Expected, Collected, Outstanding
  let totalExpectedPaise = 0;
  let totalOutstandingPaise = 0;
  let paidDemandsCount = 0;
  let partialDemandsCount = 0;
  let overdueDemandsCount = 0;

  for (const d of activeDemands) {
    const net = getDemandNetPaise(d);
    const bal = getDemandBalancePaise(d);
    totalExpectedPaise += net;
    totalOutstandingPaise += bal;
    if (d.status === "PAID" || (net > 0 && bal === 0)) paidDemandsCount++;
    else if (d.status === "PARTIAL" || (bal > 0 && bal < net)) partialDemandsCount++;
    else if (d.status === "OVERDUE") overdueDemandsCount++;
  }

  // Calculate Total Collected accurately:
  let totalCollectedPaise = 0;
  let totalRefundedPaise = 0;
  const validSuccessfulPayments = allPayments.filter((p) => {
    const st = (p.status as string) || "";
    return postedPayment(st) && st !== "REVERSED";
  });

  const validPaymentIds = new Set(validSuccessfulPayments.map(p => p.id));
  const activeDemandIds = new Set(activeDemands.map(d => d.id));
  if (selectedMonth) {
    totalCollectedPaise = allAllocations.filter(a => activeDemandIds.has(a.demandId) && validPaymentIds.has(a.paymentId)).reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
  } else {
    totalCollectedPaise = validSuccessfulPayments.reduce((sum, p) => sum + getPaymentAmountPaise(p), 0);
  }

  // Refunds calculation
  totalRefundedPaise = allRefunds.filter(r => validPaymentIds.has(r.paymentId)).reduce((sum, r) => sum + (selectedMonth ? (r.allocatedRefunds || []).filter(a => activeDemandIds.has(a.demandId)).reduce((n, a) => n + a.refundedAmountPaise, 0) : r.amountPaise || 0), 0);
  const netCollectedPaise = Math.max(
    0,
    totalCollectedPaise - totalRefundedPaise
  );

  // Collection Rate = (Collected / Expected) * 100
  const collectionRate =
    totalExpectedPaise > 0
      ? Number((((totalExpectedPaise - totalOutstandingPaise) / totalExpectedPaise) * 100).toFixed(1))
      : 0;

  // 7. Today's Performance
  let todayCollectionPaise = 0;
  let todayPaymentsCount = 0;
  for (const p of validSuccessfulPayments) {
    const payDate = (p.paymentDate || p.createdAt || "").slice(0, 10);
    if (payDate === todayStr) {
      todayCollectionPaise += getPaymentAmountPaise(p);
      todayPaymentsCount++;
    }
  }

  // 8. 12-Month Academic Session Collection Trend (April -> March)
  const sessionName = selectedYear
    ? selectedYear.replace("ay_", "").replace("_", "-")
    : "2026-2027";
  const sessionPeriods = getAcademicYearPeriods(sessionName);
  const collectionTrend = sessionPeriods.map((period) => {
    // Filter demands matching this month name or 3-letter abbreviation
    const monthDemands = allDemands.filter((d) => {
      const pStr = (d.period || "").toLowerCase();
      const mName = period.monthName.toLowerCase();
      const mShort = mName.slice(0, 3);
      return pStr.includes(mName) || pStr.includes(mShort);
    });
    const mExpected = monthDemands.reduce(
      (sum, d) => sum + getDemandNetPaise(d),
      0
    );
    const mOutstanding = monthDemands.reduce(
      (sum, d) => sum + getDemandBalancePaise(d),
      0
    );
    let mPaidFromDemands = monthDemands.reduce(
      (sum, d) => sum + getDemandPaidPaise(d),
      0
    );

    const mRate =
      mExpected > 0
        ? Number(((mPaidFromDemands / mExpected) * 100).toFixed(1))
        : 0;

    return {
      monthName: period.monthName,
      periodKey: period.periodKey,
      sequence: period.sequence,
      expectedPaise: mExpected,
      collectedPaise: mPaidFromDemands,
      outstandingPaise: mOutstanding,
      expectedRupees: paiseToRupees(mExpected),
      collectedRupees: paiseToRupees(mPaidFromDemands),
      outstandingRupees: paiseToRupees(mOutstanding),
      collectionRate: mRate,
    };
  });

  // 9. Payment Method Breakdown
  const methodMap: Record<string, { count: number; amountPaise: number }> = {
    UPI: { count: 0, amountPaise: 0 },
    Cash: { count: 0, amountPaise: 0 },
    "Bank Transfer": { count: 0, amountPaise: 0 },
    Cheque: { count: 0, amountPaise: 0 },
    Card: { count: 0, amountPaise: 0 },
    Other: { count: 0, amountPaise: 0 },
  };

  for (const p of validSuccessfulPayments) {
    const rawMethod = (p.paymentMethod || "").toUpperCase();
    const payAmt = getPaymentAmountPaise(p);
    if (rawMethod === "UPI") {
      methodMap.UPI.count++;
      methodMap.UPI.amountPaise += payAmt;
    } else if (rawMethod === "CASH") {
      methodMap.Cash.count++;
      methodMap.Cash.amountPaise += payAmt;
    } else if (rawMethod === "BANK_TRANSFER" || rawMethod === "BANK TRANSFER") {
      methodMap["Bank Transfer"].count++;
      methodMap["Bank Transfer"].amountPaise += payAmt;
    } else if (rawMethod === "CHEQUE") {
      methodMap.Cheque.count++;
      methodMap.Cheque.amountPaise += payAmt;
    } else if (rawMethod === "CARD") {
      methodMap.Card.count++;
      methodMap.Card.amountPaise += payAmt;
    } else {
      methodMap.Other.count++;
      methodMap.Other.amountPaise += payAmt;
    }
  }

  const paymentMethodSummary = Object.entries(methodMap).map(
    ([method, data]) => {
      const pct =
        totalCollectedPaise > 0
          ? Number(((data.amountPaise / totalCollectedPaise) * 100).toFixed(1))
          : 0;
      return {
        method,
        count: data.count,
        amountPaise: data.amountPaise,
        amountRupees: paiseToRupees(data.amountPaise),
        percentage: pct,
        color: METHOD_COLORS[method] || "#64748B",
      };
    }
  );

  // 10. Defaulters & Payment Follow-Up Aggregation
  // Lookup student profiles to attach genuine contact numbers
  const studentContacts = new Map<string, { phone?: string; parentPhone?: string; fatherName?: string }>();
  try {
    const stSnap = await getDocs(
      collection(db, "schools", schoolId, "students")
    );
    stSnap.docs.forEach((docSnap) => {
      const st = docSnap.data();
      studentContacts.set(docSnap.id, {
        phone: st.phone || st.mobile || st.contactNumber,
        parentPhone: st.parentPhone || st.fatherPhone || st.motherPhone || st.phone,
        fatherName: st.fatherName || st.guardianName,
      });
    });
  } catch (stErr) {
    console.warn("Student contacts lookup notice:", stErr);
  }

  // Group allDemands by studentId
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      sectionName: string;
      totalOutstandingPaise: number;
      oldestDueDate: string;
      demands: FeeDemand[];
    }
  >();

  for (const d of allDemands) {
    if (!studentMap.has(d.studentId)) {
      studentMap.set(d.studentId, {
        studentId: d.studentId,
        studentName: d.studentName,
        admissionNumber: d.admissionNumber,
        className: d.className,
        sectionName: d.sectionName,
        totalOutstandingPaise: 0,
        oldestDueDate: d.dueDate || todayStr,
        demands: [],
      });
    }

    const sEntry = studentMap.get(d.studentId)!;
    const bal = getDemandBalancePaise(d);
    sEntry.totalOutstandingPaise += bal;
    if (bal > 0) {
      sEntry.demands.push(d);
      if (
        d.dueDate &&
        new Date(d.dueDate).getTime() < new Date(sEntry.oldestDueDate).getTime()
      ) {
        sEntry.oldestDueDate = d.dueDate;
      }
    }
  }

  // Build real defaulters list (ONLY students with balance > 0)
  const defaulterList: DefaulterRecord[] = [];
  let criticalCount = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let onTrackCount = 0;
  let criticalAmountPaise = 0;
  let overdueAmountPaise = 0;
  let dueSoonAmountPaise = 0;

  const nowMs = Date.now();

  for (const entry of studentMap.values()) {
    if (entry.totalOutstandingPaise <= 0) {
      onTrackCount++;
      continue;
    }

    const oldestDueMs = new Date(entry.oldestDueDate).getTime();
    const diffDays = Math.floor((nowMs - oldestDueMs) / (1000 * 60 * 60 * 24));

    let status: DefaulterRecord["status"] = "CURRENT";
    if (diffDays > 30) {
      status = "CRITICAL";
      criticalCount++;
      criticalAmountPaise += entry.totalOutstandingPaise;
    } else if (diffDays >= 8) {
      status = "OVERDUE";
      overdueCount++;
      overdueAmountPaise += entry.totalOutstandingPaise;
    } else if (diffDays >= 0) {
      status = "DUE_SOON";
      dueSoonCount++;
      dueSoonAmountPaise += entry.totalOutstandingPaise;
    } else {
      status = "CURRENT";
    }

    // Apply payment status filter to defaulters
    if (paymentStatusFilter) {
      const defaulterStatusMap: Record<string, DefaulterRecord["status"][]> = {
        pending: ["DUE_SOON", "OVERDUE", "CRITICAL"],
        paid: [],
        overdue: ["OVERDUE", "CRITICAL"],
      };
      const allowedDefaulterStatuses =
        defaulterStatusMap[paymentStatusFilter] || [];
      if (
        allowedDefaulterStatuses.length > 0 &&
        !allowedDefaulterStatuses.includes(status)
      ) {
        continue;
      }
    }

    // Find student's last payment
    const studentPayments = allPayments.filter((p) => {
      const st = (p.status as string) || "";
      return (
        p.studentId === entry.studentId &&
        (!st || st === "SUCCESS" || st === "PAID" || st === "COMPLETED")
      );
    });
    studentPayments.sort(
      (a, b) =>
        new Date(b.paymentDate || b.createdAt).getTime() -
        new Date(a.paymentDate || a.createdAt).getTime()
    );
    const lastPay = studentPayments[0];
    const contactInfo = studentContacts.get(entry.studentId);
    const lastPayAmt = lastPay ? getPaymentAmountPaise(lastPay) : undefined;

    defaulterList.push({
      studentId: entry.studentId,
      studentName: entry.studentName,
      admissionNumber: entry.admissionNumber,
      className: entry.className,
      sectionName: entry.sectionName,
      phone: contactInfo?.phone || (entry.demands[0] as any)?.phone || undefined,
      fatherName: contactInfo?.fatherName || (entry.demands[0] as any)?.fatherName || undefined,
      totalOutstandingPaise: entry.totalOutstandingPaise,
      totalOutstandingRupees: paiseToRupees(entry.totalOutstandingPaise),
      oldestDueDate: entry.oldestDueDate,
      daysOverdue: Math.max(0, diffDays),
      lastPaymentDate: lastPay?.paymentDate || (lastPay?.createdAt ? lastPay.createdAt.slice(0, 10) : undefined),
      lastPaymentAmountPaise: lastPayAmt,
      lastPaymentAmountRupees: lastPayAmt !== undefined ? paiseToRupees(lastPayAmt) : undefined,
      status,
      dueDemandsCount: entry.demands.length,
      unpaidDemands: entry.demands.map((d) => ({
        demandId: d.id,
        feeHeadName: d.feeHeadName || "Fee",
        period: d.period || "Term",
        dueDate: d.dueDate || "",
        balanceAmountPaise: getDemandBalancePaise(d),
      })),
    });
  }

  // Sort defaulters: highest outstanding first
  defaulterList.sort(
    (a, b) => b.totalOutstandingPaise - a.totalOutstandingPaise
  );

  // 11. Recent Collections (latest successful)
  const recentCollections = [...validSuccessfulPayments]
    .sort(
      (a, b) =>
        new Date(b.paymentDate || b.createdAt).getTime() -
        new Date(a.paymentDate || a.createdAt).getTime()
    )
    .slice(0, 10);

  // 12. Selected Month Focus Summary
  const focusPeriod =
    sessionPeriods.find((p) =>
      selectedMonth
        ? selectedMonth.toLowerCase().includes(p.monthName.toLowerCase()) ||
          p.monthName.toLowerCase().includes(selectedMonth.toLowerCase())
        : p.monthName === "September"
    ) || sessionPeriods[5];

  const focusDemands = allDemands.filter((d) => {
    const pStr = (d.period || "").toLowerCase();
    const mName = focusPeriod.monthName.toLowerCase();
    return pStr.includes(mName) || pStr.includes(mName.slice(0, 3));
  });
  const focusExpected = focusDemands.reduce(
    (sum, d) => sum + getDemandNetPaise(d),
    0
  );
  const focusDue = focusDemands.reduce(
    (sum, d) => sum + getDemandBalancePaise(d),
    0
  );
  const focusPaid = focusDemands.reduce((sum, d) => sum + getDemandPaidPaise(d), 0);
  const focusRate =
    focusExpected > 0
      ? Number(((focusPaid / focusExpected) * 100).toFixed(1))
      : 0;

  // 13. Monthly Class Overview Matrix
  const distinctClasses = Array.from(
    new Set(allDemands.map((d) => d.className).filter(Boolean))
  ).sort();
  const monthlyClassOverview = distinctClasses.map((cls) => {
    const classDemands = allDemands.filter((d) => d.className === cls);
    const rates = sessionPeriods.map((sp) => {
      const spDemands = classDemands.filter((d) => {
        const pStr = (d.period || "").toLowerCase();
        const mName = sp.monthName.toLowerCase();
        return pStr.includes(mName) || pStr.includes(mName.slice(0, 3));
      });
      const spExp = spDemands.reduce((sum, d) => sum + getDemandNetPaise(d), 0);
      const spPaid = spDemands.reduce((sum, d) => sum + getDemandPaidPaise(d), 0);
      return spExp > 0 ? Math.round((spPaid / spExp) * 100) : null;
    });
    return {
      className: cls,
      rates,
    };
  });

  return {
    totalExpectedPaise,
    totalCollectedPaise,
    totalOutstandingPaise,
    totalRefundedPaise,
    netCollectedPaise,
    collectionRate,

    totalExpectedRupees: paiseToRupees(totalExpectedPaise),
    totalCollectedRupees: paiseToRupees(totalCollectedPaise),
    totalOutstandingRupees: paiseToRupees(totalOutstandingPaise),
    totalRefundedRupees: paiseToRupees(totalRefundedPaise),
    netCollectedRupees: paiseToRupees(netCollectedPaise),

    todayCollectionPaise,
    todayCollectionRupees: paiseToRupees(todayCollectionPaise),
    todayPaymentsCount,

    totalDemandsCount: activeDemands.length,
    paidDemandsCount,
    partialDemandsCount,
    overdueDemandsCount,
    totalTransactionsCount: validSuccessfulPayments.length,
    defaultersCount: defaulterList.length,

    collectionTrend,
    paymentMethodSummary,

    paymentFollowUp: {
      criticalCount,
      overdueCount,
      dueSoonCount,
      onTrackCount,
      criticalAmountPaise,
      overdueAmountPaise,
      dueSoonAmountPaise,
    },

    topDefaulters: defaulterList.slice(0, 10),
    allDefaulters: defaulterList,
    recentCollections,

    selectedMonthSummary: {
      month: focusPeriod.monthName,
      expectedRupees: paiseToRupees(focusExpected),
      collectedRupees: paiseToRupees(focusPaid),
      dueRupees: paiseToRupees(focusDue),
      collectionRate: focusRate,
    },
    monthlyClassOverview,
  };
}

// ==========================================
// 3. DEFAULTERS ENGINE
// ==========================================

export async function getFeeDefaulters(
  schoolId: string,
  filter?: {
    academicYearId?: string;
    className?: string;
    sectionName?: string;
    status?: "CRITICAL" | "OVERDUE" | "DUE_SOON" | "all";
    minOverdueDays?: number;
    sortBy?: "highestAmount" | "oldestDue" | "studentName";
    limitCount?: number;
  }
): Promise<{
  count: number;
  totalOutstandingPaise: number;
  defaulters: DefaulterRecord[];
}> {
  const summary = await getFeeDashboardSummary(schoolId, {
    academicYearId: filter?.academicYearId,
    className: filter?.className,
    sectionName: filter?.sectionName,
  });

  let list = summary.allDefaulters || summary.topDefaulters;

  // Status tab filter
  if (filter?.status && filter.status !== "all") {
    list = list.filter((d) => d.status === filter.status);
  }

  // Min overdue days filter
  if (filter?.minOverdueDays !== undefined && filter.minOverdueDays > 0) {
    list = list.filter((d) => d.daysOverdue >= filter.minOverdueDays!);
  }

  // Sorting
  if (filter?.sortBy === "oldestDue") {
    list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  } else if (filter?.sortBy === "studentName") {
    list.sort((a, b) => a.studentName.localeCompare(b.studentName));
  } else {
    // Default: highest amount
    list.sort((a, b) => b.totalOutstandingPaise - a.totalOutstandingPaise);
  }

  const totalOutstandingPaise = list.reduce(
    (sum, d) => sum + d.totalOutstandingPaise,
    0
  );

  if (filter?.limitCount && filter.limitCount > 0) {
    list = list.slice(0, filter.limitCount);
  }

  return {
    count: list.length,
    totalOutstandingPaise,
    defaulters: list,
  };
}

// ==========================================
// 4. CLASS & SECTION COLLECTION REPORT
// ==========================================

export async function getClassCollectionSummary(
  schoolId: string,
  filter?: { academicYearId?: string; month?: string }
): Promise<ClassCollectionRow[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  const yearId = filter?.academicYearId || "all";
  let demands: FeeDemand[] = [];

  const q = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
  );
  const snap = await getDocs(q);
  demands = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as FeeDemand
  );

  if (demands.length === 0) {
    const allDemandsSnap = await getDocs(
      query(collection(db, "feeDemands"), where("schoolId", "==", schoolId))
    );
    if (!allDemandsSnap.empty) {
      demands = allDemandsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FeeDemand
      );
    }
  }

  // Synthesize demands from studentFeeAssignments if explicit feeDemands don't exist
  if (demands.length === 0) {
    try {
      const assignSnap = await getDocs(
        query(collection(db, "studentFeeAssignments"), where("schoolId", "==", schoolId))
      );
      if (!assignSnap.empty) {
        assignSnap.docs.forEach((docSnap) => {
          const assign = docSnap.data() as any;
          if (assign.monthLedger && Array.isArray(assign.monthLedger)) {
            assign.monthLedger.forEach((mItem: any, idx: number) => {
              if (mItem.amountPaise > 0) {
                const admStr = String(assign.admissionNumber || docSnap.id);
                demands.push({
                  id: `${docSnap.id}_${idx}`,
                  demandNumber: `DEM-${admStr.slice(-4)}-${idx}`,
                  schoolId,
                  studentId: assign.studentId,
                  studentName: assign.studentName,
                  admissionNumber: assign.admissionNumber,
                  className: assign.className,
                  sectionName: assign.sectionName || "A",
                  academicYearId: assign.academicYearId || yearId,
                  academicYearName: assign.academicYearName,
                  period: mItem.month,
                  dueDate: mItem.dueDate,
                  grossAmountPaise: mItem.amountPaise,
                  netAmountPaise: mItem.amountPaise - (mItem.discountPaise || 0),
                  paidAmountPaise: mItem.paidAmountPaise || 0,
                  balanceAmountPaise: mItem.pendingAmountPaise ?? Math.max(0, mItem.amountPaise - (mItem.paidAmountPaise || 0)),
                  status: mItem.status === "PAID" ? "PAID" : (mItem.paidAmountPaise || 0) > 0 ? "PARTIAL" : "PENDING",
                } as any);
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn("Virtual demands synthesis in getClassCollectionSummary notice:", e);
    }
  }

  demands = demands.filter(d => matchAcademicYear(d.academicYearId, yearId));
  const studentTotals = new Map<string, { paid: number; balance: number }>();
  const classMap = new Map<
    string,
    {
      className: string;
      studentIds: Set<string>;
      paidStudentIds: Set<string>;
      partialStudentIds: Set<string>;
      dueStudentIds: Set<string>;
      expectedPaise: number;
      collectedPaise: number;
      outstandingPaise: number;
    }
  >();

  for (const d of demands) {
    if (d.status === "CANCELLED") continue;
    if (
      filter?.month &&
      filter.month !== "all" &&
      !d.period?.toLowerCase().includes(filter.month.toLowerCase())
    ) {
      continue;
    }

    const cName = d.className || "Unassigned";
    if (!classMap.has(cName)) {
      classMap.set(cName, {
        className: cName,
        studentIds: new Set(),
        paidStudentIds: new Set(),
        partialStudentIds: new Set(),
        dueStudentIds: new Set(),
        expectedPaise: 0,
        collectedPaise: 0,
        outstandingPaise: 0,
      });
    }

    const cEntry = classMap.get(cName)!;
    cEntry.studentIds.add(d.studentId);
    cEntry.expectedPaise += d.netAmountPaise || 0;
    cEntry.collectedPaise += d.paidAmountPaise || 0;
    cEntry.outstandingPaise += d.balanceAmountPaise || 0;

    const key = `${cName}:${d.studentId}`;
    const totals = studentTotals.get(key) || { paid: 0, balance: 0 };
    totals.paid += d.paidAmountPaise || 0; totals.balance += d.balanceAmountPaise || 0;
    studentTotals.set(key, totals);
  }

  const rows: ClassCollectionRow[] = [];
  for (const entry of classMap.values()) {
    for (const id of entry.studentIds) {
      const totals = studentTotals.get(`${entry.className}:${id}`)!;
      if (totals.balance === 0) entry.paidStudentIds.add(id);
      else if (totals.paid > 0) entry.partialStudentIds.add(id);
      else entry.dueStudentIds.add(id);
    }
    const rate =
      entry.expectedPaise > 0
        ? Number(
            ((entry.collectedPaise / entry.expectedPaise) * 100).toFixed(1)
          )
        : 0;
    rows.push({
      className: entry.className,
      academicYearId: yearId,
      studentCount: entry.studentIds.size,
      expectedPaise: entry.expectedPaise,
      collectedPaise: entry.collectedPaise,
      outstandingPaise: entry.outstandingPaise,
      expectedRupees: paiseToRupees(entry.expectedPaise),
      collectedRupees: paiseToRupees(entry.collectedPaise),
      outstandingRupees: paiseToRupees(entry.outstandingPaise),
      collectionRate: rate,
      paidStudentsCount: entry.paidStudentIds.size,
      partialStudentsCount: entry.partialStudentIds.size,
      dueStudentsCount: entry.dueStudentIds.size,
    });
  }

  // Sort by class name naturally
  rows.sort((a, b) =>
    a.className.localeCompare(b.className, undefined, { numeric: true })
  );
  return rows;
}

// ==========================================
// 5. FEE HEAD COLLECTION REPORT
// ==========================================

export async function getFeeHeadCollectionSummary(
  schoolId: string,
  filter?: { academicYearId?: string; className?: string; month?: string }
): Promise<FeeHeadCollectionRow[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  const yearId = filter?.academicYearId || "all";
  let q = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
  );
  const snap = await getDocs(q);
  let demands = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeeDemand);

  demands = demands.filter(d => matchAcademicYear(d.academicYearId, yearId));
  if (filter?.className && filter.className !== "all") {
    demands = demands.filter(
      (d) => d.className?.toLowerCase() === filter.className!.toLowerCase()
    );
  }
  if (filter?.month && filter.month !== "all") {
    demands = demands.filter((d) =>
      d.period?.toLowerCase().includes(filter.month!.toLowerCase())
    );
  }

  const headMap = new Map<
    string,
    {
      feeHeadId: string;
      feeHeadName: string;
      expectedPaise: number;
      collectedPaise: number;
      outstandingPaise: number;
    }
  >();

  for (const d of demands) {
    if (d.status === "CANCELLED") continue;
    const hName = d.feeHeadName || "General Fee";
    const hId = d.feeHeadId || hName.toLowerCase().replace(/\s+/g, "_");

    if (!headMap.has(hId)) {
      headMap.set(hId, {
        feeHeadId: hId,
        feeHeadName: hName,
        expectedPaise: 0,
        collectedPaise: 0,
        outstandingPaise: 0,
      });
    }

    const hEntry = headMap.get(hId)!;
    hEntry.expectedPaise += d.netAmountPaise || 0;
    hEntry.collectedPaise += d.paidAmountPaise || 0;
    hEntry.outstandingPaise += d.balanceAmountPaise || 0;
  }

  const rows: FeeHeadCollectionRow[] = [];
  for (const entry of headMap.values()) {
    const rate =
      entry.expectedPaise > 0
        ? Number(
            ((entry.collectedPaise / entry.expectedPaise) * 100).toFixed(1)
          )
        : 0;
    rows.push({
      feeHeadId: entry.feeHeadId,
      feeHeadName: entry.feeHeadName,
      expectedPaise: entry.expectedPaise,
      collectedPaise: entry.collectedPaise,
      outstandingPaise: entry.outstandingPaise,
      expectedRupees: paiseToRupees(entry.expectedPaise),
      collectedRupees: paiseToRupees(entry.collectedPaise),
      outstandingRupees: paiseToRupees(entry.outstandingPaise),
      collectionRate: rate,
    });
  }

  rows.sort((a, b) => b.expectedPaise - a.expectedPaise);
  return rows;
}

// ==========================================
// 6. PAYMENT METHOD & RECONCILIATION REPORT
// ==========================================

export async function getPaymentMethodReport(
  schoolId: string,
  filter?: { academicYearId?: string; startDate?: string; endDate?: string }
): Promise<
  Array<{
    method: string;
    transactionCount: number;
    collectedPaise: number;
    refundedPaise: number;
    netPaise: number;
    collectedRupees: number;
    refundedRupees: number;
    netRupees: number;
  }>
> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  const paySnap = await getDocs(
    query(
      collection(db, "financialPayments"),
      where("schoolId", "==", schoolId)
    )
  );
  let payments = paySnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as FinancialPayment
  );

  // Merge feePayments for legacy/direct collections
  try {
    const feePaySnap = await getDocs(
      query(collection(db, "feePayments"), where("schoolId", "==", schoolId))
    );
    const seenPayIds = new Set(payments.map((p) => p.id));
    const seenReceipts = new Set(payments.map((p) => p.receiptNumber).filter(Boolean));

    for (const d of feePaySnap.docs) {
      if (seenPayIds.has(d.id)) continue;
      const data = d.data();
      const rec = data.receiptNumber || d.id;
      if (rec && seenReceipts.has(rec)) continue;

      seenPayIds.add(d.id);
      if (rec) seenReceipts.add(rec);

      payments.push({
        id: d.id,
        receiptNumber: rec,
        schoolId,
        studentId: data.studentId || "",
        studentName: data.studentName || "",
        admissionNumber: data.admissionNumber || "",
        className: data.className || "",
        sectionName: data.sectionName || "",
        academicYearId: data.academicYearId || "",
        amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
        paymentDate: data.paymentDate || data.createdAt || new Date().toISOString(),
        paymentMethod: (data.paymentMethod || "CASH").toUpperCase() as PaymentMethod,
        referenceNumber: data.transactionRef || "",
        collectedBy: data.collectedBy || "",
        collectedByName: data.collectedByName || "",
        status: (data.status || "SUCCESS") as FinancialPayment["status"],
        remarks: data.remarks || "",
        allocatedTotalPaise: data.amountPaidPaise || 0,
        unallocatedPaise: 0,
        allocationCount: 1,
        periodMonths: Array.isArray(data.periodMonths) ? data.periodMonths : [],
        remainingDuePaise: data.remainingDuePaise,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("feePayments in payment method report notice:", e);
  }

  if (filter?.academicYearId && filter.academicYearId !== "all") {
    payments = payments.filter(
      (p) => matchAcademicYear(p.academicYearId, filter.academicYearId)
    );
  }
  if (filter?.startDate) {
    const sTime = new Date(filter.startDate).getTime();
    payments = payments.filter(
      (p) => new Date(p.paymentDate || p.createdAt).getTime() >= sTime
    );
  }
  if (filter?.endDate) {
    const eTime = new Date(`${filter.endDate.slice(0, 10)}T23:59:59.999Z`).getTime();
    payments = payments.filter(
      (p) => new Date(p.paymentDate || p.createdAt).getTime() <= eTime
    );
  }

  const methodMap: Record<
    string,
    { count: number; collected: number; refunded: number }
  > = {
    Cash: { count: 0, collected: 0, refunded: 0 },
    UPI: { count: 0, collected: 0, refunded: 0 },
    "Bank Transfer": { count: 0, collected: 0, refunded: 0 },
    Cheque: { count: 0, collected: 0, refunded: 0 },
    Card: { count: 0, collected: 0, refunded: 0 },
    Other: { count: 0, collected: 0, refunded: 0 },
  };

  for (const p of payments) {
    if (!postedPayment(p.status)) continue;

    const raw = (p.paymentMethod || "").toUpperCase();
    let mKey = "Other";
    if (raw === "CASH") mKey = "Cash";
    else if (raw === "UPI") mKey = "UPI";
    else if (raw.includes("BANK")) mKey = "Bank Transfer";
    else if (raw === "CHEQUE") mKey = "Cheque";
    else if (raw === "CARD") mKey = "Card";

    methodMap[mKey].count++;
    methodMap[mKey].collected += p.amountPaise;
    methodMap[mKey].refunded += p.status === "REVERSED" ? p.amountPaise : p.refundedAmountPaise || 0;
  }

  return Object.entries(methodMap).map(([method, data]) => {
    const netPaise = Math.max(0, data.collected - data.refunded);
    return {
      method,
      transactionCount: data.count,
      collectedPaise: data.collected,
      refundedPaise: data.refunded,
      netPaise,
      collectedRupees: paiseToRupees(data.collected),
      refundedRupees: paiseToRupees(data.refunded),
      netRupees: paiseToRupees(netPaise),
    };
  });
}
