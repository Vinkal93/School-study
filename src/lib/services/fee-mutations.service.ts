import { collection, doc, getDocs, query, where, runTransaction, type Transaction } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getChartOfAccounts } from "./accounting.service";
import { activeDemand, adjustedDemand, allocatePayment, assertPaise, moneyPaise, normalizePaymentMethod, recalculateDemand, sameAcademicYear } from "@/lib/fees/finance-core";
import type { Account, JournalEntry, JournalReferenceType } from "@/types/accounting";
import type { FeeDemand, FinancialPayment, PaymentAllocation, FeeAdjustment, FinancialRefund, PaymentReversal } from "@/types/fee-foundation";
import type { processFeePaymentWithAllocations, processFeeRefund, processPaymentReversal, applyFeeAdjustment } from "./fee-foundation.service";

const idPart = (value: string) => encodeURIComponent(value);
const uid = () => crypto.randomUUID();
const assetCode = (method: string) => method === "CASH" ? "1010" : ["UPI", "CARD", "ONLINE"].includes(method) ? "1030" : "1020";

function journal(tx: Transaction, accounts: Account[], schoolId: string, event: {
  id: string; type: JournalReferenceType; academicYearId: string; date: string; actorId: string; studentId: string; description: string;
}, amounts: Array<[string, number, number]>) {
  const db = getFirebaseDb();
  const lines = amounts.filter(([, debit, credit]) => debit > 0 || credit > 0).map(([code, debit, credit], index) => {
    assertPaise(debit); assertPaise(credit);
    const account = accounts.find(a => a.code === code && a.isActive);
    if (!account) throw new Error(`Active accounting account ${code} is required.`);
    return { id: `line_${index}`, accountId: account.id, accountCode: code, accountName: account.name, category: account.category, debitPaise: debit, creditPaise: credit, debitRupees: debit / 100, creditRupees: credit / 100, studentId: event.studentId };
  });
  const debit = lines.reduce((sum, line) => sum + line.debitPaise, 0);
  const credit = lines.reduce((sum, line) => sum + line.creditPaise, 0);
  if (debit !== credit || debit <= 0) throw new Error("Financial journal must balance exactly.");
  const id = `je_${idPart(schoolId)}_${event.type}_${idPart(event.id)}`;
  const now = new Date().toISOString();
  const value: JournalEntry = { id, schoolId, voucherNumber: `JV-${event.id}`, voucherType: event.type === "PAYMENT" ? "RECEIPT" : event.type === "REFUND" ? "PAYMENT" : "JOURNAL", date: event.date.slice(0, 10), academicYearId: event.academicYearId, referenceType: event.type, referenceId: event.id, narration: event.description, lines, totalDebitPaise: debit, totalCreditPaise: credit, totalDebitRupees: debit / 100, totalCreditRupees: credit / 100, isBalanced: true, createdBy: event.actorId, createdAt: now, updatedAt: now };
  tx.set(doc(db, "journalEntries", id), value);
  tx.set(doc(db, "financialAuditLogs", `audit_${id}`), { id: `audit_${id}`, schoolId, actorId: event.actorId, action: event.type, entityId: event.id, studentId: event.studentId, academicYearId: event.academicYearId, reason: event.description, timestamp: now, createdAt: now });
}

async function demandRefs(schoolId: string, studentId: string, academicYearId: string) {
  const db = getFirebaseDb();
  const snap = await getDocs(query(collection(db, "feeDemands"), where("schoolId", "==", schoolId), where("studentId", "==", studentId)));
  return snap.docs.filter(d => sameAcademicYear(d.data().academicYearId, academicYearId)).map(d => d.ref);
}

export async function collectPayment(schoolId: string, input: Parameters<typeof processFeePaymentWithAllocations>[1] & { discountRupees?: number; feeType?: string }) {
  if (!schoolId || !input.studentId || !input.academicYearId || ["all", "ay_current", "current"].includes(input.academicYearId)) throw new Error("Select a student and a specific academic session.");
  const amount = moneyPaise(input.amountPaidRupees, true);
  const discount = moneyPaise(input.discountRupees || 0);
  const method = normalizePaymentMethod(input.paymentMethod);
  if (["UPI", "BANK_TRANSFER", "CHEQUE"].includes(method) && !input.referenceNumber?.trim()) throw new Error("Payment reference number is required for this method.");
  const paymentDate = input.paymentDate || new Date().toISOString();
  if (!Number.isFinite(Date.parse(paymentDate))) throw new Error("Invalid payment date.");
  const db = getFirebaseDb();
  const key = input.idempotencyKey?.trim() || uid();
  if (key.length > 150) throw new Error("Invalid payment request key.");
  const id = `pay_${idPart(schoolId)}_${idPart(key)}`;
  const paymentRef = doc(db, "financialPayments", id);
  const refs = await demandRefs(schoolId, input.studentId, input.academicYearId);
  const accounts = await getChartOfAccounts(schoolId);
  const fingerprint = JSON.stringify([input.studentId, input.academicYearId, amount, discount, method, [...(input.targetDemandIds || [])].sort(), input.referenceNumber || "", paymentDate]);
  return runTransaction(db, async tx => {
    const previous = await tx.get(paymentRef);
    if (previous.exists()) {
      if (previous.data().requestFingerprint !== fingerprint) throw new Error("This request key belongs to a different payment. Refresh and try again.");
      return { payment: previous.data() as FinancialPayment, allocations: [] as PaymentAllocation[], updatedDemands: [] as FeeDemand[] };
    }
    // All reads precede writes. Re-reading invoices inside the transaction prevents lost updates.
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const settingsSnap = await tx.get(doc(db, "feeSettings", schoolId));
    const studentSnap = await tx.get(doc(db, "schools", schoolId, "students", input.studentId));
    if (!studentSnap.exists()) throw new Error("Student not found in this school.");
    const student = studentSnap.data();
    const settings = settingsSnap.data();
    if (settings?.paymentMethods?.length && !settings.paymentMethods.some((m: string) => normalizePaymentMethod(m) === method)) throw new Error("This payment method is disabled in Fee Settings.");
    const demands = snapshots.filter(s => s.exists()).map(s => recalculateDemand({ ...s.data(), id: s.id } as FeeDemand));
    const targetIds = input.targetDemandIds;
    if (targetIds && (!targetIds.length || new Set(targetIds).size !== targetIds.length || targetIds.some(id => !demands.some(d => d.id === id && activeDemand(d))))) throw new Error("Selected invoices are invalid for this student/session. Refresh the fee schedule.");
    let candidates = demands.filter(d => activeDemand(d) && d.balanceAmountPaise > 0 && (!targetIds || targetIds.includes(d.id)));
    if (!candidates.length) throw new Error("No outstanding invoices. Generate fees from Fee Structure first.");
    const total = candidates.reduce((s, d) => s + d.balanceAmountPaise, 0);
    if (discount > total || amount > total - discount) throw new Error("Payment plus discount exceeds the selected outstanding balance.");
    const now = new Date().toISOString();
    const actor = input.actorId || "admin";
    const adjusted: FeeDemand[] = [];
    let remainingDiscount = discount;
    for (const d of [...candidates].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))) {
      const part = Math.min(remainingDiscount, d.balanceAmountPaise);
      if (!part) continue;
      remainingDiscount -= part;
      const adjustmentId = `adj_${id}_${d.id}`;
      const updated = { ...adjustedDemand(d, "DISCOUNT", part), adjustmentIds: [...(d.adjustmentIds || []), adjustmentId], updatedAt: now };
      adjusted.push(updated);
      const adjustment: FeeAdjustment = { id: adjustmentId, schoolId, studentId: input.studentId, studentName: student.name || input.studentName, academicYearId: input.academicYearId, demandId: d.id, period: d.period, type: "DISCOUNT", amountPaise: part, reason: input.remarks || "Discount at fee collection", approvedBy: actor, createdBy: actor, date: paymentDate, status: "APPLIED", createdAt: now, updatedAt: now };
      tx.set(doc(db, "feeAdjustments", adjustmentId), adjustment);
      journal(tx, accounts, schoolId, { id: adjustmentId, type: "ADJUSTMENT", academicYearId: input.academicYearId, date: paymentDate, actorId: actor, studentId: input.studentId, description: adjustment.reason }, [["5010", part, 0], ["1040", 0, part]]);
    }
    candidates = candidates.map(d => adjusted.find(a => a.id === d.id) || d);
    const plan = allocatePayment(amount, candidates);
    const allocations: PaymentAllocation[] = plan.map(p => ({ id: `alloc_${id}_${p.demandId}`, paymentId: id, demandId: p.demandId, schoolId, studentId: input.studentId, academicYearId: input.academicYearId, period: p.period, feeHeadName: p.feeHeadName, allocatedAmountPaise: p.allocatedAmountPaise, allocatedAt: paymentDate, createdAt: now }));
    const updatedDemands = candidates.map(d => {
      const allocation = allocations.find(a => a.demandId === d.id);
      return allocation ? { ...recalculateDemand({ ...d, paidAmountPaise: d.paidAmountPaise + allocation.allocatedAmountPaise }), paymentAllocationIds: [...(d.paymentAllocationIds || []), allocation.id], updatedAt: now } : d;
    });
    for (const a of allocations) tx.set(doc(db, "paymentAllocations", a.id), a);
    for (const d of updatedDemands) tx.set(doc(db, "feeDemands", d.id), d);
    const remainingDuePaise = demands.filter(activeDemand).reduce((s, d) => s + (updatedDemands.find(u => u.id === d.id) || d).balanceAmountPaise, 0);
    // Counter shares the existing school settings document and is committed with the payment.
    const sequence = (settings?.receiptSequence || 0) + 1;
    const receiptNumber = `${settings?.receiptPrefix || "REC"}-${paymentDate.slice(0, 10).replace(/-/g, "")}-${String(sequence).padStart(6, "0")}-${id.slice(-6)}`;
    tx.set(doc(db, "feeSettings", schoolId), { schoolId, receiptSequence: sequence }, { merge: true });
    const payment: FinancialPayment = { id, schoolId, receiptNumber, studentId: input.studentId, studentName: student.name || input.studentName, admissionNumber: student.admissionNumber || input.admissionNumber, className: student.className || input.className, sectionName: student.sectionName || input.sectionName, academicYearId: input.academicYearId, amountPaise: amount, paymentDate, paymentMethod: method, referenceNumber: input.referenceNumber || "", collectedBy: actor, collectedByName: input.actorName || actor, status: "SUCCESS", remarks: input.remarks || "", idempotencyKey: key, refundedAmountPaise: 0, refundIds: [], allocatedTotalPaise: amount, unallocatedPaise: 0, allocationCount: allocations.length, periodMonths: [...new Set(candidates.filter(d => allocations.some(a => a.demandId === d.id) || adjusted.some(a => a.id === d.id)).map(d => d.period))], feeBreakdown: plan.map(p => ({ feeHeadName: p.feeHeadName, period: p.period, amountPaise: p.allocatedAmountPaise })), remainingDuePaise, createdAt: now, updatedAt: now };
    tx.set(paymentRef, { ...payment, discountPaise: discount, requestFingerprint: fingerprint });
    tx.set(doc(db, "feePayments", id), { ...payment, amountPaidPaise: amount, netAmountPaise: amount, discountPaise: discount, lateFeePaise: 0, feeType: input.feeType || "tuition", transactionRef: input.referenceNumber || "" });
    journal(tx, accounts, schoolId, { id, type: "PAYMENT", academicYearId: input.academicYearId, date: paymentDate, actorId: actor, studentId: input.studentId, description: `Fee collection ${receiptNumber}` }, [[assetCode(method), amount, 0], ["1040", 0, amount]]);
    return { payment, allocations, updatedDemands };
  });
}

export async function adjustInvoice(schoolId: string, input: Parameters<typeof applyFeeAdjustment>[1]) {
  const amount = moneyPaise(input.amountRupees, true);
  if (!input.reason?.trim() || !input.approvedBy) throw new Error("Adjustment reason and approver are required.");
  const db = getFirebaseDb();
  const accounts = await getChartOfAccounts(schoolId);
  const id = `adj_${uid()}`;
  return runTransaction(db, async tx => {
    const ref = doc(db, "feeDemands", input.demandId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Fee invoice not found.");
    const demand = { ...snap.data(), id: snap.id } as FeeDemand;
    if (demand.schoolId !== schoolId || demand.studentId !== input.studentId || !sameAcademicYear(demand.academicYearId, input.academicYearId)) throw new Error("Invoice does not belong to this student/session.");
    const now = new Date().toISOString();
    const updatedDemand = { ...adjustedDemand(demand, input.type, amount), adjustmentIds: [...(demand.adjustmentIds || []), id], updatedAt: now };
    const adjustment: FeeAdjustment = { id, schoolId, studentId: demand.studentId, studentName: demand.studentName, academicYearId: demand.academicYearId, demandId: demand.id, period: demand.period, type: input.type, amountPaise: amount, reason: input.reason.trim(), approvedBy: input.approvedBy, createdBy: input.actorId || input.approvedBy, date: now, status: "APPLIED", createdAt: now, updatedAt: now };
    tx.set(ref, updatedDemand);
    tx.set(doc(db, "feeAdjustments", id), adjustment);
    journal(tx, accounts, schoolId, { id, type: "ADJUSTMENT", academicYearId: demand.academicYearId, date: now, actorId: adjustment.createdBy, studentId: demand.studentId, description: adjustment.reason }, [["5010", amount, 0], ["1040", 0, amount]]);
    return { adjustment, updatedDemand };
  });
}

export async function returnPayment(schoolId: string, input: Parameters<typeof processFeeRefund>[1] | Parameters<typeof processPaymentReversal>[1], reverse: boolean) {
  if (!schoolId || !input.reason?.trim()) throw new Error("School and reason are required.");
  const db = getFirebaseDb();
  const accounts = await getChartOfAccounts(schoolId);
  const allocationSnap = await getDocs(query(collection(db, "paymentAllocations"), where("schoolId", "==", schoolId), where("paymentId", "==", input.paymentId)));
  const id = `${reverse ? "rev" : "ref"}_${uid()}`;
  return runTransaction(db, async tx => {
    const paymentRef = doc(db, "financialPayments", input.paymentId);
    const snap = await tx.get(paymentRef);
    if (!snap.exists()) throw new Error("Payment not found.");
    const payment = { ...snap.data(), id: snap.id } as FinancialPayment;
    if (payment.schoolId !== schoolId) throw new Error("Payment belongs to a different school.");
    if (!["SUCCESS", "PARTIALLY_REFUNDED"].includes(payment.status)) throw new Error("Only a settled, refundable payment can be refunded or reversed.");
    if (reverse && (payment.refundedAmountPaise || 0) > 0) throw new Error("A partially refunded payment cannot be reversed. Refund its remaining balance instead.");
    const amount = reverse ? payment.amountPaise : moneyPaise((input as Parameters<typeof processFeeRefund>[1]).amountRupees, true);
    if (amount > payment.amountPaise - (payment.refundedAmountPaise || 0)) throw new Error("Refund exceeds the remaining refundable amount.");
    const allocSnaps = await Promise.all(allocationSnap.docs.map(d => tx.get(d.ref)));
    const allocations = allocSnaps.filter(s => s.exists()).map(s => ({ ...s.data(), id: s.id } as PaymentAllocation));
    const demandIds = [...new Set(allocations.map(a => a.demandId))];
    const demandSnaps = await Promise.all(demandIds.map(id => tx.get(doc(db, "feeDemands", id))));
    const legacy = await tx.get(doc(db, "feePayments", payment.id));
    const demands = new Map(demandSnaps.filter(s => s.exists()).map(s => [s.id, { ...s.data(), id: s.id } as FeeDemand]));
    const now = new Date().toISOString();
    const advanceRefund = Math.min(payment.unallocatedPaise || 0, amount);
    let remaining = amount - advanceRefund;
    const parts: FinancialRefund["allocatedRefunds"] = [];
    const updatedDemands: FeeDemand[] = [];
    for (const allocation of [...allocations].sort((a, b) => b.allocatedAt.localeCompare(a.allocatedAt) || b.id.localeCompare(a.id))) {
      if (remaining <= 0) break;
      const available = allocation.allocatedAmountPaise - (allocation.refundedAmountPaise || 0) - (allocation.reversedAmountPaise || 0);
      const part = Math.min(remaining, available);
      if (part <= 0) continue;
      const demand = demands.get(allocation.demandId);
      if (!demand || demand.schoolId !== schoolId || demand.studentId !== payment.studentId || !sameAcademicYear(demand.academicYearId, payment.academicYearId) || demand.paidAmountPaise < part) throw new Error("Allocation cannot be reconciled with its invoice. Review this payment before refunding.");
      const updated = { ...recalculateDemand({ ...demand, paidAmountPaise: demand.paidAmountPaise - part }), updatedAt: now };
      demands.set(updated.id, updated);
      updatedDemands.push(updated);
      tx.set(doc(db, "feeDemands", updated.id), updated);
      tx.update(doc(db, "paymentAllocations", allocation.id), reverse ? { reversedAmountPaise: (allocation.reversedAmountPaise || 0) + part } : { refundedAmountPaise: (allocation.refundedAmountPaise || 0) + part });
      parts.push({ demandId: demand.id, allocationId: allocation.id, feeHeadName: allocation.feeHeadName, period: allocation.period, refundedAmountPaise: part });
      remaining -= part;
    }
    if (remaining !== 0) throw new Error("Payment allocations do not cover this refund. Reconcile the payment first.");
    const actor = input.actorId || "admin";
    const method = normalizePaymentMethod(!reverse && "refundMethod" in input && input.refundMethod ? input.refundMethod : payment.paymentMethod);
    const refunded = (payment.refundedAmountPaise || 0) + (reverse ? 0 : amount);
    const updatedPayment: FinancialPayment = { ...payment, status: reverse ? "REVERSED" : refunded === payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED", refundedAmountPaise: refunded, refundIds: reverse ? payment.refundIds || [] : [...(payment.refundIds || []), id], unallocatedPaise: (payment.unallocatedPaise || 0) - advanceRefund, updatedAt: now, ...(reverse ? { reversalId: id } : {}) };
    tx.set(paymentRef, updatedPayment);
    if (legacy.exists()) tx.update(legacy.ref, { status: updatedPayment.status, refundedAmountPaise: refunded, updatedAt: now });
    const refund: FinancialRefund = { id, schoolId, paymentId: payment.id, receiptNumber: payment.receiptNumber, refundReceiptNumber: `REF-${id}`, studentId: payment.studentId, studentName: payment.studentName, admissionNumber: payment.admissionNumber, className: payment.className, sectionName: payment.sectionName, academicYearId: payment.academicYearId, amountPaise: amount, reason: input.reason.trim(), refundMethod: method, referenceNumber: "referenceNumber" in input ? input.referenceNumber || "" : "", processedBy: actor, processedByName: input.actorName || actor, refundDate: now, allocatedRefunds: parts, advanceRefundPaise: advanceRefund, createdAt: now };
    const reversal: PaymentReversal = { id, schoolId, paymentId: payment.id, receiptNumber: payment.receiptNumber, studentId: payment.studentId, academicYearId: payment.academicYearId, paymentMethod: payment.paymentMethod, reversedAmountPaise: amount, advanceReversedPaise: advanceRefund, reason: input.reason.trim(), reversedBy: actor, reversedByName: input.actorName || actor, reversedAt: now, reversedAllocations: parts.map(p => ({ demandId: p.demandId, allocationId: p.allocationId, feeHeadName: p.feeHeadName, period: p.period, reversedAmountPaise: p.refundedAmountPaise })), createdAt: now };
    tx.set(doc(db, reverse ? "paymentReversals" : "financialRefunds", id), reverse ? reversal : refund);
    journal(tx, accounts, schoolId, { id, type: reverse ? "REVERSAL" : "REFUND", academicYearId: payment.academicYearId, date: now, actorId: actor, studentId: payment.studentId, description: input.reason.trim() }, [["1040", amount - advanceRefund, 0], ["2010", advanceRefund, 0], [assetCode(method), 0, amount]]);
    return { refund, reversal, updatedPayment, updatedDemands };
  });
}
