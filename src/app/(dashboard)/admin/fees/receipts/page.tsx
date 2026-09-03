"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { Search, Printer, FileText, Loader2, CreditCard } from "lucide-react";
import type { FeePayment } from "@/types";
import { getFeeTransactions } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminFeeReceiptsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [receipts, setReceipts] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function loadReceipts() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const list = await getFeeTransactions(schoolId);
        setReceipts(list);
      } catch (err) {
        toast.error("Failed to load receipts.");
      } finally {
        setLoading(false);
      }
    }
    loadReceipts();
  }, [schoolId]);

  const filtered = receipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EntitlementGate feature="fee_receipts" title="Receipt Generator & Search" requiredPlan="Professional Plan">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Receipts Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Search, view, print, and download official payment receipts.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipt number or student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No receipts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Receipt No</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4 text-right">Net Amount</th>
                    <th className="py-3.5 px-4">Payment Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{r.receiptNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{r.studentName}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{r.className} ({r.sectionName})</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">₹{(r.netAmountPaise / 100).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(r.paymentDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPayment(r);
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Print / View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <FeeReceiptModal
          payment={selectedPayment}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </div>
    </EntitlementGate>
  );
}
