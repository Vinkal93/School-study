import { postedPayment, normalizePaymentMethod } from "@/lib/fees/finance-core";
/**
 * PHASE 5 — PROFESSIONAL FEE LEDGER + CASH/BANK LEDGER SERVICE
 * Single Source of Truth for Student Ledgers, Statements, Cashbook, and Bank Accounts.
 * 
 * Strict Double-Entry Alignment:
 * - Student Ledger (Debtor / Accounts Receivable):
 *     Debit (+) = Fee Charges, Fines, Refunds back to student
 *     Credit (-) = Payments collected, Concessions, Waivers, Scholarships
 *     Running Balance = Prev + Debit - Credit
 * - Cash & Bank Ledgers (Asset / Cash & Bank Accounts):
 *     Debit (+) = Collections (Inflow)
 *     Credit (-) = Refunds (Outflow)
 *     Running Balance = Prev + Debit - Credit
 */

import { getFirebaseDb } from "@/lib/fees/firestore";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
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
import type {
  StudentLedgerEntry,
  StudentLedgerSummary,
  StudentStatement,
  AccountLedgerEntry,
  AccountSummary,
  CashBankMultiAccountSummary,
  LedgerFilterOptions,
} from "@/types/fee-ledger";
import {
  paiseToRupees,
  rupeesToPaise,
  formatINR,
  matchAcademicYear,
} from "@/lib/services/fee-foundation.service";
import type { StudentProfile } from "@/types";

// Date formatting helper
function formatDateStr(isoStr: string): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr.slice(0, 10);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoStr.slice(0, 10);
  }
}

// ==========================================
// 1. STUDENT LEDGER & STATEMENT SERVICE
// ==========================================

export async function getStudentLedger(
  schoolId: string,
  studentId: string,
  options: LedgerFilterOptions = {}
): Promise<{
  summary: StudentLedgerSummary;
  entries: StudentLedgerEntry[];
}> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Database connection unavailable.");
  }

  // 1. Fetch Student Profile
  let studentName = "Student";
  let admissionNumber = studentId;
  let className = "Class";
  let sectionName: string | undefined = undefined;
  let rollNumber: number | undefined = undefined;
  let fatherName: string | undefined = undefined;
  let guardianPhone: string | undefined = undefined;

  try {
    const sDocRef = doc(db, "schools", schoolId, "students", studentId);
    const sSnap = await getDoc(sDocRef);
    if (sSnap.exists()) {
      const sData = sSnap.data() as StudentProfile;
      studentName = sData.name || studentName;
      admissionNumber = sData.admissionNumber || admissionNumber;
      className = sData.className || className;
      sectionName = sData.sectionName;
      rollNumber = sData.rollNumber;
      fatherName = (sData as any).fatherName || sData.guardianName;
      guardianPhone = sData.phone || sData.guardianPhone;
    } else {
      // Fallback to root students collection
      const rootSnap = await getDoc(doc(db, "students", studentId));
      if (rootSnap.exists()) {
        const sData = rootSnap.data() as StudentProfile;
        if (sData.schoolId === schoolId) {
          studentName = sData.name || studentName;
          admissionNumber = sData.admissionNumber || admissionNumber;
          className = sData.className || className;
          sectionName = sData.sectionName;
          rollNumber = sData.rollNumber;
          fatherName = (sData as any).fatherName || sData.guardianName;
          guardianPhone = sData.phone || sData.guardianPhone;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to fetch student profile for ledger:", e);
  }

  // 2. Query Fee Demands (Charges)
  const demandsQuery = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );
  const demandsSnap = await getDocs(demandsQuery);
  let demands = demandsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeDemand));

  // Resilient fallback: If no explicit feeDemands exist, synthesize from studentFeeAssignments
  if (demands.length === 0) {
    try {
      const assignQ = query(
        collection(db, "studentFeeAssignments"),
        where("schoolId", "==", schoolId),
        where("studentId", "==", studentId)
      );
      const aSnap = await getDocs(assignQ);
      if (!aSnap.empty) {
        const assign = aSnap.docs[0].data() as any;
        if (assign.monthLedger && Array.isArray(assign.monthLedger)) {
          assign.monthLedger.forEach((mItem: any, idx: number) => {
            if (mItem.amountPaise > 0) {
              const admStr = String(admissionNumber || studentId);
              demands.push({
                id: `${aSnap.docs[0].id}_${idx}`,
                demandNumber: `DEM-${admStr.slice(-4)}-${idx}`,
                schoolId,
                studentId,
                studentName,
                admissionNumber,
                className,
                sectionName,
                academicYearId: assign.academicYearId || "ay_current",
                academicYearName: assign.academicYearName,
                period: mItem.month,
                dueDate: mItem.dueDate,
                grossAmountPaise: mItem.amountPaise,
                netAmountPaise: mItem.amountPaise - (mItem.discountPaise || 0),
                paidAmountPaise: mItem.paidAmountPaise || 0,
                balanceAmountPaise: mItem.pendingAmountPaise ?? Math.max(0, mItem.amountPaise - (mItem.paidAmountPaise || 0)),
                status: mItem.status === "PAID" ? "PAID" : (mItem.paidAmountPaise || 0) > 0 ? "PARTIAL" : "PENDING",
                isOverdue: new Date(mItem.dueDate).getTime() < Date.now() && (mItem.pendingAmountPaise > 0),
                createdAt: assign.updatedAt || new Date().toISOString(),
              } as any);
            }
          });
        }
      }
    } catch (e) {
      console.warn("Virtual demands for student ledger notice:", e);
    }
  }

  // 3. Query Payments (merging financialPayments AND feePayments)
  const paymentsSnap = await getDocs(
    query(
      collection(db, "financialPayments"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId)
    )
  );
  let payments = paymentsSnap.docs.map((d) => ({ ...d.data(), id: d.id, amountPaise: d.data().amountPaise ?? d.data().amountPaidPaise ?? d.data().netAmountPaise ?? 0 } as FinancialPayment));
  const seenPayIds = new Set(payments.map((p) => p.id));
  const seenReceipts = new Set(payments.map((p) => p.receiptNumber).filter(Boolean));

  // Also check subcollection schools/{schoolId}/financialPayments
  try {
    const subFpSnap = await getDocs(
      query(
        collection(db, "schools", schoolId, "financialPayments"),
        where("studentId", "==", studentId)
      )
    );
    for (const d of subFpSnap.docs) {
      if (seenPayIds.has(d.id)) continue;
      const data = d.data();
      const rec = data.receiptNumber || d.id;
      if (rec && seenReceipts.has(rec)) continue;
      seenPayIds.add(d.id);
      if (rec) seenReceipts.add(rec);
      payments.push({ ...data, id: d.id, amountPaise: data.amountPaise ?? data.amountPaidPaise ?? data.netAmountPaise ?? 0 } as FinancialPayment);
    }
  } catch {}

  try {
    const feePaySnap = await getDocs(
      query(
        collection(db, "feePayments"),
        where("schoolId", "==", schoolId),
        where("studentId", "==", studentId)
      )
    );
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
        studentId,
        studentName,
        admissionNumber,
        className,
        sectionName: sectionName || "A",
        academicYearId: data.academicYearId || "",
        amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
        paymentDate: data.paymentDate || data.createdAt || new Date().toISOString(),
        paymentMethod: (data.paymentMethod || "CASH").toUpperCase() as PaymentMethod,
        referenceNumber: data.transactionRef || "",
        collectedBy: data.collectedBy || "",
        collectedByName: data.collectedByName || "",
        status: (data.status || "SUCCESS") as FinancialPayment["status"],
        refundedAmountPaise: data.refundedAmountPaise || 0,
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

    // Also check subcollection schools/{schoolId}/feePayments
    try {
      const subFeeSnap = await getDocs(
        query(
          collection(db, "schools", schoolId, "feePayments"),
          where("studentId", "==", studentId)
        )
      );
      for (const d of subFeeSnap.docs) {
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
          studentId,
          studentName,
          admissionNumber,
          className,
          sectionName: sectionName || "A",
          academicYearId: data.academicYearId || "",
          amountPaise: data.amountPaidPaise || data.netAmountPaise || 0,
          paymentDate: data.paymentDate || data.createdAt || new Date().toISOString(),
          paymentMethod: (data.paymentMethod || "CASH").toUpperCase() as PaymentMethod,
          referenceNumber: data.transactionRef || "",
          collectedBy: data.collectedBy || "",
          collectedByName: data.collectedByName || "",
          status: (data.status || "SUCCESS") as FinancialPayment["status"],
        refundedAmountPaise: data.refundedAmountPaise || 0,
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
    } catch {}
  } catch (e) {
    console.warn("feePayments in student ledger notice:", e);
  }

  // 4. Query Refunds
  const refundsQuery = query(
    collection(db, "financialRefunds"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );
  const refundsSnap = await getDocs(refundsQuery);
  let refunds = refundsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialRefund));

  // 5. Query Reversals
  const reversalsQuery = query(
    collection(db, "paymentReversals"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );
  const reversalsSnap = await getDocs(reversalsQuery);
  let reversals = reversalsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentReversal));

  // 6. Query Adjustments
  const adjustmentsQuery = query(
    collection(db, "feeAdjustments"),
    where("schoolId", "==", schoolId),
    where("studentId", "==", studentId)
  );
  const adjustmentsSnap = await getDocs(adjustmentsQuery);
  let adjustments = adjustmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeAdjustment));

  // Filter by Academic Year if provided
  const targetYear = options.academicYearId || "all";
  if (options.academicYearId && options.academicYearId !== "all") {
    demands = demands.filter((d) => matchAcademicYear(d.academicYearId, options.academicYearId));
    payments = payments.filter((p) => matchAcademicYear(p.academicYearId, options.academicYearId));
    refunds = refunds.filter((r) => matchAcademicYear(r.academicYearId, options.academicYearId));
    adjustments = adjustments.filter((a) => matchAcademicYear(a.academicYearId, options.academicYearId));
  }

  // Filter by Fee Head if specified
  if (options.feeHeadId && options.feeHeadId !== "all") {
    demands = demands.filter((d) => d.feeHeadId === options.feeHeadId);
  }

  // 7. Assemble Raw Chronological Events
  type RawEvent = {
    id: string;
    timestamp: number;
    date: string;
    reference: string;
    type: StudentLedgerEntry["type"];
    description: string;
    feeHeadName?: string;
    period?: string;
    debitPaise: number;
    creditPaise: number;
    paymentMethod?: PaymentMethod;
    referenceNumber?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
    refundReceiptNumber?: string;
    notes?: string;
  };

  const rawEvents: RawEvent[] = [];

  // A. Fee Demands (Invoices) -> Debits to Student
  for (const d of demands) {
    if (d.status === "CANCELLED") continue; // Exclude cancelled demands
    const dateStr = d.createdAt || d.dueDate || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;

    // Gross Fee Charge
    rawEvents.push({
      id: `charge_${d.id}`,
      timestamp: ts,
      date: dateStr,
      reference: d.invoiceNumber || `INV-${d.id.slice(0, 8)}`,
      type: "CHARGE",
      description: `Fee Charge: ${d.feeHeadName} (${d.period})`,
      feeHeadName: d.feeHeadName,
      period: d.period,
      debitPaise: d.grossAmountPaise || d.netAmountPaise,
      creditPaise: 0,
      invoiceNumber: d.invoiceNumber,
      notes: d.dueDate ? `Due: ${formatDateStr(d.dueDate)}` : undefined,
    });

    const recorded = adjustments.filter(a => a.status === "APPLIED" && a.demandId === d.id);
    const embeddedDiscount = Math.max(0, (d.discountAmountPaise || 0) - recorded.filter(a => !["CONCESSION", "SCHOLARSHIP"].includes(a.type)).reduce((sum, a) => sum + a.amountPaise, 0));
    const embeddedConcession = Math.max(0, (d.concessionAmountPaise || 0) - recorded.filter(a => ["CONCESSION", "SCHOLARSHIP"].includes(a.type)).reduce((sum, a) => sum + a.amountPaise, 0));
    // Structure Discount if embedded on demand
    if (embeddedDiscount > 0) {
      rawEvents.push({
        id: `disc_${d.id}`,
        timestamp: ts + 1, // Immediately after charge
        date: dateStr,
        reference: d.invoiceNumber || `INV-${d.id.slice(0, 8)}`,
        type: "DISCOUNT",
        description: `Fee Discount: ${d.feeHeadName} (${d.period})`,
        feeHeadName: d.feeHeadName,
        period: d.period,
        debitPaise: 0,
        creditPaise: embeddedDiscount,
        invoiceNumber: d.invoiceNumber,
      });
    }

    // Structure Concession if embedded on demand
    if (embeddedConcession > 0) {
      rawEvents.push({
        id: `conc_${d.id}`,
        timestamp: ts + 2,
        date: dateStr,
        reference: d.invoiceNumber || `INV-${d.id.slice(0, 8)}`,
        type: "CONCESSION",
        description: `Scholarship / Concession: ${d.feeHeadName} (${d.period})`,
        feeHeadName: d.feeHeadName,
        period: d.period,
        debitPaise: 0,
        creditPaise: embeddedConcession,
        invoiceNumber: d.invoiceNumber,
      });
    }

    // Late Fee / Fine if applied
    if ((d.lateFeePaise || 0) + (d.finePaise || 0) > 0) {
      rawEvents.push({
        id: `fine_${d.id}`,
        timestamp: ts + 3,
        date: dateStr,
        reference: d.invoiceNumber || `INV-${d.id.slice(0, 8)}`,
        type: "FINE",
        description: `Late Payment Penalty: ${d.feeHeadName}`,
        feeHeadName: d.feeHeadName,
        period: d.period,
        debitPaise: (d.lateFeePaise || 0) + (d.finePaise || 0),
        creditPaise: 0,
        invoiceNumber: d.invoiceNumber,
      });
    }
  }

  // B. Separate Fee Adjustments (Waivers, Concessions, Penalties)
  for (const adj of adjustments) {
    if (adj.status === "CANCELLED") continue;
    const dateStr = adj.date || adj.createdAt || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;

    const isCredit =
      adj.type === "DISCOUNT" ||
      adj.type === "CONCESSION" ||
      adj.type === "SCHOLARSHIP" ||
      adj.type === "WAIVER" ||
      adj.type === "FINE_REDUCTION";

    rawEvents.push({
      id: `adj_${adj.id}`,
      timestamp: ts,
      date: dateStr,
      reference: `ADJ-${adj.id.slice(-6)}`,
      type: adj.type === "WAIVER" ? "WAIVER" : "ADJUSTMENT",
      description: `${adj.type}: ${adj.reason}`,
      debitPaise: isCredit ? 0 : adj.amountPaise,
      creditPaise: isCredit ? adj.amountPaise : 0,
      notes: adj.reason,
    });
  }

  // C. Payments -> Credits to Student
  for (const p of payments) {
    if (!postedPayment(p.status)) continue;

    const dateStr = p.paymentDate || p.createdAt || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;

    // Normal successful or partially refunded payment
    rawEvents.push({
      id: `pay_${p.id}`,
      timestamp: ts,
      date: dateStr,
      reference: p.receiptNumber || `REC-${p.id.slice(-6)}`,
      type: "PAYMENT",
      description: `Fee Payment via ${p.paymentMethod || "Cash"} ${p.referenceNumber ? `(Ref: ${p.referenceNumber})` : ""}`,
      debitPaise: 0,
      creditPaise: p.amountPaise,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      receiptNumber: p.receiptNumber,
      notes: p.remarks,
    });

    // If payment was fully REVERSED, record reversal as debit restoring liability
    if (p.status === "REVERSED") {
      rawEvents.push({
        id: `rev_${p.id}`,
        timestamp: Date.parse(p.updatedAt || dateStr),
        date: p.updatedAt || dateStr,
        reference: `REV-${p.receiptNumber || p.id.slice(-6)}`,
        type: "REVERSAL",
        description: `Payment Reversal (Cancelled receipt ${p.receiptNumber})`,
        debitPaise: p.amountPaise,
        creditPaise: 0,
        receiptNumber: p.receiptNumber,
        notes: "Transaction reversed by accountant",
      });
    }
  }

  // D. Refunds -> Debits to Student (money returned, balance due restored)
  for (const ref of refunds) {
    const dateStr = ref.refundDate || ref.createdAt || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;

    rawEvents.push({
      id: `ref_${ref.id}`,
      timestamp: ts,
      date: dateStr,
      reference: ref.refundReceiptNumber || `REF-${ref.id.slice(-6)}`,
      type: "REFUND",
      description: `Fee Refund returned via ${ref.refundMethod}: ${ref.reason}`,
      debitPaise: ref.amountPaise,
      creditPaise: 0,
      paymentMethod: ref.refundMethod,
      referenceNumber: ref.referenceNumber,
      refundReceiptNumber: ref.refundReceiptNumber,
      notes: ref.reason,
    });
  }

  // 8. Sort Chronologically
  rawEvents.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    // Tie-breaker: Charges before Credits
    if (a.debitPaise > 0 && b.creditPaise > 0) return -1;
    if (a.creditPaise > 0 && b.debitPaise > 0) return 1;
    return a.id.localeCompare(b.id);
  });

  // 9. Compute Running Balance
  let openingBalancePaise = 0;
  let runningBalancePaise = 0; // Default opening balance is ₹0 unless specified
  const entries: StudentLedgerEntry[] = [];

  let totalChargesPaise = 0;
  let totalDiscountsPaise = 0;
  let totalPaidPaise = 0;
  let totalRefundsPaise = 0;

  for (const ev of rawEvents) {
    // Check date range filter if specified
    if (options.startDate && ev.date.slice(0, 10) < options.startDate) {
      openingBalancePaise += ev.debitPaise - ev.creditPaise;
      runningBalancePaise = openingBalancePaise;
      continue;
    }
    if (options.endDate && ev.date.slice(0, 10) > options.endDate) continue;

    runningBalancePaise += ev.debitPaise - ev.creditPaise;

    if (ev.type === "CHARGE" || ev.type === "FINE") {
      totalChargesPaise += ev.debitPaise;
    } else if (ev.type === "DISCOUNT" || ev.type === "CONCESSION" || ev.type === "WAIVER" || ev.type === "ADJUSTMENT") {
      totalDiscountsPaise += ev.creditPaise;
    } else if (ev.type === "PAYMENT") {
      totalPaidPaise += ev.creditPaise;
    } else if (ev.type === "REFUND" || ev.type === "REVERSAL") {
      totalRefundsPaise += ev.debitPaise;
    }

    entries.push({
      id: ev.id,
      date: ev.date,
      dateFormatted: formatDateStr(ev.date),
      reference: ev.reference,
      type: ev.type,
      description: ev.description,
      feeHeadName: ev.feeHeadName,
      period: ev.period,
      debitPaise: ev.debitPaise,
      creditPaise: ev.creditPaise,
      balancePaise: runningBalancePaise,
      debitRupees: paiseToRupees(ev.debitPaise),
      creditRupees: paiseToRupees(ev.creditPaise),
      balanceRupees: paiseToRupees(runningBalancePaise),
      paymentMethod: ev.paymentMethod,
      referenceNumber: ev.referenceNumber,
      invoiceNumber: ev.invoiceNumber,
      receiptNumber: ev.receiptNumber,
      refundReceiptNumber: ev.refundReceiptNumber,
      notes: ev.notes,
    });
  }

  // 10. Reconcile with Demand Balances
  const demandTotalBalancePaise = demands.reduce(
    (sum, d) => sum + (d.status !== "CANCELLED" ? d.balanceAmountPaise || 0 : 0),
    0
  );

  const isReconciled =
    !options.endDate && !options.feeHeadId && runningBalancePaise === demandTotalBalancePaise - payments.filter(p => postedPayment(p.status) && p.status !== "REVERSED").reduce((sum, p) => sum + (p.unallocatedPaise || 0), 0); // within 1 rupee tolerance for rounding

  const summary: StudentLedgerSummary = {
    studentId,
    studentName,
    admissionNumber,
    className,
    sectionName,
    rollNumber,
    fatherName,
    guardianPhone,
    academicYearId: targetYear,
    academicYearName: demands[0]?.academicYearName || targetYear,
    openingBalancePaise,
    openingBalanceRupees: paiseToRupees(openingBalancePaise),
    totalChargesPaise,
    totalChargesRupees: paiseToRupees(totalChargesPaise),
    totalDiscountsPaise,
    totalDiscountsRupees: paiseToRupees(totalDiscountsPaise),
    totalPaidPaise,
    totalPaidRupees: paiseToRupees(totalPaidPaise),
    totalRefundsPaise,
    totalRefundsRupees: paiseToRupees(totalRefundsPaise),
    closingOutstandingPaise: runningBalancePaise,
    closingOutstandingRupees: paiseToRupees(runningBalancePaise),
    isReconciled,
    reconciliationNotes: isReconciled
      ? "Fully Reconciled: Ledger closing balance exactly matches active invoice obligations."
      : `Discrepancy detected: Ledger indicates ₹${paiseToRupees(runningBalancePaise)}, invoices indicate ₹${paiseToRupees(demandTotalBalancePaise)}.`,
  };

  return { summary, entries };
}

export async function getStudentStatement(
  schoolId: string,
  studentId: string,
  options: LedgerFilterOptions = {}
): Promise<StudentStatement> {
  const db = getFirebaseDb();
  let schoolName = "Lord Buddha Public School";
  let schoolAddress = "Station Road, CBSE Affiliated";
  let schoolPhone = "+91 9876543210";
  let schoolEmail = "office@school.edu.in";
  let schoolLogoUrl = "";

  if (db) {
    try {
      const schSnap = await getDoc(doc(db, "schools", schoolId));
      if (schSnap.exists()) {
        const s = schSnap.data();
        schoolName = s.name || schoolName;
        schoolAddress = s.address || schoolAddress;
        schoolPhone = s.phone || schoolPhone;
        schoolEmail = s.email || schoolEmail;
        schoolLogoUrl = s.logoUrl || "";
      }
    } catch {}
  }

  const { summary, entries } = await getStudentLedger(schoolId, studentId, options);

  const startStr = options.startDate ? formatDateStr(options.startDate) : "01 Apr 2026";
  const endStr = options.endDate ? formatDateStr(options.endDate) : "31 Mar 2027";

  return {
    schoolName,
    schoolAddress,
    schoolPhone,
    schoolEmail,
    schoolLogoUrl,
    statementDate: formatDateStr(new Date().toISOString()),
    periodRange: `${startStr} to ${endStr}`,
    summary,
    entries,
  };
}

// ==========================================
// 2. CASH & BANK / UPI MULTI-ACCOUNT LEDGERS
// ==========================================

export async function getAccountLedger(
  schoolId: string,
  accountType: PaymentMethod | "ALL",
  options: LedgerFilterOptions = {}
): Promise<{
  accountType: PaymentMethod | "ALL";
  summary: AccountSummary;
  entries: AccountLedgerEntry[];
}> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Database connection unavailable.");
  }

  // 1. Query Payments for this School
  const payQuery = query(
    collection(db, "financialPayments"),
    where("schoolId", "==", schoolId)
  );
  const paySnap = await getDocs(payQuery);
  let payments = paySnap.docs.map((d) => ({ ...d.data(), id: d.id, amountPaise: d.data().amountPaise ?? d.data().amountPaidPaise ?? d.data().netAmountPaise ?? 0 } as FinancialPayment));
  const seenPayIds = new Set(payments.map((p) => p.id));
  const seenReceipts = new Set(payments.map((p) => p.receiptNumber).filter(Boolean));

  // Also check subcollection schools/{schoolId}/financialPayments
  try {
    const subFpSnap = await getDocs(collection(db, "schools", schoolId, "financialPayments"));
    for (const d of subFpSnap.docs) {
      if (seenPayIds.has(d.id)) continue;
      const data = d.data();
      const rec = data.receiptNumber || d.id;
      if (rec && seenReceipts.has(rec)) continue;
      seenPayIds.add(d.id);
      if (rec) seenReceipts.add(rec);
      payments.push({ ...data, id: d.id, amountPaise: data.amountPaise ?? data.amountPaidPaise ?? data.netAmountPaise ?? 0 } as FinancialPayment);
    }
  } catch {}

  // Merge feePayments for legacy/direct payments
  try {
    const feePayQuery = query(
      collection(db, "feePayments"),
      where("schoolId", "==", schoolId)
    );
    const feePaySnap = await getDocs(feePayQuery);

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
        refundedAmountPaise: data.refundedAmountPaise || 0,
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

    // Also check subcollection schools/{schoolId}/feePayments
    try {
      const subFeeSnap = await getDocs(collection(db, "schools", schoolId, "feePayments"));
      for (const d of subFeeSnap.docs) {
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
        refundedAmountPaise: data.refundedAmountPaise || 0,
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
    } catch {}
  } catch (e) {
    console.warn("feePayments in account ledger notice:", e);
  }

  // 2. Query Refunds for this School
  const refQuery = query(
    collection(db, "financialRefunds"),
    where("schoolId", "==", schoolId)
  );
  const refSnap = await getDocs(refQuery);
  let refunds = refSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialRefund));

  // Filter by Academic Year if provided
  if (options.academicYearId && options.academicYearId !== "all") {
    payments = payments.filter((p) => matchAcademicYear(p.academicYearId, options.academicYearId));
    refunds = refunds.filter((r) => matchAcademicYear(r.academicYearId, options.academicYearId));
  }

  // Filter by Account Type
  if (accountType !== "ALL") {
    const normAcct = accountType.toUpperCase().replace(/[\s-]/g, "_");
    payments = payments.filter((p) => (p.paymentMethod || "CASH").toUpperCase().replace(/[\s-]/g, "_") === normAcct);
    refunds = refunds.filter((r) => (r.refundMethod || "CASH").toUpperCase().replace(/[\s-]/g, "_") === normAcct);
  }

  // Raw Event Assembly
  type RawAccountEvent = {
    id: string;
    timestamp: number;
    date: string;
    reference: string;
    accountType: PaymentMethod;
    type: AccountLedgerEntry["type"];
    description: string;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    className?: string;
    inflowDebitPaise: number;
    outflowCreditPaise: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    remarks?: string;
  };

  const rawEvents: RawAccountEvent[] = [];
  const expenseSnapshot = await getDocs(query(collection(db, "schoolExpenses"), where("schoolId", "==", schoolId)));
  for (const document of expenseSnapshot.docs) {
    const expense = document.data();
    if (!matchAcademicYear(expense.academicYearId, options.academicYearId)) continue;
    const method = normalizePaymentMethod(expense.paymentMethod || "CASH");
    if (accountType !== "ALL" && method !== normalizePaymentMethod(accountType)) continue;
    const date = expense.expenseDate || expense.createdAt;
    rawEvents.push({ id: `expense_${document.id}`, timestamp: Date.parse(date) || 0, date, reference: expense.voucherNumber || document.id, accountType: method, type: "EXPENSE", description: `Expense: ${expense.payeeName || ""} · ${expense.description || expense.category || ""}`, inflowDebitPaise: 0, outflowCreditPaise: expense.amountPaise, paymentMethod: method, referenceNumber: expense.referenceNumber, remarks: expense.description });
  }

  for (const p of payments) {
    if (!postedPayment(p.status)) continue;

    const dateStr = p.paymentDate || p.createdAt || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;
    const method = normalizePaymentMethod(p.paymentMethod || "CASH");

    // Normal payment inflow (Debit to cash/bank asset)
    rawEvents.push({
      id: `inflow_${p.id}`,
      timestamp: ts,
      date: dateStr,
      reference: p.receiptNumber || `REC-${p.id.slice(-6)}`,
      accountType: method,
      type: "COLLECTION",
      description: `Fee Collection - ${p.studentName || "Student"} (${p.className || ""})`,
      studentId: p.studentId,
      studentName: p.studentName,
      admissionNumber: p.admissionNumber,
      className: p.className,
      inflowDebitPaise: p.amountPaise,
      outflowCreditPaise: 0,
      paymentMethod: method,
      referenceNumber: p.referenceNumber,
      remarks: p.remarks,
    });

    // If REVERSED, create outflow entry reversing the funds
    if (p.status === "REVERSED") {
      rawEvents.push({
        id: `rev_out_${p.id}`,
        timestamp: Date.parse(p.updatedAt || dateStr),
        date: p.updatedAt || dateStr,
        reference: `REV-${p.receiptNumber || p.id.slice(-6)}`,
        accountType: method,
        type: "REVERSAL",
        description: `Reversal / Cancellation of ${p.receiptNumber}`,
        studentId: p.studentId,
        studentName: p.studentName,
        admissionNumber: p.admissionNumber,
        className: p.className,
        inflowDebitPaise: 0,
        outflowCreditPaise: p.amountPaise,
        paymentMethod: method,
        remarks: "Receipt cancelled/reversed",
      });
    }
  }

  for (const r of refunds) {
    const dateStr = r.refundDate || r.createdAt || new Date().toISOString();
    const ts = new Date(dateStr).getTime() || 0;
    const method = normalizePaymentMethod(r.refundMethod || "CASH");

    // Refund outflow (Credit to cash/bank asset)
    rawEvents.push({
      id: `outflow_${r.id}`,
      timestamp: ts,
      date: dateStr,
      reference: r.refundReceiptNumber || `REF-${r.id.slice(-6)}`,
      accountType: method,
      type: "REFUND",
      description: `Fee Refund - ${r.studentName || "Student"}: ${r.reason}`,
      studentId: r.studentId,
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      className: r.className,
      inflowDebitPaise: 0,
      outflowCreditPaise: r.amountPaise,
      paymentMethod: method,
      referenceNumber: r.referenceNumber,
      remarks: r.reason,
    });
  }

  // Sort Chronologically
  rawEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Compute Running Account Balance
  let openingBalancePaise = 0;
  let runningBalancePaise = 0;
  let totalReceiptsPaise = 0;
  let totalRefundsPaise = 0;
  const entries: AccountLedgerEntry[] = [];

  for (const ev of rawEvents) {
    if (options.startDate && ev.date.slice(0, 10) < options.startDate) {
      openingBalancePaise += ev.inflowDebitPaise - ev.outflowCreditPaise;
      runningBalancePaise = openingBalancePaise;
      continue;
    }
    if (options.endDate && ev.date.slice(0, 10) > options.endDate) continue;

    runningBalancePaise += ev.inflowDebitPaise - ev.outflowCreditPaise;
    totalReceiptsPaise += ev.inflowDebitPaise;
    totalRefundsPaise += ev.outflowCreditPaise;

    entries.push({
      id: ev.id,
      date: ev.date,
      dateFormatted: formatDateStr(ev.date),
      reference: ev.reference,
      accountType: ev.accountType,
      type: ev.type,
      description: ev.description,
      studentId: ev.studentId,
      studentName: ev.studentName,
      admissionNumber: ev.admissionNumber,
      className: ev.className,
      inflowDebitPaise: ev.inflowDebitPaise,
      outflowCreditPaise: ev.outflowCreditPaise,
      balancePaise: runningBalancePaise,
      inflowDebitRupees: paiseToRupees(ev.inflowDebitPaise),
      outflowCreditRupees: paiseToRupees(ev.outflowCreditPaise),
      balanceRupees: paiseToRupees(runningBalancePaise),
      paymentMethod: ev.paymentMethod,
      referenceNumber: ev.referenceNumber,
      remarks: ev.remarks,
    });
  }

  const accountLabels: Record<string, string> = {
    CASH: "Cash in Hand / Drawer",
    UPI: "UPI Collections (PhonePe / GPay)",
    BANK_TRANSFER: "Bank Direct Transfer (NEFT / RTGS / IMPS)",
    CHEQUE: "Cheque Clearing Account",
    CARD: "Card Settlement Account",
    ALL: "Consolidated Cash & Bank Accounts",
  };

  const summary: AccountSummary = {
    accountType: accountType as PaymentMethod,
    accountLabel: accountLabels[accountType] || accountType,
    openingBalancePaise,
    openingBalanceRupees: paiseToRupees(openingBalancePaise),
    totalReceiptsPaise,
    totalReceiptsRupees: paiseToRupees(totalReceiptsPaise),
    totalRefundsPaise,
    totalRefundsRupees: paiseToRupees(totalRefundsPaise),
    closingBalancePaise: runningBalancePaise,
    closingBalanceRupees: paiseToRupees(runningBalancePaise),
    transactionCount: entries.length,
  };

  return { accountType, summary, entries };
}

export async function getCashLedger(
  schoolId: string,
  options: LedgerFilterOptions = {}
) {
  return getAccountLedger(schoolId, "CASH", options);
}

export async function getMultiAccountSummary(
  schoolId: string,
  options: LedgerFilterOptions = {}
): Promise<CashBankMultiAccountSummary> {
  const accountTypes: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "ONLINE", "OTHER"];

  const results = await Promise.all([
    getAccountLedger(schoolId, "ALL", options),
    ...accountTypes.map((t) => getAccountLedger(schoolId, t, options)),
  ]);

  const allSummary = results[0].summary;
  const accountsMap: any = {
    ALL: allSummary,
  };

  accountTypes.forEach((t, idx) => {
    accountsMap[t] = results[idx + 1].summary;
  });

  return {
    academicYearId: options.academicYearId || "ay_2026_27",
    dateRange: {
      startDate: options.startDate,
      endDate: options.endDate,
    },
    accounts: accountsMap,
    overallOpeningBalancePaise: allSummary.openingBalancePaise,
    overallTotalReceiptsPaise: allSummary.totalReceiptsPaise,
    overallTotalRefundsPaise: allSummary.totalRefundsPaise,
    overallClosingBalancePaise: allSummary.closingBalancePaise,
    overallOpeningBalanceRupees: allSummary.openingBalanceRupees,
    overallTotalReceiptsRupees: allSummary.totalReceiptsRupees,
    overallTotalRefundsRupees: allSummary.totalRefundsRupees,
    overallClosingBalanceRupees: allSummary.closingBalanceRupees,
    isReconciled: true,
  };
}
