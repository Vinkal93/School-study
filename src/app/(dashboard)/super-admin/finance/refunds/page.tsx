"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  Building2,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RefundRecord, getRefundsList, getRefundableAmount } from "@/lib/payments/refunds";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs } from "firebase/firestore";
import { BILLING_COLLECTIONS } from "@/lib/billing";
import { PaymentRecord } from "@/lib/payments/fulfillment";

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default function SuperAdminRefundsPage() {
  const { profile } = useAuth();
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Initiating Refund
  const [showModal, setShowModal] = useState(false);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [calc, setCalc] = useState<any>(null);
  const [refundType, setRefundType] = useState<"FULL_REFUND" | "PARTIAL_REFUND">("FULL_REFUND");
  const [refundAmountRupees, setRefundAmountRupees] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [subPolicy, setSubPolicy] = useState<"NO_CHANGE" | "REVOKE_ENTITLEMENT" | "END_AT_REFUND_TIME">("NO_CHANGE");
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getRefundsList();
      setRefunds(list);

      const db = getFirebaseDb();
      if (db) {
        const snap = await getDocs(collection(db, BILLING_COLLECTIONS.PAYMENTS || "payments"));
        const pList = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as PaymentRecord))
          .filter((p) => p.status === "CAPTURED" || p.status === ("PARTIALLY_REFUNDED" as any));
        setPaymentsList(pList);
      }
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPayment = async (payId: string) => {
    setSelectedPaymentId(payId);
    setModalError(null);
    if (!payId) {
      setCalc(null);
      return;
    }
    try {
      const c = await getRefundableAmount(payId);
      setCalc(c);
      setRefundAmountRupees((c.remainingRefundable / 100).toString());
    } catch (err: any) {
      setModalError("Failed to calculate refundable balance.");
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedPaymentId || !calc) {
      setModalError("Please select a payment.");
      return;
    }

    const amtPaise = Math.round(parseFloat(refundAmountRupees) * 100);
    if (isNaN(amtPaise) || amtPaise <= 0) {
      setModalError("Enter a valid positive refund amount.");
      return;
    }

    if (amtPaise > calc.remainingRefundable) {
      setModalError(`Refund cannot exceed refundable balance of ${formatRupees(calc.remainingRefundable)}.`);
      return;
    }

    if (!refundReason.trim()) {
      setModalError("Please provide a reason for this refund.");
      return;
    }

    setProcessing(true);
    setModalError(null);

    try {
      const res = await fetch("/api/super-admin/finance/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
          amountPaise: amtPaise,
          reason: refundReason,
          actorId: profile?.email || "super_admin",
          subscriptionPolicy: subPolicy,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to execute refund.");
      }

      setShowModal(false);
      setSelectedPaymentId("");
      setCalc(null);
      setRefundReason("");
      await loadData();
    } catch (err: any) {
      setModalError(err.message || "Failed to process refund.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    const matchesSearch =
      searchQuery === "" ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.schoolId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.paymentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalRefundedPaise = refunds
    .filter((r) => r.status === "PROCESSED")
    .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/super-admin/finance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Finance Center</span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-red-600" />
            Refunds & Chargebacks Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Process full or partial payment refunds with strict balance limits and subscription policy governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Initiate Refund</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Realized Refunds
          </span>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            {formatRupees(totalRefundedPaise)}
          </p>
          <p className="text-[11px] text-slate-500">Debited from platform cashflow</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Refunds Processed Count
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {refunds.filter((r) => r.status === "PROCESSED").length}
          </p>
          <p className="text-[11px] text-slate-500">Successful gateway debits</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pending / In-Review
          </span>
          <p className="text-2xl font-black text-amber-600 font-mono">
            {refunds.filter((r) => r.status === "REQUESTED" || r.status === "PROCESSING").length}
          </p>
          <p className="text-[11px] text-slate-500">Awaiting gateway fulfillment</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by refund ID, school ID, or payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="PROCESSED">Processed</option>
            <option value="REQUESTED">Requested</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold"
          >
            <option value="all">All Types</option>
            <option value="FULL_REFUND">Full Refund</option>
            <option value="PARTIAL_REFUND">Partial Refund</option>
          </select>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading refund records...</span>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <RotateCcw className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No refunds recorded</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any full or partial refunds processed will appear in this authoritative ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3">Date</th>
                  <th className="p-3">School ID</th>
                  <th className="p-3">Original Payment</th>
                  <th className="p-3">Refund Amount</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Policy</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Gateway Ref</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRefunds.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{r.schoolId}</td>
                    <td className="p-3 font-mono text-slate-600">{r.paymentId}</td>
                    <td className="p-3 font-extrabold text-red-600 dark:text-red-400 font-mono">
                      -{formatRupees(r.approvedAmount || r.requestedAmount)}
                    </td>
                    <td className="p-3 font-semibold uppercase text-[10px]">{r.type.replace("_", " ")}</td>
                    <td className="p-3 text-[10px] text-slate-500 font-mono">{r.subscriptionPolicy || "NO_CHANGE"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "PROCESSED"
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            : r.status === "FAILED"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">{r.razorpayRefundId || "N/A"}</td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/super-admin/finance/transactions/${r.paymentId}`}
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline text-xs"
                      >
                        <span>Inspect Trace</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Initiate Refund (Section 12, 15 & 25) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-red-600" />
                <span>Initiate Gateway Refund</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Select Payment */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Captured Payment:
                </label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => handleSelectPayment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                >
                  <option value="">-- Choose Payment --</option>
                  {paymentsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — School: {p.schoolId} ({formatRupees(p.amount)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Calculation Balance Box (Section 25) */}
              {calc && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Payment:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatRupees(calc.originalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previously Refunded:</span>
                    <span className="font-mono text-red-600">-{formatRupees(calc.totalRefunded)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-bold">
                    <span>Remaining Refundable:</span>
                    <span className="font-mono text-emerald-600">{formatRupees(calc.remainingRefundable)}</span>
                  </div>
                </div>
              )}

              {/* Refund Amount Input */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Refund Amount (INR):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  placeholder="e.g. 999"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                />
              </div>

              {/* Subscription Policy (Section 19 & 20) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subscription Refund Policy:
                </label>
                <select
                  value={subPolicy}
                  onChange={(e) => setSubPolicy(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="NO_CHANGE">NO_CHANGE (Keep subscription active - Recommended for partial refunds)</option>
                  <option value="REVOKE_ENTITLEMENT">REVOKE_ENTITLEMENT (Immediately expire school subscription)</option>
                  <option value="END_AT_REFUND_TIME">END_AT_REFUND_TIME (Set expiration timestamp to right now)</option>
                </select>
              </div>

              {/* Refund Reason */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Refund Reason & Notes:
                </label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation within refund window"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={processing || !selectedPaymentId}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50"
              >
                {processing ? "Executing Gateway Refund..." : "Confirm & Process Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
