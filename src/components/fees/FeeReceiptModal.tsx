"use client";

import React, { useRef } from "react";
import { Printer, Download, X, CheckCircle2, Building2, CreditCard } from "lucide-react";
import type { FeePayment } from "@/types";

interface FeeReceiptModalProps {
  payment: FeePayment | null;
  schoolName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FeeReceiptModal({ payment, schoolName = "School Study ERP", isOpen, onClose }: FeeReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const amountRupees = (payment.amountPaidPaise / 100).toFixed(2);
  const discountRupees = (payment.discountPaise / 100).toFixed(2);
  const lateFeeRupees = (payment.lateFeePaise / 100).toFixed(2);
  const netRupees = (payment.netAmountPaise / 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Payment Receipt #{payment.receiptNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0" ref={receiptRef}>
          {/* Header Branding */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  S
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{schoolName}</h2>
                  <p className="text-xs text-slate-500">Official Fee Receipt & Student Ledger Entry</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PAID</span>
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">
                No: <span className="font-mono text-blue-600">{payment.receiptNumber}</span>
              </p>
              <p className="text-[11px] text-slate-500">Date: {new Date(payment.paymentDate).toLocaleDateString("en-IN")}</p>
            </div>
          </div>

          {/* Student & Class Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Student Name</p>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{payment.studentName}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Admission No.</p>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{payment.admissionNumber}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Class & Section</p>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{payment.className} ({payment.sectionName})</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Payment Mode</p>
              <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">{payment.paymentMethod}</p>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fee Description / Period</th>
                  <th className="py-3 px-4 text-right">Base Amount</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Late Fee</th>
                  <th className="py-3 px-4 text-right">Net Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                <tr>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{payment.feeType} Fee</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Periods: {payment.periodMonths.join(", ")}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right">₹{amountRupees}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-600">-₹{discountRupees}</td>
                  <td className="py-3.5 px-4 text-right text-amber-600">+₹{lateFeeRupees}</td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-blue-600">₹{netRupees}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Summary Footer */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-300 font-bold">Total Net Payment Collected</p>
              {payment.transactionRef && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Txn Ref: {payment.transactionRef}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{netRupees}</span>
            </div>
          </div>

          {/* Authorized Signature & Disclaimer */}
          <div className="pt-8 flex items-end justify-between border-t border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-500">Collected By: <span className="font-bold text-slate-800 dark:text-slate-200">{payment.collectedByName || "School Accountant"}</span></p>
              <p className="text-[10px] text-slate-400 mt-1">Computer Generated Receipt. Valid without physical signature.</p>
            </div>
            <div className="text-center w-36">
              <div className="border-b border-slate-400 dark:border-slate-600 mb-1 h-8"></div>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Authorized Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
