"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { formatINR, paiseToRupees } from "@/lib/services/fee-foundation.service";
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
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Wallet,
  Building2,
  QrCode,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  Eye,
  Undo2,
  ArrowDownLeft,
  Filter,
} from "lucide-react";
import type { SchoolClass, FeePayment } from "@/types";
import type { FinancialPayment, PaymentMethod, PaymentAllocation, FinancialRefund, PaymentReversal } from "@/types/fee-foundation";
import { toast } from "sonner";

export default function AdminFeeTransactionsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  const [payments, setPayments] = useState<FinancialPayment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected Transaction for Detail Modal
  const [detailModalPayment, setDetailModalPayment] = useState<FinancialPayment | null>(null);
  const [paymentDetailData, setPaymentDetailData] = useState<{
    payment: FinancialPayment;
    allocations: PaymentAllocation[];
    refunds: FinancialRefund[];
    reversal: PaymentReversal | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Receipt Modal state
  const [receiptPayment, setReceiptPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Refund Modal state
  const [refundPayment, setRefundPayment] = useState<FinancialPayment | null>(null);
  const [refundAmountRupees, setRefundAmountRupees] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Reversal Modal state
  const [reversalPayment, setReversalPayment] = useState<FinancialPayment | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalSubmitting, setReversalSubmitting] = useState(false);

  // Fetch transactions list
  const fetchPayments = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId });
      if (selectedClass !== "all") params.set("className", selectedClass);
      if (selectedMethod !== "all") params.set("paymentMethod", selectedMethod);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const [res, clsList] = await Promise.all([
        fetch(`/api/fees/foundation/payments?${params.toString()}`),
        getClassesWithSections(schoolId),
      ]);

      if (!res.ok) throw new Error("Failed to load financial payments");
      const json = await res.json();
      setPayments(json.payments || []);
      setClasses(clsList);
    } catch (err: any) {
      console.error("fetchPayments error:", err);
      toast.error(err.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [schoolId, selectedClass, selectedMethod, selectedStatus, startDate, endDate]);

  // Handle Search Input (debounce / button)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  // KPI Calculations from Payments
  const kpiStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);

    let todayPaise = 0;
    let thisMonthPaise = 0;
    let totalRefundedPaise = 0;
    let successfulCount = 0;

    for (const p of payments) {
      const dateStr = (p.paymentDate || p.createdAt || "").slice(0, 10);
      const isSuccess = p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED";

      if (isSuccess) {
        if (dateStr === todayStr) todayPaise += p.amountPaise;
        if (dateStr.startsWith(thisMonthPrefix)) thisMonthPaise += p.amountPaise;
        successfulCount++;
      }
      totalRefundedPaise += p.refundedAmountPaise || 0;
    }

    return {
      todayRupees: paiseToRupees(todayPaise),
      thisMonthRupees: paiseToRupees(thisMonthPaise),
      totalRefundedRupees: paiseToRupees(totalRefundedPaise),
      successfulCount,
    };
  }, [payments]);

  // Pagination slice
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return payments.slice(start, start + pageSize);
  }, [payments, currentPage]);

  const totalPages = Math.ceil(payments.length / pageSize) || 1;

  // Open Detail Drawer
  const openDetailModal = async (payment: FinancialPayment) => {
    setDetailModalPayment(payment);
    setLoadingDetail(true);
    setPaymentDetailData(null);
    try {
      const res = await fetch(
        `/api/fees/foundation/payments/${payment.id}?schoolId=${encodeURIComponent(schoolId)}`
      );
      if (!res.ok) throw new Error("Failed to load payment detail");
      const json = await res.json();
      setPaymentDetailData(json.data);
    } catch (err: any) {
      console.error("openDetailModal error:", err);
      toast.error(err.message || "Failed to load transaction details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Receipt Modal
  const openReceiptModal = (payment: FinancialPayment) => {
    const receiptData: FeePayment = {
      id: payment.id,
      schoolId: payment.schoolId,
      receiptNumber: payment.receiptNumber,
      studentId: payment.studentId,
      studentName: payment.studentName,
      admissionNumber: payment.admissionNumber,
      className: payment.className,
      sectionName: payment.sectionName,
      academicYearId: payment.academicYearId,
      feeType: "tuition",
      periodMonths: payment.periodMonths || [],
      amountPaidPaise: payment.amountPaise,
      discountPaise: 0,
      lateFeePaise: 0,
      netAmountPaise: payment.amountPaise,
      paymentMethod: (payment.paymentMethod === "CASH"
        ? "Cash"
        : payment.paymentMethod === "UPI"
        ? "UPI"
        : payment.paymentMethod === "BANK_TRANSFER"
        ? "Bank Transfer"
        : payment.paymentMethod === "CHEQUE"
        ? "Cheque"
        : payment.paymentMethod === "CARD"
        ? "Card"
        : "Other") as any,
      transactionRef: payment.referenceNumber,
      remarks: payment.remarks,
      paymentDate: payment.paymentDate,
      collectedBy: payment.collectedBy,
      collectedByName: payment.collectedByName,
      status: payment.status === "REFUNDED" ? "REFUNDED" : "SUCCESS",
      remainingDuePaise: payment.remainingDuePaise,
      createdAt: payment.createdAt,
    };
    setReceiptPayment(receiptData);
    setShowReceiptModal(true);
  };

  // Open Refund Modal
  const openRefundModal = (payment: FinancialPayment) => {
    const availablePaise = payment.amountPaise - (payment.refundedAmountPaise || 0);
    const availableRupees = paiseToRupees(availablePaise);
    setRefundPayment(payment);
    setRefundAmountRupees(String(availableRupees));
    setRefundReason("");
    setRefundMethod(payment.paymentMethod || "CASH");
  };

  // Process Refund Submit
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment || !schoolId) return;

    const amt = Number(refundAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid refund amount.");
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund.");
      return;
    }

    setRefundSubmitting(true);
    try {
      const res = await fetch("/api/fees/foundation/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          paymentId: refundPayment.id,
          amountRupees: amt,
          reason: refundReason.trim(),
          refundMethod,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Refund processing failed");

      toast.success(`Refund processed! Receipt #${json.refundReceiptNumber}`);
      setRefundPayment(null);
      fetchPayments();
    } catch (err: any) {
      console.error("Refund error:", err);
      toast.error(err.message || "Failed to process refund.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Open Reversal Modal
  const openReversalModal = (payment: FinancialPayment) => {
    setReversalPayment(payment);
    setReversalReason("");
  };

  // Process Reversal Submit
  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalPayment || !schoolId) return;

    if (!reversalReason.trim()) {
      toast.error("Please provide a reason for reversing this payment.");
      return;
    }

    setReversalSubmitting(true);
    try {
      const res = await fetch("/api/fees/foundation/reversals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          paymentId: reversalPayment.id,
          reason: reversalReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment reversal failed");

      toast.success(`Payment #${reversalPayment.receiptNumber} reversed successfully.`);
      setReversalPayment(null);
      fetchPayments();
    } catch (err: any) {
      console.error("Reversal error:", err);
      toast.error(err.message || "Failed to reverse payment.");
    } finally {
      setReversalSubmitting(false);
    }
  };

  return (
    <EntitlementGate feature="fee_transactions" title="Fee Transactions" requiredPlan="Professional Plan">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              Fee Transactions Ledger
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Authoritative transaction audit logs, payment allocations, instant receipt reprints, and refunds.
            </p>
          </div>
          <Link
            href="/admin/fees/collect"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Collect Fee
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Collected Today
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatINR(kpiStats.todayRupees, false)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Live synchronized
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Collected This Month
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {formatINR(kpiStats.thisMonthRupees, false)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {kpiStats.successfulCount} success transactions
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Total Refunds
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(kpiStats.totalRefundedRupees, false)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Controlled audit refunds
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Total Ledger Records
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {payments.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Historical immutable records
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Receipt Number, Student Name, Admission No, Reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm rounded-lg hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Class Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Payment Mode</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Modes</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                <option value="REFUNDED">Fully Refunded</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedClass("all");
                  setSelectedMethod("all");
                  setSelectedStatus("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-medium rounded-md transition-colors text-center"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm">Loading transactions...</span>
            </div>
          ) : paginatedPayments.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No transactions found matching the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Mode / Ref</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPayments.map((p) => {
                    const isReversed = p.status === "REVERSED";
                    const isRefunded = p.status === "REFUNDED";
                    const isPartial = p.status === "PARTIALLY_REFUNDED";

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Receipt # */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {p.receiptNumber}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                          <div>
                            {new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(p.paymentDate || p.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {p.studentName}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {p.admissionNumber || p.studentId}
                          </div>
                        </td>

                        {/* Class */}
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {p.className} {p.sectionName ? `(${p.sectionName})` : ""}
                        </td>

                        {/* Payment Mode */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.paymentMethod}
                          </div>
                          {p.referenceNumber && (
                            <div className="font-mono text-[11px] text-slate-400 truncate max-w-[130px]" title={p.referenceNumber}>
                              Ref: {p.referenceNumber}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right">
                          <div className={`font-bold ${isReversed ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                            {formatINR(p.amountPaise)}
                          </div>
                          {(p.refundedAmountPaise || 0) > 0 && (
                            <div className="text-[11px] text-amber-600 font-medium">
                              Ref: -{formatINR(p.refundedAmountPaise || 0)}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                              p.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                : isPartial
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                                : isRefunded
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                                : isReversed
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Print Receipt */}
                            <button
                              type="button"
                              onClick={() => openReceiptModal(p)}
                              title="Print Receipt"
                              className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* View Allocations / Detail */}
                            <button
                              type="button"
                              onClick={() => openDetailModal(p)}
                              title="View Breakdown & Allocations"
                              className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Refund Button */}
                            {!isReversed && !isRefunded && (
                              <button
                                type="button"
                                onClick={() => openRefundModal(p)}
                                title="Process Controlled Refund"
                                className="p-1.5 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <ArrowDownLeft className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reversal Button */}
                            {!isReversed && (p.refundedAmountPaise || 0) === 0 && (
                              <button
                                type="button"
                                onClick={() => openReversalModal(p)}
                                title="Reverse Mistaken Payment"
                                className="p-1.5 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, payments.length)} of {payments.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Detail Drawer */}
        {detailModalPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    Transaction #{detailModalPayment.receiptNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: {detailModalPayment.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailModalPayment(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDetail ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Basic Metadata */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-slate-500 block">Student Name:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {detailModalPayment.studentName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Admission Number:</span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {detailModalPayment.admissionNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Class & Section:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {detailModalPayment.className} ({detailModalPayment.sectionName || "A"})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Amount Collected:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(detailModalPayment.amountPaise)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Payment Method:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {detailModalPayment.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Reference No:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {detailModalPayment.referenceNumber || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Collected By:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {detailModalPayment.collectedByName || detailModalPayment.collectedBy || "Staff"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Payment Date:</span>
                      <span className="text-slate-900 dark:text-slate-100">
                        {new Date(detailModalPayment.paymentDate || detailModalPayment.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Allocations Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                      Allocated Invoices / Demands
                    </h4>
                    {paymentDetailData?.allocations && paymentDetailData.allocations.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {paymentDetailData.allocations.map((alloc) => (
                          <div key={alloc.id} className="p-3 flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {alloc.feeHeadName}
                              </span>
                              <span className="text-slate-400 ml-2">({alloc.period})</span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Demand ID: {alloc.demandId}
                              </div>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatINR(alloc.allocatedAmountPaise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                        Standard tuition fee allocation
                      </div>
                    )}
                  </div>

                  {/* Linked Refunds */}
                  {paymentDetailData?.refunds && paymentDetailData.refunds.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">
                        Refund History
                      </h4>
                      <div className="space-y-2">
                        {paymentDetailData.refunds.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1"
                          >
                            <div className="flex justify-between font-semibold">
                              <span>Receipt: {r.refundReceiptNumber}</span>
                              <span className="text-amber-700 dark:text-amber-400">
                                -{formatINR(r.amountPaise)}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-400">
                              Reason: {r.reason}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Processed by {r.processedByName} on {new Date(r.refundDate).toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reversal Information */}
                  {paymentDetailData?.reversal && (
                    <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-rose-700 dark:text-rose-400">
                        Transaction Reversed
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        Reason: {paymentDetailData.reversal.reason}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Reversed by {paymentDetailData.reversal.reversedByName} on {new Date(paymentDetailData.reversal.reversedAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModalPayment(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controlled Refund Modal */}
        {refundPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <form
              onSubmit={handleRefundSubmit}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-amber-600" />
                  Process Controlled Refund
                </h3>
                <button
                  type="button"
                  onClick={() => setRefundPayment(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Payment:</span>
                  <span className="font-mono font-bold">{refundPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold">{refundPayment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Collected:</span>
                  <span>{formatINR(refundPayment.amountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available to Refund:</span>
                  <span className="font-bold text-emerald-600">
                    {formatINR(refundPayment.amountPaise - (refundPayment.refundedAmountPaise || 0))}
                  </span>
                </div>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Refund Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Refund Method */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Refund Reason (Mandatory for Audit) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Concession granted by principal after fee collection"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={refundSubmitting}
                  onClick={() => setRefundPayment(null)}
                  className="flex-1 py-2 px-4 rounded-lg border border-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="flex-1 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {refundSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Refund"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Full Reversal Modal */}
        {reversalPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <form
              onSubmit={handleReversalSubmit}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                  <Undo2 className="w-5 h-5 text-rose-600" />
                  Reverse Payment
                </h3>
                <button
                  type="button"
                  onClick={() => setReversalPayment(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1.5 text-rose-900 dark:text-rose-200">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Full Transaction Reversal Warning
                </div>
                <p>
                  Reversing payment <strong>{reversalPayment.receiptNumber}</strong> will cancel this transaction completely and restore all allocated dues back to the student&apos;s invoice balances.
                </p>
                <div className="font-semibold">
                  Amount to Reverse: {formatINR(reversalPayment.amountPaise)}
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Reason for Reversal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Payment entered under wrong student by mistake"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={reversalSubmitting}
                  onClick={() => setReversalPayment(null)}
                  className="flex-1 py-2 px-4 rounded-lg border border-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversalSubmitting}
                  className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
                >
                  {reversalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Reversing...
                    </>
                  ) : (
                    "Confirm Reversal"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Instant Receipt Modal for Print / Reprint */}
        <FeeReceiptModal
          payment={receiptPayment}
          schoolName={schoolName}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptPayment(null);
          }}
        />
      </div>
    </EntitlementGate>
  );
}
