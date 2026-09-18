"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Scale,
  BookOpen,
  FileSpreadsheet,
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
  Plus,
  X,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Wallet,
  Receipt,
  FileText,
} from "lucide-react";
import type {
  Account,
  JournalEntry,
  GeneralLedgerAccountStatement,
  TrialBalanceReport,
  SchoolExpense,
  VoucherType,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  FinancialStatementComparison,
} from "@/types/accounting";
import {
  getChartOfAccounts,
  getJournalEntries,
  getGeneralLedger,
  getTrialBalance,
  getSchoolExpenses,
  recordSchoolExpense,
  syncPhase1to5JournalEntries,
  getProfitAndLossStatement,
  getBalanceSheet,
  getFinancialStatementsComparison,
  exportProfitAndLossToCsv,
  exportBalanceSheetToCsv,
} from "@/lib/services/accounting.service";
import { getAcademicYears } from "@/lib/services/academic.service";
import type { AcademicYear } from "@/types";
import { toast } from "sonner";

type AccountingTab =
  | "trial_balance"
  | "profit_and_loss"
  | "balance_sheet"
  | "comparison"
  | "general_ledger"
  | "journal"
  | "chart_of_accounts"
  | "expenses";

export default function AdminAccountingPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as AccountingTab) || "trial_balance";
  const [activeTab, setActiveTab] = useState<AccountingTab>(initialTab);

  // Common Filters
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [compareYear, setCompareYear] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Tab 1: Trial Balance state
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);

  // Tab: Profit & Loss state
  const [pnlStatement, setPnlStatement] = useState<ProfitAndLossStatement | null>(null);

  // Tab: Balance Sheet state
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetStatement | null>(null);

  // Tab: Multi-Session Comparison state
  const [comparison, setComparison] = useState<FinancialStatementComparison | null>(null);

  // Tab: General Ledger state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("1040"); // Default: Fee Receivable
  const [ledgerStatement, setLedgerStatement] = useState<GeneralLedgerAccountStatement | null>(null);

  // Tab: Journal Vouchers state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>("ALL");

  // Tab: Expenses state
  const [expenses, setExpenses] = useState<SchoolExpense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Electricity & Utilities",
    expenseAccountCode: "5040",
    payeeName: "",
    amount: "",
    paymentMethod: "BANK_TRANSFER" as any,
    expenseDate: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    referenceNumber: "",
    description: "",
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [savingExpense, setSavingExpense] = useState<boolean>(false);

  // Load academic sessions
  useEffect(() => {
    if (!schoolId) return;
    getAcademicYears(schoolId)
      .then((years: AcademicYear[]) => {
        setAcademicYears(years);
        const active = years.find((y: AcademicYear) => y.isCurrent) || years[0];
        if (active) {
          setSelectedYear(active.id);
          const otherYear = years.find((y: AcademicYear) => y.id !== active.id);
          if (otherYear) setCompareYear(otherYear.id);
        }
      })
      .catch((err: any) => console.error("Error loading academic years:", err));
  }, [schoolId]);

  // Load Chart of Accounts
  useEffect(() => {
    if (!schoolId) return;
    getChartOfAccounts(schoolId)
      .then((accList) => {
        setAccounts(accList);
        if (accList.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accList[0].code);
        }
      })
      .catch((err) => console.error("Error loading COA:", err));
  }, [schoolId]);

  // Load Data based on active tab
  const loadTabData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      if (activeTab === "trial_balance") {
        const tb = await getTrialBalance(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setTrialBalance(tb);
      } else if (activeTab === "profit_and_loss") {
        const pnl = await getProfitAndLossStatement(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setPnlStatement(pnl);
      } else if (activeTab === "balance_sheet") {
        const bs = await getBalanceSheet(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setBalanceSheet(bs);
      } else if (activeTab === "comparison") {
        const baseYr = selectedYear || "ay_2026_27";
        const compYr = compareYear || (academicYears.find((y) => y.id !== baseYr)?.id || "ay_2025_26");
        const comp = await getFinancialStatementsComparison(schoolId, baseYr, compYr);
        setComparison(comp);
      } else if (activeTab === "general_ledger") {
        if (selectedAccountId) {
          const stmt = await getGeneralLedger(schoolId, selectedAccountId, {
            academicYearId: selectedYear || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });
          setLedgerStatement(stmt);
        }
      } else if (activeTab === "journal") {
        const journals = await getJournalEntries(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          voucherType: selectedVoucherType !== "ALL" ? (selectedVoucherType as VoucherType) : undefined,
        });
        setJournalEntries(journals);
      } else if (activeTab === "chart_of_accounts") {
        const accList = await getChartOfAccounts(schoolId);
        setAccounts(accList);
      } else if (activeTab === "expenses") {
        const expList = await getSchoolExpenses(schoolId, {
          academicYearId: selectedYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setExpenses(expList);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load accounting data.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, activeTab, selectedYear, compareYear, startDate, endDate, selectedAccountId, selectedVoucherType, academicYears]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // Handle P&L CSV Export
  const handleDownloadPnlCsv = () => {
    if (!pnlStatement) return;
    const csv = exportProfitAndLossToCsv(pnlStatement, schoolName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Profit_and_Loss_${pnlStatement.academicYearName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Profit & Loss statement exported to CSV.");
  };

  // Handle Balance Sheet CSV Export
  const handleDownloadBalanceSheetCsv = () => {
    if (!balanceSheet) return;
    const csv = exportBalanceSheetToCsv(balanceSheet, schoolName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Balance_Sheet_${balanceSheet.academicYearName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Balance Sheet statement exported to CSV.");
  };

  // Handle Sync Historical Phase 1-5 Transactions
  const handleSyncHistory = async () => {
    if (!schoolId) return;
    setSyncing(true);
    try {
      const result = await syncPhase1to5JournalEntries(schoolId, selectedYear || "ay_2026_27");
      toast.success(
        `Accounting Reconciled: ${result.totalVouchers} vouchers synced (${result.syncedDemands} demands, ${result.syncedPayments} collections, ${result.syncedRefunds} refunds).`
      );
      loadTabData();
    } catch (err: any) {
      toast.error(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  // Handle Record School Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    const amountNum = parseFloat(expenseForm.amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid expense amount greater than ₹0.");
      return;
    }
    if (!expenseForm.payeeName.trim()) {
      toast.error("Payee name is required.");
      return;
    }

    setSavingExpense(true);
    try {
      const expAcc = accounts.find((a) => a.code === expenseForm.expenseAccountCode) || {
        id: "acc_5090",
        code: "5090",
        name: "Other Operating Expenses",
      };

      const paymentAccCode =
        expenseForm.paymentMethod === "CASH"
          ? "1010"
          : expenseForm.paymentMethod === "UPI"
          ? "1030"
          : "1020";
      const payAcc = accounts.find((a) => a.code === paymentAccCode) || {
        id: "acc_1020",
        code: paymentAccCode,
        name: "Bank Account",
      };

      const result = await recordSchoolExpense(
        schoolId,
        {
          academicYearId: selectedYear || "ay_2026_27",
          expenseAccountId: expAcc.id,
          expenseAccountCode: expAcc.code,
          expenseAccountName: expAcc.name,
          paymentMethod: expenseForm.paymentMethod,
          paymentAccountId: payAcc.id,
          paymentAccountName: payAcc.name,
          amountPaise: Math.round(amountNum * 100),
          expenseDate: expenseForm.expenseDate,
          payeeName: expenseForm.payeeName.trim(),
          invoiceNumber: expenseForm.invoiceNumber.trim() || undefined,
          referenceNumber: expenseForm.referenceNumber.trim() || undefined,
          category: expenseForm.category,
          description: expenseForm.description.trim() || `${expenseForm.category} payment to ${expenseForm.payeeName}`,
        },
        { id: profile?.uid || "staff", name: profile?.name || "Staff Accountant" }
      );

      toast.success(
        `Expense recorded! Voucher #${result.journalEntry.voucherNumber} automatically posted to double-entry general ledger.`
      );
      setShowExpenseModal(false);
      setExpenseForm({
        category: "Electricity & Utilities",
        expenseAccountCode: "5040",
        payeeName: "",
        amount: "",
        paymentMethod: "BANK_TRANSFER",
        expenseDate: new Date().toISOString().split("T")[0],
        invoiceNumber: "",
        referenceNumber: "",
        description: "",
      });
      loadTabData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense.");
    } finally {
      setSavingExpense(false);
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateStr = (d: string | undefined) => {
    if (!d) return "—";
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return d;
      return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "ASSET":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60">
            ASSET
          </span>
        );
      case "LIABILITY":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/60">
            LIABILITY
          </span>
        );
      case "EQUITY":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/60">
            EQUITY
          </span>
        );
      case "INCOME":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60">
            INCOME
          </span>
        );
      case "EXPENSE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/60">
            EXPENSE
          </span>
        );
      default:
        return <span className="text-[10px] font-bold">{category}</span>;
    }
  };

  const tabs: Array<{ id: AccountingTab; label: string; icon: any }> = [
    { id: "trial_balance", label: "Trial Balance", icon: Scale },
    { id: "profit_and_loss", label: "Profit & Loss", icon: FileSpreadsheet },
    { id: "balance_sheet", label: "Balance Sheet", icon: Building2 },
    { id: "comparison", label: "Session Comparison", icon: TrendingUp },
    { id: "general_ledger", label: "General Ledger", icon: BookOpen },
    { id: "journal", label: "Journal Book (Vouchers)", icon: FileText },
    { id: "chart_of_accounts", label: "Chart of Accounts", icon: Layers },
    { id: "expenses", label: "School Expenses", icon: Receipt },
  ];

  return (
    <EntitlementGate feature="fee_accounting" title="Accounting Core & Financial Statements" requiredPlan="Enterprise Plan">
      <div className="space-y-6 pb-16 print:p-0">
        {/* ========================================================
            1. HEADER WITH BRANDING & TOP ACTIONS
        ======================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Link href="/admin/fees" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  Fee Management
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">Double-Entry Accounting</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                Financial Statements & Accounting Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Profit & Loss, Balance Sheet, balanced Trial Balance, and General Ledger derived directly from double-entry vouchers.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleSyncHistory}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {syncing ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <RefreshCw className="w-4 h-4 text-blue-600" />}
              <span>Sync All Transactions</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            2. NAVIGATION TABS
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
                    ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl"
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
            3. GLOBAL FILTER BAR (Academic Year & Date Range)
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
            {/* Academic Session */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full"
              >
                <option value="">All Academic Sessions</option>
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
                placeholder="From Date"
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full"
              />
            </div>

            {/* Date Range End */}
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="To Date"
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer w-full"
              />
            </div>

            {/* Account Selector (for General Ledger tab) */}
            {activeTab === "general_ledger" && (
              <div className="relative flex-1 min-w-[240px] w-full sm:w-auto">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full"
                >
                  {accounts.map((acc) => (
                    <option key={acc.code} value={acc.code}>
                      {acc.code} — {acc.name} ({acc.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Voucher Type filter (for Journal tab) */}
            {activeTab === "journal" && (
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedVoucherType}
                  onChange={(e) => setSelectedVoucherType(e.target.value)}
                  className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer w-full"
                >
                  <option value="ALL">All Voucher Types</option>
                  <option value="JOURNAL">Journal Vouchers (JV)</option>
                  <option value="RECEIPT">Receipt Vouchers (RV)</option>
                  <option value="PAYMENT">Payment Vouchers (PV)</option>
                  <option value="CONTRA">Contra Vouchers (CV)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Compare Session Selector (for Comparison tab) */}
            {activeTab === "comparison" && (
              <div className="relative flex-1 min-w-[240px] w-full sm:w-auto">
                <select
                  value={compareYear}
                  onChange={(e) => setCompareYear(e.target.value)}
                  className="appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-xs font-bold text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer w-full"
                >
                  <option value="">Select benchmark session to compare...</option>
                  {academicYears
                    .filter((ay) => ay.id !== selectedYear)
                    .map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        Compare with: {ay.name} {ay.isCurrent ? "(Current)" : ""}
                      </option>
                    ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-purple-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="ml-auto text-rose-600 hover:underline flex items-center gap-1 font-bold text-xs"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            TAB 1: TRIAL BALANCE
        ======================================================== */}
        {activeTab === "trial_balance" && trialBalance && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Debit Balances</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {formatCurrency(trialBalance.grandTotalDebitRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Assets & Operating Expenses</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Credit Balances</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {formatCurrency(trialBalance.grandTotalCreditRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Liabilities, Capital & Income</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Double-Entry Status</span>
                <div className="mt-2 flex items-center gap-1.5">
                  {trialBalance.isBalanced ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Perfectly In Balance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/60">
                      <AlertCircle className="w-4 h-4 text-rose-600" /> Imbalance Detected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Difference: ₹{trialBalance.differenceRupees.toLocaleString("en-IN")}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Accounts in Ledger</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {trialBalance.rows.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Institutional Ledger Heads</p>
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Institutional Trial Balance Statement
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    As of {formatDateStr(trialBalance.asOfDate)} • All figures derived from double-entry vouchers
                  </p>
                </div>
                {trialBalance.isBalanced && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Total Debits = Total Credits
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Account Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Debit Total</th>
                      <th className="py-3 px-4 text-right">Credit Total</th>
                      <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Net Debit (₹)</th>
                      <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Net Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {trialBalance.rows.map((row) => (
                      <tr
                        key={row.accountCode}
                        onClick={() => {
                          setSelectedAccountId(row.accountCode);
                          setActiveTab("general_ledger");
                        }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.accountCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{row.accountName}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getCategoryBadge(row.category)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap text-slate-500">
                          {row.totalDebitRupees > 0 ? `₹${row.totalDebitRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap text-slate-500">
                          {row.totalCreditRupees > 0 ? `₹${row.totalCreditRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {row.netDebitRupees > 0 ? `₹${row.netDebitRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {row.netCreditRupees > 0 ? `₹${row.netCreditRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Grand Totals Footer */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700 font-black text-xs text-slate-900 dark:text-white">
                    <tr>
                      <td colSpan={5} className="py-4 px-4 uppercase tracking-wider text-right font-black">
                        Grand Totals:
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        {formatCurrency(trialBalance.grandTotalDebitRupees)}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        {formatCurrency(trialBalance.grandTotalCreditRupees)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status footer */}
              <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">
                  {trialBalance.reconciliationNotes}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Audit Tolerance: ₹0.00 (Zero synthetic balance)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: PROFIT & LOSS STATEMENT (P&L)
        ======================================================== */}
        {activeTab === "profit_and_loss" && pnlStatement && (
          <div className="space-y-6">
            {/* P&L Statement Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Statement of Financial Performance
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    Profit & Loss (Income & Expenditure)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Period: <span className="font-bold text-slate-700 dark:text-slate-300">{pnlStatement.periodLabel}</span> • Session: <span className="font-bold text-slate-700 dark:text-slate-300">{pnlStatement.academicYearName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPnlCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Statement
                  </button>
                </div>
              </div>
            </div>

            {/* P&L Executive Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Operating Income</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {formatCurrency(pnlStatement.totalIncomeRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Fee collections & institutional revenues</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Operating Expenses</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {formatCurrency(pnlStatement.totalExpenseRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Salaries, utilities, consumables & admin</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Operational Margin</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pnlStatement.netSurplusRupees >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/60"
                    }`}
                  >
                    {pnlStatement.netSurplusRupees >= 0 ? "SURPLUS" : "DEFICIT"}
                  </span>
                </div>
                <p
                  className={`text-2xl font-black mt-2 ${
                    pnlStatement.netSurplusRupees >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(pnlStatement.netSurplusRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Transferred to Balance Sheet Equity (Account 3020)
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Ratio</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {pnlStatement.operatingMarginPercentage}%
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Surplus as % of total operating revenue</p>
              </div>
            </div>

            {/* Income and Expense Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION A: REVENUE / INCOME */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-950/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Operating Revenue (Income)
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Credit Balances
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Revenue Head</th>
                          <th className="py-3 px-4 text-right">% Share</th>
                          <th className="py-3 px-4 text-right font-black">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {pnlStatement.incomeLines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No revenue recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          pnlStatement.incomeLines.map((line) => (
                            <tr
                              key={line.accountCode}
                              onClick={() => {
                                setSelectedAccountId(line.accountCode);
                                setActiveTab("general_ledger");
                              }}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                                {line.accountCode}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {line.accountName}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500">
                                {line.percentageOfTotal}%
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                {formatCurrency(line.amountRupees)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center text-xs">
                  <span className="font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Total Revenue
                  </span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(pnlStatement.totalIncomeRupees)}
                  </span>
                </div>
              </div>

              {/* SECTION B: OPERATING EXPENSES */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-950/10 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Operating Expenditure (Expenses)
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Debit Balances
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Expense Head</th>
                          <th className="py-3 px-4 text-right">% Share</th>
                          <th className="py-3 px-4 text-right font-black">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {pnlStatement.expenseLines.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No expenses recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          pnlStatement.expenseLines.map((line) => (
                            <tr
                              key={line.accountCode}
                              onClick={() => {
                                setSelectedAccountId(line.accountCode);
                                setActiveTab("general_ledger");
                              }}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                                {line.accountCode}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {line.accountName}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500">
                                {line.percentageOfTotal}%
                              </td>
                              <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                {formatCurrency(line.amountRupees)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30 flex justify-between items-center text-xs">
                  <span className="font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Total Expenses
                  </span>
                  <span className="text-base font-black text-rose-700 dark:text-rose-300">
                    {formatCurrency(pnlStatement.totalExpenseRupees)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Double-Entry Flow Callout */}
            <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                    Double-Entry Integration Audit
                  </h4>
                  <p className="text-xs text-blue-700/80 dark:text-blue-300/80 font-medium mt-0.5">
                    Net surplus of {formatCurrency(pnlStatement.netSurplusRupees)} flows directly into Balance Sheet Equity under Account 3020 (Current Year Operating Surplus) to guarantee institutional equilibrium.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("balance_sheet")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>View in Balance Sheet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: BALANCE SHEET (STATEMENT OF FINANCIAL POSITION)
        ======================================================== */}
        {activeTab === "balance_sheet" && balanceSheet && (
          <div className="space-y-6">
            {/* Balance Sheet Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Statement of Financial Position
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Institutional Balance Sheet
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    As of: <span className="font-bold text-slate-700 dark:text-slate-300">{formatDateStr(balanceSheet.asOfDate)}</span> • Session: <span className="font-bold text-slate-700 dark:text-slate-300">{balanceSheet.academicYearName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBalanceSheetCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Balance Sheet
                  </button>
                </div>
              </div>
            </div>

            {/* Accounting Equation Verification Banner */}
            <div
              className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                balanceSheet.isBalanced
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    balanceSheet.isBalanced
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {balanceSheet.isBalanced ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide">
                    {balanceSheet.isBalanced ? "Accounting Equation Balanced" : "Accounting Discrepancy Alert"}
                  </h4>
                  <p className="text-xs font-medium opacity-90 mt-0.5">
                    {balanceSheet.reconciliationNotes}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono font-bold whitespace-nowrap self-end sm:self-center">
                <span>Assets: {formatCurrency(balanceSheet.totalAssetsRupees)}</span>
                <span>=</span>
                <span>Liabilities & Equity: {formatCurrency(balanceSheet.totalLiabilitiesAndEquityRupees)}</span>
              </div>
            </div>

            {/* Balance Sheet KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Assets</span>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(balanceSheet.totalAssetsRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Cash, Bank, Digital, & Receivables</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Liabilities</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {formatCurrency(balanceSheet.totalLiabilitiesRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Student advances & accounts payable</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Equity & Reserves</span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
                  {formatCurrency(balanceSheet.totalEquityRupees)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">School capital fund + Operating surplus</p>
              </div>
            </div>

            {/* 3 Detailed Balance Sheet Tables */}
            <div className="space-y-6">
              {/* 1. ASSETS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      1. Institutional Assets (Application of Funds)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                    Series 1000 • Debit Normal
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Asset Account Title</th>
                        <th className="py-3 px-4 text-right">Debit Total (₹)</th>
                        <th className="py-3 px-4 text-right">Credit Total (₹)</th>
                        <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Net Asset Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {balanceSheet.assets.lines.map((line) => (
                        <tr
                          key={line.accountCode}
                          onClick={() => {
                            setSelectedAccountId(line.accountCode);
                            setActiveTab("general_ledger");
                          }}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                            {line.accountCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {line.accountName}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {line.debitRupees > 0 ? `₹${line.debitRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {line.creditRupees > 0 ? `₹${line.creditRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {formatCurrency(line.closingBalanceRupees)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50/50 dark:bg-blue-950/20 border-t-2 border-blue-100 dark:border-blue-900/30 font-black text-xs text-blue-950 dark:text-blue-200">
                      <tr>
                        <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                          Total Institutional Assets:
                        </td>
                        <td className="py-3.5 px-4 text-right text-base text-blue-600 dark:text-blue-400">
                          {formatCurrency(balanceSheet.totalAssetsRupees)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 2. LIABILITIES */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      2. Institutional Liabilities (External Obligations)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                    Series 2000 • Credit Normal
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Liability Account Title</th>
                        <th className="py-3 px-4 text-right">Debit Adjustments (₹)</th>
                        <th className="py-3 px-4 text-right">Credit Incurred (₹)</th>
                        <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Net Liability Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {balanceSheet.liabilities.lines.map((line) => (
                        <tr
                          key={line.accountCode}
                          onClick={() => {
                            setSelectedAccountId(line.accountCode);
                            setActiveTab("general_ledger");
                          }}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                            {line.accountCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {line.accountName}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {line.debitRupees > 0 ? `₹${line.debitRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {line.creditRupees > 0 ? `₹${line.creditRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {formatCurrency(line.closingBalanceRupees)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-amber-50/50 dark:bg-amber-950/20 border-t-2 border-amber-100 dark:border-amber-900/30 font-black text-xs text-amber-950 dark:text-amber-200">
                      <tr>
                        <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                          Total Liabilities:
                        </td>
                        <td className="py-3.5 px-4 text-right text-base text-amber-600 dark:text-amber-400">
                          {formatCurrency(balanceSheet.totalLiabilitiesRupees)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 3. EQUITY & CAPITAL RESERVES */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-950/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      3. Equity & Operating Reserves (Capital)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                    Series 3000 • Credit Normal
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Capital / Reserve Head</th>
                        <th className="py-3 px-4">Origin / Derivation</th>
                        <th className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {balanceSheet.equity.lines.map((line) => (
                        <tr
                          key={line.accountCode}
                          onClick={() => {
                            if (line.accountCode === "3020") {
                              setActiveTab("profit_and_loss");
                            } else {
                              setSelectedAccountId(line.accountCode);
                              setActiveTab("general_ledger");
                            }
                          }}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                            {line.accountCode}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {line.accountName}
                          </td>
                          <td className="py-3 px-4">
                            {line.accountCode === "3020" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60">
                                Transferred from Profit & Loss
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Accumulated Corpus Fund</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {formatCurrency(line.closingBalanceRupees)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50/50 dark:bg-purple-950/20 border-t-2 border-purple-100 dark:border-purple-900/30 font-black text-xs text-purple-950 dark:text-purple-200">
                      <tr>
                        <td colSpan={3} className="py-3.5 px-4 uppercase tracking-wider text-right">
                          Total Equity & Reserves:
                        </td>
                        <td className="py-3.5 px-4 text-right text-base text-purple-600 dark:text-purple-400">
                          {formatCurrency(balanceSheet.totalEquityRupees)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Total Liabilities & Equity Summary Footer */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Claims on Assets
                  </span>
                  <h4 className="text-lg font-black mt-0.5">
                    Total Liabilities + Total Equity & Reserves
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Must strictly equal Total Institutional Assets ({formatCurrency(balanceSheet.totalAssetsRupees)})
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">
                    {formatCurrency(balanceSheet.totalLiabilitiesAndEquityRupees)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Difference: ₹{balanceSheet.differenceRupees.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: MULTI-SESSION FINANCIAL COMPARISON
        ======================================================== */}
        {activeTab === "comparison" && comparison && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Multi-Year Trend Analysis
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Session-over-Session Financial Comparison
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Base Session: <span className="font-bold text-blue-600">{comparison.baseYearName}</span> vs Benchmark Session: <span className="font-bold text-purple-600">{comparison.compareYearName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Comparison
                </button>
              </div>
            </div>

            {/* Summary Variance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Revenue */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Revenue</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      comparison.summary.totalIncome.varianceRupees >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {comparison.summary.totalIncome.variancePercentage >= 0 ? "+" : ""}
                    {comparison.summary.totalIncome.variancePercentage}%
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {formatCurrency(comparison.summary.totalIncome.baseValueRupees)}
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Prior: {formatCurrency(comparison.summary.totalIncome.compareValueRupees)}</span>
                  <span className="font-bold font-mono text-slate-600 dark:text-slate-300">
                    {comparison.summary.totalIncome.varianceRupees >= 0 ? "+" : ""}
                    {formatCurrency(comparison.summary.totalIncome.varianceRupees)}
                  </span>
                </div>
              </div>

              {/* Expenses */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Expenses</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      comparison.summary.totalExpenses.varianceRupees <= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {comparison.summary.totalExpenses.variancePercentage >= 0 ? "+" : ""}
                    {comparison.summary.totalExpenses.variancePercentage}%
                  </span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  {formatCurrency(comparison.summary.totalExpenses.baseValueRupees)}
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Prior: {formatCurrency(comparison.summary.totalExpenses.compareValueRupees)}</span>
                  <span className="font-bold font-mono text-slate-600 dark:text-slate-300">
                    {comparison.summary.totalExpenses.varianceRupees >= 0 ? "+" : ""}
                    {formatCurrency(comparison.summary.totalExpenses.varianceRupees)}
                  </span>
                </div>
              </div>

              {/* Net Surplus */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Surplus</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      comparison.summary.netSurplus.varianceRupees >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {comparison.summary.netSurplus.variancePercentage >= 0 ? "+" : ""}
                    {comparison.summary.netSurplus.variancePercentage}%
                  </span>
                </div>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(comparison.summary.netSurplus.baseValueRupees)}
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Prior: {formatCurrency(comparison.summary.netSurplus.compareValueRupees)}</span>
                  <span className="font-bold font-mono text-slate-600 dark:text-slate-300">
                    {comparison.summary.netSurplus.varianceRupees >= 0 ? "+" : ""}
                    {formatCurrency(comparison.summary.netSurplus.varianceRupees)}
                  </span>
                </div>
              </div>
            </div>

            {/* Incomes & Expenses Comparison Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Revenue Head Comparison Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Revenue Stream</th>
                      <th className="py-3 px-4 text-right">{comparison.baseYearName} (₹)</th>
                      <th className="py-3 px-4 text-right">{comparison.compareYearName} (₹)</th>
                      <th className="py-3 px-4 text-right">Variance (₹)</th>
                      <th className="py-3 px-4 text-right">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {comparison.incomeComparison.map((item) => (
                      <tr key={item.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {item.label}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.baseValueRupees)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(item.compareValueRupees)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={item.varianceRupees >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {item.varianceRupees >= 0 ? "+" : ""}
                            {formatCurrency(item.varianceRupees)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span className={item.variancePercentage >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {item.variancePercentage >= 0 ? "+" : ""}
                            {item.variancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses Comparison Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Operating Expenses Comparison Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Expense Head</th>
                      <th className="py-3 px-4 text-right">{comparison.baseYearName} (₹)</th>
                      <th className="py-3 px-4 text-right">{comparison.compareYearName} (₹)</th>
                      <th className="py-3 px-4 text-right">Variance (₹)</th>
                      <th className="py-3 px-4 text-right">% Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {comparison.expenseComparison.map((item) => (
                      <tr key={item.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {item.label}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.baseValueRupees)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(item.compareValueRupees)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={item.varianceRupees <= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {item.varianceRupees >= 0 ? "+" : ""}
                            {formatCurrency(item.varianceRupees)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span className={item.variancePercentage <= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {item.variancePercentage >= 0 ? "+" : ""}
                            {item.variancePercentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: GENERAL LEDGER
        ======================================================== */}
        {activeTab === "general_ledger" && ledgerStatement && (
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Account Ledger
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono text-blue-600">{ledgerStatement.account.code}</span>
                    <span>{ledgerStatement.account.name}</span>
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {getCategoryBadge(ledgerStatement.account.category)}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Normal: {ledgerStatement.account.normalBalance}
                  </span>
                </div>
              </div>

              {/* Account KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Opening Balance</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {formatCurrency(ledgerStatement.openingBalanceRupees)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Debits</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    +{formatCurrency(ledgerStatement.totalDebitRupees)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Credits</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    -{formatCurrency(ledgerStatement.totalCreditRupees)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">Closing Balance</div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                    {formatCurrency(ledgerStatement.closingBalanceRupees)}
                  </div>
                </div>
              </div>
            </div>

            {/* General Ledger Transactions Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Chronological Account Register
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Showing {ledgerStatement.entries.length} posting{ledgerStatement.entries.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Voucher No</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Narration & Student</th>
                      <th className="py-3 px-4 text-right">Debit (+)</th>
                      <th className="py-3 px-4 text-right">Credit (-)</th>
                      <th className="py-3 px-4 text-right font-black">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {ledgerStatement.entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No transactions recorded for this account during selected period.
                        </td>
                      </tr>
                    ) : (
                      ledgerStatement.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {entry.dateFormatted}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            {entry.voucherNumber}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {entry.voucherType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                            {entry.referenceNumber || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{entry.narration}</div>
                            {entry.studentName && (
                              <div className="text-[10px] text-slate-400">Student: {entry.studentName}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {entry.debitRupees > 0 ? `₹${entry.debitRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                            {entry.creditRupees > 0 ? `₹${entry.creditRupees.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-black text-slate-900 dark:text-white">
                            {formatCurrency(entry.runningBalanceRupees)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: JOURNAL BOOK (VOUCHERS)
        ======================================================== */}
        {activeTab === "journal" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Double-Entry Journal Book
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Authoritative vouchers register • Each entry strictly balances (Debit = Credit)
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {journalEntries.length} Voucher{journalEntries.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {journalEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No journal vouchers found. Click &quot;Sync All Transactions&quot; to backfill historical fee records.
                </div>
              ) : (
                journalEntries.map((j) => (
                  <div key={j.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors space-y-3">
                    {/* Voucher Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60">
                          {j.voucherNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {j.voucherType}
                        </span>
                        <span className="text-xs text-slate-400">{formatDateStr(j.date)}</span>
                        {j.referenceNumber && (
                          <span className="text-xs font-mono text-slate-500">Ref: {j.referenceNumber}</span>
                        )}
                      </div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        Voucher Total: {formatCurrency(j.totalDebitRupees)}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {j.narration}
                    </p>

                    {/* Debit & Credit Legs Table */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200/60 dark:border-slate-700">
                          <tr>
                            <th className="py-2 px-3">Account Code & Title</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3 text-right">Debit (₹)</th>
                            <th className="py-2 px-3 text-right">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/40 dark:divide-slate-700/50 font-medium">
                          {j.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-blue-600 mr-1.5">{l.accountCode}</span>
                                <span className="text-slate-900 dark:text-white">{l.accountName}</span>
                                {l.narration && <span className="text-[10px] text-slate-400 block">{l.narration}</span>}
                              </td>
                              <td className="py-2 px-3">{getCategoryBadge(l.category)}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                                {l.debitRupees > 0 ? `₹${l.debitRupees.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                                {l.creditRupees > 0 ? `₹${l.creditRupees.toLocaleString("en-IN")}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: CHART OF ACCOUNTS
        ======================================================== */}
        {activeTab === "chart_of_accounts" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Institutional Chart of Accounts
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Standardized 5-tier accounting ledger schema (Assets, Liabilities, Equity, Income, Expenses)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Normal Balance</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {accounts.map((acc) => (
                    <tr key={acc.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {acc.name}
                      </td>
                      <td className="py-3 px-4">{getCategoryBadge(acc.category)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {acc.normalBalance}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {acc.description}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.code);
                            setActiveTab("general_ledger");
                          }}
                          className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: SCHOOL OPERATING EXPENSES
        ======================================================== */}
        {activeTab === "expenses" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Operational School Expenses
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Recorded expenditures automatically post Payment Vouchers (PV) to general ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payee / Vendor</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right font-black">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No operational expenses recorded for this session.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {formatDateStr(exp.expenseDate)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          {exp.voucherNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {exp.category}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {exp.payeeName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {exp.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {exp.description}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(exp.amountRupees)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            RECORD EXPENSE MODAL
        ======================================================== */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Record Operational School Expense
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Expense Category / Ledger Head
                  </label>
                  <select
                    value={expenseForm.expenseAccountCode}
                    onChange={(e) => {
                      const acc = accounts.find((a) => a.code === e.target.value);
                      setExpenseForm({
                        ...expenseForm,
                        expenseAccountCode: e.target.value,
                        category: acc?.name || "Operating Expense",
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-semibold cursor-pointer"
                  >
                    <option value="5020">5020 — Staff Salary & Wages</option>
                    <option value="5030">5030 — Rent & Facility Lease</option>
                    <option value="5040">5040 — Electricity & Utilities</option>
                    <option value="5050">5050 — Repairs & Maintenance</option>
                    <option value="5060">5060 — Printing & Stationery</option>
                    <option value="5070">5070 — Internet & Technology</option>
                    <option value="5080">5080 — Bank Charges & Gateway Fees</option>
                    <option value="5090">5090 — Other Operating Expenses</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Payee / Vendor Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. State Electricity Board"
                      value={expenseForm.payeeName}
                      onChange={(e) => setExpenseForm({ ...expenseForm, payeeName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 15000"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-black text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={expenseForm.paymentMethod}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-semibold cursor-pointer"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CASH">Cash Drawer</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Invoice / Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EB-BILL-SEP-2026"
                    value={expenseForm.invoiceNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Narration / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide brief details for accounting audit trail..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 font-medium"
                  />
                </div>

                {/* Double Entry Preview Notice */}
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
                  <span className="font-bold">Double-Entry Impact:</span> Posts balanced Payment Voucher (PV) crediting selected payment account and debiting {expenseForm.category}.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingExpense}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {savingExpense && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Post Expense Voucher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
