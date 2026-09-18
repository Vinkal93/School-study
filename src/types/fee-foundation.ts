/**
 * PHASE 1 — FEE MANAGEMENT FINANCIAL FOUNDATION
 * Core Types & Entity Definitions
 * 
 * Strict Multi-Tenant, Academic Year Aware, Integer-Paise Precision.
 */

import type { FeeFrequency } from "./billing";

export type FeeDemandStatus =
  | "DUE"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "WAIVED"
  | "CANCELLED";

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "CARD"
  | "CHEQUE"
  | "ONLINE"
  | "OTHER";

export type PaymentStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "REVERSED";

export type AdjustmentType =
  | "DISCOUNT"
  | "CONCESSION"
  | "SCHOLARSHIP"
  | "WAIVER"
  | "FINE_REDUCTION";

export type AdjustmentStatus = "APPLIED" | "CANCELLED";

export type FinancialAction =
  | "CREATE"
  | "UPDATE"
  | "CANCEL"
  | "ADJUST"
  | "PAYMENT"
  | "REFUND"
  | "REVERSAL"
  | "ALLOCATION";

/**
 * Academic Year Reference Entity
 */
export interface AcademicYearRef {
  id: string; // e.g. "ay_2026_27"
  schoolId: string; // instituteId
  name: string; // e.g. "2026-27"
  startDate: string; // "2026-04-01"
  endDate: string; // "2027-03-31"
  isCurrent: boolean;
  status: "ACTIVE" | "ARCHIVED";
}

/**
 * Configurable Fee Head (Not Hardcoded)
 * e.g. Tuition Fee, Transport Fee, Computer Fee, Exam Fee
 */
export interface FeeHead {
  id: string; // e.g. "fh_tuition"
  schoolId: string; // instituteId
  name: string; // "Tuition Fee"
  code: string; // "TUITION"
  description?: string;
  isSystem: boolean; // System default heads cannot be deleted, only disabled
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Late Fee Calculation Rule
 */
export interface LateFeeRule {
  enabled: boolean;
  gracePeriodDays: number;
  type: "FIXED" | "PERCENTAGE" | "DAILY";
  amountPaise: number; // For FIXED or DAILY rate in paise
  percentage?: number; // e.g. 5%
  maxLimitPaise?: number; // Cap on maximum penalty
}

/**
 * Fee Structure (Class & Academic Year Level Plan)
 */
export interface FeeStructureDefinition {
  id: string; // "fs_2026_cls10_tuition"
  schoolId: string; // instituteId
  academicYearId: string;
  academicYearName: string;
  feeHeadId: string;
  feeHeadName: string;
  className: string; // "Class 10" or "all"
  sectionName?: string; // "Section A" or "all"
  title: string;
  amountPaise: number; // Integer paise (₹1,500 = 150000)
  frequency: FeeFrequency;
  dueDayOfMonth: number; // 1-31
  applicableMonths: string[]; // ["April", "May", ...]
  gracePeriodDays: number;
  lateFeeRule: LateFeeRule;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Authoritative Fee Demand / Invoice
 * Single unit of financial obligation for a student.
 */
export interface FeeDemand {
  id: string; // Deterministic: demand_${schoolId}_${studentId}_${academicYearId}_${feeHeadId}_${periodKey}
  invoiceNumber: string; // Human-readable e.g. "INV-2026-00421"
  schoolId: string; // instituteId
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  academicYearName: string;
  feeHeadId: string;
  feeHeadName: string;
  feeStructureId: string;
  period: string; // e.g. "April 2026", "Q1 2026", "Annual 2026-27"
  dueDate: string; // ISO date "2026-04-10T00:00:00.000Z"
  
  // Safe Integer Paise Amounts
  grossAmountPaise: number; // Base fee from structure
  discountAmountPaise: number; // Concessions/Discounts applied
  concessionAmountPaise: number; // Specific scholarship/concession
  lateFeePaise: number; // Computed overdue penalty
  finePaise: number; // Manually added penalty
  netAmountPaise: number; // gross - discount - concession + lateFee + fine
  paidAmountPaise: number; // Total payments allocated to this invoice
  balanceAmountPaise: number; // net - paid (Never negative)
  
  status: FeeDemandStatus;
  paymentAllocationIds: string[]; // Pointers to PaymentAllocation records
  adjustmentIds: string[]; // Pointers to FeeAdjustment records
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Payment Transaction Record
 * Represents receipt of funds from a payer.
 */
export interface FinancialPayment {
  id: string; // pay_${timestamp}_${random}
  receiptNumber: string; // Sequential: "REC-20260918-0001"
  schoolId: string; // instituteId
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  
  amountPaise: number; // Total money collected in paise
  paymentDate: string; // ISO date
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // Transaction ID, UTR, Cheque No
  collectedBy: string; // Staff UID
  collectedByName: string; // Staff Name
  status: PaymentStatus;
  remarks?: string;
  
  // Idempotency Protection
  idempotencyKey?: string;
  
  // Refund & Reversal Tracking
  refundedAmountPaise?: number; // Total refunded in paise
  refundIds?: string[];
  reversalId?: string;
  
  // Receipt Snapshot Details
  periodMonths?: string[];
  feeBreakdown?: Array<{
    feeHeadName: string;
    period: string;
    amountPaise: number;
  }>;
  remainingDuePaise?: number; // Snapshot of student's remaining due after this transaction
  
  // Allocation Metadata
  allocatedTotalPaise: number;
  unallocatedPaise: number; // Any unassigned balance (advance)
  allocationCount: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Controlled Financial Refund Record
 */
export interface FinancialRefund {
  id: string; // ref_${timestamp}_${random}
  schoolId: string; // instituteId
  paymentId: string; // Linked original FinancialPayment ID
  receiptNumber: string; // Original payment receipt number
  refundReceiptNumber: string; // e.g. "REF-20260918-0001"
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  
  amountPaise: number; // Refund amount in paise
  reason: string; // Mandatory explanation for audit
  refundMethod: PaymentMethod;
  referenceNumber?: string; // Bank refund UTR / voucher no
  processedBy: string; // Staff UID
  processedByName: string; // Staff Name
  refundDate: string; // ISO date
  
  // De-allocated items tracking
  allocatedRefunds: Array<{
    demandId: string;
    allocationId: string;
    feeHeadName: string;
    period: string;
    refundedAmountPaise: number;
  }>;
  
  createdAt: string;
}

/**
 * Payment Reversal Record (Mistaken Entry / Full Cancellation)
 */
export interface PaymentReversal {
  id: string; // rev_${timestamp}_${random}
  schoolId: string; // instituteId
  paymentId: string; // Linked original FinancialPayment ID
  receiptNumber: string; // Original payment receipt number
  studentId: string;
  reversedAmountPaise: number; // 100% of payment
  reason: string; // Mandatory explanation
  reversedBy: string; // Staff UID
  reversedByName: string; // Staff Name
  reversedAt: string; // ISO date
  
  reversedAllocations: Array<{
    demandId: string;
    allocationId: string;
    feeHeadName: string;
    period: string;
    reversedAmountPaise: number;
  }>;
  
  createdAt: string;
}

/**
 * Payment Allocation
 * Explicit link distributing a payment to one or more Fee Demands (Invoices).
 */
export interface PaymentAllocation {
  id: string; // alloc_${paymentId}_${demandId}
  paymentId: string;
  demandId: string; // Invoice ID
  schoolId: string; // instituteId
  studentId: string;
  academicYearId: string;
  period: string;
  feeHeadName: string;
  
  allocatedAmountPaise: number; // Portion of payment assigned to this demand
  allocatedAt: string;
  createdAt: string;
}

/**
 * Financial Adjustment (Discount, Concession, Scholarship, Waiver)
 * Explicit, audit-tracked adjustment separate from payments.
 */
export interface FeeAdjustment {
  id: string; // adj_${timestamp}_${random}
  schoolId: string; // instituteId
  studentId: string;
  studentName: string;
  academicYearId: string;
  demandId?: string; // Specific invoice adjusted (or null if general)
  period?: string;
  
  type: AdjustmentType;
  amountPaise: number; // In paise
  reason: string;
  approvedBy: string; // Principal/Admin UID
  createdBy: string;
  date: string;
  status: AdjustmentStatus;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Student Overall Financial Summary
 */
export interface StudentFinancialSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  schoolId: string;
  academicYearId: string;
  
  totalGrossPaise: number;
  totalDiscountPaise: number;
  totalConcessionPaise: number;
  totalLateFeePaise: number;
  totalFinePaise: number;
  totalNetPaise: number;
  totalPaidPaise: number;
  totalOutstandingPaise: number; // Net - Paid
  
  // Human-readable Rupees equivalents
  totalGrossRupees: number;
  totalNetRupees: number;
  totalPaidRupees: number;
  totalOutstandingRupees: number;
  
  status: "PAID" | "PARTIAL" | "DUE" | "OVERDUE";
  demandsCount: number;
  paidDemandsCount: number;
  pendingDemandsCount: number;
  overdueDemandsCount: number;
  
  recentDemands: FeeDemand[];
  recentPayments: FinancialPayment[];
  recentAdjustments: FeeAdjustment[];
}

/**
 * Immutable Financial Audit Log
 */
export interface FinancialAuditLog {
  id: string; // audit_${timestamp}_${random}
  schoolId: string; // instituteId
  actorId: string;
  actorRole: string;
  actorName: string;
  action: FinancialAction;
  entity: "FeeHead" | "FeeStructure" | "FeeDemand" | "Payment" | "PaymentAllocation" | "Adjustment" | "Refund" | "Reversal";
  entityId: string;
  studentId?: string;
  academicYearId?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string;
  timestamp: string;
  createdAt: any;
}

/**
 * PHASE 2 — Academic Session Period (Indian School April-March Model)
 */
export interface AcademicSessionPeriod {
  sequence: number; // 1 to 12
  monthName: string; // "April", "May", ... "March"
  monthNumber: number; // 4..12, 1..3
  year: number; // e.g. 2026 or 2027
  periodKey: string; // e.g. "april_2026"
  displayName: string; // e.g. "April 2026"
  startDate: string; // "2026-04-01"
  endDate: string; // "2026-04-30"
}

/**
 * PHASE 2 — Frequency Period Definition
 */
export interface FrequencyPeriod {
  periodKey: string;
  displayName: string;
  sequence: number;
  startDate: string;
  endDate: string;
  dueMonthIndex: number; // 0-11 in JS Date (0 = Jan, 1 = Feb, etc.)
  dueYear: number;
}

/**
 * PHASE 2 — Bulk Demand Generation Options
 */
export interface BulkDemandOptions {
  academicYearId: string;
  academicYearName?: string;
  className?: string; // "all" or specific class
  sectionName?: string; // "all" or specific section
  periodName?: string; // "all" or specific period e.g. "April", "Q1"
  studentIds?: string[];
  includeArrears?: boolean;
  actorId?: string;
  actorName?: string;
}

/**
 * PHASE 2 — Bulk Demand Generation Result Summary
 */
export interface BulkDemandGenerationResult {
  eligibleStudents: number;
  alreadyGenerated: number;
  newlyGenerated: number;
  skipped: number;
  failed: number;
  totalGrossPaise: number;
  totalNetPaise: number;
  demands: FeeDemand[];
  errors: string[];
}

/**
 * PHASE 2 — Class-wise Outstanding Summary
 */
export interface ClassOutstandingSummary {
  className: string;
  academicYearId: string;
  studentCount: number;
  totalGrossPaise: number;
  totalDiscountPaise: number;
  totalNetPaise: number;
  totalPaidPaise: number;
  totalOutstandingPaise: number;
  totalGrossRupees: number;
  totalNetRupees: number;
  totalPaidRupees: number;
  totalOutstandingRupees: number;
  paidStudentsCount: number;
  partialStudentsCount: number;
  dueStudentsCount: number;
  overdueStudentsCount: number;
}

