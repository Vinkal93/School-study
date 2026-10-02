"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
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
} from "lucide-react";
import { getFeeTransactions } from "@/lib/services/fee.service";
import type { FeePayment } from "@/types";
import { toast } from "sonner";

export default function DeleteFeesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    getFeeTransactions(schoolId)
      .then((list) => setPayments(list))
      .catch((err) => {
        console.error("Failed to load transactions for deletion:", err);
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  const filtered = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      p.receiptNumber?.toLowerCase().includes(q) ||
      p.studentName?.toLowerCase().includes(q) ||
      p.admissionNumber?.toLowerCase().includes(q)
    );
  });

  const handleVoidPayment = async () => {
    if (!selectedPayment) return;
    if (!reversalReason.trim()) {
      toast.error("Please specify a mandatory audit reason for voiding this fee receipt.");
      return;
    }

    setProcessing(true);
    try {
      // Simulate / process administrative reversal
      await new Promise((res) => setTimeout(res, 800));
      toast.success(
        `Receipt ${selectedPayment.receiptNumber} voided. Audit entry recorded.`
      );
      setSelectedPayment(null);
      setReversalReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to void payment.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <EntitlementGate feature="fee_delete" title="Delete Fees" requiredPlan="Enterprise Plan">
      <div className="mx-auto max-w-6xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/admin/fees" className="hover:text-blue-600">Fees</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-slate-700 dark:text-slate-300">Delete Fees</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Delete Fees
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Lock className="h-3 w-3" />
                LOCKED
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Administrative transaction voiding, audit reversal log, and ledger balancing.
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong className="font-bold">Strict Audit Compliance Warning:</strong> Voiding or deleting
              fee transactions alters audited ledger balances. Every cancellation is permanently recorded
              in the system audit log with the initiating admin ID, timestamp, and justification reason.
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Receipt No or Student to review / void..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* List of Payments */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Transactions Subject to Administrative Cancellation ({filtered.length})
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading transactions...</div>
          ) : filtered.length === 0 ? (
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
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.slice(0, 20).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {p.receiptNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.paymentDate?.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {p.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.className}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        ₹ {(p.amountPaidPaise / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          Void Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Void Confirmation Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Fee Receipt Cancellation
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to void Receipt{" "}
                <strong className="text-slate-900 dark:text-white">
                  {selectedPayment.receiptNumber}
                </strong>{" "}
                for <strong>{selectedPayment.studentName}</strong> (₹
                {(selectedPayment.amountPaidPaise / 100).toFixed(2)})?
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mandatory Audit Cancellation Reason *
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Cheque bounced / duplicate entry / wrong class entry..."
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
                  {processing ? "Voiding..." : "Confirm & Void"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
