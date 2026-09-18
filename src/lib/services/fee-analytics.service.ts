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

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
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
  const selectedYear = filter?.academicYearId && filter.academicYearId !== "all" ? filter.academicYearId : "ay_2026_27";
  const selectedClass = filter?.className && filter.className !== "all" ? filter.className.trim() : null;
  const selectedSection = filter?.sectionName && filter.sectionName !== "all" ? filter.sectionName.trim() : null;
  const selectedMonth = filter?.month && filter.month !== "all" ? filter.month.trim() : null;

  // 1. Fetch Demands for school and academic year
  let demandsQuery = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId)
  );
  if (selectedYear) {
    demandsQuery = query(demandsQuery, where("academicYearId", "==", selectedYear));
  }

  const demandsSnap = await getDocs(demandsQuery);
  let allDemands = demandsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

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

  // 2. Fetch Payments for school
  let paymentsQuery = query(
    collection(db, "financialPayments"),
    where("schoolId", "==", schoolId)
  );
  if (selectedYear) {
    paymentsQuery = query(paymentsQuery, where("academicYearId", "==", selectedYear));
  }
  const paymentsSnap = await getDocs(paymentsQuery);
  let allPayments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialPayment));

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

  // 3. Fetch Allocations (for exact fee-head and period matching)
  const allocSnap = await getDocs(
    query(collection(db, "paymentAllocations"), where("schoolId", "==", schoolId))
  );
  const allAllocations = allocSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentAllocation));

  // 4. Fetch Refunds
  const refundSnap = await getDocs(
    query(collection(db, "financialRefunds"), where("schoolId", "==", schoolId))
  );
  const allRefunds = refundSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialRefund));

  // 5. Active Target Demands for Selected Month filter
  const activeDemands = selectedMonth
    ? allDemands.filter((d) => d.period?.toLowerCase().includes(selectedMonth.toLowerCase()))
    : allDemands;

  // 6. Aggregate Total Expected, Collected, Outstanding
  let totalExpectedPaise = 0;
  let totalOutstandingPaise = 0;
  let paidDemandsCount = 0;
  let partialDemandsCount = 0;
  let overdueDemandsCount = 0;

  for (const d of activeDemands) {
    totalExpectedPaise += d.netAmountPaise || 0;
    totalOutstandingPaise += d.balanceAmountPaise || 0;
    if (d.status === "PAID") paidDemandsCount++;
    else if (d.status === "PARTIAL") partialDemandsCount++;
    else if (d.status === "OVERDUE") overdueDemandsCount++;
  }

  // Calculate Total Collected accurately:
  // If a specific month is selected, sum payments allocated to demands of that month
  let totalCollectedPaise = 0;
  let totalRefundedPaise = 0;
  const validSuccessfulPayments = allPayments.filter(
    (p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED"
  );

  if (selectedMonth) {
    // Filter by demands belonging to this month
    const activeDemandIdSet = new Set(activeDemands.map((d) => d.id));
    const matchingAllocations = allAllocations.filter((a) => activeDemandIdSet.has(a.demandId));
    totalCollectedPaise = matchingAllocations.reduce((sum, a) => sum + (a.allocatedAmountPaise || 0), 0);
  } else {
    // Overall scope: sum valid successful payments
    totalCollectedPaise = validSuccessfulPayments.reduce((sum, p) => sum + (p.amountPaise || 0), 0);
  }

  // Refunds calculation
  totalRefundedPaise = allRefunds.reduce((sum, r) => sum + (r.amountPaise || 0), 0);
  const netCollectedPaise = Math.max(0, totalCollectedPaise - totalRefundedPaise);

  // Collection Rate = (Collected / Expected) * 100
  const collectionRate =
    totalExpectedPaise > 0
      ? Number(((totalCollectedPaise / totalExpectedPaise) * 100).toFixed(1))
      : 0;

  // 7. Today's Performance
  let todayCollectionPaise = 0;
  let todayPaymentsCount = 0;
  for (const p of validSuccessfulPayments) {
    const payDate = (p.paymentDate || p.createdAt || "").slice(0, 10);
    if (payDate === todayStr) {
      todayCollectionPaise += p.amountPaise;
      todayPaymentsCount++;
    }
  }

  // 8. 12-Month Academic Session Collection Trend (April -> March)
  const sessionName = selectedYear ? selectedYear.replace("ay_", "").replace("_", "-") : "2026-2027";
  const sessionPeriods = getAcademicYearPeriods(sessionName);
  const collectionTrend = sessionPeriods.map((period) => {
    // Filter demands matching this month name
    const monthDemands = allDemands.filter((d) =>
      d.period?.toLowerCase().includes(period.monthName.toLowerCase())
    );
    const mExpected = monthDemands.reduce((sum, d) => sum + d.netAmountPaise, 0);
    const mOutstanding = monthDemands.reduce((sum, d) => sum + d.balanceAmountPaise, 0);
    const mPaidFromDemands = monthDemands.reduce((sum, d) => sum + d.paidAmountPaise, 0);

    const mRate = mExpected > 0 ? Number(((mPaidFromDemands / mExpected) * 100).toFixed(1)) : 0;

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
    if (rawMethod === "UPI") {
      methodMap.UPI.count++;
      methodMap.UPI.amountPaise += p.amountPaise;
    } else if (rawMethod === "CASH") {
      methodMap.Cash.count++;
      methodMap.Cash.amountPaise += p.amountPaise;
    } else if (rawMethod === "BANK_TRANSFER" || rawMethod === "BANK TRANSFER") {
      methodMap["Bank Transfer"].count++;
      methodMap["Bank Transfer"].amountPaise += p.amountPaise;
    } else if (rawMethod === "CHEQUE") {
      methodMap.Cheque.count++;
      methodMap.Cheque.amountPaise += p.amountPaise;
    } else if (rawMethod === "CARD") {
      methodMap.Card.count++;
      methodMap.Card.amountPaise += p.amountPaise;
    } else {
      methodMap.Other.count++;
      methodMap.Other.amountPaise += p.amountPaise;
    }
  }

  const paymentMethodSummary = Object.entries(methodMap).map(([method, data]) => {
    const pct = totalCollectedPaise > 0 ? Number(((data.amountPaise / totalCollectedPaise) * 100).toFixed(1)) : 0;
    return {
      method,
      count: data.count,
      amountPaise: data.amountPaise,
      amountRupees: paiseToRupees(data.amountPaise),
      percentage: pct,
      color: METHOD_COLORS[method] || "#64748B",
    };
  });

  // 10. Defaulters & Payment Follow-Up Aggregation
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
        oldestDueDate: d.dueDate,
        demands: [],
      });
    }

    const sEntry = studentMap.get(d.studentId)!;
    sEntry.totalOutstandingPaise += d.balanceAmountPaise || 0;
    if (d.balanceAmountPaise > 0) {
      sEntry.demands.push(d);
      if (new Date(d.dueDate).getTime() < new Date(sEntry.oldestDueDate).getTime()) {
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

    // Find student's last payment
    const studentPayments = allPayments.filter((p) => p.studentId === entry.studentId && p.status === "SUCCESS");
    studentPayments.sort(
      (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
    );
    const lastPay = studentPayments[0];

    defaulterList.push({
      studentId: entry.studentId,
      studentName: entry.studentName,
      admissionNumber: entry.admissionNumber,
      className: entry.className,
      sectionName: entry.sectionName,
      totalOutstandingPaise: entry.totalOutstandingPaise,
      totalOutstandingRupees: paiseToRupees(entry.totalOutstandingPaise),
      oldestDueDate: entry.oldestDueDate,
      daysOverdue: Math.max(0, diffDays),
      lastPaymentDate: lastPay?.paymentDate,
      lastPaymentAmountPaise: lastPay?.amountPaise,
      lastPaymentAmountRupees: lastPay ? paiseToRupees(lastPay.amountPaise) : undefined,
      status,
      dueDemandsCount: entry.demands.length,
      unpaidDemands: entry.demands.map((d) => ({
        demandId: d.id,
        feeHeadName: d.feeHeadName,
        period: d.period,
        dueDate: d.dueDate,
        balanceAmountPaise: d.balanceAmountPaise,
      })),
    });
  }

  // Sort defaulters: highest outstanding first
  defaulterList.sort((a, b) => b.totalOutstandingPaise - a.totalOutstandingPaise);

  // 11. Recent Collections (latest successful)
  const recentCollections = [...validSuccessfulPayments]
    .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())
    .slice(0, 10);

  // 12. Selected Month Focus Summary
  const focusPeriod = sessionPeriods.find((p) =>
    selectedMonth ? p.monthName.toLowerCase() === selectedMonth.toLowerCase() : p.monthName === "September"
  ) || sessionPeriods[5];

  const focusDemands = allDemands.filter((d) =>
    d.period?.toLowerCase().includes(focusPeriod.monthName.toLowerCase())
  );
  const focusExpected = focusDemands.reduce((sum, d) => sum + d.netAmountPaise, 0);
  const focusDue = focusDemands.reduce((sum, d) => sum + d.balanceAmountPaise, 0);
  const focusPaid = focusDemands.reduce((sum, d) => sum + d.paidAmountPaise, 0);
  const focusRate = focusExpected > 0 ? Number(((focusPaid / focusExpected) * 100).toFixed(1)) : 0;

  // 13. Monthly Class Overview Matrix
  const distinctClasses = Array.from(new Set(allDemands.map((d) => d.className).filter(Boolean))).sort();
  const monthlyClassOverview = distinctClasses.map((cls) => {
    const classDemands = allDemands.filter((d) => d.className === cls);
    const rates = sessionPeriods.map((sp) => {
      const spDemands = classDemands.filter((d) =>
        d.period?.toLowerCase().includes(sp.monthName.toLowerCase())
      );
      const spExp = spDemands.reduce((sum, d) => sum + d.netAmountPaise, 0);
      const spPaid = spDemands.reduce((sum, d) => sum + d.paidAmountPaise, 0);
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
): Promise<{ count: number; totalOutstandingPaise: number; defaulters: DefaulterRecord[] }> {
  const summary = await getFeeDashboardSummary(schoolId, {
    academicYearId: filter?.academicYearId,
    className: filter?.className,
    sectionName: filter?.sectionName,
  });

  let list = summary.topDefaulters;

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

  const totalOutstandingPaise = list.reduce((sum, d) => sum + d.totalOutstandingPaise, 0);

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

  const yearId = filter?.academicYearId || "ay_2026_27";
  const q = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
    where("academicYearId", "==", yearId)
  );
  const snap = await getDocs(q);
  const demands = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

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
    if (filter?.month && filter.month !== "all" && !d.period?.toLowerCase().includes(filter.month.toLowerCase())) {
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

    if (d.balanceAmountPaise === 0) cEntry.paidStudentIds.add(d.studentId);
    else if (d.paidAmountPaise > 0) cEntry.partialStudentIds.add(d.studentId);
    else cEntry.dueStudentIds.add(d.studentId);
  }

  const rows: ClassCollectionRow[] = [];
  for (const entry of classMap.values()) {
    const rate = entry.expectedPaise > 0 ? Number(((entry.collectedPaise / entry.expectedPaise) * 100).toFixed(1)) : 0;
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
  rows.sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
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

  const yearId = filter?.academicYearId || "ay_2026_27";
  let q = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
    where("academicYearId", "==", yearId)
  );
  const snap = await getDocs(q);
  let demands = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

  if (filter?.className && filter.className !== "all") {
    demands = demands.filter((d) => d.className?.toLowerCase() === filter.className!.toLowerCase());
  }
  if (filter?.month && filter.month !== "all") {
    demands = demands.filter((d) => d.period?.toLowerCase().includes(filter.month!.toLowerCase()));
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
    const rate = entry.expectedPaise > 0 ? Number(((entry.collectedPaise / entry.expectedPaise) * 100).toFixed(1)) : 0;
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
    query(collection(db, "financialPayments"), where("schoolId", "==", schoolId))
  );
  let payments = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialPayment));

  if (filter?.academicYearId && filter.academicYearId !== "all") {
    payments = payments.filter((p) => p.academicYearId === filter.academicYearId);
  }
  if (filter?.startDate) {
    const sTime = new Date(filter.startDate).getTime();
    payments = payments.filter((p) => new Date(p.paymentDate || p.createdAt).getTime() >= sTime);
  }
  if (filter?.endDate) {
    const eTime = new Date(filter.endDate).getTime();
    payments = payments.filter((p) => new Date(p.paymentDate || p.createdAt).getTime() <= eTime);
  }

  const methodMap: Record<string, { count: number; collected: number; refunded: number }> = {
    Cash: { count: 0, collected: 0, refunded: 0 },
    UPI: { count: 0, collected: 0, refunded: 0 },
    "Bank Transfer": { count: 0, collected: 0, refunded: 0 },
    Cheque: { count: 0, collected: 0, refunded: 0 },
    Card: { count: 0, collected: 0, refunded: 0 },
    Other: { count: 0, collected: 0, refunded: 0 },
  };

  for (const p of payments) {
    if (p.status === "FAILED" || p.status === "CANCELLED") continue;

    const raw = (p.paymentMethod || "").toUpperCase();
    let mKey = "Other";
    if (raw === "CASH") mKey = "Cash";
    else if (raw === "UPI") mKey = "UPI";
    else if (raw.includes("BANK")) mKey = "Bank Transfer";
    else if (raw === "CHEQUE") mKey = "Cheque";
    else if (raw === "CARD") mKey = "Card";

    methodMap[mKey].count++;
    methodMap[mKey].collected += p.amountPaise;
    methodMap[mKey].refunded += p.refundedAmountPaise || 0;
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
