"use client";

import React from "react";
import { X, Printer, Download, Receipt, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface InvoiceData {
  id: string;
  invoiceNumber?: string;
  paymentId?: string;
  schoolId?: string;
  schoolName?: string;
  planName?: string;
  amount?: number; // paise or rupees
  amountRupees?: number;
  status?: string;
  createdAt?: string;
  capturedAt?: string;
  billingPeriod?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  paymentMethod?: string;
  gstin?: string;
}

export interface InvoiceDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
}

export function InvoiceDetailsDrawer({ isOpen, onClose, invoice }: InvoiceDetailsDrawerProps) {
  if (!isOpen || !invoice) return null;

  const invNum = invoice.invoiceNumber || invoice.id || "INV-2026-001";
  const rawAmt = invoice.amountRupees || (invoice.amount ? Math.round(invoice.amount / 100) : 1999);
  const tax = Math.round(rawAmt * 0.18);
  const total = rawAmt;
  const subtotal = rawAmt - tax;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 my-auto print:shadow-none print:border-none">
        {/* Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Tax Invoice Details</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="space-y-6 text-xs">
          {/* Header Branding & Invoice Meta */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">SCHOOL STUDY SAAS</h2>
              <p className="text-[11px] text-slate-500">School Management Technologies Pvt Ltd</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: 29AAAAA0000A1Z5</p>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 block">{invNum}</span>
              <span className="text-[11px] text-slate-500 block">Date: {new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN")}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                <CheckCircle2 className="h-3 w-3" />
                {invoice.status || "PAID"}
              </span>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Billed To</span>
              <span className="font-bold text-slate-900 dark:text-white block text-sm">{invoice.schoolName || "Greenwood Campus"}</span>
              <span className="text-slate-500 block">Karnataka, India</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Metadata</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 block">Payment ID: {invoice.paymentId || "pay_default"}</span>
              <span className="text-slate-500 block">Method: {invoice.paymentMethod || "Razorpay UPI"}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-3">Description / Plan</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <tr>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 dark:text-white block">{invoice.planName || "Professional Plan Subscription"}</span>
                    <span className="text-slate-400 text-[11px]">Billing Period: {invoice.billingPeriod || "1 Month Subscription Access"}</span>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">₹{subtotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-right font-mono text-xs pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GST (18%):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">₹{tax.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Total Paid:</span>
              <span className="text-blue-600 dark:text-blue-400">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
