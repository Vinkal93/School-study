"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  TrendingDown,
  Download,
  Printer,
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  RotateCcw,
  Sparkles,
  Banknote,
  FileText,
} from "lucide-react";
import {
  getAccountHeads,
  getAccountTransactions,
  recordAccountTransaction,
  generateAccountVoucherPDF,
  type AccountHead,
  type AccountTransaction,
} from "@/lib/services/account-head.service";
import { getFeeSettings } from "@/lib/services/fee.service";
import type { FeeSettings } from "@/types";
import { toast } from "sonner";

export default function AddExpensePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Data states
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [expenses, setExpenses] = useState<AccountTransaction[]>([]);
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [headId, setHeadId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<AccountTransaction["paymentMethod"]>("Cash");
  const [payeeName, setPayeeName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([
      getAccountHeads(schoolId),
      getAccountTransactions(schoolId, { type: "EXPENSE" }),
      getFeeSettings(schoolId),
    ])
      .then(([headsList, txnsList, feeSett]) => {
        setHeads(headsList);
        setExpenses(txnsList);
        setSettings(feeSett);

        const expHeads = headsList.filter((h) => h.type === "EXPENSE");
        if (expHeads.length > 0) {
          setHeadId(expHeads[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load expense data:", err);
        toast.error("Failed to load expense records.");
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  // Expense heads only
  const expenseHeads = useMemo(() => {
    return heads.filter((h) => h.type === "EXPENSE");
  }, [heads]);

  // Submit Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headId) {
      toast.error("Please select an Account Head.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const selectedHead = heads.find((h) => h.id === headId);
    const headName = selectedHead ? selectedHead.name : "Expense";

    setSaving(true);
    try {
      const created = await recordAccountTransaction(schoolId, {
        headId,
        headName,
        type: "EXPENSE",
        date,
        amount: Number(amount),
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        partyName: payeeName.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      setExpenses((prev) => [created, ...prev]);
      setAmount("");
      setPayeeName("");
      setReferenceNo("");
      setRemarks("");

      toast.success(`Expense recorded! Voucher ${created.voucherNo}`);

      // Auto-trigger professional PDF voucher download
      handleDownloadVoucher(created);
    } catch (err: any) {
      console.error("Error saving expense:", err);
      toast.error(err.message || "Failed to record expense.");
    } finally {
      setSaving(false);
    }
  };

  // Download PDF Voucher
  const handleDownloadVoucher = (txn: AccountTransaction) => {
    try {
      const doc = generateAccountVoucherPDF({
        schoolName: settings?.schoolName || profile?.schoolName || "DEMO PUBLIC SCHOOL",
        schoolAddress: settings?.schoolAddress || "Institutional Area, Main Campus",
        transaction: txn,
      });
      const fileName = `Expense_Voucher_${txn.voucherNo}.pdf`;
      doc.save(fileName);
      toast.success(`Voucher PDF downloaded: ${fileName}`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate voucher PDF.");
    }
  };

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (exp) =>
        exp.voucherNo.toLowerCase().includes(q) ||
        exp.headName.toLowerCase().includes(q) ||
        exp.partyName?.toLowerCase().includes(q) ||
        exp.remarks?.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return (
    <EntitlementGate feature="account_add_expense" title="Add Expense" requiredPlan="Professional Plan">
      <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6">
        {/* Breadcrumb Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
            <Link href="/admin/accounts/chart-of-accounts" className="text-slate-900 hover:text-rose-600 dark:text-white">
              Accounts
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-normal">Add Expense</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/accounts/chart-of-accounts"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Banknote className="h-3.5 w-3.5 text-indigo-600" />
              Chart of Accounts
            </Link>
            <Link
              href="/admin/accounts/statement"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <FileText className="h-3.5 w-3.5" />
              Account Statement
            </Link>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Left Form: Record Expense */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 self-start">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Record New Expense
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Utility bills, maintenance, fuel, supplies, and institutional payments.
              </p>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Account Head * */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  EXPENSE HEAD *
                </label>
                <select
                  required
                  value={headId}
                  onChange={(e) => setHeadId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Select Expense Head --</option>
                  {expenseHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (#{h.numericId})
                    </option>
                  ))}
                </select>
                {expenseHeads.length === 0 && (
                  <p className="text-[11px] text-amber-600">
                    No expense heads found. Please add an Expense head in{" "}
                    <Link href="/admin/accounts/chart-of-accounts" className="underline">
                      Chart of Accounts
                    </Link>
                    .
                  </p>
                )}
              </div>

              {/* Date & Amount */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Payment Method & Ref */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    PAYMENT METHOD *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    CHEQUE / REF NO
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cheque / Txn No"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Payee / Vendor Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  PAYEE / VENDOR NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Power Corporation / Modern Stationery"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  DESCRIPTION / REMARKS
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. October monthly electricity bill payment..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !amount || Number(amount) <= 0 || !headId}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-50"
              >
                <TrendingDown className="h-4 w-4" />
                {saving ? "Saving Expense..." : "Save Expense & Print Voucher"}
              </button>
            </form>
          </div>

          {/* Right Card: Recent Expense Records */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recorded Expense Entries ({filteredExpenses.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Total Disbursed: <strong className="text-rose-600">₹ {totalExpenseSum.toFixed(2)}</strong>
                </p>
              </div>

              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voucher, payee..."
                  className="w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-8 py-1.5 text-xs text-slate-800 shadow-sm focus:border-rose-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Search className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Voucher No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Head</th>
                    <th className="px-4 py-3">Payee / Vendor</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No expense entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {exp.voucherNo}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{exp.date}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {exp.headName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {exp.partyName || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                            {exp.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-400">
                          ₹ {exp.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDownloadVoucher(exp)}
                            title="Download Official Voucher PDF"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </EntitlementGate>
  );
}
