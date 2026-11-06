"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import {
  Printer,
  Search,
  Download,
  Share2,
  Receipt,
  CheckCircle2,
  ChevronRight,
  Clock,
  RotateCcw,
  Sparkles,
  CreditCard,
  User,
  Filter,
} from "lucide-react";
import type { FeePayment, SchoolClass } from "@/types";
import { getFeeTransactions, getFeeSettings } from "@/lib/services/fee.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { formatINR } from "@/lib/services/fee-foundation.service";
import {
  generateProfessionalFeeReceiptPDF,
  type FeeReceiptPDFData,
} from "@/lib/services/pdf-invoice-receipt.service";
import { toast } from "sonner";

function FeesPaidSlipContent() {
  const { academicYearId } = useFeeSession();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "School";

  const searchParams = useSearchParams();
  const paramReceipt = searchParams?.get("receipt") || searchParams?.get("receiptNumber") || "";
  const paramStudentId = searchParams?.get("studentId") || "";

  const [receipts, setReceipts] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(paramReceipt || paramStudentId || "");
  const [selectedClass, setSelectedClass] = useState("all");

  const [selectedSlip, setSelectedSlip] = useState<FeePayment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const [list, clsList] = await Promise.all([
          getFeeTransactions(schoolId, {
            academicYearId: academicYearId !== "all" ? academicYearId : undefined,
          }),
          getClassesWithSections(schoolId).catch(() => []),
        ]);
        setReceipts(list);
        setClasses(clsList);

        if (paramReceipt && list.length > 0) {
          const matched = list.find((r) => r.receiptNumber === paramReceipt);
          if (matched) setSelectedSlip(matched);
        } else if (list.length > 0 && !selectedSlip) {
          setSelectedSlip(list[0]);
        }
      } catch (err) {
        console.error("Failed to load paid slips:", err);
        toast.error("Failed to load paid slips.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [schoolId, academicYearId, paramReceipt]);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (selectedClass !== "all" && r.className !== selectedClass) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRec = String(r.receiptNumber || "").toLowerCase().includes(q);
        const matchName = String(r.studentName || "").toLowerCase().includes(q);
        const matchAdm = String(r.admissionNumber || "").toLowerCase().includes(q);
        if (!matchRec && !matchName && !matchAdm) return false;
      }
      return true;
    });
  }, [receipts, selectedClass, searchQuery]);

  const handleDownloadPDF = (payment: FeePayment) => {
    try {
      const pdfInput: FeeReceiptPDFData = {
        schoolName: schoolName,
        schoolAddress: "",
        schoolPhone: "",
        schoolAffiliation: "",
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate ? payment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentTime: "12:00 PM",
        studentName: payment.studentName,
        studentIdOrAdmissionNo: String(payment.admissionNumber || payment.studentId || "1"),
        rollNumber: (payment as any).rollNumber,
        className: payment.className,
        sectionName: payment.sectionName || "A",
        guardianName: (payment as any).guardianName || (payment as any).fatherName || "",
        guardianPhone: (payment as any).guardianPhone || (payment as any).phone || "",
        feeMonth: (payment.periodMonths || []).join(", ") || "Current Period",
        paymentMethod: payment.paymentMethod || "Cash",
        transactionRef: payment.transactionRef || undefined,
        cashierName: payment.collectedByName || "Finance Office",
        items: [
          {
            sr: 1,
            particulars: "Tuition / Institutional Fee Collection",
            amount: (payment.amountPaidPaise || 0) / 100,
          },
        ],
        totalAmount: (payment.amountPaidPaise || 0) / 100,
        depositAmount: (payment.amountPaidPaise || 0) / 100,
        remainingBalance: (payment.remainingDuePaise || 0) / 100,
        discountAmount: (payment.discountPaise || 0) / 100,
        remarks: payment.remarks || "Paid in full",
      };

      const doc = generateProfessionalFeeReceiptPDF(pdfInput);
      doc.save(`Fee_Paid_Slip_${payment.receiptNumber}.pdf`);
      toast.success(`Paid slip PDF for receipt ${payment.receiptNumber} downloaded successfully.`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Could not generate vector PDF slip.");
    }
  };

  const handleShareWhatsApp = (payment: FeePayment) => {
    const phone = ((payment as any).guardianPhone || (payment as any).phone || "").replace(/[^0-9]/g, "");
    const waPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = `Dear Parent,\nYour fee payment of ${formatINR(payment.amountPaidPaise)} for ${payment.studentName} (Class ${payment.className}) has been successfully confirmed.\nReceipt No: ${payment.receiptNumber}\nDate: ${payment.paymentDate?.slice(0, 10)}\nThank you.\n- ${schoolName}`;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <EntitlementGate feature="fee_paid_slip" title="Fees Paid Slip" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Fees Paid Slip</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fees Paid Slips & Proof of Collection
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Search confirmed fee collections, preview official vector slips, print cashier receipts, and dispatch WhatsApp acknowledgments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <CreditCard className="h-4 w-4" />
              <span>Collect Fee</span>
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="sm:col-span-2 relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Receipt No, Student Name, or Admission No..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Master Details: Left List (Receipts) + Right Slip Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Table: 5 cols */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Confirmed Receipts ({filtered.length})
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to preview slip</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[560px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading receipt records...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No matching paid receipts found.</div>
              ) : (
                filtered.map((r) => {
                  const isSelected = selectedSlip?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedSlip(r)}
                      className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {r.receiptNumber}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            PAID
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {r.studentName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Class {r.className} {r.sectionName ? `(${r.sectionName})` : ""} • Adm: {r.admissionNumber || r.studentId}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {formatINR(r.amountPaidPaise)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.paymentDate ? r.paymentDate.slice(0, 10) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Official Paid Slip Preview (7 cols) */}
          <div className="lg:col-span-7">
            {selectedSlip ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                {/* Header ribbon */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                      Official Payment Confirmation
                    </span>
                    <h2 className="text-xl font-black mt-0.5">{schoolName}</h2>
                    <p className="text-xs text-blue-100">Fee Paid Slip / Collection Receipt</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-blue-200 uppercase font-semibold">Receipt No</span>
                    <p className="font-mono text-lg font-black tracking-wider text-white">
                      {selectedSlip.receiptNumber}
                    </p>
                    <p className="text-xs text-blue-100">
                      {selectedSlip.paymentDate?.slice(0, 10)}
                    </p>
                  </div>
                </div>

                {/* Slip Meta */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">Student Name</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedSlip.studentName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Admission / Reg No</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedSlip.admissionNumber || selectedSlip.studentId}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Class & Section</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedSlip.className} {selectedSlip.sectionName ? `(${selectedSlip.sectionName})` : ""}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Payment Mode</span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedSlip.paymentMethod || "Cash"}</p>
                    </div>
                  </div>

                  {/* Particulars Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-2.5">Particulars / Fee Head</th>
                          <th className="px-4 py-2.5">Fee Period</th>
                          <th className="px-4 py-2.5 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            Tuition & Educational Fee Charges
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {(selectedSlip.periodMonths || []).join(", ") || "Active Period"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(selectedSlip.amountPaidPaise)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Footer */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Cashier / Authorized Collector: {selectedSlip.collectedByName || "Finance Office"}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400">Net Confirmed Collection</span>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {formatINR(selectedSlip.amountPaidPaise)}
                      </p>
                    </div>
                  </div>

                  {/* Slip Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlip(selectedSlip);
                        setShowModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Receipt className="h-4 w-4 text-blue-600" />
                      <span>Full Receipt Modal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(selectedSlip)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                    >
                      <Share2 className="h-4 w-4 text-emerald-600" />
                      <span>WhatsApp Slip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(selectedSlip)}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Official PDF Slip</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center text-xs text-slate-500">
                Select a receipt from the left panel to preview and print its official paid slip.
              </div>
            )}
          </div>
        </div>

        {/* Full Modal Viewer if requested */}
        {showModal && selectedSlip && (
          <FeeReceiptModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            payment={selectedSlip}
            schoolName={schoolName}
          />
        )}
      </div>
    </EntitlementGate>
  );
}


export default function AdminFeesPaidSlipPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading fees paid slips...</div>}>
      <FeesPaidSlipContent />
    </Suspense>
  );
}
