import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface FeeReceiptPDFData {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAffiliation?: string;
  receiptNumber: string;
  paymentDate: string; // YYYY-MM-DD or formatted
  paymentTime?: string;
  studentName: string;
  studentIdOrAdmissionNo: string;
  rollNumber?: number | string;
  className: string;
  sectionName?: string;
  guardianName?: string;
  guardianPhone?: string;
  feeMonth: string; // e.g. "October, 2026"
  paymentMethod: string;
  transactionRef?: string;
  cashierName?: string;
  items: Array<{
    sr: number;
    particulars: string;
    amount: number;
  }>;
  totalAmount: number;
  depositAmount: number;
  remainingBalance: number;
  discountAmount?: number;
  fineAmount?: number;
  remarks?: string;
}

export interface FeeInvoicePDFData {
  schoolName: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolAffiliation?: string;
  invoiceNumber: string;
  feeMonth: string;
  dueDate: string;
  fineAfterDueDate: number;
  bankName: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  studentName: string;
  registrationNo: string;
  rollNumber?: number | string;
  className: string;
  sectionName?: string;
  guardianName?: string;
  guardianPhone?: string;
  items: Array<{
    sr: number;
    particulars: string;
    amount: number;
  }>;
  totalAmount: number;
  copies: {
    bankCopy: boolean;
    studentCopy: boolean;
    instituteCopy: boolean;
  };
}

/**
 * Converts numbers to Indian currency words (e.g. 400 -> Rupees Four Hundred Only)
 */
export function numberToWords(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return "Rupees Zero Only";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore > 0) result += inWords(crore) + "Crore ";
  if (lakh > 0) result += inWords(lakh) + "Lakh ";
  if (thousand > 0) result += inWords(thousand) + "Thousand ";
  if (rem > 0) result += inWords(rem);

  return `Rupees ${result.trim()} Only`;
}

/**
 * Generates an official, publication-quality A4 Fee Payment Receipt PDF
 */
export function generateProfessionalFeeReceiptPDF(data: FeeReceiptPDFData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Background Outer Border
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Decorative Header Ribbon
  doc.setFillColor(30, 58, 138); // Deep Navy
  doc.rect(margin + 0.8, margin + 0.8, pageWidth - margin * 2 - 1.6, 26, "F");

  // School Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.schoolName.toUpperCase(), pageWidth / 2, margin + 10, { align: "center" });

  // Affiliation / Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const sub = data.schoolAffiliation || "Recognized & Affiliated Educational Institution";
  doc.text(sub, pageWidth / 2, margin + 16, { align: "center" });

  // Address & Contact
  const contact = [
    data.schoolAddress || "Institutional Area, Main Campus",
    data.schoolPhone ? `Phone: ${data.schoolPhone}` : "",
    data.schoolEmail ? `Email: ${data.schoolEmail}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  doc.setFontSize(7.5);
  doc.text(contact, pageWidth / 2, margin + 21, { align: "center" });

  // Sub-header Banner: FEE PAYMENT RECEIPT
  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 1, margin + 27, pageWidth - margin * 2 - 2, 9, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("OFFICIAL FEE RECEIPT / PAYMENT ACKNOWLEDGEMENT", pageWidth / 2, margin + 33, {
    align: "center",
  });

  // Metadata Box (Receipt No, Date, Time, Payment Mode)
  const metaY = margin + 38;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 2, metaY, pageWidth - margin * 2 - 4, 18, "FD");

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Receipt No:", margin + 6, metaY + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.receiptNumber, margin + 26, metaY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Date & Time:", margin + 6, metaY + 13);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const timeStr = data.paymentTime ? ` at ${data.paymentTime}` : "";
  doc.text(`${data.paymentDate}${timeStr}`, margin + 26, metaY + 13);

  // Right Side of Metadata
  const colRightX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Fee Month:", colRightX, metaY + 6);
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.text(data.feeMonth, colRightX + 22, metaY + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Payment Mode:", colRightX, metaY + 13);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const txn = data.transactionRef ? ` (${data.transactionRef})` : "";
  doc.text(`${data.paymentMethod}${txn}`, colRightX + 24, metaY + 13);

  // Student Information Box
  const stuY = metaY + 21;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 2, stuY, pageWidth - margin * 2 - 4, 22, "FD");

  // Row 1
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Student Name:", margin + 6, stuY + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(data.studentName, margin + 28, stuY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Registration / ID:", colRightX, stuY + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentIdOrAdmissionNo, colRightX + 28, stuY + 6);

  // Row 2
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Class & Section:", margin + 6, stuY + 14);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  const clsSec = `${data.className}${data.sectionName ? ` - ${data.sectionName}` : ""}${
    data.rollNumber !== undefined ? ` (Roll: ${data.rollNumber})` : ""
  }`;
  doc.text(clsSec, margin + 28, stuY + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Guardian Name:", colRightX, stuY + 14);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(data.guardianName || "N/A", colRightX + 28, stuY + 14);

  // Particulars Table via autoTable
  const tableStartY = stuY + 25;
  const tableRows = data.items.map((it) => [
    it.sr,
    it.particulars,
    `INR ${it.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin + 2, right: margin + 2 },
    head: [["Sr.", "Particulars Description", "Amount (INR)"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { halign: "left" },
      2: { cellWidth: 38, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Table Final Y
  const finalY = (doc as any).lastAutoTable.finalY + 3;

  // Financial Totals Summary Box
  const summaryBoxY = finalY;
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - 2 - summaryBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, 32, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);

  doc.text("Total Gross Fee:", summaryBoxX + 4, summaryBoxY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`INR ${data.totalAmount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 6, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Discount / Concession:", summaryBoxX + 4, summaryBoxY + 12);
  doc.setFont("helvetica", "bold");
  doc.text(`INR ${(data.discountAmount || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 12, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(22, 101, 52); // green
  doc.text("Amount Deposited:", summaryBoxX + 4, summaryBoxY + 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`INR ${data.depositAmount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 19, {
    align: "right",
  });

  // Remaining Due Balance
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(data.remainingBalance > 0 ? 185 : 71, data.remainingBalance > 0 ? 28 : 85, data.remainingBalance > 0 ? 28 : 105);
  doc.text("Due Balance:", summaryBoxX + 4, summaryBoxY + 27);
  doc.text(`INR ${data.remainingBalance.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 4, summaryBoxY + 27, {
    align: "right",
  });

  // Left side: Amount in Words & Status Stamp
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Amount in Words:", margin + 6, summaryBoxY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const words = numberToWords(data.depositAmount);
  doc.text(words, margin + 6, summaryBoxY + 12);

  // Status Stamp Box
  const isPaid = data.remainingBalance <= 0;
  doc.setDrawColor(isPaid ? 22 : 217, isPaid ? 101 : 119, isPaid ? 52 : 6);
  doc.setLineWidth(0.6);
  doc.setFillColor(isPaid ? 240 : 254, isPaid ? 253 : 242, isPaid ? 244 : 242);
  doc.roundedRect(margin + 6, summaryBoxY + 17, 44, 12, 2, 2, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPaid ? 22 : 185, isPaid ? 101 : 28, isPaid ? 52 : 28);
  doc.text(isPaid ? "FULLY PAID" : "PARTIAL PAID", margin + 28, summaryBoxY + 24.5, { align: "center" });

  // Signatory & Stamp Box
  const signY = pageHeight - margin - 22;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Cashier Line
  doc.line(margin + 12, signY + 10, margin + 60, signY + 10);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Cashier / Accountant Signature", margin + 36, signY + 14, { align: "center" });

  // School Seal Area
  doc.text("Authorized School Seal", pageWidth / 2, signY + 14, { align: "center" });

  // Principal Line
  doc.line(pageWidth - margin - 60, signY + 10, pageWidth - margin - 12, signY + 10);
  doc.text("Principal / Director Signature", pageWidth - margin - 36, signY + 14, { align: "center" });

  // Bottom Notice
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is an official computer-generated fee receipt issued by SchoolStudy ERP. Valid without manual alteration.",
    pageWidth / 2,
    pageHeight - margin - 3,
    { align: "center" }
  );

  return doc;
}

/**
 * Generates an official 3-Voucher Fee Invoice / Bank Challan (Bank Copy, Student Copy, Institute Copy)
 */
export function generateThreeCopyFeeInvoicePDF(data: FeeInvoicePDFData): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const copiesCount = 3;
  const colWidth = (pageWidth - margin * 2) / copiesCount;

  const copyLabels = ["BANK COPY", "STUDENT COPY", "INSTITUTE COPY"];

  copyLabels.forEach((label, idx) => {
    const colLeft = margin + idx * colWidth;
    const colRight = colLeft + colWidth;

    // Draw Column Border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(colLeft + 1, margin, colWidth - 2, pageHeight - margin * 2);

    // Header Ribbon
    doc.setFillColor(30, 58, 138);
    doc.rect(colLeft + 1.2, margin + 0.2, colWidth - 2.4, 14, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(data.schoolName.toUpperCase(), colLeft + colWidth / 2, margin + 6, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`--- ${label} ---`, colLeft + colWidth / 2, margin + 11, { align: "center" });

    // Bank Details
    let curY = margin + 18;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(6.8);
    doc.text(`Bank: ${data.bankName}`, colLeft + 3, curY);
    if (data.bankAccountNumber) {
      doc.text(`A/c: ${data.bankAccountNumber}`, colLeft + 3, curY + 4);
      curY += 4;
    }
    curY += 5;

    // Challan Metadata
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(colLeft + 3, curY, colWidth - 6, 12, "FD");

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Invoice No:", colLeft + 5, curY + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.invoiceNumber, colLeft + 22, curY + 4);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Month:", colLeft + 5, curY + 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(data.feeMonth, colLeft + 16, curY + 9);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Due Date:", colLeft + colWidth - 28, curY + 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(data.dueDate, colLeft + colWidth - 5, curY + 9, { align: "right" });

    curY += 15;

    // Student Info
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: `, colLeft + 3, curY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.studentName, colLeft + 14, curY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Reg: `, colLeft + colWidth - 25, curY);
    doc.setFont("helvetica", "bold");
    doc.text(data.registrationNo, colLeft + colWidth - 5, curY, { align: "right" });

    curY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Class: ${data.className} ${data.sectionName || ""}`, colLeft + 3, curY);
    doc.text(`Parent: ${data.guardianName || "N/A"}`, colLeft + colWidth - 5, curY, { align: "right" });

    curY += 4;

    // Particulars Table for this copy
    const copyTableRows = data.items.map((it) => [it.particulars, `${it.amount.toFixed(0)}`]);

    autoTable(doc, {
      startY: curY,
      margin: { left: colLeft + 3, right: pageWidth - colRight + 3 },
      head: [["Particulars", "INR"]],
      body: copyTableRows,
      theme: "plain",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 58, 138],
        fontStyle: "bold",
        fontSize: 6.5,
      },
      styles: {
        fontSize: 6.2,
        cellPadding: 1.2,
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { halign: "left" },
        1: { cellWidth: 16, halign: "right", fontStyle: "bold" },
      },
    });

    const subFinalY = (doc as any).lastAutoTable.finalY + 2;

    // Total Amount Box
    doc.setFillColor(241, 245, 249);
    doc.rect(colLeft + 3, subFinalY, colWidth - 6, 12, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Total Payable:", colLeft + 5, subFinalY + 5);
    doc.text(`INR ${data.totalAmount.toFixed(2)}`, colLeft + colWidth - 5, subFinalY + 5, {
      align: "right",
    });

    if (data.fineAfterDueDate > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(220, 38, 38);
      doc.text(
        `After Due Date (+Fine INR ${data.fineAfterDueDate}): INR ${(
          data.totalAmount + data.fineAfterDueDate
        ).toFixed(2)}`,
        colLeft + 5,
        subFinalY + 10
      );
    }

    // Signatures Area
    const signBoxY = pageHeight - margin - 16;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);

    doc.line(colLeft + 5, signBoxY + 8, colLeft + 26, signBoxY + 8);
    doc.text("Depositor Sign", colLeft + 15, signBoxY + 11, { align: "center" });

    doc.line(colLeft + colWidth - 26, signBoxY + 8, colLeft + colWidth - 5, signBoxY + 8);
    doc.text("Bank Cashier Seal", colLeft + colWidth - 15, signBoxY + 11, { align: "center" });
  });

  return doc;
}
