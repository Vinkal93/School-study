"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  BookOpen,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  Share2,
  CreditCard,
  User,
  Users,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Loader2,
  FileText,
  FileSpreadsheet,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Receipt,
  X,
} from "lucide-react";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { StudentProfile, SchoolClass } from "@/types";
import type {
  StudentLedgerEntry,
  StudentLedgerSummary,
  StudentStatement,
} from "@/types/fee-ledger";
import {
  getStudentLedger,
  getStudentStatement,
} from "@/lib/services/fee-ledger.service";
import { toast } from "sonner";

export default function AdminStudentLedgerPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryStudentId = searchParams.get("studentId") || "";

  // Data states
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [ledgerSummary, setLedgerSummary] = useState<StudentLedgerSummary | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<StudentLedgerEntry[]>([]);
  const [statementData, setStatementData] = useState<StudentStatement | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("ay_2026_27");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");

  // Load students & classes list
  useEffect(() => {
    async function loadInitial() {
      if (!schoolId) return;
      setLoadingList(true);
      try {
        const [studList, clsList] = await Promise.all([
          getStudents(schoolId, { status: "active" }).catch(() => []),
          getClassesWithSections(schoolId).catch(() => []),
        ]);
        setStudents(studList);
        setClasses(clsList);

        if (queryStudentId && studList.length > 0) {
          const match = studList.find((s) => s.id === queryStudentId || s.studentId === queryStudentId);
          if (match) {
            setSelectedStudent(match);
          }
        } else if (studList.length > 0 && !selectedStudent) {
          setSelectedStudent(studList[0]);
        }
      } catch (err) {
        console.error("Failed to load students for ledger:", err);
      } finally {
        setLoadingList(false);
      }
    }
    loadInitial();
  }, [schoolId, queryStudentId]);

  // Load selected student's ledger
  const fetchStudentLedger = async (student: StudentProfile) => {
    if (!schoolId || !student.id) return;
    setLoadingLedger(true);
    try {
      // 1. Direct Service Execution (Fast, Offline-ready, Zero 401 issues)
      const [ledgerData, statement] = await Promise.all([
        getStudentLedger(schoolId, student.id, {
          academicYearId: selectedAcademicYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        getStudentStatement(schoolId, student.id, {
          academicYearId: selectedAcademicYear || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      if (ledgerData) {
        setLedgerSummary(ledgerData.summary);
        setLedgerEntries(ledgerData.entries || []);
      }
      if (statement) {
        setStatementData(statement);
      }
    } catch (err) {
      console.warn("Direct student ledger load error, trying API fallback:", err);
      try {
        const q = new URLSearchParams({
          schoolId,
          studentId: student.id,
          academicYearId: selectedAcademicYear,
        });
        if (startDate) q.set("startDate", startDate);
        if (endDate) q.set("endDate", endDate);

        const [ledgerRes, stmtRes] = await Promise.all([
          fetch(`/api/fees/foundation/ledger/student?${q.toString()}`).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch(`/api/fees/foundation/ledger/student?statement=true&${q.toString()}`).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);

        if (ledgerRes?.data) {
          setLedgerSummary(ledgerRes.data.summary);
          setLedgerEntries(ledgerRes.data.entries || []);
        }
        if (stmtRes?.data) {
          setStatementData(stmtRes.data);
        }
      } catch (fallbackErr) {
        toast.error("Failed to load student ledger data.");
      }
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentLedger(selectedStudent);
    }
  }, [selectedStudent, selectedAcademicYear, startDate, endDate]);

  // Filtered Students in Dropdown / Search
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedClass !== "all") {
      list = list.filter((s) => s.className === selectedClass);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.admissionNumber || "").toLowerCase().includes(q) ||
          (s.studentId || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, selectedClass, searchQuery]);

  // Filtered Ledger Entries
  const filteredEntries = useMemo(() => {
    if (entryTypeFilter === "all") return ledgerEntries;
    if (entryTypeFilter === "charges") {
      return ledgerEntries.filter((e) => e.type === "CHARGE" || e.type === "FINE");
    }
    if (entryTypeFilter === "payments") {
      return ledgerEntries.filter((e) => e.type === "PAYMENT");
    }
    if (entryTypeFilter === "discounts") {
      return ledgerEntries.filter(
        (e) => e.type === "DISCOUNT" || e.type === "CONCESSION" || e.type === "WAIVER"
      );
    }
    if (entryTypeFilter === "refunds") {
      return ledgerEntries.filter((e) => e.type === "REFUND" || e.type === "REVERSAL");
    }
    return ledgerEntries;
  }, [ledgerEntries, entryTypeFilter]);

  // Export to CSV
  const handleExportCSV = async () => {
    if (!schoolId || !selectedStudent) return;
    setExporting(true);
    try {
      const res = await fetch("/api/fees/foundation/ledger/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          exportType: "student_ledger",
          studentId: selectedStudent.id,
          academicYearId: selectedAcademicYear,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to export ledger");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Student_Ledger_${selectedStudent.admissionNumber || selectedStudent.id}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Student ledger exported to CSV successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export ledger.");
    } finally {
      setExporting(false);
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <EntitlementGate feature="fee_ledger" title="Student Fee Ledger" requiredPlan="Professional Plan">
      <div className="space-y-6 pb-16">
        {/* ========================================================
            1. HEADER WITH BRANDING & TOP ACTIONS
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Student Fee Ledger
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Chronological
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Complete audit trail of all student charges, concessions, payments, refunds, and running balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/fees/cash-bank"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Cash & Bank Ledger</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowStatementModal(true)}
              disabled={!selectedStudent}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Student Statement</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || !selectedStudent}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-slate-500" />}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            2. STUDENT SELECTION & FILTER CONTROL BAR
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* Student Search / Selector (4 cols) */}
            <div className="lg:col-span-4 relative">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Student</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name or admission no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Autocomplete Dropdown if typing */}
              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1">
                  {filteredStudents.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {s.admissionNumber} ({s.className})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter by Class (2 cols) */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  const firstInClass = students.find((s) => e.target.value === "all" || s.className === e.target.value);
                  if (firstInClass) setSelectedStudent(firstInClass);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Academic Year (2 cols) */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Academic Year</label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                <option value="ay_2026_27">2026–2027 (Apr–Mar)</option>
                <option value="ay_2025_26">2025–2026 (Apr–Mar)</option>
                <option value="all">All Academic Years</option>
              </select>
            </div>

            {/* Filter by Date Range (2 cols) */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white cursor-pointer"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white cursor-pointer"
              />
            </div>
          </div>

          {/* Active Student Card Banner */}
          {selectedStudent && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                  {selectedStudent.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">{selectedStudent.name}</span>
                    <span className="text-xs font-bold text-slate-500">
                      Class {selectedStudent.className} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ""}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Adm: {selectedStudent.admissionNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                    {ledgerSummary?.fatherName && <span>Father/Guardian: {ledgerSummary.fatherName}</span>}
                    {ledgerSummary?.guardianPhone && <span>Phone: {ledgerSummary.guardianPhone}</span>}
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/fees/collect?studentId=${selectedStudent.id}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Collect Fee</span>
                </Link>
                <Link
                  href={`/admin/fees/student-fees?studentId=${selectedStudent.id}`}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            3. FINANCIAL KPI SUMMARY TILES (RECONCILED SOURCE)
        ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tile 1: Opening Balance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">Opening Balance</span>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-1">
              ₹{(ledgerSummary?.openingBalanceRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-slate-400">Arrears b/f</span>
          </div>

          {/* Tile 2: Total Charges (Debits) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600">Total Charges (+)</span>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              ₹{(ledgerSummary?.totalChargesRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-slate-400">Invoices & Fines</span>
          </div>

          {/* Tile 3: Concessions / Waivers (-) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-purple-600">Concessions (-)</span>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
              ₹{(ledgerSummary?.totalDiscountsRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-slate-400">Waivers & Relief</span>
          </div>

          {/* Tile 4: Total Paid (Credits) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600">Total Paid (-)</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{(ledgerSummary?.totalPaidRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Payments cleared</span>
          </div>

          {/* Tile 5: Total Refunds (+) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <span className="text-[11px] font-bold text-amber-600">Refunds Returned</span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              ₹{(ledgerSummary?.totalRefundsRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-slate-400">Reversed outflow</span>
          </div>

          {/* Tile 6: Closing Outstanding Due */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm ring-2 ring-rose-500/20">
            <span className="text-[11px] font-bold text-rose-600">Closing Balance</span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{(ledgerSummary?.closingOutstandingRupees || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-rose-500 font-bold">Net Current Due</span>
          </div>
        </div>

        {/* ========================================================
            4. CHRONOLOGICAL LEDGER TABLE
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Chronological Transaction Ledger
                </h3>
                <p className="text-[11px] text-slate-400">
                  {ledgerSummary?.isReconciled ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled with Invoices & Transactions
                    </span>
                  ) : (
                    <span>Running balance audit trail</span>
                  )}
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
              {[
                { id: "all", label: "All Records" },
                { id: "charges", label: "Charges" },
                { id: "payments", label: "Payments" },
                { id: "discounts", label: "Discounts" },
                { id: "refunds", label: "Refunds/Reversals" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEntryTypeFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    entryTypeFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3 text-right">Debit (+)</th>
                  <th className="py-3 px-3 text-right">Credit (-)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {loadingLedger ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Reconciling student ledger entries...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEntries.length > 0 ? (
                  filteredEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono text-[11px]">
                        {row.dateFormatted || row.date.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {row.reference}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            row.type === "CHARGE"
                              ? "bg-blue-100 text-blue-700"
                              : row.type === "PAYMENT"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.type === "DISCOUNT" || row.type === "CONCESSION" || row.type === "WAIVER"
                              ? "bg-purple-100 text-purple-700"
                              : row.type === "REFUND"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        <div>{row.description}</div>
                        {row.notes && <div className="text-[10px] text-slate-400 italic">{row.notes}</div>}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.debitRupees > 0 ? (
                          <span className="text-blue-600 font-bold">₹{row.debitRupees.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        {row.creditRupees > 0 ? (
                          <span className="text-emerald-600 font-bold">₹{row.creditRupees.toLocaleString("en-IN")}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black">
                        <span className={row.balanceRupees > 0 ? "text-rose-600" : "text-emerald-600"}>
                          ₹{row.balanceRupees.toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No ledger transactions found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================
            5. FORMAL STUDENT STATEMENT MODAL (PRINTABLE)
        ======================================================== */}
        {showStatementModal && statementData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Formal Student Fee Statement
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStatementModal(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Statement Canvas */}
              <div className="print-area space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2">
                {/* School Header */}
                <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-black tracking-tight">{statementData.schoolName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{statementData.schoolAddress}</p>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-4 mt-1">
                    <span>Phone: {statementData.schoolPhone}</span>
                    <span>Email: {statementData.schoolEmail}</span>
                  </div>
                  <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider">
                    Official Fee Statement of Account
                  </div>
                </div>

                {/* Student Demographics & Statement Meta */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="space-y-1">
                    <p>
                      <span className="font-bold text-slate-500">Student Name:</span>{" "}
                      <span className="font-black text-slate-900 dark:text-white">{statementData.summary.studentName}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Admission No:</span>{" "}
                      <span className="font-mono font-bold">{statementData.summary.admissionNumber}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Class & Section:</span>{" "}
                      <span className="font-bold">
                        {statementData.summary.className} {statementData.summary.sectionName ? `(${statementData.summary.sectionName})` : ""}
                      </span>
                    </p>
                    {statementData.summary.fatherName && (
                      <p>
                        <span className="font-bold text-slate-500">Father/Guardian:</span>{" "}
                        <span className="font-bold">{statementData.summary.fatherName}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-right">
                    <p>
                      <span className="font-bold text-slate-500">Statement Date:</span>{" "}
                      <span className="font-bold">{statementData.statementDate}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Academic Year:</span>{" "}
                      <span className="font-bold">{statementData.summary.academicYearName}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Period Covered:</span>{" "}
                      <span className="font-bold">{statementData.periodRange}</span>
                    </p>
                    <p>
                      <span className="font-bold text-slate-500">Status:</span>{" "}
                      <span className="font-bold text-emerald-600">Reconciled</span>
                    </p>
                  </div>
                </div>

                {/* Summary KPI Block */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Opening Due</p>
                    <p className="text-sm font-black mt-0.5">₹{statementData.summary.openingBalanceRupees}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Total Charges</p>
                    <p className="text-sm font-black text-blue-600 mt-0.5">₹{statementData.summary.totalChargesRupees}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Concessions</p>
                    <p className="text-sm font-black text-purple-600 mt-0.5">₹{statementData.summary.totalDiscountsRupees}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</p>
                    <p className="text-sm font-black text-emerald-600 mt-0.5">₹{statementData.summary.totalPaidRupees}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Refunds</p>
                    <p className="text-sm font-black text-amber-600 mt-0.5">₹{statementData.summary.totalRefundsRupees}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
                    <p className="text-[10px] font-bold text-rose-600 uppercase">Net Closing Due</p>
                    <p className="text-sm font-black text-rose-600 mt-0.5">₹{statementData.summary.closingOutstandingRupees}</p>
                  </div>
                </div>

                {/* Statement Table */}
                <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-2">Ref No</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-2 text-right">Debit (+)</th>
                      <th className="py-2.5 px-2 text-right">Credit (-)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-[11px]">
                    {statementData.entries.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 font-mono">{e.dateFormatted || e.date.slice(0, 10)}</td>
                        <td className="py-2 px-2 font-mono font-bold text-slate-600 dark:text-slate-400">{e.reference}</td>
                        <td className="py-2 px-3">{e.description}</td>
                        <td className="py-2 px-2 text-right font-bold text-blue-600">
                          {e.debitRupees > 0 ? `₹${e.debitRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-600">
                          {e.creditRupees > 0 ? `₹${e.creditRupees.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-black">
                          ₹{e.balanceRupees.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Statement Signatures Footer */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-xs border-t border-slate-200 dark:border-slate-800 text-slate-500">
                  <div>
                    <p className="font-bold">Important Notes:</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This is a system-generated statement reflecting all recorded fee charges and collections.
                      Please retain this statement for your financial records.
                    </p>
                  </div>
                  <div className="text-right pt-6">
                    <div className="border-t border-slate-300 dark:border-slate-700 w-48 ml-auto pt-1 font-bold text-slate-800 dark:text-slate-200">
                      Authorized Accounts Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
