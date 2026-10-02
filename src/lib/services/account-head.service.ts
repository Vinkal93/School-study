import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "./pdf-invoice-receipt.service";

export interface AccountHead {
  id: string;
  numericId: number;
  schoolId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface AccountTransaction {
  id: string;
  voucherNo: string;
  schoolId: string;
  headId: string;
  headName: string;
  type: "INCOME" | "EXPENSE";
  date: string;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other";
  referenceNo?: string;
  partyName?: string; // Payer for Income, Payee for Expense
  remarks?: string;
  createdAt: string;
}

const DEFAULT_INITIAL_HEADS: Array<{ numericId: number; name: string; type: "INCOME" | "EXPENSE" }> = [
  { numericId: 29727, name: "Electricity Bill", type: "EXPENSE" },
  { numericId: 29728, name: "Generator Fuel & Diesel", type: "EXPENSE" },
  { numericId: 29729, name: "Fuel", type: "EXPENSE" },
  { numericId: 29730, name: "School Maintenance & Repairs", type: "EXPENSE" },
  { numericId: 29731, name: "Office Stationery & Printing", type: "EXPENSE" },
  { numericId: 29732, name: "Staff Welfare & Refreshment", type: "EXPENSE" },
  { numericId: 29733, name: "Internet & Digital Infrastructure", type: "EXPENSE" },
  { numericId: 29734, name: "School Canteen Rent", type: "INCOME" },
  { numericId: 29735, name: "Donations & Educational Grants", type: "INCOME" },
  { numericId: 29736, name: "Book Store & Stationery Sale", type: "INCOME" },
  { numericId: 29737, name: "Uniform Store Sale", type: "INCOME" },
  { numericId: 29738, name: "Transport Facility Fee", type: "INCOME" },
];

/**
 * Fetch all account heads for a school. Automatically seeds defaults if empty.
 */
export async function getAccountHeads(schoolId: string): Promise<AccountHead[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return DEFAULT_INITIAL_HEADS.map(h => ({
    id: `head_${h.numericId}`,
    numericId: h.numericId,
    schoolId: schoolId || "default",
    name: h.name,
    type: h.type,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  }));

  try {
    const headsRef = collection(db, "schools", schoolId, "accountHeads");
    const snap = await getDocs(headsRef);

    if (snap.empty) {
      // Seed default heads
      const seeded: AccountHead[] = [];
      for (const h of DEFAULT_INITIAL_HEADS) {
        const docId = `head_${h.numericId}`;
        const newHead: AccountHead = {
          id: docId,
          numericId: h.numericId,
          schoolId,
          name: h.name,
          type: h.type,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(headsRef, docId), newHead).catch(() => {});
        seeded.push(newHead);
      }
      return seeded;
    }

    return snap.docs
      .map((d) => d.data() as AccountHead)
      .sort((a, b) => a.numericId - b.numericId);
  } catch (err) {
    console.error("Error loading account heads:", err);
    return DEFAULT_INITIAL_HEADS.map(h => ({
      id: `head_${h.numericId}`,
      numericId: h.numericId,
      schoolId,
      name: h.name,
      type: h.type,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    }));
  }
}

/**
 * Create a new account head (Income or Expense)
 */
export async function createAccountHead(
  schoolId: string,
  name: string,
  type: "INCOME" | "EXPENSE"
): Promise<AccountHead> {
  const db = getFirebaseDb();
  const numericId = Math.floor(29700 + Math.random() * 9000);
  const docId = `head_${numericId}_${Date.now()}`;

  const newHead: AccountHead = {
    id: docId,
    numericId,
    schoolId,
    name: name.trim(),
    type,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };

  if (db && schoolId) {
    await setDoc(doc(db, "schools", schoolId, "accountHeads", docId), newHead);
  }

  return newHead;
}

/**
 * Delete an account head
 */
export async function deleteAccountHead(schoolId: string, headId: string): Promise<void> {
  const db = getFirebaseDb();
  if (db && schoolId) {
    await deleteDoc(doc(db, "schools", schoolId, "accountHeads", headId));
  }
}

/**
 * Fetch Account Transactions (Incomes and Expenses)
 */
export async function getAccountTransactions(
  schoolId: string,
  filter?: {
    type?: "INCOME" | "EXPENSE" | "ALL";
    headId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AccountTransaction[]> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return [];

  try {
    const txnsRef = collection(db, "schools", schoolId, "accountTransactions");
    const snap = await getDocs(txnsRef);

    let list = snap.docs.map((d) => d.data() as AccountTransaction);

    if (filter?.type && filter.type !== "ALL") {
      list = list.filter((t) => t.type === filter.type);
    }
    if (filter?.headId && filter.headId !== "all") {
      list = list.filter((t) => t.headId === filter.headId);
    }
    if (filter?.startDate) {
      list = list.filter((t) => t.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      list = list.filter((t) => t.date <= filter.endDate!);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error("Error loading account transactions:", err);
    return [];
  }
}

/**
 * Record Income or Expense Transaction
 */
export async function recordAccountTransaction(
  schoolId: string,
  input: {
    headId: string;
    headName: string;
    type: "INCOME" | "EXPENSE";
    date: string;
    amount: number;
    paymentMethod: AccountTransaction["paymentMethod"];
    referenceNo?: string;
    partyName?: string;
    remarks?: string;
  }
): Promise<AccountTransaction> {
  const db = getFirebaseDb();
  const prefix = input.type === "INCOME" ? "INC" : "EXP";
  const num = Math.floor(10000 + Math.random() * 90000);
  const voucherNo = `${prefix}-${new Date(input.date).getFullYear()}-${num}`;
  const docId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newTxn: AccountTransaction = {
    id: docId,
    voucherNo,
    schoolId,
    headId: input.headId,
    headName: input.headName,
    type: input.type,
    date: input.date,
    amount: Math.max(0, input.amount),
    paymentMethod: input.paymentMethod,
    referenceNo: input.referenceNo?.trim() || undefined,
    partyName: input.partyName?.trim() || undefined,
    remarks: input.remarks?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (db && schoolId) {
    await setDoc(doc(db, "schools", schoolId, "accountTransactions", docId), newTxn);
  }

  return newTxn;
}

/**
 * Generates high-res Vector PDF Statement for Accounts
 */
export function generateAccountStatementPDF(params: {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  startDate: string;
  endDate: string;
  transactions: AccountTransaction[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Outer Border
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Top Ribbon
  doc.setFillColor(30, 58, 138); // Deep Navy
  doc.rect(margin + 0.6, margin + 0.6, pageWidth - margin * 2 - 1.2, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(params.schoolName.toUpperCase(), pageWidth / 2, margin + 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(params.schoolAddress || "Institutional Area, Main Campus", pageWidth / 2, margin + 15, {
    align: "center",
  });
  if (params.schoolPhone) {
    doc.setFontSize(7.5);
    doc.text(`Phone: ${params.schoolPhone}`, pageWidth / 2, margin + 20, { align: "center" });
  }

  // Header Title
  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 1, margin + 25.5, pageWidth - margin * 2 - 2, 9, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ACCOUNT STATEMENT & GENERAL LEDGER REPORT", pageWidth / 2, margin + 31.5, {
    align: "center",
  });

  // Statement Meta Bar
  const metaY = margin + 37;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 2, metaY, pageWidth - margin * 2 - 4, 11, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Reporting Period:", margin + 6, metaY + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${params.startDate} to ${params.endDate}`, margin + 32, metaY + 7);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Generated On:", pageWidth - margin - 55, metaY + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("en-IN"), pageWidth - margin - 6, metaY + 7, {
    align: "right",
  });

  // 3 Metric KPI Summary Cards
  const kpiY = metaY + 14;
  const kpiWidth = (pageWidth - margin * 2 - 8) / 3;

  // Total Income
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.rect(margin + 2, kpiY, kpiWidth, 16, "FD");
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text("Total Income (+)", margin + 6, kpiY + 5.5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${params.totalIncome.toFixed(2)}`, margin + 6, kpiY + 12);

  // Total Expense
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.rect(margin + 4 + kpiWidth, kpiY, kpiWidth, 16, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(153, 27, 27);
  doc.text("Total Expense (-)", margin + 8 + kpiWidth, kpiY + 5.5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${params.totalExpense.toFixed(2)}`, margin + 8 + kpiWidth, kpiY + 12);

  // Net Balance
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(margin + 6 + kpiWidth * 2, kpiY, kpiWidth, 16, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 64, 175);
  doc.text("Net Surplus / Balance", margin + 10 + kpiWidth * 2, kpiY + 5.5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${params.netBalance.toFixed(2)}`, margin + 10 + kpiWidth * 2, kpiY + 12);

  // Chronological Table
  let runningBal = 0;
  const tableRows = params.transactions.map((t, idx) => {
    const isInc = t.type === "INCOME";
    const debit = !isInc ? `INR ${t.amount.toFixed(2)}` : "-";
    const credit = isInc ? `INR ${t.amount.toFixed(2)}` : "-";
    runningBal += isInc ? t.amount : -t.amount;

    return [
      idx + 1,
      t.date,
      t.voucherNo,
      t.headName,
      t.partyName || t.remarks || "Regular Entry",
      t.paymentMethod,
      debit,
      credit,
      `INR ${runningBal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: kpiY + 20,
    margin: { left: margin + 2, right: margin + 2 },
    head: [
      [
        "#",
        "Date",
        "Voucher",
        "Account Head",
        "Particulars / Party",
        "Mode",
        "Debit (Exp)",
        "Credit (Inc)",
        "Balance",
      ],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.2,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 24, fontStyle: "bold" },
      3: { cellWidth: 32 },
      4: { halign: "left" },
      5: { cellWidth: 16 },
      6: { cellWidth: 20, halign: "right", textColor: [185, 28, 28] },
      7: { cellWidth: 20, halign: "right", textColor: [22, 101, 52] },
      8: { cellWidth: 22, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer Signatures
  const signY = pageHeight - margin - 18;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 10, signY + 8, margin + 55, signY + 8);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Prepared by Accountant", margin + 18, signY + 12);

  doc.line(pageWidth - margin - 55, signY + 8, pageWidth - margin - 10, signY + 8);
  doc.text("Authorized Signatory / Principal", pageWidth - margin - 50, signY + 12);

  return doc;
}

/**
 * Generates an Individual Payment/Expense Voucher PDF
 */
export function generateAccountVoucherPDF(params: {
  schoolName: string;
  schoolAddress?: string;
  transaction: AccountTransaction;
}): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // Crisp A5 voucher
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const isIncome = params.transaction.type === "INCOME";

  // Border
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Header Ribbon
  doc.setFillColor(30, 58, 138);
  doc.rect(margin + 0.4, margin + 0.4, pageWidth - margin * 2 - 0.8, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(params.schoolName.toUpperCase(), pageWidth / 2, margin + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(params.schoolAddress || "Institutional Area, Main Campus", pageWidth / 2, margin + 13, {
    align: "center",
  });

  // Voucher Title
  doc.setFillColor(isIncome ? 240 : 254, isIncome ? 253 : 242, isIncome ? 244 : 242);
  doc.rect(margin + 1, margin + 19, pageWidth - margin * 2 - 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(isIncome ? 22 : 185, isIncome ? 101 : 28, isIncome ? 52 : 28);
  doc.text(
    isIncome ? "OFFICIAL REVENUE / INCOME VOUCHER" : "OFFICIAL PAYMENT / EXPENSE VOUCHER",
    pageWidth / 2,
    margin + 24,
    { align: "center" }
  );

  // Meta Box
  const metaY = margin + 29;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 2, metaY, pageWidth - margin * 2 - 4, 16, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Voucher No:", margin + 5, metaY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(params.transaction.voucherNo, margin + 25, metaY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Date:", pageWidth - margin - 35, metaY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(params.transaction.date, pageWidth - margin - 5, metaY + 5.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Payment Mode:", margin + 5, metaY + 11.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const ref = params.transaction.referenceNo ? ` (${params.transaction.referenceNo})` : "";
  doc.text(`${params.transaction.paymentMethod}${ref}`, margin + 25, metaY + 11.5);

  // Details
  const detY = metaY + 20;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Account Head:", margin + 5, detY + 5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(params.transaction.headName, margin + 30, detY + 5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(isIncome ? "Received From:" : "Paid To / Payee:", margin + 5, detY + 12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(params.transaction.partyName || "Official Accounting Entry", margin + 30, detY + 12);

  if (params.transaction.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Description:", margin + 5, detY + 19);
    doc.setTextColor(15, 23, 42);
    doc.text(params.transaction.remarks, margin + 30, detY + 19);
  }

  // Amount Box
  const amtY = detY + 27;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 5, amtY, pageWidth - margin * 2 - 10, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Amount Total:", margin + 8, amtY + 9);
  doc.setFontSize(12);
  doc.setTextColor(isIncome ? 22 : 185, isIncome ? 101 : 28, isIncome ? 52 : 28);
  doc.text(`INR ${params.transaction.amount.toFixed(2)}`, pageWidth - margin - 8, amtY + 9.5, {
    align: "right",
  });

  // Words
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(71, 85, 105);
  doc.text(numberToWords(params.transaction.amount), margin + 5, amtY + 20);

  // Signatures
  const signY = pageHeight - margin - 15;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, signY + 6, margin + 35, signY + 6);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Receiver / Payee Sign", margin + 8, signY + 10);

  doc.line(pageWidth - margin - 35, signY + 6, pageWidth - margin - 5, signY + 6);
  doc.text("Authorized Signature", pageWidth - margin - 32, signY + 10);

  return doc;
}
