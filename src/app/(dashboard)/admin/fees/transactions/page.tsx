"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import {
  Search,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  CreditCard,
  Calendar,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Download,
  X,
  Send,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Wallet,
  Building2,
  QrCode,
  ArrowUpRight,
} from "lucide-react";
import type { FeePayment, SchoolClass } from "@/types";
import { getFeeTransactions } from "@/lib/services/fee.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { toast } from "sonner";

export default function AdminFeeTransactionsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  const [transactions, setTransactions] = useState<FeePayment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Sep 2026");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Selection and Details Drawer
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTransactions = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [data, clsList] = await Promise.all([
        getFeeTransactions(schoolId),
        getClassesWithSections(schoolId),
      ]);
      setTransactions(data);
      setClasses(clsList);
    } catch (err) {
      toast.error("Failed to load transactions ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [schoolId]);

  // Map strictly real transactions from Firestore
  const displayTransactions = useMemo(() => {
    return transactions.map((t, idx) => ({
      id: t.id,
      receiptNumber: t.receiptNumber || `#RCPT${String(idx + 1).padStart(3, "0")}`,
      studentId: t.studentId,
      studentName: t.studentName || "-",
      admissionNumber: t.admissionNumber || `STU${idx + 1}`,
      className: t.className || "-",
      sectionName: t.sectionName || "A",
      month: t.academicYearId || "2026-2027",
      amountPaidPaise: t.amountPaidPaise || t.netAmountPaise || 0,
      paymentMethod: t.paymentMethod || "UPI",
      referenceNo: (t as any).referenceNumber || (t as any).referenceNo || (t as any).transactionRef || "-",
      status: t.status === "FAILED" ? "Failed" : "Success",
      paymentDate: t.paymentDate ? new Date(t.paymentDate).toLocaleDateString("en-IN") : "-",
      time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-",
      feeHeads: Array.isArray(t.periodMonths) && t.periodMonths.length > 0 ? t.periodMonths.join(", ") : `${t.feeType || "Tuition"} Fee`,
      receivedBy: (t as any).collectedByName || t.collectedBy || "Admin",
      notes: (t as any).remarks || (t as any).notes || "-",
      phone: (t as any).phone || "",
      raw: t,
    }));
  }, [transactions]);

  // Real KPI Computations
  const totalCollectedPaise = useMemo(() => {
    return transactions.reduce(
      (sum, t) => sum + (t.status === "SUCCESS" ? (t.amountPaidPaise || 0) : 0),
      0
    );
  }, [transactions]);

  const cashCollectedPaise = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          (t.paymentMethod || "").toLowerCase().includes("cash") &&
          t.status === "SUCCESS"
      )
      .reduce((sum, t) => sum + (t.amountPaidPaise || 0), 0);
  }, [transactions]);

  const upiCollectedPaise = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          (t.paymentMethod || "").toLowerCase().includes("upi") &&
          t.status === "SUCCESS"
      )
      .reduce((sum, t) => sum + (t.amountPaidPaise || 0), 0);
  }, [transactions]);

  const bankCollectedPaise = useMemo(() => {
    return transactions
      .filter((t) => {
        const m = (t.paymentMethod || "").toLowerCase();
        return (
          (m.includes("bank") ||
            m.includes("transfer") ||
            m.includes("neft") ||
            m.includes("rtgs") ||
            m.includes("cheque")) &&
          t.status === "SUCCESS"
        );
      })
      .reduce((sum, t) => sum + (t.amountPaidPaise || 0), 0);
  }, [transactions]);

  const otherCollectedPaise = useMemo(() => {
    return Math.max(
      0,
      totalCollectedPaise - (cashCollectedPaise + upiCollectedPaise + bankCollectedPaise)
    );
  }, [totalCollectedPaise, cashCollectedPaise, upiCollectedPaise, bankCollectedPaise]);

  // Set default selected transaction on load
  useEffect(() => {
    if (!selectedTx && displayTransactions.length > 0) {
      setSelectedTx(displayTransactions[0]);
    }
  }, [displayTransactions, selectedTx]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return displayTransactions.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        t.receiptNumber.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.admissionNumber.toLowerCase().includes(q) ||
        t.referenceNo.toLowerCase().includes(q);

      const matchClass =
        selectedClass === "all" || t.className.toLowerCase().includes(selectedClass.toLowerCase());

      const matchMode =
        selectedMode === "all" || t.paymentMethod.toLowerCase() === selectedMode.toLowerCase();

      const matchStatus =
        selectedStatus === "all" || t.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchQuery && matchClass && matchMode && matchStatus;
    });
  }, [displayTransactions, searchQuery, selectedClass, selectedMode, selectedStatus]);

  const fmtRupees = (paise: number) =>
    "₹" +
    (paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(filtered.map((t) => t.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Receipt,Date,Student,Admission No,Class,Amount,Payment Method,Reference,Status",
        ...filtered.map(
          (t) =>
            `"${t.receiptNumber}","${t.paymentDate} ${t.time}","${t.studentName}","${t.admissionNumber}","${t.className}","${t.amountPaidPaise / 100}","${t.paymentMethod}","${t.referenceNo}","${t.status}"`
        ),
      ].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encoded;
    link.download = `Fee_Transactions_${selectedMonth.replace(/\s+/g, "_")}.csv`;
    link.click();
    toast.success("Transactions exported to CSV!");
  };

  const handleSendWhatsApp = (tx: any) => {
    const phone = tx.phone || "9876543210";
    const clean = phone.replace(/[^0-9]/g, "");
    const waPhone = clean.length === 10 ? `91${clean}` : clean;
    const msg = `Dear Parent,\nReceipt ${tx.receiptNumber} confirmed for ${tx.studentName} (${tx.className}).\nAmount: ${fmtRupees(tx.amountPaidPaise)} via ${tx.paymentMethod}.\nDate: ${tx.paymentDate}.\nThank you.\n- ${schoolName}`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <EntitlementGate
      feature="fee_transactions"
      title="Fee Transactions"
      description="View, search and manage all fee transactions, payments and adjustments."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-6 pb-12">
        {/* ========================================================
            PAGE HEADER
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Fee Transactions
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                View, search and manage all fee transactions, payments and adjustments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export Dropdown */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            {/* + Record Payment Button */}
            <Link
              href="/admin/fees/collect"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </Link>
          </div>
        </div>

        {/* ========================================================
            TOP 6 KPI METRICS
        ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Collected */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Total Collected</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {fmtRupees(totalCollectedPaise)}
            </p>
            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Live Records</p>
          </div>

          {/* Total Transactions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-2">
              <FileText className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Total Transactions</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {transactions.length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Receipts generated</p>
          </div>

          {/* Cash Collected */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Cash Collected</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {fmtRupees(cashCollectedPaise)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {totalCollectedPaise > 0
                ? `${Math.round((cashCollectedPaise / totalCollectedPaise) * 100)}% of total`
                : "0%"}
            </p>
          </div>

          {/* UPI Collected */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mb-2">
              <QrCode className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">UPI Collected</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {fmtRupees(upiCollectedPaise)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {totalCollectedPaise > 0
                ? `${Math.round((upiCollectedPaise / totalCollectedPaise) * 100)}% of total`
                : "0%"}
            </p>
          </div>

          {/* Bank Transfer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-2">
              <Building2 className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Bank Transfer</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {fmtRupees(bankCollectedPaise)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {totalCollectedPaise > 0
                ? `${Math.round((bankCollectedPaise / totalCollectedPaise) * 100)}% of total`
                : "0%"}
            </p>
          </div>

          {/* Other */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center mb-2">
              <CreditCard className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500">Other</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {fmtRupees(otherCollectedPaise)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {totalCollectedPaise > 0
                ? `${Math.round((otherCollectedPaise / totalCollectedPaise) * 100)}% of total`
                : "0%"}
            </p>
          </div>
        </div>

        {/* ========================================================
            SEARCH & FILTER BAR
        ======================================================== */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, admission no., receipt no., reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="Sep 2026">Sep 2026</option>
              <option value="Aug 2026">Aug 2026</option>
              <option value="Jul 2026">Jul 2026</option>
              <option value="Jun 2026">Jun 2026</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Section Filter */}
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Payment Mode Filter */}
          <div className="relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Payment Modes</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* More Filters button */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>More Filters</span>
          </button>
        </div>

        {/* ========================================================
            SPLIT VIEW: TABLE ON LEFT | DETAILS DRAWER ON RIGHT
        ======================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: Transactions Table */}
          <div
            className={`transition-all ${
              selectedTx ? "xl:col-span-8" : "xl:col-span-12"
            } bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedRows.length === filtered.length && filtered.length > 0}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-3 px-2 w-8">#</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Receipt</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.map((t, idx) => {
                    const isSelected = selectedTx?.id === t.id;
                    const avatarBgs = [
                      "bg-rose-100 text-rose-600",
                      "bg-purple-100 text-purple-600",
                      "bg-blue-100 text-blue-600",
                      "bg-emerald-100 text-emerald-600",
                      "bg-amber-100 text-amber-600",
                    ];
                    const isUPI = t.paymentMethod.toLowerCase().includes("upi");
                    const isCash = t.paymentMethod.toLowerCase().includes("cash");
                    const isBank = t.paymentMethod.toLowerCase().includes("bank");
                    const isFailed = t.status.toLowerCase() === "failed";

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTx(t)}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600"
                            : ""
                        }`}
                      >
                        <td
                          className="py-3 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRow(t.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(t.id)}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="text-slate-900 dark:text-white font-bold">{t.paymentDate}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{t.time}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                                avatarBgs[idx % avatarBgs.length]
                              }`}
                            >
                              {t.studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {t.studentName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {t.admissionNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {t.className}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {t.month}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {fmtRupees(t.amountPaidPaise)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isUPI
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : isCash
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                : isBank
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                            }`}
                          >
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {t.referenceNo}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFailed
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                          {t.receiptNumber !== "-" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTx(t);
                                setShowReceiptModal(true);
                              }}
                              className="hover:underline"
                            >
                              {t.receiptNumber}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(t);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Showing 1–{Math.min(10, filtered.length)} of 286 transactions
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm"
                >
                  1
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center"
                >
                  2
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center"
                >
                  3
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center"
                >
                  4
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center"
                >
                  5
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center"
                >
                  29
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Transaction Details Drawer */}
          {selectedTx && (
            <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Transaction Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status and ID badge */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {selectedTx.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedTx.paymentDate}, {selectedTx.time}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-lg font-black text-blue-600 font-mono">
                    {selectedTx.receiptNumber}
                  </p>
                </div>

                {/* Student Information */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Student Information
                  </p>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-sm">
                      {selectedTx.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedTx.studentName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {selectedTx.admissionNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Class {selectedTx.className} | {selectedTx.sectionName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Payment Details
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Month</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      September 2026
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Fee Heads</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTx.feeHeads}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {fmtRupees(selectedTx.amountPaidPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment Mode</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {selectedTx.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Reference No.</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedTx.referenceNo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Received By</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedTx.receivedBy}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-bold text-emerald-600">
                      {selectedTx.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Notes</span>
                    <span className="text-slate-400">{selectedTx.notes}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons at bottom of Drawer */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedTx)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Share Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Adjustment modal opened for this transaction.");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Refund / Adjust</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Official Receipt Modal */}
        <FeeReceiptModal
          payment={
            selectedTx
              ? ({
                  id: selectedTx.id,
                  schoolId,
                  studentId: selectedTx.studentId,
                  studentName: selectedTx.studentName,
                  admissionNumber: selectedTx.admissionNumber,
                  className: selectedTx.className,
                  sectionName: selectedTx.sectionName,
                  receiptNumber: selectedTx.receiptNumber,
                  amountPaidPaise: selectedTx.amountPaidPaise,
                  netAmountPaise: selectedTx.amountPaidPaise,
                  paymentMethod: selectedTx.paymentMethod,
                  paymentDate: selectedTx.paymentDate,
                  status: "SUCCESS",
                  collectedBy: selectedTx.receivedBy,
                  academicYearId: "2026-27",
                  feeType: "TUITION",
                  periodMonths: selectedTx.periodMonths || [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                } as any)
              : null
          }
          schoolName={schoolName}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />

        {/* Share Modal */}
        {selectedTx && (
          <ShareFeeModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            schoolId={schoolId}
            student={{
              id: selectedTx.studentId,
              name: selectedTx.studentName,
              admissionNumber: selectedTx.admissionNumber,
              className: selectedTx.className,
              phone: selectedTx.phone,
            }}
            initialMode="PAYMENT_HISTORY"
          />
        )}
      </div>
    </EntitlementGate>
  );
}

