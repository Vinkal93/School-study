import type { FeeDemand, FinancialPayment, PaymentMethod, AdjustmentType } from "@/types/fee-foundation";
import type { StudentFeeAssignment, MonthLedgerItem } from "@/types";

export function moneyPaise(value: number, positive = false): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Amount must be a finite, non-negative number.");
  const paise = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(paise) || (positive && paise <= 0)) throw new Error("Enter a valid amount of at least ₹0.01.");
  return paise;
}

export function assertPaise(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid financial amount in paise.");
  return value;
}

export function academicYearKey(value?: string): string {
  const text = (value || "").trim().toLowerCase();
  const match = text.match(/^(?:ay[_-])?(20\d{2})[-_](\d{2}|20\d{2})$/);
  if (!match) return text;
  const end = match[2].length === 2 ? Number(match[1].slice(0, 2) + match[2]) : Number(match[2]);
  return end === Number(match[1]) + 1 ? `${match[1]}-${end}` : text;
}

export function sameAcademicYear(value?: string, filter?: string): boolean {
  if (!filter || filter === "all") return true;
  return !!value && academicYearKey(value) === academicYearKey(filter);
}

export function normalizePaymentMethod(value: string): PaymentMethod {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const method = normalized === "ONLINE_PAYMENT" ? "ONLINE" : normalized;
  if (!["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "ONLINE", "OTHER"].includes(method)) {
    throw new Error("Unsupported payment method.");
  }
  return method as PaymentMethod;
}

export function postedPayment(status?: string): boolean {
  return ["SUCCESS", "PAID", "COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "REVERSED"].includes(status || "SUCCESS");
}

export function netPaymentPaise(payment: Pick<FinancialPayment, "status" | "amountPaise" | "refundedAmountPaise">): number {
  if (!postedPayment(payment.status) || payment.status === "REVERSED") return 0;
  return Math.max(0, payment.amountPaise - (payment.refundedAmountPaise || 0));
}

export function activeDemand(demand: FeeDemand): boolean {
  return demand.status !== "CANCELLED";
}

export function recalculateDemand(demand: FeeDemand): FeeDemand {
  const gross = assertPaise(demand.grossAmountPaise);
  const discount = assertPaise(demand.discountAmountPaise || 0);
  const concession = assertPaise(demand.concessionAmountPaise || 0);
  const late = assertPaise(demand.lateFeePaise || 0);
  const fine = assertPaise(demand.finePaise || 0);
  const paid = assertPaise(demand.paidAmountPaise || 0);
  const net = Math.max(0, gross + late + fine - discount - concession);
  if (paid > net) throw new Error("Invoice payments exceed its net amount. Reconcile this invoice before continuing.");
  const balance = net - paid;
  return {
    ...demand, netAmountPaise: net, balanceAmountPaise: balance,
    status: demand.status === "CANCELLED" ? "CANCELLED" : balance === 0
      ? (net === 0 && paid === 0 ? "WAIVED" : "PAID")
      : paid > 0 ? "PARTIAL" : Date.parse(demand.dueDate) < Date.now() ? "OVERDUE" : "DUE",
  };
}

export function adjustedDemand(demand: FeeDemand, type: AdjustmentType, amount: number): FeeDemand {
  assertPaise(amount);
  const current = recalculateDemand(demand);
  if (!activeDemand(current) || amount <= 0 || amount > current.balanceAmountPaise) {
    throw new Error("Adjustment must be positive and cannot exceed the outstanding invoice balance.");
  }
  if (!["DISCOUNT", "CONCESSION", "SCHOLARSHIP", "WAIVER", "FINE_REDUCTION"].includes(type)) {
    throw new Error("Unsupported adjustment type.");
  }
  if (type === "FINE_REDUCTION" && amount > (current.lateFeePaise || 0) + (current.finePaise || 0)) {
    throw new Error("Fine reduction cannot exceed the invoice's penalties.");
  }
  // Keep penalties at their original value for the ledger; the separate relief is a credit.
  if (type === "CONCESSION" || type === "SCHOLARSHIP") current.concessionAmountPaise += amount;
  else current.discountAmountPaise += amount;
  return recalculateDemand(current);
}

export function allocatePayment(amount: number, demands: FeeDemand[]) {
  assertPaise(amount);
  let remaining = amount;
  const seen = new Set<string>();
  return [...demands].filter(activeDemand).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)).flatMap(d => {
    if (seen.has(d.id)) return [];
    seen.add(d.id);
    const current = recalculateDemand(d);
    const allocatedAmountPaise = Math.min(remaining, current.balanceAmountPaise);
    if (allocatedAmountPaise <= 0) return [];
    remaining -= allocatedAmountPaise;
    return [{ demandId: d.id, period: d.period, feeHeadName: d.feeHeadName, allocatedAmountPaise, remainingDemandBalancePaise: current.balanceAmountPaise - allocatedAmountPaise }];
  });
}

/** Read-model only: legacy screens get the same balances as invoices, never guessed payments. */
export function assignmentFromDemands(demands: FeeDemand[]): StudentFeeAssignment | null {
  const active = demands.filter(activeDemand);
  if (!active.length) return null;
  const first = active[0];
  const months = new Map<string, MonthLedgerItem>();
  for (const d of active) {
    const row = months.get(d.period) || { month: d.period, dueDate: d.dueDate, amountPaise: 0, paidAmountPaise: 0, discountPaise: 0, lateFeePaise: 0, pendingAmountPaise: 0, status: "PENDING" as const };
    row.amountPaise += d.grossAmountPaise;
    row.paidAmountPaise += d.paidAmountPaise;
    row.discountPaise += (d.discountAmountPaise || 0) + (d.concessionAmountPaise || 0);
    row.lateFeePaise += (d.lateFeePaise || 0) + (d.finePaise || 0);
    row.pendingAmountPaise += d.balanceAmountPaise;
    if (d.dueDate < row.dueDate) row.dueDate = d.dueDate;
    months.set(d.period, row);
  }
  const monthLedger = [...months.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const row of monthLedger) row.status = row.pendingAmountPaise === 0 ? "PAID" : row.paidAmountPaise > 0 ? "PARTIAL" : Date.parse(row.dueDate) < Date.now() ? "OVERDUE" : "PENDING";
  const sum = (key: "amountPaise" | "paidAmountPaise" | "discountPaise" | "lateFeePaise" | "pendingAmountPaise") => monthLedger.reduce((s, r) => s + r[key], 0);
  return { id: `${first.schoolId}_${first.studentId}_${first.academicYearId}`, schoolId: first.schoolId, studentId: first.studentId, studentName: first.studentName, admissionNumber: first.admissionNumber, className: first.className, sectionName: first.sectionName, academicYearId: first.academicYearId, academicYearName: first.academicYearName, feeStructureIds: [...new Set(active.map(d => d.feeStructureId))], totalAssignedPaise: sum("amountPaise"), totalPaidPaise: sum("paidAmountPaise"), totalDiscountPaise: sum("discountPaise"), totalLateFeePaise: sum("lateFeePaise"), totalPendingPaise: sum("pendingAmountPaise"), monthLedger, status: sum("pendingAmountPaise") === 0 ? "PAID" : sum("paidAmountPaise") > 0 ? "PARTIAL" : "PENDING", updatedAt: new Date().toISOString() };
}
