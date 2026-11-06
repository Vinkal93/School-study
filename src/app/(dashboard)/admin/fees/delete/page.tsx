"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useFeeSession } from "@/components/fees/FeeSessionProvider";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { feeFetch } from "@/lib/fees/client-request";
import {
  Trash2,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Search,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Receipt,
  FileText,
  Clock,
  RefreshCw,
} from "lucide-react";
import { getFeeTransactions } from "@/lib/services/fee.service";
import type { FeePayment } from "@/types";
import type { FeeDemand } from "@/types/fee-foundation";
import { formatINR } from "@/lib/services/fee-foundation.service";
import { toast } from "sonner";

export default function DeleteFeesPage() {
  const { profile } = useAuth();
  const { academicYearId } = useFeeSession();
  const schoolId = profile?.schoolId || "";

  const [activeTab, setActiveTab] = useState<"payments" | "invoices">("payments");
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Reversal state for confirmed payments
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Void state for unpaid fee demands
  const [selectedDemand, setSelectedDemand] = useState<FeeDemand | null>(null);
  const [voidDemandReason, setVoidDemandReason] = useState("");
  const [voidingDemand, setVoidingDemand] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [paymentsList, demandsRes] = await Promise.all([
        getFeeTransactions(schoolId, {
          academicYearId: academicYearId !== "all" ? academicYearId : undefined,
        }).catch(() => []),
        feeFetch(
          `/api/fees/foundation/demands?schoolId=${encodeURIComponent(schoolId)}&academicYearId=${encodeURIComponent(
            academicYearId
          )}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      setPayments(paymentsList || []);
      const activeDemands: FeeDemand[] = (demandsRes?.demands || []).filter(
        (d: FeeDemand) => d.status !== "CANCELLED" && (d.paidAmountPaise || 0) === 0
      );
      setDemands(activeDemands);
    } catch (err) {
      console.error("Failed to load records for deletion:", err);
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, academicYearId]);

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      String(p.receiptNumber || "").toLowerCase().includes(q) ||
      String(p.studentName || "").toLowerCase().includes(q) ||
      String(p.admissionNumber || "").toLowerCase().includes(q)
    );
  });

  const filteredDemands = demands.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      String(d.studentName || "").toLowerCase().includes(q) ||
      String(d.admissionNumber || "").toLowerCase().includes(q) ||
      String(d.feeHeadName || "").toLowerCase().includes(q) ||
      String(d.period || "").toLowerCase().includes(q)
    );
  });

  // Authoritative Reversal Execution
  const handleVoidPayment = async () => {
    if (!selectedPayment) return;
    if (!reversalReason.trim()) {
      toast.error("Please specify a mandatory audit reason for voiding this fee receipt.");
      return;
    }

    setProcessing(true);
    try {
      const res = await feeFetch("/api/fees/foundation/reversals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          paymentId: selectedPayment.id,
          reason: reversalReason.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reverse fee payment.");
      }

      toast.success(
        `Receipt ${selectedPayment.receiptNumber} voided successfully. Audit reversal journal posted and dues restored.`
      );
      setSelectedPayment(null);
      setReversalReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void payment.");
    } finally {
      setProcessing(false);
    }
  };

  // Authoritative Invoice Void Execution
  const handleVoidDemand = async () => {
    if (!selectedDemand) return;
    if (!voidDemandReason.trim()) {
      toast.error("Please specify a mandatory audit reason for voiding this fee invoice.");
      return;
    }

    setVoidingDemand(true);
    try {
      const res = await feeFetch("/api/fees/foundation/demands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          demandId: selectedDemand.id,
          reason: voidDemandReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to void fee invoice.");
      }

      toast.success(
        `Invoice for ${selectedDemand.studentName} (${selectedDemand.feeHeadName}) voided and removed from outstanding dues.`
      );
      setSelectedDemand(null);
      setVoidDemandReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void fee invoice.");
    } finally {
      setVoidingDemand(false);
    }
  };

  return (
    <EntitlementGate feature="fee_delete" title="Delete Fees" requiredPlan="Enterprise Plan">
      <div className="mx-auto max-w-6xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">
                Fees
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Delete Fees</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Controlled Fee Corrections & Voiding
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Lock className="h-3 w-3" />
                AUDITED CORRECTIONS
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Administrative payment reversals with automated ledger re-balancing and unpaid invoice cancellations.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Warning Banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong className="font-bold">Strict Accounting Compliance:</strong> Ordinary hard deletion of completed financial records is forbidden. Voiding a confirmed payment posts an automated reversing journal entry, restores the student's dues, updates the cashbook, and logs an immutable audit event with your admin credentials.
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("payments");
              setSearchQuery("");
            }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "payments"
                ? "border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Confirmed Payments ({payments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("invoices");
              setSearchQuery("");
            }}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "invoices"
                ? "border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Unpaid Invoices ({demands.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "payments"
                  ? "Search Receipt No or Student to review / void payment..."
                  : "Search Student, Admission No, or Fee Head to cancel unpaid invoice..."
              }
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* TAB 1: Payments List */}
        {activeTab === "payments" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Confirmed Collections Subject to Reversal ({filteredPayments.length})
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading transactions...</div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No transactions match your search.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Receipt No</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Payment Mode</th>
                      <th className="px-4 py-3 text-right">Amount Paid</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.slice(0, 30).map((p) => {
                      const isReversed = (p as any).isReversed || p.status === "REVERSED";
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {p.receiptNumber}
                            {isReversed && (
                              <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                REVERSED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.paymentDate?.slice(0, 10)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {p.studentName}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{p.className}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.paymentMethod}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(p.amountPaidPaise)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isReversed ? (
                              <span className="text-slate-400 text-xs italic">Already Voided</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedPayment(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                              >
                                <Trash2 className="h-3 w-3" />
                                Reverse & Void
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Unpaid Invoices List */}
        {activeTab === "invoices" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Unpaid Invoices Eligible for Cancellation ({filteredDemands.length})
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading invoices...</div>
            ) : filteredDemands.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No unpaid fee invoices found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Fee Head</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Net Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDemands.slice(0, 30).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {d.studentName}
                          <div className="text-[10px] text-slate-400 font-mono">Adm: {d.admissionNumber || d.studentId}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{d.className}</td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{d.feeHeadName}</td>
                        <td className="px-4 py-3 text-slate-500">{d.period}</td>
                        <td className="px-4 py-3 text-slate-500">{d.dueDate?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(d.netAmountPaise)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedDemand(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            <Trash2 className="h-3 w-3" />
                            Void Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Void Payment Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Fee Payment Reversal
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to reverse Receipt{" "}
                <strong className="text-slate-900 dark:text-white">
                  {selectedPayment.receiptNumber}
                </strong>{" "}
                for <strong>{selectedPayment.studentName}</strong> (
                {formatINR(selectedPayment.amountPaidPaise)})? This will restore the student's dues and post a reversal journal entry.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mandatory Audit Cancellation Reason *
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Cheque dishonoured / wrong student selected / duplicate cashier entry..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVoidPayment}
                  disabled={processing || !reversalReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {processing ? "Reversing..." : "Confirm & Reverse"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Void Invoice Demand Modal */}
        {selectedDemand && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Unpaid Invoice Cancellation
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to void the unpaid invoice for{" "}
                <strong className="text-slate-900 dark:text-white">{selectedDemand.studentName}</strong> (
                {selectedDemand.feeHeadName} - {selectedDemand.period}, {formatINR(selectedDemand.netAmountPaise)})?
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mandatory Audit Cancellation Reason *
                </label>
                <textarea
                  value={voidDemandReason}
                  onChange={(e) => setVoidDemandReason(e.target.value)}
                  placeholder="e.g. Student transferred mid-session / incorrect structure assigned / duplicate invoice..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDemand(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVoidDemand}
                  disabled={voidingDemand || !voidDemandReason.trim()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {voidingDemand ? "Voiding..." : "Confirm & Void Invoice"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
