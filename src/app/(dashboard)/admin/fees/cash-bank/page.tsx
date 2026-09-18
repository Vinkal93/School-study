"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Wallet,
  Building2,
  QrCode,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Printer,
  Download,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  User,
  X,
  ChevronDown,
  Filter,
} from "lucide-react";
import type {
  AccountLedgerEntry,
  AccountSummary,
  CashBankMultiAccountSummary,
} from "@/types/fee-ledger";
import {
  getAccountLedger,
  getMultiAccountSummary,
} from "@/lib/services/fee-ledger.service";
import { getAcademicYears } from "@/lib/services/academic.service";
import type { AcademicYear } from "@/types";
import { toast } from "sonner";

type AccountTab = "ALL" | "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

export default function AdminCashBankLedgerPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  const [activeTab, setActiveTab] = useState<AccountTab>("ALL");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ledger state
  const [multiSummary, setMultiSummary] = useState<CashBankMultiAccountSummary | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<AccountLedgerEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Quick Date presets
  const handleQuickDatePreset = (preset: "today" | "this_week" | "this_month" | "all") => {
    const today = new Date();
    if (preset === "today") {
      const dStr = today.toISOString().split("T")[0];
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === "this_week") {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(new Date().toISOString().split("T")[0]);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Load academic years
  useEffect(() => {
    if (!schoolId) return;
    getAcademicYears(schoolId)
      .then((years: AcademicYear[]) => {
        setAcademicYears(years);
        const active = years.find((y: AcademicYear) => y.isCurrent) || years[0];
        if (active) setSelectedYear(active.id);
      })
      .catch((err: any) => console.error("Error loading academic years:", err));
  }, [schoolId]);

  // Load Ledger data directly via Service with API fallback
  const fetchLedger = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Direct service call (guarantees fast loading with zero 401 issues)
      const [accountData, multiData] = await Promise.all([
        getAccountLedger(schoolId, activeTab, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        getMultiAccountSummary(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      setAccountSummary(accountData.summary || null);
      setLedgerEntries(accountData.entries || []);
      setMultiSummary(multiData || null);
    } catch (err: any) {
      console.warn("Direct service load error, trying API fallback:", err);
      try {
        const params = new URLSearchParams({
          schoolId,
          accountType: activeTab,
        });
        if (selectedYear) params.append("academicYearId", selectedYear);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const res = await fetch(`/api/fees/foundation/ledger/cash-bank?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          setAccountSummary(data.summary || null);
          setLedgerEntries(data.entries || []);
          setMultiSummary(data.multiAccountSummary || null);
        }
      } catch (fallbackErr: any) {
        toast.error("Unable to load ledger data.");
      }
    } finally {
      setLoading(false);
    }
  }, [schoolId, activeTab, selectedYear, startDate, endDate]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Filter entries locally by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return ledgerEntries;
    const q = searchQuery.toLowerCase();
    return ledgerEntries.filter(
      (e) =>
        (e.reference && e.reference.toLowerCase().includes(q)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q)) ||
        (e.studentName && e.studentName.toLowerCase().includes(q)) ||
        (e.admissionNumber && e.admissionNumber.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(q))
    );
  }, [ledgerEntries, searchQuery]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    if (!schoolId || !accountSummary) return;
    setExporting(true);
    try {
      const res = await fetch("/api/fees/foundation/ledger/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          exportType: activeTab === "CASH" ? "cash_ledger" : "bank_ledger",
          accountType: activeTab,
          academicYearId: selectedYear,
          startDate,
          endDate,
        }),
      });

      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CashBank_Ledger_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Ledger CSV exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
            <Wallet className="h-3 w-3" /> Cash
          </span>
        );
      case "UPI":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
            <QrCode className="h-3 w-3" /> UPI
          </span>
        );
      case "BANK_TRANSFER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
            <Building2 className="h-3 w-3" /> Bank Transfer
          </span>
        );
      case "CHEQUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
            <CreditCard className="h-3 w-3" /> Cheque / DD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {method}
          </span>
        );
    }
  };

  const cashSummary = multiSummary?.accounts?.["CASH"];
  const upiSummary = multiSummary?.accounts?.["UPI"];
  const bankSummary = multiSummary?.accounts?.["BANK_TRANSFER"];
  const chequeSummary = multiSummary?.accounts?.["CHEQUE"];

  const tabs: Array<{ id: AccountTab; label: string; icon: any }> = [
    { id: "ALL", label: "Consolidated (All Accounts)", icon: Layers },
    { id: "CASH", label: "Cash Drawer", icon: Wallet },
    { id: "UPI", label: "UPI Collections", icon: QrCode },
    { id: "BANK_TRANSFER", label: "Bank Transfer (NEFT/RTGS)", icon: Building2 },
    { id: "CHEQUE", label: "Cheque / Clearing", icon: CreditCard },
  ];

  return (
    <EntitlementGate feature="fee_cash_bank" title="Cash & Bank Ledger Hub" requiredPlan="Professional Plan">
      <div className="space-y-6 pb-16 print:p-0">
        {/* ========================================================
            1. HEADER WITH BRANDING & TOP ACTIONS
        ======================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Link
                  href="/admin/fees"
                  className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Fee Management
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">Cash & Bank Ledger</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Cash & Bank Multi-Account Ledger
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Real-time cash drawer, UPI, and bank account balances reconciled with collections and refunds.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/fees/ledger"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>Student Ledger</span>
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Ledger</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            2. REAL-TIME MULTI-ACCOUNT OVERVIEW CARDS
        ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          {/* Card 1: Cash Drawer */}
          <div
            onClick={() => setActiveTab("CASH")}
            className={`rounded-3xl p-5 border transition-all cursor-pointer shadow-sm ${
              activeTab === "CASH"
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-md"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Cash Drawer
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Physical
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {formatCurrency(cashSummary?.closingBalanceRupees)}
            </p>
            <div className="flex items-center justify-between text-[11px] mt-1 font-bold">
              <span className="text-emerald-600">+{formatCurrency(cashSummary?.totalReceiptsRupees)}</span>
              <span className="text-rose-500">-{formatCurrency(cashSummary?.totalRefundsRupees)}</span>
            </div>
          </div>

          {/* Card 2: UPI Collections */}
          <div
            onClick={() => setActiveTab("UPI")}
            className={`rounded-3xl p-5 border transition-all cursor-pointer shadow-sm ${
              activeTab === "UPI"
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 shadow-md"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                UPI Collections
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                Instant
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {formatCurrency(upiSummary?.closingBalanceRupees)}
            </p>
            <div className="flex items-center justify-between text-[11px] mt-1 font-bold">
              <span className="text-blue-600">+{formatCurrency(upiSummary?.totalReceiptsRupees)}</span>
              <span className="text-rose-500">-{formatCurrency(upiSummary?.totalRefundsRupees)}</span>
            </div>
          </div>

          {/* Card 3: Bank Transfer */}
          <div
            onClick={() => setActiveTab("BANK_TRANSFER")}
            className={`rounded-3xl p-5 border transition-all cursor-pointer shadow-sm ${
              activeTab === "BANK_TRANSFER"
                ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-500/20 shadow-md"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                Bank Transfer
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
                NEFT/RTGS
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {formatCurrency(bankSummary?.closingBalanceRupees)}
            </p>
            <div className="flex items-center justify-between text-[11px] mt-1 font-bold">
              <span className="text-purple-600">+{formatCurrency(bankSummary?.totalReceiptsRupees)}</span>
              <span className="text-rose-500">-{formatCurrency(bankSummary?.totalRefundsRupees)}</span>
            </div>
          </div>

          {/* Card 4: Cheque / Clearing */}
          <div
            onClick={() => setActiveTab("CHEQUE")}
            className={`rounded-3xl p-5 border transition-all cursor-pointer shadow-sm ${
              activeTab === "CHEQUE"
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20 shadow-md"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Cheque / Clearing
              </span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                Clearing
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {formatCurrency(chequeSummary?.closingBalanceRupees)}
            </p>
            <div className="flex items-center justify-between text-[11px] mt-1 font-bold">
              <span className="text-amber-600">+{formatCurrency(chequeSummary?.totalReceiptsRupees)}</span>
              <span className="text-rose-500">-{formatCurrency(chequeSummary?.totalRefundsRupees)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. ACCOUNT NAVIGATION TABS
        ======================================================== */}
        <div className="border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex overflow-x-auto gap-2 pb-px no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-black whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-emerald-600 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            4. REFINED FILTERS BAR
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Receipt, UTR, Student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Academic Session */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer w-full"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range Start */}
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer w-full"
              />
            </div>

            {/* Date Range End */}
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer w-full"
              />
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Quick Filter:
            </span>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("today")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                startDate === new Date().toISOString().split("T")[0] && endDate === new Date().toISOString().split("T")[0]
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("this_week")}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("this_month")}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset("all")}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              All Time
            </button>

            {(startDate || endDate || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSearchQuery("");
                }}
                className="ml-auto text-rose-600 hover:underline flex items-center gap-1 font-bold text-xs"
              >
                <X className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            5. ACCOUNT STATEMENT SUMMARY CARD (KPIS)
        ======================================================== */}
        {accountSummary && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  Account Ledger Statement
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {accountSummary.accountLabel}
                </h2>
              </div>

              {/* Reconciled Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Reconciled & In Balance</span>
              </div>
            </div>

            {/* 4 Financial KPI Blocks */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Opening Balance</div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(accountSummary.openingBalanceRupees)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Collections (Inflows)
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  +{formatCurrency(accountSummary.totalReceiptsRupees)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                <div className="text-[11px] text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Refunds (Outflows)
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  -{formatCurrency(accountSummary.totalRefundsRupees)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <div className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">Net Closing Balance</div>
                <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                  {formatCurrency(accountSummary.closingBalanceRupees)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            6. CHRONOLOGICAL TRANSACTIONS TABLE
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Chronological Transactions Register
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Showing {filteredEntries.length} transaction{filteredEntries.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Receipt / Ref</th>
                  <th className="py-3 px-4">Student & Details</th>
                  <th className="py-3 px-4">Method / Account</th>
                  <th className="py-3 px-4 text-right">Inflow (+)</th>
                  <th className="py-3 px-4 text-right">Outflow (-)</th>
                  <th className="py-3 px-4 text-right font-black">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Loading account transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      No transaction records found for the selected account and filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {entry.dateFormatted}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.type === "COLLECTION" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <ArrowDownLeft className="w-3 h-3" /> Receipt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            <ArrowUpRight className="w-3 h-3" /> Refund / Outflow
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{entry.reference}</div>
                        {entry.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {entry.referenceNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {entry.studentName || "School Account"}
                          {entry.admissionNumber && (
                            <span className="text-slate-400 font-normal ml-1">
                              ({entry.admissionNumber})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {entry.description}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getMethodBadge(entry.paymentMethod)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {entry.inflowDebitRupees > 0 ? `+${formatCurrency(entry.inflowDebitRupees)}` : "—"}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                        {entry.outflowCreditRupees > 0 ? `-${formatCurrency(entry.outflowCreditRupees)}` : "—"}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-black text-slate-900 dark:text-white">
                        {formatCurrency(entry.balanceRupees)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {accountSummary && (
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
              <div className="text-slate-500">
                Formula:{" "}
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  Opening ({formatCurrency(accountSummary.openingBalanceRupees)}) + Inflow (
                  {formatCurrency(accountSummary.totalReceiptsRupees)}) - Outflow (
                  {formatCurrency(accountSummary.totalRefundsRupees)}) = Closing (
                  {formatCurrency(accountSummary.closingBalanceRupees)})
                </span>
              </div>
              <div className="font-black text-slate-900 dark:text-white">
                Closing Balance: {formatCurrency(accountSummary.closingBalanceRupees)}
              </div>
            </div>
          )}
        </div>
      </div>
    </EntitlementGate>
  );
}
