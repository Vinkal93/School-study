/**
 * PHASE 6 — ACCOUNTING CORE + DOUBLE ENTRY + TRIAL BALANCE
 * Central Accounting Service Engine
 * 
 * Strict Invariants:
 * 1. Chart of Accounts configurable per school/institute.
 * 2. Strict Double Entry: Total Debits MUST equal Total Credits for every voucher.
 * 3. Idempotent Journal Generation: Never duplicate vouchers for same transaction.
 * 4. General Ledger with proper running balances by account normal balance.
 * 5. Balanced Trial Balance with zero fake balancing figures.
 * 6. Historical preservation: No deletes, corrections via reversals.
 */

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import type {
  Account,
  AccountCategory,
  AccountNormalBalance,
  JournalEntry,
  JournalEntryLine,
  VoucherType,
  JournalReferenceType,
  GeneralLedgerEntry,
  GeneralLedgerAccountStatement,
  TrialBalanceRow,
  TrialBalanceReport,
  SchoolExpense,
  AccountingFilterOptions,
  ProfitAndLossAccountLine,
  ProfitAndLossStatement,
  BalanceSheetAccountLine,
  BalanceSheetSection,
  BalanceSheetStatement,
  AccountingEquationValidation,
  FinancialComparisonItem,
  FinancialStatementComparison,
} from "@/types/accounting";
import type { PaymentMethod } from "@/types/fee-foundation";
import { getFinancialPayments } from "./fee-foundation.service";

// -------------------------------------------------------------
// Helper: Paise to Rupees & Rupees to Paise
// -------------------------------------------------------------
function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function formatDateStr(isoOrDate: string): string {
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoOrDate;
  }
}

// -------------------------------------------------------------
// Standard Default Chart of Accounts Definition
// -------------------------------------------------------------
export const DEFAULT_COA_DEFINITIONS: Array<{
  code: string;
  name: string;
  category: AccountCategory;
  normalBalance: AccountNormalBalance;
  description: string;
}> = [
  // 1000 - ASSETS
  { code: "1010", name: "Cash in Hand / Drawer", category: "ASSET", normalBalance: "DEBIT", description: "Physical cash drawer at school accounts desk" },
  { code: "1020", name: "Bank Operating Account", category: "ASSET", normalBalance: "DEBIT", description: "Primary institutional bank current/savings account" },
  { code: "1030", name: "UPI & Digital Collections", category: "ASSET", normalBalance: "DEBIT", description: "Instant digital payment clearing account" },
  { code: "1040", name: "Student Fee Receivable", category: "ASSET", normalBalance: "DEBIT", description: "Accounts receivable: unpaid fee obligations owed by students" },
  { code: "1090", name: "Other Current Assets", category: "ASSET", normalBalance: "DEBIT", description: "Prepaid expenses, deposits, and other receivables" },

  // 2000 - LIABILITIES
  { code: "2010", name: "Student Fee Advance", category: "LIABILITY", normalBalance: "CREDIT", description: "Advance/unallocated fee payments received from parents" },
  { code: "2020", name: "Accounts Payable / Vendors", category: "LIABILITY", normalBalance: "CREDIT", description: "Unpaid vendor bills and supplier liabilities" },
  { code: "2090", name: "Other Current Liabilities", category: "LIABILITY", normalBalance: "CREDIT", description: "Statutory payables, caution deposits, and accruals" },

  // 3000 - EQUITY / FUND
  { code: "3010", name: "School Capital / Operating Fund", category: "EQUITY", normalBalance: "CREDIT", description: "Opening accumulated school corpus fund and retained surplus" },
  { code: "3020", name: "Current Year Operating Surplus", category: "EQUITY", normalBalance: "CREDIT", description: "Net operational margin of current academic session" },

  // 4000 - INCOME
  { code: "4010", name: "Tuition Fee Income", category: "INCOME", normalBalance: "CREDIT", description: "Core academic curriculum tuition charges" },
  { code: "4020", name: "Admission Fee Income", category: "INCOME", normalBalance: "CREDIT", description: "One-time registration and admission revenue" },
  { code: "4030", name: "Transport Fee Income", category: "INCOME", normalBalance: "CREDIT", description: "School bus and transit facility collections" },
  { code: "4040", name: "Examination Fee Income", category: "INCOME", normalBalance: "CREDIT", description: "Term and annual examination evaluation fees" },
  { code: "4050", name: "Late Fee & Fine Income", category: "INCOME", normalBalance: "CREDIT", description: "Overdue penalties and late fee charges" },
  { code: "4090", name: "Miscellaneous Fee Income", category: "INCOME", normalBalance: "CREDIT", description: "Activity, sports, laboratory, and library revenue" },

  // 5000 - EXPENSES
  { code: "5010", name: "Fee Concessions, Waivers & Discounts", category: "EXPENSE", normalBalance: "DEBIT", description: "Scholarships, sibling concessions, and management waivers" },
  { code: "5020", name: "Staff Salary & Wages", category: "EXPENSE", normalBalance: "DEBIT", description: "Teacher and administrative payroll disbursement" },
  { code: "5030", name: "Rent & Facility Lease", category: "EXPENSE", normalBalance: "DEBIT", description: "Building rent and campus ground lease" },
  { code: "5040", name: "Electricity & Utilities", category: "EXPENSE", normalBalance: "DEBIT", description: "Power, water, and heating utility bills" },
  { code: "5050", name: "Repairs & Maintenance", category: "EXPENSE", normalBalance: "DEBIT", description: "Infrastructure maintenance and classroom upkeep" },
  { code: "5060", name: "Printing & Stationery", category: "EXPENSE", normalBalance: "DEBIT", description: "Exam paper printing, registers, and office stationery" },
  { code: "5070", name: "Internet & Technology", category: "EXPENSE", normalBalance: "DEBIT", description: "Broadband, software subscriptions, and IT services" },
  { code: "5080", name: "Bank Charges & Gateway Fees", category: "EXPENSE", normalBalance: "DEBIT", description: "Bank transaction charges and payment gateway commission" },
  { code: "5090", name: "Other Operating Expenses", category: "EXPENSE", normalBalance: "DEBIT", description: "Miscellaneous campus administrative expenditures" },
];

// -------------------------------------------------------------
// 1. Chart of Accounts Services
// -------------------------------------------------------------

/**
 * Initialize default Chart of Accounts for a school
 */
export async function initializeDefaultCOA(schoolId: string): Promise<Account[]> {
  const db = getFirebaseDb();
  const accounts: Account[] = [];
  const now = new Date().toISOString();

  for (const def of DEFAULT_COA_DEFINITIONS) {
    const id = `coa_${schoolId}_${def.code}`;
    const acc: Account = {
      id,
      schoolId,
      code: def.code,
      name: def.name,
      category: def.category,
      normalBalance: def.normalBalance,
      description: def.description,
      isSystem: true,
      isActive: true,
      parentId: null,
      currentBalancePaise: 0,
      currentBalanceRupees: 0,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = doc(db, "chartOfAccounts", id);
    await setDoc(docRef, acc, { merge: true });
    accounts.push(acc);
  }

  return accounts;
}

/**
 * Fetch Chart of Accounts for a school (Auto-initializes if missing)
 */
export async function getChartOfAccounts(schoolId: string): Promise<Account[]> {
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, "chartOfAccounts"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return await initializeDefaultCOA(schoolId);
    }

    const accounts: Account[] = [];
    snap.forEach((d) => accounts.push(d.data() as Account));
    accounts.sort((a, b) => a.code.localeCompare(b.code));
    return accounts;
  } catch (err) {
    console.warn("Failed to load Chart of Accounts from Firestore, returning defaults:", err);
    return DEFAULT_COA_DEFINITIONS.map((def) => ({
      id: `coa_${schoolId}_${def.code}`,
      schoolId,
      code: def.code,
      name: def.name,
      category: def.category,
      normalBalance: def.normalBalance,
      description: def.description,
      isSystem: true,
      isActive: true,
      parentId: null,
      currentBalancePaise: 0,
      currentBalanceRupees: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Helper to get account by code
 */
export async function getAccountByCode(schoolId: string, code: string): Promise<Account | null> {
  const coa = await getChartOfAccounts(schoolId);
  return coa.find((a) => a.code === code) || null;
}

// -------------------------------------------------------------
// 2. Double-Entry Journal Engine
// -------------------------------------------------------------

/**
 * Post an Atomic Double-Entry Journal Entry
 * Strictly enforces Total Debits === Total Credits.
 */
export async function postJournalEntry(
  schoolId: string,
  entry: {
    voucherType: VoucherType;
    date: string;
    academicYearId: string;
    referenceType: JournalReferenceType;
    referenceId: string;
    referenceNumber?: string;
    narration: string;
    lines: Array<{
      accountCode: string;
      debitPaise: number;
      creditPaise: number;
      narration?: string;
      studentId?: string;
      studentName?: string;
      feeHeadId?: string;
    }>;
    createdBy: string;
    createdByName?: string;
  }
): Promise<JournalEntry> {
  const db = getFirebaseDb();

  // 1. Idempotency Check: Don't create duplicate journal for same reference
  const existingQ = query(
    collection(db, "journalEntries"),
    where("schoolId", "==", schoolId),
    where("referenceId", "==", entry.referenceId),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as JournalEntry;
  }

  // 2. Load Chart of Accounts to resolve codes to accounts
  const coa = await getChartOfAccounts(schoolId);
  const coaMap = new Map<string, Account>();
  coa.forEach((a) => coaMap.set(a.code, a));

  // 3. Compute Totals & Build Lines
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;
  const entryLines: JournalEntryLine[] = [];

  entry.lines.forEach((l, idx) => {
    const acc = coaMap.get(l.accountCode);
    if (!acc) {
      throw new Error(`Account with code ${l.accountCode} does not exist in Chart of Accounts.`);
    }

    const debitPaise = Math.round(l.debitPaise || 0);
    const creditPaise = Math.round(l.creditPaise || 0);

    totalDebitPaise += debitPaise;
    totalCreditPaise += creditPaise;

    entryLines.push({
      id: `line_${idx + 1}`,
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      category: acc.category,
      debitPaise,
      creditPaise,
      debitRupees: paiseToRupees(debitPaise),
      creditRupees: paiseToRupees(creditPaise),
      narration: l.narration,
      studentId: l.studentId,
      studentName: l.studentName,
      feeHeadId: l.feeHeadId,
    });
  });

  // 4. Strict Double Entry Balance Assertion
  const differencePaise = Math.abs(totalDebitPaise - totalCreditPaise);
  if (differencePaise > 0) {
    throw new Error(
      `Double-Entry Invariant Violation: Total Debits (₹${paiseToRupees(totalDebitPaise)}) must equal Total Credits (₹${paiseToRupees(totalCreditPaise)}). Imbalance: ₹${paiseToRupees(differencePaise)}`
    );
  }

  // 5. Generate Voucher Number
  const voucherPrefix =
    entry.voucherType === "RECEIPT"
      ? "RV"
      : entry.voucherType === "PAYMENT"
      ? "PV"
      : entry.voucherType === "CONTRA"
      ? "CV"
      : "JV";
  const dateCompact = entry.date.replace(/[^0-9]/g, "").slice(0, 6) || "202609";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const voucherNumber = `${voucherPrefix}-${dateCompact}-${randomSuffix}`;

  const id = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const journalDoc: JournalEntry = {
    id,
    schoolId,
    voucherNumber,
    voucherType: entry.voucherType,
    date: entry.date,
    academicYearId: entry.academicYearId || "ay_2026_27",
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    referenceNumber: entry.referenceNumber,
    narration: entry.narration,
    lines: entryLines,
    totalDebitPaise,
    totalCreditPaise,
    totalDebitRupees: paiseToRupees(totalDebitPaise),
    totalCreditRupees: paiseToRupees(totalCreditPaise),
    isBalanced: true,
    createdBy: entry.createdBy,
    createdByName: entry.createdByName || "System Accountant",
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, "journalEntries", id);
  await setDoc(docRef, journalDoc);

  return journalDoc;
}

// -------------------------------------------------------------
// 3. Integration & Sync with Phase 1–5 Financial Events
// -------------------------------------------------------------

/**
 * Maps a FeeHead name to corresponding Income Account Code
 */
function mapFeeHeadToIncomeAccount(feeHeadName?: string): string {
  if (!feeHeadName) return "4010"; // Default: Tuition Fee Income
  const lower = feeHeadName.toLowerCase();
  if (lower.includes("tuition")) return "4010";
  if (lower.includes("admission") || lower.includes("registration")) return "4020";
  if (lower.includes("transport") || lower.includes("bus") || lower.includes("van")) return "4030";
  if (lower.includes("exam") || lower.includes("test")) return "4040";
  if (lower.includes("fine") || lower.includes("late")) return "4050";
  return "4090"; // Miscellaneous Fee Income
}

/**
 * Maps Payment Method to Asset Account Code
 */
function mapPaymentMethodToAssetAccount(method?: string): string {
  const m = (method || "CASH").toUpperCase();
  if (m === "CASH") return "1010"; // Cash in Hand
  if (m === "UPI") return "1030"; // UPI Collections
  if (m === "BANK_TRANSFER" || m === "NEFT" || m === "RTGS" || m === "IMPS") return "1020"; // Bank Account
  if (m === "CHEQUE") return "1020"; // Cheque clears to Bank
  return "1010";
}

/**
 * Automatically generate balanced journal entry for a Fee Demand
 * Dr Fee Receivable (Net)
 * Dr Fee Concessions & Waivers (if discount)
 * Cr Fee Income (Gross)
 */
export async function postJournalForDemand(
  schoolId: string,
  demand: {
    id: string;
    invoiceNumber: string;
    studentId: string;
    studentName: string;
    feeHeadName?: string;
    grossAmountPaise: number;
    concessionAmountPaise: number;
    netAmountPaise: number;
    dueDate?: string;
    academicYearId: string;
  },
  actor: { id: string; name?: string }
): Promise<JournalEntry> {
  const incomeCode = mapFeeHeadToIncomeAccount(demand.feeHeadName);
  const dateStr = (demand.dueDate || new Date().toISOString()).split("T")[0];

  const lines = [
    {
      accountCode: "1040", // Student Fee Receivable
      debitPaise: demand.netAmountPaise,
      creditPaise: 0,
      narration: `Fee Receivable - ${demand.studentName} (${demand.feeHeadName || "Fee"})`,
      studentId: demand.studentId,
      studentName: demand.studentName,
    },
  ];

  if (demand.concessionAmountPaise > 0) {
    lines.push({
      accountCode: "5010", // Fee Concessions, Waivers & Discounts
      debitPaise: demand.concessionAmountPaise,
      creditPaise: 0,
      narration: `Concession / Discount on invoice ${demand.invoiceNumber}`,
      studentId: demand.studentId,
      studentName: demand.studentName,
    });
  }

  lines.push({
    accountCode: incomeCode, // e.g. 4010 Tuition Fee Income
    debitPaise: 0,
    creditPaise: demand.grossAmountPaise,
    narration: `Fee Income: ${demand.feeHeadName || "Tuition"} for ${demand.studentName}`,
    studentId: demand.studentId,
    studentName: demand.studentName,
  });

  return await postJournalEntry(schoolId, {
    voucherType: "JOURNAL",
    date: dateStr,
    academicYearId: demand.academicYearId || "ay_2026_27",
    referenceType: "FEE_DEMAND",
    referenceId: demand.id,
    referenceNumber: demand.invoiceNumber,
    narration: `Fee Demand #${demand.invoiceNumber} - ${demand.studentName} (${demand.feeHeadName || "Fee"})`,
    lines,
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

/**
 * Automatically generate balanced journal entry for a Fee Payment
 * Dr Cash / Bank / UPI (Total Collected)
 * Cr Student Fee Receivable (Allocated to Invoices)
 * Cr Student Fee Advance (Unallocated Advance, if any)
 */
export async function postJournalForPayment(
  schoolId: string,
  payment: {
    id: string;
    receiptNumber: string;
    studentId: string;
    studentName: string;
    amountPaise: number;
    allocatedTotalPaise?: number;
    unallocatedPaise?: number;
    paymentMethod: string;
    paymentDate?: string;
    transactionReference?: string;
    academicYearId: string;
  },
  actor: { id: string; name?: string }
): Promise<JournalEntry> {
  const assetAccountCode = mapPaymentMethodToAssetAccount(payment.paymentMethod);
  const dateStr = (payment.paymentDate || new Date().toISOString()).split("T")[0];

  const allocatedPaise =
    typeof payment.allocatedTotalPaise === "number"
      ? payment.allocatedTotalPaise
      : payment.amountPaise;
  const advancePaise = payment.unallocatedPaise || (payment.amountPaise - allocatedPaise);

  const lines = [
    {
      accountCode: assetAccountCode, // Dr Cash / Bank / UPI
      debitPaise: payment.amountPaise,
      creditPaise: 0,
      narration: `Fee Collection via ${payment.paymentMethod} (Receipt #${payment.receiptNumber})`,
      studentId: payment.studentId,
      studentName: payment.studentName,
    },
    {
      accountCode: "1040", // Cr Student Fee Receivable
      debitPaise: 0,
      creditPaise: allocatedPaise,
      narration: `Settlement of student fee dues for ${payment.studentName}`,
      studentId: payment.studentId,
      studentName: payment.studentName,
    },
  ];

  if (advancePaise > 0) {
    lines.push({
      accountCode: "2010", // Cr Student Fee Advance (Liability)
      debitPaise: 0,
      creditPaise: advancePaise,
      narration: `Unallocated advance / excess payment from ${payment.studentName}`,
      studentId: payment.studentId,
      studentName: payment.studentName,
    });
  }

  return await postJournalEntry(schoolId, {
    voucherType: "RECEIPT",
    date: dateStr,
    academicYearId: payment.academicYearId || "ay_2026_27",
    referenceType: "PAYMENT",
    referenceId: payment.id,
    referenceNumber: payment.receiptNumber,
    narration: `Fee Collection #${payment.receiptNumber} - ${payment.studentName} (${payment.paymentMethod})`,
    lines,
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

/**
 * Automatically generate balanced journal entry for a Fee Refund
 * Dr Student Fee Receivable (Balance restored to student)
 * Cr Cash / Bank / UPI (Outflow)
 */
export async function postJournalForRefund(
  schoolId: string,
  refund: {
    id: string;
    refundReceiptNumber: string;
    studentId: string;
    studentName: string;
    amountPaise: number;
    refundMethod: string;
    refundDate?: string;
    reason: string;
    academicYearId: string;
  },
  actor: { id: string; name?: string }
): Promise<JournalEntry> {
  const assetAccountCode = mapPaymentMethodToAssetAccount(refund.refundMethod);
  const dateStr = (refund.refundDate || new Date().toISOString()).split("T")[0];

  const lines = [
    {
      accountCode: "1040", // Dr Student Fee Receivable (Restores liability)
      debitPaise: refund.amountPaise,
      creditPaise: 0,
      narration: `Fee Refund: Reopening dues for ${refund.studentName} (${refund.reason})`,
      studentId: refund.studentId,
      studentName: refund.studentName,
    },
    {
      accountCode: assetAccountCode, // Cr Cash / Bank / UPI Outflow
      debitPaise: 0,
      creditPaise: refund.amountPaise,
      narration: `Refund disbursement via ${refund.refundMethod} (Voucher #${refund.refundReceiptNumber})`,
      studentId: refund.studentId,
      studentName: refund.studentName,
    },
  ];

  return await postJournalEntry(schoolId, {
    voucherType: "PAYMENT",
    date: dateStr,
    academicYearId: refund.academicYearId || "ay_2026_27",
    referenceType: "REFUND",
    referenceId: refund.id,
    referenceNumber: refund.refundReceiptNumber,
    narration: `Fee Refund #${refund.refundReceiptNumber} - ${refund.studentName}: ${refund.reason}`,
    lines,
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

/**
 * Automatically generate balanced journal entry for a Payment Reversal
 * Dr Student Fee Receivable (restores liability)
 * Cr Cash / Bank / UPI (cancels cash balance)
 */
export async function postJournalForReversal(
  schoolId: string,
  reversal: {
    id: string;
    receiptNumber: string;
    studentId: string;
    reversedAmountPaise: number;
    reason: string;
    paymentMethod?: string;
    reversedAt?: string;
    academicYearId: string;
  },
  actor: { id: string; name?: string }
): Promise<JournalEntry> {
  const assetAccountCode = mapPaymentMethodToAssetAccount(reversal.paymentMethod || "CASH");
  const dateStr = (reversal.reversedAt || new Date().toISOString()).split("T")[0];

  const lines = [
    {
      accountCode: "1040", // Dr Student Fee Receivable
      debitPaise: reversal.reversedAmountPaise,
      creditPaise: 0,
      narration: `Reversal of Payment #${reversal.receiptNumber}: ${reversal.reason}`,
      studentId: reversal.studentId,
    },
    {
      accountCode: assetAccountCode, // Cr Cash / Bank / UPI
      debitPaise: 0,
      creditPaise: reversal.reversedAmountPaise,
      narration: `Payment reversal deduction (${reversal.reason})`,
      studentId: reversal.studentId,
    },
  ];

  return await postJournalEntry(schoolId, {
    voucherType: "JOURNAL",
    date: dateStr,
    academicYearId: reversal.academicYearId || "ay_2026_27",
    referenceType: "REVERSAL",
    referenceId: reversal.id,
    referenceNumber: `REV-${reversal.receiptNumber}`,
    narration: `Payment Reversal for #${reversal.receiptNumber}: ${reversal.reason}`,
    lines,
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

/**
 * Automatically generate balanced journal entry for Fee Adjustments (Waivers, Fines)
 */
export async function postJournalForAdjustment(
  schoolId: string,
  adjustment: {
    id: string;
    type: string;
    studentId: string;
    studentName: string;
    amountPaise: number;
    reason: string;
    date?: string;
    academicYearId: string;
  },
  actor: { id: string; name?: string }
): Promise<JournalEntry> {
  const dateStr = (adjustment.date || new Date().toISOString()).split("T")[0];
  const isWaiver =
    adjustment.type === "WAIVER" ||
    adjustment.type === "DISCOUNT" ||
    adjustment.type === "CONCESSION" ||
    adjustment.type === "SCHOLARSHIP";

  let lines: Array<{ accountCode: string; debitPaise: number; creditPaise: number; narration?: string }>;

  if (isWaiver) {
    // Dr Fee Concessions & Waivers / Cr Student Fee Receivable
    lines = [
      {
        accountCode: "5010", // Concessions & Waivers
        debitPaise: adjustment.amountPaise,
        creditPaise: 0,
        narration: `Fee Waiver / Concession for ${adjustment.studentName}: ${adjustment.reason}`,
      },
      {
        accountCode: "1040", // Student Fee Receivable
        debitPaise: 0,
        creditPaise: adjustment.amountPaise,
        narration: `Relief applied to student receivable balance`,
      },
    ];
  } else {
    // Late Fee / Fine Penalty: Dr Student Fee Receivable / Cr Late Fee & Fine Income
    lines = [
      {
        accountCode: "1040", // Student Fee Receivable
        debitPaise: adjustment.amountPaise,
        creditPaise: 0,
        narration: `Late fee / Penalty on ${adjustment.studentName}: ${adjustment.reason}`,
      },
      {
        accountCode: "4050", // Late Fee & Fine Income
        debitPaise: 0,
        creditPaise: adjustment.amountPaise,
        narration: `Income from penalty charges`,
      },
    ];
  }

  return await postJournalEntry(schoolId, {
    voucherType: "JOURNAL",
    date: dateStr,
    academicYearId: adjustment.academicYearId || "ay_2026_27",
    referenceType: "ADJUSTMENT",
    referenceId: adjustment.id,
    referenceNumber: `ADJ-${adjustment.id.slice(-6)}`,
    narration: `Financial Adjustment (${adjustment.type}) - ${adjustment.studentName}: ${adjustment.reason}`,
    lines,
    createdBy: actor.id,
    createdByName: actor.name,
  });
}

/**
 * Record a School Operational Expense and post balanced double-entry voucher
 * Dr Expense Account (Rent, Salary, Electricity, etc.)
 * Cr Cash / Bank / UPI
 */
export async function recordSchoolExpense(
  schoolId: string,
  expenseData: {
    academicYearId: string;
    expenseAccountId: string;
    expenseAccountCode: string;
    expenseAccountName: string;
    paymentMethod: PaymentMethod;
    paymentAccountId: string;
    paymentAccountName: string;
    amountPaise: number;
    expenseDate: string;
    payeeName: string;
    invoiceNumber?: string;
    referenceNumber?: string;
    category: string;
    description: string;
  },
  actor: { id: string; name?: string }
): Promise<{ expense: SchoolExpense; journalEntry: JournalEntry }> {
  const db = getFirebaseDb();
  const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // 1. Post Balanced Journal Entry (Payment Voucher)
  const paymentAccountCode = mapPaymentMethodToAssetAccount(expenseData.paymentMethod);
  const journal = await postJournalEntry(schoolId, {
    voucherType: "PAYMENT",
    date: expenseData.expenseDate,
    academicYearId: expenseData.academicYearId || "ay_2026_27",
    referenceType: "EXPENSE",
    referenceId: id,
    referenceNumber: expenseData.referenceNumber || expenseData.invoiceNumber,
    narration: `Operational Expense: ${expenseData.category} to ${expenseData.payeeName} - ${expenseData.description}`,
    lines: [
      {
        accountCode: expenseData.expenseAccountCode, // Dr Expense
        debitPaise: expenseData.amountPaise,
        creditPaise: 0,
        narration: `${expenseData.expenseAccountName}: ${expenseData.description}`,
      },
      {
        accountCode: paymentAccountCode, // Cr Cash / Bank
        debitPaise: 0,
        creditPaise: expenseData.amountPaise,
        narration: `Paid via ${expenseData.paymentMethod} to ${expenseData.payeeName}`,
      },
    ],
    createdBy: actor.id,
    createdByName: actor.name,
  });

  // 2. Save SchoolExpense record
  const expense: SchoolExpense = {
    id,
    schoolId,
    academicYearId: expenseData.academicYearId || "ay_2026_27",
    voucherNumber: journal.voucherNumber,
    expenseAccountId: expenseData.expenseAccountId,
    expenseAccountCode: expenseData.expenseAccountCode,
    expenseAccountName: expenseData.expenseAccountName,
    paymentMethod: expenseData.paymentMethod,
    paymentAccountId: expenseData.paymentAccountId,
    paymentAccountName: expenseData.paymentAccountName,
    amountPaise: expenseData.amountPaise,
    amountRupees: paiseToRupees(expenseData.amountPaise),
    expenseDate: expenseData.expenseDate,
    payeeName: expenseData.payeeName,
    invoiceNumber: expenseData.invoiceNumber,
    referenceNumber: expenseData.referenceNumber,
    category: expenseData.category,
    description: expenseData.description,
    createdBy: actor.id,
    createdByName: actor.name,
    createdAt: now,
  };

  await setDoc(doc(db, "schoolExpenses", id), expense);

  return { expense, journalEntry: journal };
}

/**
 * Synchronize all Phase 1–5 historical transactions into balanced double-entry vouchers
 * Idempotent: Never duplicates already-synced vouchers.
 */
export async function syncPhase1to5JournalEntries(
  schoolId: string,
  academicYearId: string = "ay_2026_27"
): Promise<{
  syncedDemands: number;
  syncedPayments: number;
  syncedRefunds: number;
  syncedReversals: number;
  syncedAdjustments: number;
  totalVouchers: number;
}> {
  const db = getFirebaseDb();
  const actor = { id: "system_sync", name: "Double Entry Sync Engine" };

  // Make sure COA is initialized
  await getChartOfAccounts(schoolId);

  let syncedDemands = 0;
  let syncedPayments = 0;
  let syncedRefunds = 0;
  let syncedReversals = 0;
  let syncedAdjustments = 0;

  // 1. Sync Fee Demands
  const demandsQ = query(
    collection(db, "feeDemands"),
    where("schoolId", "==", schoolId)
  );
  const demandsSnap = await getDocs(demandsQ);
  for (const dDoc of demandsSnap.docs) {
    const d = dDoc.data() as any;
    if (d.status === "CANCELLED" || d.status === "VOID") continue;
    try {
      await postJournalForDemand(
        schoolId,
        {
          id: d.id || dDoc.id,
          invoiceNumber: d.invoiceNumber || `INV-${dDoc.id.slice(-6)}`,
          studentId: d.studentId,
          studentName: d.studentName || "Student",
          feeHeadName: d.feeHeadName,
          grossAmountPaise: d.grossAmountPaise || 0,
          concessionAmountPaise: d.concessionAmountPaise || 0,
          netAmountPaise: d.netAmountPaise || 0,
          dueDate: d.dueDate,
          academicYearId: d.academicYearId || academicYearId,
        },
        actor
      );
      syncedDemands++;
    } catch (e) {
      // Already posted or error
    }
  }

  // 2. Sync Payments
  const payments = await getFinancialPayments(schoolId, { status: "SUCCESS" });
  for (const p of payments) {
    try {
      await postJournalForPayment(
        schoolId,
        {
          id: p.id,
          receiptNumber: p.receiptNumber,
          studentId: p.studentId,
          studentName: p.studentName,
          amountPaise: p.amountPaise,
          allocatedTotalPaise: p.allocatedTotalPaise,
          unallocatedPaise: p.unallocatedPaise,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          transactionReference: p.referenceNumber || "",
          academicYearId: p.academicYearId || academicYearId,
        },
        actor
      );
      syncedPayments++;
    } catch (e) {
      // Already posted
    }
  }

  // 3. Sync Refunds
  const refundsQ = query(
    collection(db, "financialRefunds"),
    where("schoolId", "==", schoolId)
  );
  const refundsSnap = await getDocs(refundsQ);
  for (const rDoc of refundsSnap.docs) {
    const r = rDoc.data() as any;
    try {
      await postJournalForRefund(
        schoolId,
        {
          id: r.id || rDoc.id,
          refundReceiptNumber: r.refundReceiptNumber,
          studentId: r.studentId,
          studentName: r.studentName,
          amountPaise: r.amountPaise,
          refundMethod: r.refundMethod,
          refundDate: r.refundDate,
          reason: r.reason,
          academicYearId: r.academicYearId || academicYearId,
        },
        actor
      );
      syncedRefunds++;
    } catch (e) {}
  }

  // 4. Sync Reversals
  const revQ = query(
    collection(db, "paymentReversals"),
    where("schoolId", "==", schoolId)
  );
  const revSnap = await getDocs(revQ);
  for (const revDoc of revSnap.docs) {
    const rev = revDoc.data() as any;
    try {
      await postJournalForReversal(
        schoolId,
        {
          id: rev.id || revDoc.id,
          receiptNumber: rev.receiptNumber,
          studentId: rev.studentId,
          reversedAmountPaise: rev.reversedAmountPaise,
          reason: rev.reason,
          reversedAt: rev.reversedAt,
          academicYearId: rev.academicYearId || academicYearId,
        },
        actor
      );
      syncedReversals++;
    } catch (e) {}
  }

  // 5. Sync Adjustments
  const adjQ = query(
    collection(db, "feeAdjustments"),
    where("schoolId", "==", schoolId)
  );
  const adjSnap = await getDocs(adjQ);
  for (const aDoc of adjSnap.docs) {
    const adj = aDoc.data() as any;
    try {
      await postJournalForAdjustment(
        schoolId,
        {
          id: adj.id || aDoc.id,
          type: adj.type || "WAIVER",
          studentId: adj.studentId,
          studentName: adj.studentName || "Student",
          amountPaise: adj.amountPaise,
          reason: adj.reason,
          date: adj.date,
          academicYearId: adj.academicYearId || academicYearId,
        },
        actor
      );
      syncedAdjustments++;
    } catch (e) {}
  }

  const totalVouchers =
    syncedDemands + syncedPayments + syncedRefunds + syncedReversals + syncedAdjustments;

  return {
    syncedDemands,
    syncedPayments,
    syncedRefunds,
    syncedReversals,
    syncedAdjustments,
    totalVouchers,
  };
}

// -------------------------------------------------------------
// 4. Querying Journal Vouchers
// -------------------------------------------------------------

export async function getJournalEntries(
  schoolId: string,
  options: AccountingFilterOptions = {}
): Promise<JournalEntry[]> {
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, "journalEntries"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    const entries: JournalEntry[] = [];

    snap.forEach((d) => {
      const data = d.data() as JournalEntry;
      if (options.academicYearId && data.academicYearId !== options.academicYearId) return;
      if (options.startDate && data.date < options.startDate) return;
      if (options.endDate && data.date > options.endDate) return;
      if (options.voucherType && data.voucherType !== options.voucherType) return;
      if (options.accountId) {
        const hasAccount = data.lines.some(
          (l) => l.accountId === options.accountId || l.accountCode === options.accountId
        );
        if (!hasAccount) return;
      }
      entries.push(data);
    });

    entries.sort((a, b) => b.date.localeCompare(a.date) || b.voucherNumber.localeCompare(a.voucherNumber));
    return entries;
  } catch (err) {
    console.error("Error fetching journal entries:", err);
    return [];
  }
}

// -------------------------------------------------------------
// 5. General Ledger Derivation Engine
// -------------------------------------------------------------

/**
 * Generate Chronological General Ledger Account Statement
 */
export async function getGeneralLedger(
  schoolId: string,
  accountIdOrCode: string,
  options: AccountingFilterOptions = {}
): Promise<GeneralLedgerAccountStatement> {
  const coa = await getChartOfAccounts(schoolId);
  const account = coa.find(
    (a) => a.id === accountIdOrCode || a.code === accountIdOrCode
  );

  if (!account) {
    throw new Error(`Account '${accountIdOrCode}' not found in Chart of Accounts.`);
  }

  // Get all journal entries containing this account
  const allJournals = await getJournalEntries(schoolId, {
    academicYearId: options.academicYearId,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  // Extract all lines matching this account
  const rawEvents: Array<{
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
    studentName?: string;
  }> = [];

  for (const j of allJournals) {
    for (const l of j.lines) {
      if (l.accountId === account.id || l.accountCode === account.code) {
        rawEvents.push({
          id: `${j.id}_${l.id}`,
          date: j.date,
          dateFormatted: formatDateStr(j.date),
          voucherNumber: j.voucherNumber,
          voucherType: j.voucherType,
          referenceType: j.referenceType,
          referenceNumber: j.referenceNumber,
          narration: l.narration || j.narration,
          debitPaise: l.debitPaise,
          creditPaise: l.creditPaise,
          studentName: l.studentName,
        });
      }
    }
  }

  // Sort Date Ascending for Ledger
  rawEvents.sort((a, b) => a.date.localeCompare(b.date) || a.voucherNumber.localeCompare(b.voucherNumber));

  // Compute Running Balance based on Account Normal Balance
  // ASSET / EXPENSE: Balance = Opening + Debit - Credit
  // LIABILITY / EQUITY / INCOME: Balance = Opening + Credit - Debit
  const isDebitNormal = account.normalBalance === "DEBIT";
  let runningPaise = 0; // Default opening balance is 0 unless pre-configured
  let totalDebitPaise = 0;
  let totalCreditPaise = 0;

  const entries: GeneralLedgerEntry[] = [];

  for (const ev of rawEvents) {
    if (isDebitNormal) {
      runningPaise += ev.debitPaise - ev.creditPaise;
    } else {
      runningPaise += ev.creditPaise - ev.debitPaise;
    }

    totalDebitPaise += ev.debitPaise;
    totalCreditPaise += ev.creditPaise;

    entries.push({
      ...ev,
      debitRupees: paiseToRupees(ev.debitPaise),
      creditRupees: paiseToRupees(ev.creditPaise),
      runningBalancePaise: runningPaise,
      runningBalanceRupees: paiseToRupees(runningPaise),
    });
  }

  return {
    account,
    academicYearId: options.academicYearId || "ay_2026_27",
    openingBalancePaise: 0,
    openingBalanceRupees: 0,
    totalDebitPaise,
    totalDebitRupees: paiseToRupees(totalDebitPaise),
    totalCreditPaise,
    totalCreditRupees: paiseToRupees(totalCreditPaise),
    closingBalancePaise: runningPaise,
    closingBalanceRupees: paiseToRupees(runningPaise),
    entries,
  };
}

// -------------------------------------------------------------
// 6. Trial Balance Derivation Engine
// -------------------------------------------------------------

/**
 * Generate Authoritative Balanced Trial Balance Report
 * Strictly validates: Total Debits === Total Credits.
 * Zero synthetic / fake balancing numbers!
 */
export async function getTrialBalance(
  schoolId: string,
  options: AccountingFilterOptions = {}
): Promise<TrialBalanceReport> {
  const coa = await getChartOfAccounts(schoolId);
  const journals = await getJournalEntries(schoolId, {
    academicYearId: options.academicYearId,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  // Accumulate Debits and Credits per account
  const accountTotals = new Map<string, { debitPaise: number; creditPaise: number }>();
  coa.forEach((acc) => {
    accountTotals.set(acc.code, { debitPaise: 0, creditPaise: 0 });
  });

  for (const j of journals) {
    for (const l of j.lines) {
      const curr = accountTotals.get(l.accountCode);
      if (curr) {
        curr.debitPaise += l.debitPaise;
        curr.creditPaise += l.creditPaise;
      }
    }
  }

  // Build Trial Balance Rows
  const rows: TrialBalanceRow[] = [];
  let grandTotalDebitPaise = 0;
  let grandTotalCreditPaise = 0;

  for (const acc of coa) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const { debitPaise, creditPaise } = totals;

    // Calculate Net Debit or Net Credit Balance
    let netDebitPaise = 0;
    let netCreditPaise = 0;

    if (debitPaise > creditPaise) {
      netDebitPaise = debitPaise - creditPaise;
    } else if (creditPaise > debitPaise) {
      netCreditPaise = creditPaise - debitPaise;
    }

    grandTotalDebitPaise += netDebitPaise;
    grandTotalCreditPaise += netCreditPaise;

    rows.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      category: acc.category,
      normalBalance: acc.normalBalance,
      totalDebitPaise: debitPaise,
      totalCreditPaise: creditPaise,
      totalDebitRupees: paiseToRupees(debitPaise),
      totalCreditRupees: paiseToRupees(creditPaise),
      netDebitPaise,
      netCreditPaise,
      netDebitRupees: paiseToRupees(netDebitPaise),
      netCreditRupees: paiseToRupees(netCreditPaise),
    });
  }

  const differencePaise = Math.abs(grandTotalDebitPaise - grandTotalCreditPaise);
  const differenceRupees = paiseToRupees(differencePaise);
  const isBalanced = differencePaise === 0;

  const reconciliationNotes = isBalanced
    ? "Double-Entry Verified: Total Debits perfectly match Total Credits across all general ledger accounts."
    : `Trial Balance Imbalance Detected: Debits (₹${paiseToRupees(grandTotalDebitPaise)}) differ from Credits (₹${paiseToRupees(grandTotalCreditPaise)}) by ₹${differenceRupees}. Review unbalanced vouchers.`;

  return {
    schoolId,
    schoolName: "Lord Buddha Public School",
    academicYearId: options.academicYearId || "ay_2026_27",
    asOfDate: options.endDate || new Date().toISOString().split("T")[0],
    rows,
    grandTotalDebitPaise,
    grandTotalCreditPaise,
    grandTotalDebitRupees: paiseToRupees(grandTotalDebitPaise),
    grandTotalCreditRupees: paiseToRupees(grandTotalCreditPaise),
    differencePaise,
    differenceRupees,
    isBalanced,
    reconciliationNotes,
  };
}

// -------------------------------------------------------------
// 7. Operating Expenses Query
// -------------------------------------------------------------

export async function getSchoolExpenses(
  schoolId: string,
  options: AccountingFilterOptions = {}
): Promise<SchoolExpense[]> {
  const db = getFirebaseDb();
  try {
    const q = query(
      collection(db, "schoolExpenses"),
      where("schoolId", "==", schoolId)
    );
    const snap = await getDocs(q);
    const list: SchoolExpense[] = [];

    snap.forEach((d) => {
      const data = d.data() as SchoolExpense;
      if (options.academicYearId && data.academicYearId !== options.academicYearId) return;
      if (options.startDate && data.expenseDate < options.startDate) return;
      if (options.endDate && data.expenseDate > options.endDate) return;
      list.push(data);
    });

    list.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
    return list;
  } catch (err) {
    console.error("Error loading expenses:", err);
    return [];
  }
}

// -------------------------------------------------------------
// 8. Profit & Loss Statement (Income Statement) Engine
// -------------------------------------------------------------

export async function getProfitAndLossStatement(
  schoolId: string,
  options: AccountingFilterOptions = {}
): Promise<ProfitAndLossStatement> {
  const coa = await getChartOfAccounts(schoolId);
  const journals = await getJournalEntries(schoolId, {
    academicYearId: options.academicYearId,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  // Accumulate Debits and Credits per account
  const accountTotals = new Map<string, { debitPaise: number; creditPaise: number }>();
  coa.forEach((acc) => {
    accountTotals.set(acc.code, { debitPaise: 0, creditPaise: 0 });
  });

  for (const j of journals) {
    for (const l of j.lines) {
      const curr = accountTotals.get(l.accountCode);
      if (curr) {
        curr.debitPaise += l.debitPaise;
        curr.creditPaise += l.creditPaise;
      }
    }
  }

  // Income Accounts (Category: INCOME, Normal Balance: CREDIT)
  // Income amount = Credit - Debit
  const incomeAccounts = coa.filter((a) => a.category === "INCOME");
  let totalIncomePaise = 0;
  const rawIncomeLines: Array<{ acc: Account; amountPaise: number }> = [];

  for (const acc of incomeAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    // Normal balance for income is Credit: Credit increases income, Debit decreases income (e.g. reversals)
    const amountPaise = totals.creditPaise - totals.debitPaise;
    rawIncomeLines.push({ acc, amountPaise: Math.max(0, amountPaise) });
    totalIncomePaise += Math.max(0, amountPaise);
  }

  const incomeLines: ProfitAndLossAccountLine[] = rawIncomeLines.map(({ acc, amountPaise }) => ({
    accountId: acc.id,
    accountCode: acc.code,
    accountName: acc.name,
    category: "INCOME" as const,
    amountPaise,
    amountRupees: paiseToRupees(amountPaise),
    percentageOfTotal: totalIncomePaise > 0 ? Math.round((amountPaise / totalIncomePaise) * 1000) / 10 : 0,
  }));

  // Expense Accounts (Category: EXPENSE, Normal Balance: DEBIT)
  // Expense amount = Debit - Credit
  const expenseAccounts = coa.filter((a) => a.category === "EXPENSE");
  let totalExpensePaise = 0;
  const rawExpenseLines: Array<{ acc: Account; amountPaise: number }> = [];

  for (const acc of expenseAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    // Normal balance for expense is Debit: Debit increases expense, Credit decreases expense
    const amountPaise = totals.debitPaise - totals.creditPaise;
    rawExpenseLines.push({ acc, amountPaise: Math.max(0, amountPaise) });
    totalExpensePaise += Math.max(0, amountPaise);
  }

  const expenseLines: ProfitAndLossAccountLine[] = rawExpenseLines.map(({ acc, amountPaise }) => ({
    accountId: acc.id,
    accountCode: acc.code,
    accountName: acc.name,
    category: "EXPENSE" as const,
    amountPaise,
    amountRupees: paiseToRupees(amountPaise),
    percentageOfTotal: totalExpensePaise > 0 ? Math.round((amountPaise / totalExpensePaise) * 1000) / 10 : 0,
  }));

  const netSurplusPaise = totalIncomePaise - totalExpensePaise;
  const netSurplusRupees = paiseToRupees(netSurplusPaise);
  const operatingMarginPercentage =
    totalIncomePaise > 0 ? Math.round((netSurplusPaise / totalIncomePaise) * 1000) / 10 : 0;

  const academicYearId = options.academicYearId || "ay_2026_27";
  const startDate = options.startDate || "2026-04-01";
  const endDate = options.endDate || new Date().toISOString().split("T")[0];

  return {
    schoolId,
    schoolName: "Lord Buddha Public School",
    academicYearId,
    academicYearName: academicYearId.replace("ay_", "").replace("_", "-"),
    startDate,
    endDate,
    periodLabel: `${formatDateStr(startDate)} to ${formatDateStr(endDate)}`,
    incomeLines,
    totalIncomePaise,
    totalIncomeRupees: paiseToRupees(totalIncomePaise),
    expenseLines,
    totalExpensePaise,
    totalExpenseRupees: paiseToRupees(totalExpensePaise),
    netSurplusPaise,
    netSurplusRupees,
    operatingMarginPercentage,
    generatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// 9. Balance Sheet Statement (Statement of Financial Position)
// -------------------------------------------------------------

export async function getBalanceSheet(
  schoolId: string,
  options: AccountingFilterOptions = {}
): Promise<BalanceSheetStatement> {
  const coa = await getChartOfAccounts(schoolId);
  const journals = await getJournalEntries(schoolId, {
    academicYearId: options.academicYearId,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  // Calculate Net P&L for the same period so surplus flows into Equity
  const pnl = await getProfitAndLossStatement(schoolId, options);

  // Accumulate Debits and Credits per account
  const accountTotals = new Map<string, { debitPaise: number; creditPaise: number }>();
  coa.forEach((acc) => {
    accountTotals.set(acc.code, { debitPaise: 0, creditPaise: 0 });
  });

  for (const j of journals) {
    for (const l of j.lines) {
      const curr = accountTotals.get(l.accountCode);
      if (curr) {
        curr.debitPaise += l.debitPaise;
        curr.creditPaise += l.creditPaise;
      }
    }
  }

  // 1. ASSETS (Category: ASSET, Normal Balance: DEBIT)
  // Closing Balance = Debit - Credit
  const assetAccounts = coa.filter((a) => a.category === "ASSET");
  const assetLines: BalanceSheetAccountLine[] = [];
  let totalAssetsPaise = 0;

  for (const acc of assetAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const closingBalancePaise = totals.debitPaise - totals.creditPaise;
    totalAssetsPaise += closingBalancePaise;

    assetLines.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      category: "ASSET",
      openingBalancePaise: 0,
      openingBalanceRupees: 0,
      debitPaise: totals.debitPaise,
      debitRupees: paiseToRupees(totals.debitPaise),
      creditPaise: totals.creditPaise,
      creditRupees: paiseToRupees(totals.creditPaise),
      closingBalancePaise,
      closingBalanceRupees: paiseToRupees(closingBalancePaise),
    });
  }

  // 2. LIABILITIES (Category: LIABILITY, Normal Balance: CREDIT)
  // Closing Balance = Credit - Debit
  const liabilityAccounts = coa.filter((a) => a.category === "LIABILITY");
  const liabilityLines: BalanceSheetAccountLine[] = [];
  let totalLiabilitiesPaise = 0;

  for (const acc of liabilityAccounts) {
    const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
    const closingBalancePaise = totals.creditPaise - totals.debitPaise;
    totalLiabilitiesPaise += closingBalancePaise;

    liabilityLines.push({
      accountId: acc.id,
      accountCode: acc.code,
      accountName: acc.name,
      category: "LIABILITY",
      openingBalancePaise: 0,
      openingBalanceRupees: 0,
      debitPaise: totals.debitPaise,
      debitRupees: paiseToRupees(totals.debitPaise),
      creditPaise: totals.creditPaise,
      creditRupees: paiseToRupees(totals.creditPaise),
      closingBalancePaise,
      closingBalanceRupees: paiseToRupees(closingBalancePaise),
    });
  }

  // 3. EQUITY (Category: EQUITY, Normal Balance: CREDIT)
  // Consists of Permanent Capital/Fund (3010) + Current Year Surplus (3020) injected from P&L
  const equityAccounts = coa.filter((a) => a.category === "EQUITY");
  const equityLines: BalanceSheetAccountLine[] = [];
  let totalEquityPaise = 0;

  for (const acc of equityAccounts) {
    if (acc.code === "3020") {
      // Current Year Operating Surplus injected from P&L
      const closingBalancePaise = pnl.netSurplusPaise;
      totalEquityPaise += closingBalancePaise;
      equityLines.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        category: "EQUITY",
        openingBalancePaise: 0,
        openingBalanceRupees: 0,
        debitPaise: closingBalancePaise < 0 ? Math.abs(closingBalancePaise) : 0,
        debitRupees: paiseToRupees(closingBalancePaise < 0 ? Math.abs(closingBalancePaise) : 0),
        creditPaise: closingBalancePaise >= 0 ? closingBalancePaise : 0,
        creditRupees: paiseToRupees(closingBalancePaise >= 0 ? closingBalancePaise : 0),
        closingBalancePaise,
        closingBalanceRupees: paiseToRupees(closingBalancePaise),
      });
    } else {
      const totals = accountTotals.get(acc.code) || { debitPaise: 0, creditPaise: 0 };
      const closingBalancePaise = totals.creditPaise - totals.debitPaise;
      totalEquityPaise += closingBalancePaise;
      equityLines.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        category: "EQUITY",
        openingBalancePaise: 0,
        openingBalanceRupees: 0,
        debitPaise: totals.debitPaise,
        debitRupees: paiseToRupees(totals.debitPaise),
        creditPaise: totals.creditPaise,
        creditRupees: paiseToRupees(totals.creditPaise),
        closingBalancePaise,
        closingBalanceRupees: paiseToRupees(closingBalancePaise),
      });
    }
  }

  // Ensure 3020 is represented even if not explicitly defined in school's COA
  const hasSurplusAccount = equityLines.some((l) => l.accountCode === "3020");
  if (!hasSurplusAccount) {
    const closingBalancePaise = pnl.netSurplusPaise;
    totalEquityPaise += closingBalancePaise;
    equityLines.push({
      accountId: "acc_3020",
      accountCode: "3020",
      accountName: "Current Year Operating Surplus / (Deficit)",
      category: "EQUITY",
      openingBalancePaise: 0,
      openingBalanceRupees: 0,
      debitPaise: closingBalancePaise < 0 ? Math.abs(closingBalancePaise) : 0,
      debitRupees: paiseToRupees(closingBalancePaise < 0 ? Math.abs(closingBalancePaise) : 0),
      creditPaise: closingBalancePaise >= 0 ? closingBalancePaise : 0,
      creditRupees: paiseToRupees(closingBalancePaise >= 0 ? closingBalancePaise : 0),
      closingBalancePaise,
      closingBalanceRupees: paiseToRupees(closingBalancePaise),
    });
  }

  const totalLiabilitiesAndEquityPaise = totalLiabilitiesPaise + totalEquityPaise;
  const differencePaise = Math.abs(totalAssetsPaise - totalLiabilitiesAndEquityPaise);
  const differenceRupees = paiseToRupees(differencePaise);
  const isBalanced = differencePaise === 0;

  const academicYearId = options.academicYearId || "ay_2026_27";
  const asOfDate = options.endDate || new Date().toISOString().split("T")[0];

  const reconciliationNotes = isBalanced
    ? `Accounting Equation Verified: Total Assets (₹${paiseToRupees(totalAssetsPaise)}) = Total Liabilities (₹${paiseToRupees(totalLiabilitiesPaise)}) + Total Equity (₹${paiseToRupees(totalEquityPaise)}). Strict zero-variance double-entry reconciliation.`
    : `Accounting Reconciliation Error: Total Assets (₹${paiseToRupees(totalAssetsPaise)}) differ from Total Liabilities & Equity (₹${paiseToRupees(totalLiabilitiesAndEquityPaise)}) by ₹${differenceRupees}. Review unbalanced vouchers or historical entries.`;

  return {
    schoolId,
    schoolName: "Lord Buddha Public School",
    academicYearId,
    academicYearName: academicYearId.replace("ay_", "").replace("_", "-"),
    asOfDate,
    assets: {
      title: "Assets (Application of Funds)",
      category: "ASSET",
      lines: assetLines,
      totalClosingPaise: totalAssetsPaise,
      totalClosingRupees: paiseToRupees(totalAssetsPaise),
    },
    liabilities: {
      title: "Liabilities (External Claims)",
      category: "LIABILITY",
      lines: liabilityLines,
      totalClosingPaise: totalLiabilitiesPaise,
      totalClosingRupees: paiseToRupees(totalLiabilitiesPaise),
    },
    equity: {
      title: "Equity & Operating Reserves (Capital)",
      category: "EQUITY",
      lines: equityLines,
      totalClosingPaise: totalEquityPaise,
      totalClosingRupees: paiseToRupees(totalEquityPaise),
    },
    totalAssetsPaise,
    totalAssetsRupees: paiseToRupees(totalAssetsPaise),
    totalLiabilitiesPaise,
    totalLiabilitiesRupees: paiseToRupees(totalLiabilitiesPaise),
    totalEquityPaise,
    totalEquityRupees: paiseToRupees(totalEquityPaise),
    totalLiabilitiesAndEquityPaise,
    totalLiabilitiesAndEquityRupees: paiseToRupees(totalLiabilitiesAndEquityPaise),
    differencePaise,
    differenceRupees,
    isBalanced,
    reconciliationNotes,
    generatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// 10. Multi-Session Comparison Engine
// -------------------------------------------------------------

function makeComparisonItem(label: string, basePaise: number, compPaise: number): FinancialComparisonItem {
  const baseRupees = paiseToRupees(basePaise);
  const compRupees = paiseToRupees(compPaise);
  const varianceRupees = baseRupees - compRupees;
  let variancePercentage = 0;
  if (compRupees !== 0) {
    variancePercentage = Math.round(((varianceRupees) / Math.abs(compRupees)) * 1000) / 10;
  } else if (baseRupees > 0) {
    variancePercentage = 100;
  }
  return {
    label,
    baseValuePaise: basePaise,
    baseValueRupees: baseRupees,
    compareValuePaise: compPaise,
    compareValueRupees: compRupees,
    varianceRupees,
    variancePercentage,
  };
}

export async function getFinancialStatementsComparison(
  schoolId: string,
  baseYearId: string,
  compareYearId: string
): Promise<FinancialStatementComparison> {
  const [basePnl, compPnl, baseBs, compBs] = await Promise.all([
    getProfitAndLossStatement(schoolId, { academicYearId: baseYearId }),
    getProfitAndLossStatement(schoolId, { academicYearId: compareYearId }),
    getBalanceSheet(schoolId, { academicYearId: baseYearId }),
    getBalanceSheet(schoolId, { academicYearId: compareYearId }),
  ]);

  // Compare Incomes
  const allIncomeCodes = Array.from(
    new Set([
      ...basePnl.incomeLines.map((l) => l.accountCode),
      ...compPnl.incomeLines.map((l) => l.accountCode),
    ])
  );
  const incomeComparison: FinancialComparisonItem[] = allIncomeCodes.map((code) => {
    const baseLine = basePnl.incomeLines.find((l) => l.accountCode === code);
    const compLine = compPnl.incomeLines.find((l) => l.accountCode === code);
    const label = baseLine?.accountName || compLine?.accountName || code;
    return makeComparisonItem(label, baseLine?.amountPaise || 0, compLine?.amountPaise || 0);
  });

  // Compare Expenses
  const allExpenseCodes = Array.from(
    new Set([
      ...basePnl.expenseLines.map((l) => l.accountCode),
      ...compPnl.expenseLines.map((l) => l.accountCode),
    ])
  );
  const expenseComparison: FinancialComparisonItem[] = allExpenseCodes.map((code) => {
    const baseLine = basePnl.expenseLines.find((l) => l.accountCode === code);
    const compLine = compPnl.expenseLines.find((l) => l.accountCode === code);
    const label = baseLine?.accountName || compLine?.accountName || code;
    return makeComparisonItem(label, baseLine?.amountPaise || 0, compLine?.amountPaise || 0);
  });

  // Compare Assets
  const allAssetCodes = Array.from(
    new Set([
      ...baseBs.assets.lines.map((l) => l.accountCode),
      ...compBs.assets.lines.map((l) => l.accountCode),
    ])
  );
  const assetComparison: FinancialComparisonItem[] = allAssetCodes.map((code) => {
    const baseLine = baseBs.assets.lines.find((l) => l.accountCode === code);
    const compLine = compBs.assets.lines.find((l) => l.accountCode === code);
    const label = baseLine?.accountName || compLine?.accountName || code;
    return makeComparisonItem(label, baseLine?.closingBalancePaise || 0, compLine?.closingBalancePaise || 0);
  });

  // Compare Liabilities
  const allLiabCodes = Array.from(
    new Set([
      ...baseBs.liabilities.lines.map((l) => l.accountCode),
      ...compBs.liabilities.lines.map((l) => l.accountCode),
    ])
  );
  const liabilityComparison: FinancialComparisonItem[] = allLiabCodes.map((code) => {
    const baseLine = baseBs.liabilities.lines.find((l) => l.accountCode === code);
    const compLine = compBs.liabilities.lines.find((l) => l.accountCode === code);
    const label = baseLine?.accountName || compLine?.accountName || code;
    return makeComparisonItem(label, baseLine?.closingBalancePaise || 0, compLine?.closingBalancePaise || 0);
  });

  return {
    schoolId,
    baseYearId,
    baseYearName: baseYearId.replace("ay_", "").replace("_", "-"),
    compareYearId,
    compareYearName: compareYearId.replace("ay_", "").replace("_", "-"),
    incomeComparison,
    expenseComparison,
    assetComparison,
    liabilityComparison,
    summary: {
      totalIncome: makeComparisonItem("Total Operating Revenue", basePnl.totalIncomePaise, compPnl.totalIncomePaise),
      totalExpenses: makeComparisonItem("Total Operating Expenses", basePnl.totalExpensePaise, compPnl.totalExpensePaise),
      netSurplus: makeComparisonItem("Net Surplus / (Deficit)", basePnl.netSurplusPaise, compPnl.netSurplusPaise),
      totalAssets: makeComparisonItem("Total Institutional Assets", baseBs.totalAssetsPaise, compBs.totalAssetsPaise),
      totalLiabilities: makeComparisonItem("Total Liabilities", baseBs.totalLiabilitiesPaise, compBs.totalLiabilitiesPaise),
    },
  };
}

// -------------------------------------------------------------
// 11. Statement Export Helpers (CSV)
// -------------------------------------------------------------

export function exportProfitAndLossToCsv(pnl: ProfitAndLossStatement, schoolName: string): string {
  const rows: string[][] = [
    [schoolName],
    ["STATEMENT OF PROFIT AND LOSS (INCOME & EXPENDITURE)"],
    [`Period: ${pnl.periodLabel}`, `Academic Year: ${pnl.academicYearName}`],
    [`Generated: ${formatDateStr(pnl.generatedAt)}`],
    [],
    ["CATEGORY", "ACCOUNT CODE", "ACCOUNT NAME", "AMOUNT (INR)", "% OF TOTAL"],
    ["--- REVENUE / INCOME ---"],
  ];

  for (const line of pnl.incomeLines) {
    rows.push(["Revenue", line.accountCode, `"${line.accountName}"`, line.amountRupees.toFixed(2), `${line.percentageOfTotal}%`]);
  }
  rows.push(["TOTAL REVENUE", "", "", pnl.totalIncomeRupees.toFixed(2), "100.0%"]);
  rows.push([]);
  rows.push(["--- OPERATING EXPENSES ---"]);

  for (const line of pnl.expenseLines) {
    rows.push(["Expense", line.accountCode, `"${line.accountName}"`, line.amountRupees.toFixed(2), `${line.percentageOfTotal}%`]);
  }
  rows.push(["TOTAL EXPENSES", "", "", pnl.totalExpenseRupees.toFixed(2), "100.0%"]);
  rows.push([]);
  rows.push(["NET OPERATING SURPLUS / (DEFICIT)", "", "", pnl.netSurplusRupees.toFixed(2), `${pnl.operatingMarginPercentage}% Margin`]);

  return rows.map((r) => r.join(",")).join("\n");
}

export function exportBalanceSheetToCsv(bs: BalanceSheetStatement, schoolName: string): string {
  const rows: string[][] = [
    [schoolName],
    ["STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)"],
    [`As of Date: ${formatDateStr(bs.asOfDate)}`, `Academic Year: ${bs.academicYearName}`],
    [`Generated: ${formatDateStr(bs.generatedAt)}`],
    [`Double Entry Verification: ${bs.isBalanced ? "BALANCED" : "IMBALANCE DETECTED"}`],
    [],
    ["SECTION", "ACCOUNT CODE", "ACCOUNT NAME", "DEBIT (INR)", "CREDIT (INR)", "CLOSING (INR)"],
    ["--- 1. ASSETS ---"],
  ];

  for (const line of bs.assets.lines) {
    rows.push(["Assets", line.accountCode, `"${line.accountName}"`, line.debitRupees.toFixed(2), line.creditRupees.toFixed(2), line.closingBalanceRupees.toFixed(2)]);
  }
  rows.push(["TOTAL INSTITUTIONAL ASSETS", "", "", "", "", bs.totalAssetsRupees.toFixed(2)]);
  rows.push([]);
  rows.push(["--- 2. LIABILITIES ---"]);

  for (const line of bs.liabilities.lines) {
    rows.push(["Liabilities", line.accountCode, `"${line.accountName}"`, line.debitRupees.toFixed(2), line.creditRupees.toFixed(2), line.closingBalanceRupees.toFixed(2)]);
  }
  rows.push(["TOTAL LIABILITIES", "", "", "", "", bs.totalLiabilitiesRupees.toFixed(2)]);
  rows.push([]);
  rows.push(["--- 3. EQUITY & CAPITAL RESERVES ---"]);

  for (const line of bs.equity.lines) {
    rows.push(["Equity", line.accountCode, `"${line.accountName}"`, line.debitRupees.toFixed(2), line.creditRupees.toFixed(2), line.closingBalanceRupees.toFixed(2)]);
  }
  rows.push(["TOTAL EQUITY & CAPITAL", "", "", "", "", bs.totalEquityRupees.toFixed(2)]);
  rows.push([]);
  rows.push(["TOTAL LIABILITIES & EQUITY", "", "", "", "", bs.totalLiabilitiesAndEquityRupees.toFixed(2)]);
  rows.push(["ACCOUNTING EQUATION DIFFERENCE", "", "", "", "", bs.differenceRupees.toFixed(2)]);

  return rows.map((r) => r.join(",")).join("\n");
}

