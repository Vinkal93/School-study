"use client";

import React, { useState, useMemo } from "react";
import { Receipt, Search, Filter, Eye, Download, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import type { InvoiceData } from "./InvoiceDetailsDrawer";

export interface BillingHistoryTableProps {
  invoices: InvoiceData[];
  payments: any[];
  onViewInvoice: (invoice: InvoiceData) => void;
}

export function BillingHistoryTable({ invoices = [], payments = [], onViewInvoice }: BillingHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("ALL");

  const combinedRecords = useMemo(() => {
    if (invoices.length > 0) return invoices;
    // Map payments to invoice records if no invoice docs exist
    return payments.map((p) => ({
      id: p.id,
      invoiceNumber: `INV-${p.id.slice(-6).toUpperCase()}`,
      paymentId: p.razorpayPaymentId || p.id,
      planName: p.planId === "plan_professional" ? "Professional Plan" : "Starter Plan",
      amountRupees: Math.round((p.amountPaise || p.amount || 199900) / 100),
      status: p.status === "captured" ? "PAID" : p.status || "PAID",
      createdAt: p.capturedAt || p.createdAt || new Date().toISOString(),
      billingPeriod: "Monthly Subscription",
      paymentMethod: p.method || "Razorpay UPI",
    }));
  }, [invoices, payments]);

  const filtered = useMemo(() => {
    return combinedRecords.filter((rec) => {
      const matchStatus = statusFilter === "ALL" || (rec.status || "").toUpperCase() === statusFilter;
      const matchSearch =
        !search.trim() ||
        (rec.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (rec.planName || "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [combinedRecords, statusFilter, search]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Billing History & Invoices</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of subscription payments, charges, and tax receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Tabs */}
          {(["ALL", "PAID", "PENDING", "FAILED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number or plan..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Table / Empty State */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 space-y-1">
          <Receipt className="h-6 w-6 text-slate-400 mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No billing history or invoices found</p>
          <p className="text-[11px] text-slate-500">Invoices will automatically generate here after subscription renewals.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Invoice Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Plan / Description</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber || inv.id}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 dark:text-white block">{inv.planName || "Professional Plan"}</span>
                    <span className="text-[10px] text-slate-400">{inv.billingPeriod || "Monthly Subscription"}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    ₹{(inv.amountRupees || Math.round(((inv as any).amount || 199900) / 100)).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px] uppercase">
                      <CheckCircle2 className="h-3 w-3" />
                      {inv.status || "PAID"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onViewInvoice(inv)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-all cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
