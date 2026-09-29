"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import {
  Search,
  Printer,
  FileText,
  Loader2,
  CreditCard,
  Wallet,
  Building2,
  Calendar,
  Filter,
  Download,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import type { FeePayment, SchoolClass } from "@/types";
import { getFeeTransactions } from "@/lib/services/fee.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { formatINR } from "@/lib/services/fee-foundation.service";
import { toast } from "sonner";

export default function AdminFeeReceiptsPage() {
  const { profile } = useAuth();
  const effectiveSchoolId =
    profile?.schoolId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("currentSchoolId") || ""
      : "");
  const schoolId = effectiveSchoolId;
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  const [receipts, setReceipts] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadReceipts() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const [list, clsList] = await Promise.all([
          getFeeTransactions(schoolId),
          getClassesWithSections(schoolId).catch(() => []),
        ]);
        setReceipts(list);
        setClasses(clsList);
      } catch (err) {
        console.error("Failed to load receipts:", err);
        toast.error("Failed to load receipts.");
      } finally {
        setLoading(false);
      }
    }
    loadReceipts();
  }, [schoolId]);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (selectedClass !== "all" && r.className !== selectedClass) return false;
      if (selectedMethod !== "all") {
        const methodStr = (r.paymentMethod || "").toLowerCase().replace(/[\s_-]/g, "");
        const targetStr = selectedMethod.toLowerCase().replace(/[\s_-]/g, "");
        if (!methodStr.includes(targetStr) && !targetStr.includes(methodStr)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRec = (r.receiptNumber || "").toLowerCase().includes(q);
        const matchName = (r.studentName || "").toLowerCase().includes(q);
        const matchAdm = (r.admissionNumber || "").toLowerCase().includes(q);
        if (!matchRec && !matchName && !matchAdm) return false;
      }
      return true;
    });
  }, [receipts, selectedClass, selectedMethod, searchQuery]);

  // Quick Stats
  const totalAmountPaise = useMemo(
    () => filtered.reduce((sum, r) => sum + (r.amountPaidPaise || r.netAmountPaise || 0), 0),
    [filtered]
  );
  const upiCount = useMemo(
    () => filtered.filter((r) => (r.paymentMethod || "").toLowerCase().includes("upi")).length,
    [filtered]
  );
  const cashCount = useMemo(
    () => filtered.filter((r) => (r.paymentMethod || "").toLowerCase().includes("cash")).length,
    [filtered]
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.info("No receipts to export.");
      return;
    }
    const headers = [
      "Receipt Number",
      "Student Name",
      "Admission No",
      "Class",
      "Section",
      "Amount (₹)",
      "Payment Mode",
      "Transaction Ref",
      "Payment Date",
      "Status",
    ];
    const rows = filtered.map((r) => [
      `"${r.receiptNumber}"`,
      `"${r.studentName}"`,
      `"${r.admissionNumber || ""}"`,
      `"${r.className}"`,
      `"${r.sectionName || "A"}"`,
      ((r.amountPaidPaise || r.netAmountPaise || 0) / 100).toFixed(2),
      `"${r.paymentMethod}"`,
      `"${r.transactionRef || ""}"`,
      `"${new Date(r.paymentDate).toLocaleDateString("en-IN")}"`,
      `"${r.status || "SUCCESS"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Fee_Receipts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Receipts exported successfully!");
  };

  return (
    <EntitlementGate feature="fee_receipts" title="Receipt Generator & Search" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Receipts Directory</h1>
            <p className="text-xs text-slate-500 mt-1">
              Search, verify, print, and download official payment receipts with live double-entry audit linkage.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 4 Summary Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <span className="text-[11px] font-semibold text-slate-500">Total Receipts</span>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{filtered.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20 p-4">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Total Collected</span>
            <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatINR(totalAmountPaise)}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-blue-950 dark:bg-blue-950/20 p-4">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">UPI / Digital Receipts</span>
            <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{upiCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/20 p-4">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Cash Receipts</span>
            <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{cashCount}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt number, student name, admission no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </select>

          {(selectedClass !== "all" || selectedMethod !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedClass("all");
                setSelectedMethod("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Receipts Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <FileText className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No receipts found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Receipts generated during fee collections will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filtered.map((r) => {
                    const isUPI = (r.paymentMethod || "").toLowerCase().includes("upi");
                    const isCash = (r.paymentMethod || "").toLowerCase().includes("cash");
                    const isCompleted = (r.status || "SUCCESS") === "SUCCESS";

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {r.receiptNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <p>{r.studentName}</p>
                          <p className="text-[10px] font-mono text-slate-400 font-normal">
                            Adm: {r.admissionNumber || r.studentId}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {r.className} {r.sectionName ? `(${r.sectionName})` : ""}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                          {formatINR(r.amountPaidPaise || r.netAmountPaise || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              isUPI
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : isCash
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                            }`}
                          >
                            {r.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(r.paymentDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                            }`}
                          >
                            {r.status || "SUCCESS"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedPayment(r);
                              setShowModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Print / View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPayment && (
          <FeeReceiptModal
            payment={selectedPayment}
            schoolName={schoolName}
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
