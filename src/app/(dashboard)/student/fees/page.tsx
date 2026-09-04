"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Printer,
  Loader2,
  DollarSign,
  Receipt,
  AlertCircle,
} from "lucide-react";
import type { StudentProfile, StudentFeeAssignment, FeePayment } from "@/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  subscribeToStudentFeeAssignment,
  subscribeToStudentFeePayments,
} from "@/lib/services/fee.service";

export default function StudentFeePortalPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [assignment, setAssignment] = useState<StudentFeeAssignment | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // 1. Resolve student document ID from Auth UID
  useEffect(() => {
    async function loadStudent() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        let studentDoc: any = null;

        const q = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          studentDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else if (profile.email) {
          const qEmail = query(
            collection(db, "schools", schoolId, "students"),
            where("email", "==", profile.email.toLowerCase())
          );
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            studentDoc = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
          }
        }

        if (studentDoc) {
          setStudent(studentDoc as StudentProfile);
        }
      } catch (err) {
        console.error("Failed to load student for fees:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [schoolId, profile?.uid, profile?.email]);

  // 2. Real-time subscription to fee assignment & payments
  useEffect(() => {
    if (!schoolId || !student?.id) return;

    const unsubAssignment = subscribeToStudentFeeAssignment(
      schoolId,
      student.id,
      (liveAssignment) => {
        setAssignment(liveAssignment);
      }
    );

    const unsubPayments = subscribeToStudentFeePayments(
      schoolId,
      student.id,
      (livePayments) => {
        setPayments(livePayments);
      }
    );

    return () => {
      unsubAssignment();
      unsubPayments();
    };
  }, [schoolId, student?.id]);

  const totalAssignedRupees = assignment
    ? (assignment.totalAssignedPaise / 100).toFixed(2)
    : "0.00";
  const totalPaidRupees = assignment
    ? (assignment.totalPaidPaise / 100).toFixed(2)
    : "0.00";
  const totalPendingRupees = assignment
    ? (assignment.totalPendingPaise / 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Fee Status & Official Receipts
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Live financial ledger of your academic fees, recorded payments, and verified receipts.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 font-semibold">Total Session Fee</span>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            ₹{totalAssignedRupees}
          </p>
          <p className="text-[11px] text-slate-400">Class academic fee structure</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-emerald-600 font-semibold">Total Paid</span>
          <p className="text-3xl font-black text-emerald-600">
            ₹{totalPaidRupees}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">Verified by school cashier</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-amber-600 font-semibold">Pending Dues</span>
          <p className="text-3xl font-black text-amber-600">
            ₹{totalPendingRupees}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">
            {Number(totalPendingRupees) > 0 ? "Outstanding balance" : "All cleared ✓"}
          </p>
        </div>
      </div>

      {/* Month-Wise Ledger Breakdown */}
      {assignment && assignment.monthLedger && assignment.monthLedger.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Academic Fee Schedule ({assignment.monthLedger.length} Months)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {assignment.monthLedger.map((m) => {
              const isPaid = m.status === "PAID";
              const isZero = m.amountPaise === 0;
              return (
                <div
                  key={m.month}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    isPaid
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                      : isZero
                      ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60"
                      : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40"
                  }`}
                >
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">{m.month}</p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    ₹{(m.amountPaise / 100).toFixed(0)}
                  </p>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      isPaid
                        ? "bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100"
                        : isZero
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        : "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                    }`}
                  >
                    {isZero ? "N/A" : m.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Receipts History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          Payment Receipts & History
        </h3>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <Receipt className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No payment receipts recorded yet</p>
            <p className="text-[11px] text-slate-400">
              When fees are paid and recorded by the school administration, your official receipt will appear here instantly.
            </p>
          </div>
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
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold">{p.feeType}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                      ₹{(p.netAmountPaise / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                    </td>
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
