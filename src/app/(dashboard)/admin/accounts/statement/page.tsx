"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  BarChart3,
  Download,
  Printer,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  Banknote,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  getAccountHeads,
  getAccountTransactions,
  generateAccountStatementPDF,
  type AccountHead,
  type AccountTransaction,
} from "@/lib/services/account-head.service";
import { getFeeSettings } from "@/lib/services/fee.service";
import type { FeeSettings } from "@/types";
import { toast } from "sonner";

export default function AccountStatementPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Data states
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedType, setSelectedType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [selectedHeadId, setSelectedHeadId] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load Data
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      getAccountHeads(schoolId),
      getAccountTransactions(schoolId),
      getFeeSettings(schoolId),
    ])
      .then(([headsList, txnsList, feeSett]) => {
        setHeads(headsList);
        setTransactions(txnsList);
        setSettings(feeSett);
      })
      .catch((err) => {
        console.error("Failed to load accounting data:", err);
        toast.error("Failed to load account statement.");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Date filter
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // Type filter
      if (selectedType !== "ALL" && t.type !== selectedType) return false;

      // Head filter
      if (selectedHeadId !== "all" && t.headId !== selectedHeadId) return false;

      // Method filter
      if (selectedMethod !== "all" && t.paymentMethod !== selectedMethod) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.voucherNo.toLowerCase().includes(q) ||
          t.headName.toLowerCase().includes(q) ||
          t.partyName?.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [transactions, startDate, endDate, selectedType, selectedHeadId, selectedMethod, searchQuery]);

  // KPI Calculations
  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === "INCOME") inc += t.amount;
      else if (t.type === "EXPENSE") exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp,
    };
  }, [filteredTransactions]);

  // Download PDF Statement
  const handleDownloadPDF = () => {
    try {
      const doc = generateAccountStatementPDF({
        schoolName: settings?.schoolName || profile?.schoolName || "DEMO PUBLIC SCHOOL",
        schoolAddress: settings?.schoolAddress || "Institutional Area, Main Campus",
        schoolPhone: settings?.schoolPhone || "+91 98765 43210",
        startDate,
        endDate,
        transactions: filteredTransactions,
        totalIncome,
        totalExpense,
        netBalance,
      });

      const fileName = `Account_Statement_${startDate}_to_${endDate}.pdf`;
      doc.save(fileName);
      toast.success(`Account Statement PDF downloaded: ${fileName}`);
    } catch (err) {
      console.error("Statement PDF error:", err);
      toast.error("Failed to generate statement PDF.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      let csv = "Sr,Date,Voucher No,Account Head,Type,Particulars/Party,Payment Method,Debit (Expense),Credit (Income),Running Balance\n";
      let running = 0;
      filteredTransactions.forEach((t, i) => {
        const isInc = t.type === "INCOME";
        running += isInc ? t.amount : -t.amount;
        const debit = !isInc ? t.amount.toFixed(2) : "0.00";
        const credit = isInc ? t.amount.toFixed(2) : "0.00";
        const party = `"${(t.partyName || t.remarks || "Regular").replace(/"/g, '""')}"`;
        const head = `"${t.headName.replace(/"/g, '""')}"`;
        csv += `${i + 1},${t.date},${t.voucherNo},${head},${t.type},${party},${t.paymentMethod},${debit},${credit},${running.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Account_Statement_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Statement CSV exported successfully!");
    } catch (err) {
      toast.error("Failed to export CSV.");
    }
  };

  return (
    <EntitlementGate feature="account_statement" title="Account Statement" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <Link href="/admin/accounts/chart-of-accounts" className="text-slate-900 hover:text-indigo-600 dark:text-white">
              Accounts
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-normal">Account Statement</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download Official PDF
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Income
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₹ {totalIncome.toFixed(2)}
            </p>
            <span className="mt-1 block text-[11px] text-slate-500">Revenues, grants & sales</span>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Total Expenses
              </span>
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
              ₹ {totalExpense.toFixed(2)}
            </p>
            <span className="mt-1 block text-[11px] text-slate-500">Utility, fuel, repairs & supplies</span>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Net Balance
              </span>
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
            <p
              className={`mt-2 text-2xl font-black ${
                netBalance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              ₹ {netBalance.toFixed(2)}
            </p>
            <span className="mt-1 block text-[11px] text-slate-500">
              {netBalance >= 0 ? "Surplus / Net Profit" : "Net Deficit"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Entries Count
              </span>
              <BarChart3 className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {filteredTransactions.length}
            </p>
            <span className="mt-1 block text-[11px] text-slate-500">In selected period</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            Filter Statement
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-[11px] font-semibold text-slate-500">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500">Transaction Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="ALL">All Transactions</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Expense Only</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500">Account Head</label>
              <select
                value={selectedHeadId}
                onChange={(e) => setSelectedHeadId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Account Heads</option>
                {heads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500">Payment Mode</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="all">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chronological Statement Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              General Ledger Entries ({filteredTransactions.length})
            </span>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-8 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Search className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Voucher</th>
                  <th className="px-4 py-3">Account Head</th>
                  <th className="px-4 py-3">Particulars / Party</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Debit (Exp)</th>
                  <th className="px-4 py-3 text-right">Credit (Inc)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Loading statement ledger...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No accounting entries found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let running = 0;
                    return filteredTransactions.map((t, idx) => {
                      const isInc = t.type === "INCOME";
                      running += isInc ? t.amount : -t.amount;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {t.voucherNo}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {t.headName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {t.partyName || t.remarks || "Regular Ledger Entry"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {t.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                            {!isInc ? `₹ ${t.amount.toFixed(2)}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {isInc ? `₹ ${t.amount.toFixed(2)}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 dark:text-white">
                            ₹ {running.toFixed(2)}
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EntitlementGate>
  );
}
