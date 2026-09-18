/**
 * PHASE 6 — ACCOUNTING CORE + DOUBLE ENTRY + TRIAL BALANCE
 * Type & Entity Definitions
 * 
 * Strict Double-Entry Alignment:
 * - Every transaction balances: Total Debits === Total Credits.
 * - Normal Balances:
 *     - ASSET: Debit (Increases with Debit, Decreases with Credit)
 *     - EXPENSE: Debit (Increases with Debit, Decreases with Credit)
 *     - LIABILITY: Credit (Increases with Credit, Decreases with Debit)
 *     - EQUITY: Credit (Increases with Credit, Decreases with Debit)
 *     - INCOME: Credit (Increases with Credit, Decreases with Debit)
 */

import type { PaymentMethod } from "./fee-foundation";

export type AccountCategory = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export type AccountNormalBalance = "DEBIT" | "CREDIT";

export type VoucherType = "JOURNAL" | "RECEIPT" | "PAYMENT" | "CONTRA";

export type JournalReferenceType =
  | "FEE_DEMAND"
  | "PAYMENT"
  | "REFUND"
  | "REVERSAL"
  | "ADJUSTMENT"
  | "EXPENSE"
  | "OPENING_BALANCE"
  | "MANUAL";

/**
 * Chart of Accounts (COA) Entry
 */
export interface Account {
  id: string; // e.g. "acc_1010"
  schoolId: string; // Multi-tenant isolation
  code: string; // e.g. "1010", "1020", "4010"
  name: string; // e.g. "Cash in Hand", "Tuition Fee Income"
  category: AccountCategory;
  normalBalance: AccountNormalBalance;
  description?: string;
  isSystem: boolean; // True for default built-in accounts, false for custom accounts
  isActive: boolean;
  parentId?: string | null; // For hierarchical sub-accounts
  
  // Running Balance Cache (in Paise and Rupees)
  currentBalancePaise: number;
  currentBalanceRupees: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Journal Entry Line (Single Debit or Credit Leg)
 */
export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  
  debitPaise: number;
  creditPaise: number;
  debitRupees: number;
  creditRupees: number;
  
  narration?: string;
  studentId?: string; // Subledger tracking
  studentName?: string;
  feeHeadId?: string;
}

/**
 * Balanced Double-Entry Voucher
 */
export interface JournalEntry {
  id: string; // je_${timestamp}_${random}
  schoolId: string;
  voucherNumber: string; // e.g. "JV-2026-00001", "RV-2026-00001"
  voucherType: VoucherType;
  date: string; // YYYY-MM-DD
  academicYearId: string;
  
  referenceType: JournalReferenceType;
  referenceId: string; // Idempotency key (e.g. demandId, paymentId, refundId)
  referenceNumber?: string; // Invoice No, Receipt No, Cheque No
  narration: string;
  
  lines: JournalEntryLine[];
  
  totalDebitPaise: number;
  totalCreditPaise: number;
  totalDebitRupees: number;
  totalCreditRupees: number;
  
  isBalanced: boolean; // Must be true (totalDebitPaise === totalCreditPaise)
  
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * General Ledger Account Statement Row
 */
export interface GeneralLedgerEntry {
  id: string;
  date: string;
  dateFormatted: string;
  voucherNumber: string;
  voucherType: VoucherType;
  referenceType: JournalReferenceType;
  referenceNumber?: string;
  narration: string;
  
  debitPaise: number;
  creditPaise: number;
  debitRupees: number;
  creditRupees: number;
  
  runningBalancePaise: number;
  runningBalanceRupees: number;
  
  studentName?: string;
}

/**
 * General Ledger Statement for an Account
 */
export interface GeneralLedgerAccountStatement {
  account: Account;
  academicYearId: string;
  openingBalancePaise: number;
  openingBalanceRupees: number;
  totalDebitPaise: number;
  totalDebitRupees: number;
  totalCreditPaise: number;
  totalCreditRupees: number;
  closingBalancePaise: number;
  closingBalanceRupees: number;
  entries: GeneralLedgerEntry[];
}

/**
 * Single Row in Trial Balance
 */
export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  normalBalance: AccountNormalBalance;
  
  totalDebitPaise: number;
  totalCreditPaise: number;
  totalDebitRupees: number;
  totalCreditRupees: number;
  
  netDebitPaise: number;
  netCreditPaise: number;
  netDebitRupees: number;
  netCreditRupees: number;
}

/**
 * Complete Trial Balance Report
 */
export interface TrialBalanceReport {
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  asOfDate: string;
  
  rows: TrialBalanceRow[];
  
  grandTotalDebitPaise: number;
  grandTotalCreditPaise: number;
  grandTotalDebitRupees: number;
  grandTotalCreditRupees: number;
  
  differencePaise: number; // Must be 0
  differenceRupees: number; // Must be 0
  isBalanced: boolean;
  reconciliationNotes: string;
}

/**
 * School Operating Expense Record
 */
export interface SchoolExpense {
  id: string; // exp_${timestamp}_${random}
  schoolId: string;
  academicYearId: string;
  voucherNumber: string; // Linked Payment Voucher
  
  expenseAccountId: string; // COA 5020..5090
  expenseAccountCode: string;
  expenseAccountName: string;
  
  paymentMethod: PaymentMethod; // CASH, BANK_TRANSFER, UPI, CHEQUE
  paymentAccountId: string; // COA 1010, 1020, 1030
  paymentAccountName: string;
  
  amountPaise: number;
  amountRupees: number;
  
  expenseDate: string; // YYYY-MM-DD
  payeeName: string; // Vendor, Employee, Service Provider
  invoiceNumber?: string;
  referenceNumber?: string; // Cheque No, UTR, Txn ID
  category: string; // Salary, Rent, Electricity, etc.
  description: string;
  
  approvedBy?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

/**
 * Query Filter Options for Accounting
 */
export interface AccountingFilterOptions {
  academicYearId?: string;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  category?: AccountCategory;
  voucherType?: VoucherType;
  searchQuery?: string;
  limit?: number;
}

/**
 * Profit & Loss Account Line Item
 */
export interface ProfitAndLossAccountLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: "INCOME" | "EXPENSE";
  amountPaise: number;
  amountRupees: number;
  percentageOfTotal: number;
}

/**
 * Profit & Loss Statement (Income Statement)
 */
export interface ProfitAndLossStatement {
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
  
  incomeLines: ProfitAndLossAccountLine[];
  totalIncomePaise: number;
  totalIncomeRupees: number;
  
  expenseLines: ProfitAndLossAccountLine[];
  totalExpensePaise: number;
  totalExpenseRupees: number;
  
  netSurplusPaise: number; // Positive = Surplus, Negative = Deficit
  netSurplusRupees: number;
  operatingMarginPercentage: number;
  
  generatedAt: string;
}

/**
 * Balance Sheet Account Line Item
 */
export interface BalanceSheetAccountLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  openingBalancePaise: number;
  openingBalanceRupees: number;
  debitPaise: number;
  debitRupees: number;
  creditPaise: number;
  creditRupees: number;
  closingBalancePaise: number;
  closingBalanceRupees: number;
}

/**
 * Balance Sheet Categorized Section (Assets, Liabilities, Equity)
 */
export interface BalanceSheetSection {
  title: string;
  category: AccountCategory;
  lines: BalanceSheetAccountLine[];
  totalClosingPaise: number;
  totalClosingRupees: number;
}

/**
 * Balance Sheet Statement (Statement of Financial Position)
 */
export interface BalanceSheetStatement {
  schoolId: string;
  schoolName: string;
  academicYearId: string;
  academicYearName: string;
  asOfDate: string;
  
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection; // Includes School Capital/Fund and Current Year Surplus
  
  totalAssetsPaise: number;
  totalAssetsRupees: number;
  
  totalLiabilitiesPaise: number;
  totalLiabilitiesRupees: number;
  
  totalEquityPaise: number;
  totalEquityRupees: number;
  
  totalLiabilitiesAndEquityPaise: number;
  totalLiabilitiesAndEquityRupees: number;
  
  differencePaise: number; // Must be 0
  differenceRupees: number;
  isBalanced: boolean;
  reconciliationNotes: string;
  
  generatedAt: string;
}

/**
 * Accounting Equation Validation
 */
export interface AccountingEquationValidation {
  totalAssetsRupees: number;
  totalLiabilitiesRupees: number;
  totalEquityRupees: number;
  differenceRupees: number;
  isBalanced: boolean;
}

/**
 * Financial Comparison Item
 */
export interface FinancialComparisonItem {
  label: string;
  baseValuePaise: number;
  baseValueRupees: number;
  compareValuePaise: number;
  compareValueRupees: number;
  varianceRupees: number;
  variancePercentage: number;
}

/**
 * Multi-Session Financial Statement Comparison
 */
export interface FinancialStatementComparison {
  schoolId: string;
  baseYearId: string;
  baseYearName: string;
  compareYearId: string;
  compareYearName: string;
  
  incomeComparison: FinancialComparisonItem[];
  expenseComparison: FinancialComparisonItem[];
  assetComparison: FinancialComparisonItem[];
  liabilityComparison: FinancialComparisonItem[];
  
  summary: {
    totalIncome: FinancialComparisonItem;
    totalExpenses: FinancialComparisonItem;
    netSurplus: FinancialComparisonItem;
    totalAssets: FinancialComparisonItem;
    totalLiabilities: FinancialComparisonItem;
  };
}

