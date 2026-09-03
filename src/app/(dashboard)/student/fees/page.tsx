"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { CreditCard, CheckCircle2, Clock, Printer, Loader2, DollarSign } from "lucide-react";
import type { StudentFeeAssignment, FeePayment } from "@/types";
import { getStudentFeeAssignment, getFeeTransactions } from "@/lib/services/fee.service";

export default function StudentFeePortalPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "school_demo";
  const studentId = profile?.uid || "std_demo_1";

  const [assignment, setAssignment] = useState<StudentFeeAssignment | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      try {
        const [a, pList] = await Promise.all([
          getStudentFeeAssignment(schoolId, studentId),
          getFeeTransactions(schoolId, { studentId }),
        ]);
        setAssignment(a);
        setPayments(pList);
      } catch (err) {
        console.error("Failed to load student fee data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [schoolId, studentId]);

  const totalAssignedRupees = assignment ? (assignment.totalAssignedPaise / 100).toFixed(2) : "0.00";
  const totalPaidRupees = assignment ? (assignment.totalPaidPaise / 100).toFixed(2) : "0.00";
  const totalPendingRupees = assignment ? (assignment.totalPendingPaise / 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Status & Receipts</h1>
        <p className="text-xs text-slate-500 mt-1">Read-only overview of your fee schedule, paid payments, and official receipts.</p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 font-semibold">Total Session Fee</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">₹{totalAssignedRupees}</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-emerald-600 font-semibold">Total Paid</span>
          <p className="text-2xl font-black text-emerald-600">₹{totalPaidRupees}</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-amber-600 font-semibold">Pending Dues</span>
          <p className="text-2xl font-black text-amber-600">₹{totalPendingRupees}</p>
        </div>
      </div>

      {/* Payment Receipts History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Receipts & History</h3>

        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">No payment receipts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Fee Type</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{p.receiptNumber}</td>
                    <td className="py-3.5 px-4 capitalize font-semibold">{p.feeType}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{p.paymentMethod}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">₹{(p.netAmountPaise / 100).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setShowReceiptModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm"
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
  );
}
