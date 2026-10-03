"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Printer,
  Search,
  Download,
  Share2,
  Calendar,
  User,
  Filter,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { getFeeTransactions, getFeeSettings } from "@/lib/services/fee.service";
import {
  generateProfessionalFeeReceiptPDF,
  type FeeReceiptPDFData,
} from "@/lib/services/pdf-invoice-receipt.service";
import type { FeePayment, FeeSettings } from "@/types";
import { toast } from "sonner";

export default function FeesPaidSlipPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Receipt Modal State
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([getFeeTransactions(schoolId), getFeeSettings(schoolId)])
      .then(([payList, feeSett]) => {
        // Sort descending by payment date
        const sorted = [...payList].sort(
          (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
        setPayments(sorted);
        setSettings(feeSett);
      })
      .catch((err) => {
        console.error("Failed to load fee payments:", err);
        toast.error("Failed to load receipts list");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        p.studentName?.toLowerCase().includes(q) ||
        p.admissionNumber?.toLowerCase().includes(q) ||
        p.className?.toLowerCase().includes(q);

      const matchMethod =
        selectedMethod === "all" ||
        p.paymentMethod?.toLowerCase() === selectedMethod.toLowerCase();

      const matchDate = !dateFilter || p.paymentDate?.startsWith(dateFilter);

      return matchQuery && matchMethod && matchDate;
    });
  }, [payments, searchQuery, selectedMethod, dateFilter]);

  // Download PDF
  const handleDownloadPDF = (payment: FeePayment) => {
    try {
      const grossPaise = payment.amountPaidPaise + (payment.remainingDuePaise || 0);
      const grossRupees = grossPaise / 100;
      const depositRupees = payment.amountPaidPaise / 100;
      const dueRupees = (payment.remainingDuePaise || 0) / 100;
      const discountRupees = (payment.discountPaise || 0) / 100;

      const pdfData: FeeReceiptPDFData = {
        schoolName: settings?.schoolName || profile?.schoolName || "DEMO PUBLIC SCHOOL",
        schoolAddress: settings?.schoolAddress || "Institutional Area, Main Campus",
        schoolPhone: settings?.schoolPhone || "+91 98765 43210",
        schoolAffiliation: "Affiliated to CBSE / State Board",
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentTime: payment.paymentDate && payment.paymentDate.includes("T") ? payment.paymentDate.slice(11, 16) : undefined,
        studentName: payment.studentName,
        studentIdOrAdmissionNo: payment.admissionNumber || payment.studentId,
        className: payment.className,
        sectionName: payment.sectionName || "A",
        guardianName: "Parent / Guardian",
        feeMonth: (payment.periodMonths && payment.periodMonths[0]) || "Current Session",
        paymentMethod: payment.paymentMethod,
        transactionRef: payment.transactionRef,
        cashierName: payment.collectedByName || "School Cashier",
        items: [
          {
            sr: 1,
            particulars: `${payment.feeType ? payment.feeType.toUpperCase() : "TUITION"} FEE (${payment.periodMonths?.join(", ") || "Regular"})`,
            amount: grossRupees,
          },
          ...(discountRupees > 0
            ? [{ sr: 2, particulars: "DISCOUNT / CONCESSION", amount: -discountRupees }]
            : []),
        ],
        totalAmount: grossRupees,
        depositAmount: depositRupees,
        remainingBalance: dueRupees,
        discountAmount: discountRupees,
      };

      const doc = generateProfessionalFeeReceiptPDF(pdfData);
      const fileName = `Receipt_${payment.receiptNumber}_${payment.studentName.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
      toast.success(`Receipt PDF downloaded: ${fileName}`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF receipt.");
    }
  };

  // WhatsApp Share
  const handleWhatsApp = (payment: FeePayment) => {
    const msg = encodeURIComponent(
      `*OFFICIAL FEE RECEIPT*\n` +
        `🏫 *${settings?.schoolName || "DEMO PUBLIC SCHOOL"}*\n` +
        `🧾 Receipt: *${payment.receiptNumber}*\n` +
        `👤 Student: *${payment.studentName}* (${payment.className})\n` +
        `💵 Amount Paid: *₹${(payment.amountPaidPaise / 100).toFixed(2)}*\n` +
        `📅 Date: ${payment.paymentDate.slice(0, 10)}\n` +
        `💳 Mode: ${payment.paymentMethod}\n` +
        `Status: *FULLY PAID*\n\n` +
        `Thank you for your timely fee submission.`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <EntitlementGate feature="fee_paid_slip" title="Fees Paid Slip" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Header Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Fees Paid Slip</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fees Paid Slip
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Locate, download, and reprint official vector-sharp fee receipts and WhatsApp slips.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Collect Fees
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Receipt No, Student Name, Class..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Payments List Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Receipt Records ({filteredPayments.length})
            </span>
            <span className="text-xs text-slate-400">
              Click &quot;Download PDF&quot; to obtain the high-res vector receipt
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading fee payment records...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <Printer className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                No fee payment records found
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Collect fee from students to automatically issue and store receipts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Receipt No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Student & Class</th>
                    <th className="px-4 py-3">Fee Period</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.map((p) => {
                    const isFullyPaid = !p.remainingDuePaise || p.remainingDuePaise <= 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {p.receiptNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {p.paymentDate?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.studentName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {p.className} {p.sectionName ? `(${p.sectionName})` : ""} • Reg:{" "}
                            {p.admissionNumber}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {p.periodMonths?.join(", ") || "Tuition"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white text-sm">
                          ₹ {(p.amountPaidPaise / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isFullyPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {isFullyPaid ? "Fully Paid" : "Partial"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(p)}
                              title="Download Official Vector PDF"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <Download className="h-3.5 w-3.5 text-blue-600" />
                              PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => handleWhatsApp(p)}
                              title="Share Receipt on WhatsApp"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50/50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </EntitlementGate>
  );
}
