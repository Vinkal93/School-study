"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { Search, Printer, FileText, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import type { FeePayment } from "@/types";
import { getFeeTransactions } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminFeeTransactionsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [transactions, setTransactions] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchTransactions = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getFeeTransactions(schoolId);
      setTransactions(data);
    } catch (err) {
      toast.error("Failed to load transactions ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [schoolId]);

  const filtered = transactions.filter(
    (t) =>
      t.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EntitlementGate feature="fee_transactions" title="Transactions Ledger" requiredPlan="Professional Plan">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Transactions Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">Audit log of all processed fee payments, receipt numbers, and payment modes.</p>
        </div>

        {/* Search Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by receipt no, student name, admission no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">No fee transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Receipt No</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Fee Type</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Net Amount</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{t.receiptNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {t.studentName}
                        <p className="text-[10px] text-slate-400 font-normal">Adm: {t.admissionNumber}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{t.className} ({t.sectionName})</td>
                      <td className="py-3.5 px-4 capitalize font-semibold">{t.feeType}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{t.paymentMethod}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                        ₹{(t.netAmountPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(t.paymentDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPayment(t);
                            setShowReceiptModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 transition-all"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Receipt Modal */}
        <FeeReceiptModal
          payment={selectedPayment}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      </div>
    </EntitlementGate>
  );
}
