/**
 * PHASE 5 — PROFESSIONAL FEE LEDGER + CASH/BANK LEDGER
 * Types & Entity Definitions
 * 
 * Strict Double-Entry Alignment:
 * - Student Ledger (Debtor / Accounts Receivable):
 *     Debit (+) = Charges, Late Fines, Refunds paid to student
 *     Credit (-) = Payments collected, Discounts, Scholarships, Waivers
 *     Running Balance = Prev + Debit - Credit
 * - Cash & Bank Ledgers (Asset / Cash & Bank Accounts):
 *     Debit (+) = Collections / Inflow
 *     Credit (-) = Refunds / Outflow
 *     Running Balance = Prev + Debit - Credit
 */

import type { PaymentMethod } from "./fee-foundation";

export type StudentLedgerEntryType =
  | "OPENING_BALANCE"
  | "CHARGE"
  | "PAYMENT"
  | "DISCOUNT"
  | "CONCESSION"
  | "WAIVER"
  | "REFUND"
  | "REVERSAL"
  | "ADJUSTMENT"
  | "FINE";

export interface StudentLedgerEntry {
  id: string;
  date: string; // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  dateFormatted: string; // e.g. "10 Apr 2026"
  reference: string; // Invoice No, Receipt No, Refund No, etc.
  type: StudentLedgerEntryType;
  description: string;
  feeHeadName?: string;
  period?: string;
  
  debitPaise: number; // Increases student liability (Charge, fine, refund to student)
  creditPaise: number; // Decreases student liability (Payment, discount, waiver)
  balancePaise: number; // Running balance after this transaction
  
  debitRupees: number;
  creditRupees: number;
  balanceRupees: number;
  
  paymentMethod?: PaymentMethod;
  referenceNumber?: string; // UTR, Cheque No
  invoiceNumber?: string;
  receiptNumber?: string;
  refundReceiptNumber?: string;
  notes?: string;
}

export interface StudentLedgerSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName?: string;
  rollNumber?: number;
  fatherName?: string;
  guardianPhone?: string;
  academicYearId: string;
  academicYearName: string;
  
  openingBalancePaise: number;
  openingBalanceRupees: number;
  
  totalChargesPaise: number; // Total Debits from invoices
  totalChargesRupees: number;
  
  totalDiscountsPaise: number; // Discounts, concessions, waivers
  totalDiscountsRupees: number;
  
  totalPaidPaise: number; // Total payments received (Credits)
  totalPaidRupees: number;
  
  totalRefundsPaise: number; // Refunds paid back (Debits to student)
  totalRefundsRupees: number;
  
  closingOutstandingPaise: number; // Final net due
  closingOutstandingRupees: number;
  
  isReconciled: boolean;
  reconciliationNotes?: string;
}

export interface StudentStatement {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  statementDate: string; // Generated date
  periodRange: string; // e.g. "01 Apr 2026 to 31 Mar 2027"
  
  summary: StudentLedgerSummary;
  entries: StudentLedgerEntry[];
}

export type AccountLedgerEntryType =
  | "OPENING_BALANCE"
  | "COLLECTION"
  | "REFUND"
  | "REVERSAL"
  | "TRANSFER";

export interface AccountLedgerEntry {
  id: string;
  date: string;
  dateFormatted: string;
  reference: string; // Receipt No, Refund No, UTR
  accountType: PaymentMethod;
  type: AccountLedgerEntryType;
  description: string;
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  className?: string;
  
  inflowDebitPaise: number; // Collections (inflow into cash/bank)
  outflowCreditPaise: number; // Refunds (outflow out of cash/bank)
  balancePaise: number; // Running balance in this account
  
  inflowDebitRupees: number;
  outflowCreditRupees: number;
  balanceRupees: number;
  
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // Bank UTR, Cheque No
  remarks?: string;
}

export interface AccountSummary {
  accountType: PaymentMethod;
  accountLabel: string;
  openingBalancePaise: number;
  openingBalanceRupees: number;
  
  totalReceiptsPaise: number; // Total Inflow
  totalReceiptsRupees: number;
  
  totalRefundsPaise: number; // Total Outflow
  totalRefundsRupees: number;
  
  closingBalancePaise: number; // Opening + Inflow - Outflow
  closingBalanceRupees: number;
  
  transactionCount: number;
}

export interface CashBankMultiAccountSummary {
  academicYearId: string;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  accounts: Record<PaymentMethod | "ALL", AccountSummary>;
  overallOpeningBalancePaise: number;
  overallTotalReceiptsPaise: number;
  overallTotalRefundsPaise: number;
  overallClosingBalancePaise: number;
  
  overallOpeningBalanceRupees: number;
  overallTotalReceiptsRupees: number;
  overallTotalRefundsRupees: number;
  overallClosingBalanceRupees: number;
  
  isReconciled: boolean;
}

export interface LedgerFilterOptions {
  academicYearId?: string;
  studentId?: string;
  className?: string;
  sectionName?: string;
  feeHeadId?: string;
  accountType?: PaymentMethod | "ALL";
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}
