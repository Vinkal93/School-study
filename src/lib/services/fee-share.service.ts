import type { StudentFeeSummary } from "./fee.service";

export type FeeShareMode = "FULL_DUE" | "CURRENT_MONTH" | "PAYMENT_REMINDER" | "PAYMENT_HISTORY";

export interface FormatFeeShareParams {
  schoolName: string;
  schoolPhone?: string;
  schoolEmail?: string;
  upiId?: string;
  upiNumber?: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: number | string;
  className: string;
  sectionName?: string;
  phone?: string;
  mode: FeeShareMode;
  summary: StudentFeeSummary;
}

/**
 * Generates an authoritative UPI deep payment link using configured school UPI ID
 * and the student's dynamic outstanding dues amount.
 */
export function generateUpiPayLink(params: {
  upiId: string;
  schoolName: string;
  amountRupees?: number;
  amountPaise?: number;
  studentName: string;
  admissionNumber: string;
}): string {
  if (!params.upiId) return "";
  const rupees = params.amountRupees !== undefined
    ? params.amountRupees
    : params.amountPaise !== undefined
    ? params.amountPaise / 100
    : 0;

  if (rupees <= 0) return "";
  const pa = encodeURIComponent(params.upiId.trim());
  const pn = encodeURIComponent((params.schoolName || "School").trim());
  const am = rupees.toFixed(2);
  const tn = encodeURIComponent(`Fees-${params.studentName.replace(/\s+/g, "")}-${params.admissionNumber}`);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

/**
 * Generates a clean, professional statement for SMS/WhatsApp/Clipboard sharing.
 * Strictly uses authoritative database data — never hardcodes amounts or fabricates contact details.
 */
export function formatStudentFeeMessage(params: FormatFeeShareParams): string {
  const {
    schoolName,
    schoolPhone,
    schoolEmail,
    upiId,
    upiNumber,
    studentName,
    admissionNumber,
    rollNumber,
    className,
    sectionName,
    mode,
    summary,
  } = params;

  const fmt = (rupees: number) => `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const classDisplay = sectionName ? `${className} (${sectionName})` : className;
  const rollDisplay = rollNumber !== undefined && rollNumber !== null && rollNumber !== "-" ? ` | Roll: #${rollNumber}` : "";

  let headerTitle = "FEE ACCOUNT STATEMENT";
  if (mode === "CURRENT_MONTH") headerTitle = "CURRENT MONTH FEE STATEMENT";
  if (mode === "PAYMENT_REMINDER") headerTitle = "FEE PAYMENT REMINDER";
  if (mode === "PAYMENT_HISTORY") headerTitle = "PAYMENT & RECEIPT HISTORY";

  let body = "";

  const pendingMonths = summary?.pendingMonths || [];
  const recentPayments = summary?.recentPayments || [];
  const totalPaidRupees = summary?.totalPaidRupees ?? 0;
  const totalPendingRupees = summary?.totalPendingRupees ?? 0;
  const monthlyFeeRupees = summary?.monthlyFeeRupees ?? 0;
  const totalAssignedPaise = summary?.assignment?.totalAssignedPaise ?? 0;
  const totalDiscountPaise = summary?.assignment?.totalDiscountPaise ?? 0;
  const totalLateFeePaise = summary?.assignment?.totalLateFeePaise ?? 0;

  // Determine applicable due amount for payment link
  let dynamicDueAmount = totalPendingRupees;

  if (mode === "CURRENT_MONTH") {
    const currentMonth = summary?.nextDueMonth || pendingMonths[0] || "Current Month";
    const currentMonthItem = summary?.assignment?.monthLedger?.find((m) => m.month === currentMonth);
    const monthDueRupees = currentMonthItem ? currentMonthItem.pendingAmountPaise / 100 : monthlyFeeRupees;
    dynamicDueAmount = monthDueRupees;
    const dueDateFormatted = currentMonthItem?.dueDate
      ? new Date(currentMonthItem.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "10th of the month";

    body = `📅 *Billing Period:* ${currentMonth}
💵 *Month Fee Rate:* ${fmt(monthlyFeeRupees)}
⏳ *Due Date:* ${dueDateFormatted}
⚠️ *Month Due Amount:* ${fmt(monthDueRupees)}
📊 *Total Outstanding Balance:* ${fmt(totalPendingRupees)}`;
  } else if (mode === "PAYMENT_REMINDER") {
    const overdueCount = pendingMonths.length;
    body = `Dear Parent,
This is a fee reminder for *${studentName}*, Class *${classDisplay}*.
Pending Fee: *${fmt(totalPendingRupees)}* across *${overdueCount} billing period(s)* (${pendingMonths.slice(0, 3).join(", ")}${overdueCount > 3 ? "..." : ""}).

Kindly make the payment at the earliest to ensure uninterrupted academic sessions.`;
  } else if (mode === "PAYMENT_HISTORY") {
    if (recentPayments.length > 0) {
      const paymentsText = recentPayments
        .slice(0, 5)
        .map((p) => {
          const dateStr = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "";
          return `• Receipt: *${p.receiptNumber}* | ${fmt((p.amountPaidPaise || 0) / 100)} (${p.paymentMethod || "Payment"}) on ${dateStr}`;
        })
        .join("\n");
      body = `🧾 *Recent Verified Payments:*\n${paymentsText}\n\n*Total Fees Paid to Date:* ${fmt(totalPaidRupees)}\n*Remaining Balance:* ${fmt(totalPendingRupees)}`;
    } else {
      body = `No previous payment transactions recorded yet.\n*Total Pending Balance:* ${fmt(totalPendingRupees)}`;
    }
  } else {
    // FULL_DUE (Default)
    const pendingMonthsText = pendingMonths.length > 0
      ? pendingMonths.slice(0, 4).join(", ") + (pendingMonths.length > 4 ? ` (+${pendingMonths.length - 4} more)` : "")
      : "None (Fully Paid)";

    body = `💰 *Fee Ledger Overview:*
• Total Assigned: ${fmt(totalAssignedPaise / 100)}
• Total Paid: ${fmt(totalPaidRupees)}
• Discounts Applied: ${fmt(totalDiscountPaise / 100)}
• Late Fee Added: ${fmt(totalLateFeePaise / 100)}
• *Net Outstanding Balance:* *${fmt(totalPendingRupees)}*

📅 *Pending Periods:* ${pendingMonthsText}`;
  }

  // Dynamic UPI Payment Block
  let upiBlock = "";
  if (upiId && dynamicDueAmount > 0) {
    const upiUri = generateUpiPayLink({
      upiId,
      schoolName,
      amountRupees: dynamicDueAmount,
      studentName,
      admissionNumber,
    });
    upiBlock = `\n----------------------------------------\n📲 *Pay Online via UPI:*\nUPI ID: \`${upiId}\`${upiNumber ? ` | Accounts: ${upiNumber}` : ""}\n🔗 *Direct UPI Payment Link:*\n${upiUri}\n_(Open with GPay, PhonePe, Paytm, or BHIM)_\n----------------------------------------`;
  }

  // Contact Footer - Strictly only configured details
  const contactParts: string[] = [];
  if (schoolPhone && schoolPhone.trim()) contactParts.push(`📞 ${schoolPhone.trim()}`);
  if (schoolEmail && schoolEmail.trim()) contactParts.push(`✉️ ${schoolEmail.trim()}`);
  const contactText = contactParts.length > 0 ? `\n*School Accounts Office:* ${contactParts.join(" | ")}` : "";

  return `🏛️ *${schoolName.toUpperCase()}*
📋 *${headerTitle}*
----------------------------------------
👤 *Student:* ${studentName}
🆔 *Admission No:* ${admissionNumber}${rollDisplay}
🏫 *Class:* ${classDisplay}
----------------------------------------
${body}${upiBlock}

💳 *Payment Channels:*
Cash at School Counter | UPI / Net Banking${contactText}
----------------------------------------
_Please note: Fees are verified and recorded upon official receipt generation._`;
}

/**
 * Sanitizes an Indian / international phone number and generates a WhatsApp web/app link.
 */
export function generateWhatsAppLink(phoneNumber: string | undefined, message: string): string | null {
  if (!phoneNumber) return null;
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  if (!digits) return null;

  // If 10 digits Indian number, prepend 91
  const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
