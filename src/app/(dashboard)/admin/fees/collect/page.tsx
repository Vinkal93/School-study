"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { getStudents } from "@/lib/services/student.service";
import {
  CreditCard,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  Check,
  UserCheck,
  X,
  GraduationCap,
  Clock,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { FeePayment, FeeType, StudentProfile } from "@/types";
import { getStudentFeeSummary, type StudentFeeSummary } from "@/lib/services/fee.service";
import { toast } from "sonner";

export default function AdminCollectFeePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Student list & Searchable dropdown state
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [feeType, setFeeType] = useState<FeeType>("tuition");
  const [amountPaidRupees, setAmountPaidRupees] = useState("500");
  const [discountRupees, setDiscountRupees] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<FeePayment["paymentMethod"]>("Cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["April 2026"]);

  // Student Fee Ledger & Auto-Calculation state
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [loadingFeeSummary, setLoadingFeeSummary] = useState(false);
  const [isManualAmountOverride, setIsManualAmountOverride] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [issuedPayment, setIssuedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Helper to calculate total fee for given months based on ledger & structure
  const calculateMonthsFee = (months: string[], summary: StudentFeeSummary | null = feeSummary) => {
    if (!summary || months.length === 0) return 0;
    let total = 0;
    months.forEach((m) => {
      const item = summary.assignment?.monthLedger?.find((l) => l.month === m);
      if (item && item.pendingAmountPaise > 0) {
        total += item.pendingAmountPaise / 100;
      } else if (item && item.amountPaise > 0) {
        total += item.amountPaise / 100;
      } else {
        total += summary.monthlyFeeRupees || 500;
      }
    });
    return Math.round(total);
  };

  // Auto-calculated fee amount for current selected months
  const autoCalculatedAmount = useMemo(() => {
    return calculateMonthsFee(selectedMonths, feeSummary);
  }, [selectedMonths, feeSummary]);

  // Fetch student fee profile & ledger
  const fetchStudentFeeDetails = async (student: StudentProfile) => {
    if (!schoolId || !student?.id) return;
    setLoadingFeeSummary(true);
    try {
      let summary: StudentFeeSummary | null = null;
      try {
        summary = await getStudentFeeSummary(schoolId, student);
      } catch (clientErr) {
        // Fallback to API route
        const res = await fetch(
          `/api/fees/student-summary?schoolId=${schoolId}&studentId=${student.id}&studentName=${encodeURIComponent(
            student.name
          )}&admissionNumber=${encodeURIComponent(
            student.admissionNumber || student.studentId || ""
          )}&className=${encodeURIComponent(student.className || "")}&sectionName=${encodeURIComponent(
            student.sectionName || "A"
          )}`
        );
        const data = await res.json();
        if (data.success && data.summary) {
          summary = data.summary;
        }
      }

      if (summary) {
        setFeeSummary(summary);

        // Auto-select the next due month if available
        const initialMonth = summary.nextDueMonth || summary.pendingMonths[0] || "April 2026";
        const newSelected = [initialMonth];
        setSelectedMonths(newSelected);

        // Auto-reload fee amount based on the selected month
        const autoFee = calculateMonthsFee(newSelected, summary);
        setAmountPaidRupees(autoFee.toString());
        setIsManualAmountOverride(false);
      }
    } catch (err) {
      console.warn("Could not fetch student fee details:", err);
    } finally {
      setLoadingFeeSummary(false);
    }
  };

  // Fetch real students of this school
  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const data = await getStudents(schoolId);
        if (mounted) {
          setStudentsList(data);
          // If students exist and no student is selected yet, pre-select the first student
          if (data.length > 0 && !studentId) {
            const first = data[0];
            setSelectedStudent(first);
            setStudentId(first.id);
            setStudentName(first.name);
            setAdmissionNumber(first.admissionNumber || first.studentId || "");
            setClassName(first.className || "");
            setSectionName(first.sectionName || "");
            fetchStudentFeeDetails(first);
          }
        }
      } catch (err) {
        console.warn("Could not load school students:", err);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };
    fetchStudents();
    return () => {
      mounted = false;
    };
  }, [schoolId]);

  // Outside click listener for student dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsList;
    const q = studentSearch.toLowerCase().trim();
    return studentsList.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const adm = (s.admissionNumber || "").toLowerCase();
      const id = (s.studentId || "").toLowerCase();
      const cls = (s.className || "").toLowerCase();
      const roll = String(s.rollNumber || "");
      return name.includes(q) || adm.includes(q) || id.includes(q) || cls.includes(q) || roll.includes(q);
    });
  }, [studentsList, studentSearch]);

  const handleSelectStudent = (s: StudentProfile) => {
    setSelectedStudent(s);
    setStudentId(s.id);
    setStudentName(s.name);
    setAdmissionNumber(s.admissionNumber || s.studentId || "");
    setClassName(s.className || "");
    setSectionName(s.sectionName || "");
    setIsDropdownOpen(false);
    setStudentSearch("");
    fetchStudentFeeDetails(s);
    toast.success(`Selected student: ${s.name} (${s.className || "Class"} ${s.sectionName || ""})`);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentId("");
    setStudentName("");
    setAdmissionNumber("");
    setClassName("");
    setSectionName("");
    setStudentSearch("");
    setFeeSummary(null);
    setSelectedMonths(["April 2026"]);
    setAmountPaidRupees("500");
    setIsManualAmountOverride(false);
  };

  const monthsList = [
    "April 2026", "May 2026", "June 2026", "July 2026", "August 2026", "September 2026",
    "October 2026", "November 2026", "December 2026", "January 2027", "February 2027", "March 2027"
  ];

  const handleMonthToggle = (month: string) => {
    let newSelected: string[];
    if (selectedMonths.includes(month)) {
      newSelected = selectedMonths.filter((m) => m !== month);
    } else {
      newSelected = [...selectedMonths, month];
    }
    setSelectedMonths(newSelected);

    // Auto-reload fee amount dynamically
    const autoFee = calculateMonthsFee(newSelected);
    setAmountPaidRupees(autoFee.toString());
    setIsManualAmountOverride(false);
  };

  // Quick Action: Select Next Due Month
  const handleSelectNextDue = () => {
    if (!feeSummary?.nextDueMonth) {
      toast.info("All session fees are already paid!");
      return;
    }
    const newSelected = [feeSummary.nextDueMonth];
    setSelectedMonths(newSelected);
    const autoFee = calculateMonthsFee(newSelected);
    setAmountPaidRupees(autoFee.toString());
    setIsManualAmountOverride(false);
    toast.success(`Selected next due month: ${feeSummary.nextDueMonth}`);
  };

  // Quick Action: Select 3 Months (Quarter)
  const handleSelectQuarter = () => {
    if (!feeSummary || feeSummary.pendingMonths.length === 0) {
      toast.info("No pending months remaining!");
      return;
    }
    const newSelected = feeSummary.pendingMonths.slice(0, 3);
    setSelectedMonths(newSelected);
    const autoFee = calculateMonthsFee(newSelected);
    setAmountPaidRupees(autoFee.toString());
    setIsManualAmountOverride(false);
    toast.success(`Selected ${newSelected.length} quarter months: ${newSelected.join(", ")}`);
  };

  // Quick Action: Select All Pending Months
  const handleSelectAllPending = () => {
    if (!feeSummary || feeSummary.pendingMonths.length === 0) {
      toast.info("No pending months remaining!");
      return;
    }
    const newSelected = [...feeSummary.pendingMonths];
    setSelectedMonths(newSelected);
    const autoFee = calculateMonthsFee(newSelected);
    setAmountPaidRupees(autoFee.toString());
    setIsManualAmountOverride(false);
    toast.success(`Selected all ${newSelected.length} pending months`);
  };

  // Quick Action: Clear Month Selection
  const handleClearMonths = () => {
    setSelectedMonths([]);
    setAmountPaidRupees("0");
    setIsManualAmountOverride(false);
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast.error("Please select or enter a student name.");
      return;
    }
    if (!amountPaidRupees || parseFloat(amountPaidRupees) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          studentId: studentId || "std_custom",
          studentName,
          admissionNumber,
          className,
          sectionName,
          academicYearId: "ay_current",
          feeType,
          periodMonths: selectedMonths,
          amountPaidRupees: parseFloat(amountPaidRupees),
          discountRupees: parseFloat(discountRupees || "0"),
          paymentMethod,
          transactionRef,
          remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Fee collected successfully! Receipt #${data.receiptNumber}`);
        setIssuedPayment(data.payment);
        setShowReceiptModal(true);
        if (selectedStudent) {
          fetchStudentFeeDetails(selectedStudent);
        }
      } else {
        toast.error(data.error || "Failed to process fee payment.");
      }
    } catch (err) {
      toast.error("Server error processing payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntitlementGate feature="fee_collection" title="Collect Fee Payment" requiredPlan="Professional Plan">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Collect Student Fee</h1>
          <p className="text-xs text-slate-500 mt-1">Select enrolled student or search student records, calculate discounts, and issue receipt.</p>
        </div>

        <form onSubmit={handleCollect} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Student Identification Section with Searchable Dropdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                <span>1. Select Student From School Records</span>
              </h3>
              {studentsList.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {studentsList.length} students enrolled
                </span>
              )}
            </div>

            {/* Searchable Combobox */}
            <div className="relative" ref={dropdownRef}>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                Search & Select Student
              </label>

              {/* Trigger Input Box */}
              <div
                onClick={() => setIsDropdownOpen(true)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  {selectedStudent ? (
                    <div className="flex items-center gap-2 truncate text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {selectedStudent.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                        {selectedStudent.className || "Class"} {selectedStudent.sectionName || ""}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Adm: {selectedStudent.admissionNumber || selectedStudent.studentId}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {loadingStudents ? "Loading school students..." : "Click or type to search student by name, roll #, or ID..."}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearStudent();
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Clear Selection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Dropdown Menu Popup */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 max-h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                  {/* Search filter input */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search student name, roll number, admission #..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Student list */}
                  <div className="overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800 p-1">
                    {loadingStudents ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading students...</span>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No students match &quot;{studentSearch}&quot;
                      </div>
                    ) : (
                      filteredStudents.map((s) => {
                        const isSelected = selectedStudent?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {(s.name || "S").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  {s.rollNumber && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                      Roll #{s.rollNumber}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {s.className || "Class"} {s.sectionName || ""} • ID: {s.admissionNumber || s.studentId || "N/A"}
                                </p>
                              </div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Student Fee Status & History Ledger Card ("Kahan Tak Jama Hai" & "Kaunsa Jama Hona Hai") */}
            {selectedStudent && (
              <div className="mt-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/60 via-indigo-50/20 to-white dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedStudent.name} — Fee Ledger & Status</span>
                        {loadingFeeSummary && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {selectedStudent.className || "Class"} {selectedStudent.sectionName || ""} • Adm No: {selectedStudent.admissionNumber || selectedStudent.studentId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchStudentFeeDetails(selectedStudent)}
                      disabled={loadingFeeSummary}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
                      title="Reload fee ledger"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingFeeSummary ? "animate-spin" : ""}`} />
                      <span>Sync Ledger</span>
                    </button>
                  </div>
                </div>

                {/* 3 Status Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* 1. Kaha tak jma hai (Paid Status) */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Kahan Tak Jama Hai</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold">
                        {feeSummary?.paidMonths.length || 0} Paid
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {feeSummary?.lastPaidMonth ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Paid through {feeSummary.lastPaidMonth}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-xs">No previous payments recorded</span>
                      )}
                    </p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Total Paid: </span>
                      <span className="font-extrabold text-emerald-600">₹{(feeSummary?.totalPaidRupees || 0).toLocaleString()}</span>
                      {feeSummary?.lastPayment && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          Last Rec: #{feeSummary.lastPayment.receiptNumber} (₹{(feeSummary.lastPayment.amountPaidPaise / 100).toLocaleString()})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Kaunsa jma hona hai (Next Due) */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Kaunsa Jama Hona Hai</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-extrabold">
                        {feeSummary?.pendingMonths.length || 0} Due
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {feeSummary?.nextDueMonth ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>Next Due: {feeSummary.nextDueMonth}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-extrabold">All Session Dues Cleared ✓</span>
                      )}
                    </p>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Total Pending: </span>
                      <span className="font-extrabold text-amber-600">₹{(feeSummary?.totalPendingRupees || 0).toLocaleString()}</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Due date: 10th of each month</p>
                    </div>
                  </div>

                  {/* 3. Class Monthly Rate & Auto Calculation */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        <span>Class Fee Rate</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {selectedStudent.className || "Class"}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{feeSummary?.monthlyFeeRupees || 500} <span className="text-[11px] font-normal text-slate-400">/ month</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Selecting months below automatically loads the exact total fee.
                    </p>
                  </div>
                </div>

                {/* Quick Action Selection Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    <span>Quick Select:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectNextDue}
                    disabled={!feeSummary?.nextDueMonth}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 hover:bg-blue-200 font-bold text-[11px] transition-colors disabled:opacity-40"
                  >
                    + Next Due ({feeSummary?.nextDueMonth || "None"})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectQuarter}
                    disabled={!feeSummary || feeSummary.pendingMonths.length === 0}
                    className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 font-bold text-[11px] transition-colors disabled:opacity-40"
                  >
                    + Next 3 Months (Quarter)
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllPending}
                    disabled={!feeSummary || feeSummary.pendingMonths.length === 0}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-bold text-[11px] transition-colors disabled:opacity-40"
                  >
                    + All Pending ({feeSummary?.pendingMonths.length || 0})
                  </button>
                  {selectedMonths.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearMonths}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-medium text-[11px] transition-colors ml-auto"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Auto-populated form fields (with manual edit ability) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Student Name *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admission Number *</label>
                <input
                  type="text"
                  required
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="e.g. ADM-2026-001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Class & Section</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Class"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                  <input
                    type="text"
                    required
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                    placeholder="Section"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Fee Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as FeeType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium capitalize"
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="admission">Admission Fee</option>
                  <option value="annual">Annual Fee</option>
                  <option value="exam">Exam Fee</option>
                  <option value="computer">Computer Fee</option>
                  <option value="transport">Transport Fee</option>
                  <option value="library">Library Fee</option>
                  <option value="other">Other Fee</option>
                </select>
              </div>
            </div>
          </div>

          {/* Period Selection with Live Paid / Due Badges */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>2. Fee Period Months</span>
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Paid</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Next Due</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span>Selected</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {monthsList.map((m) => {
                const isSelected = selectedMonths.includes(m);
                const ledgerItem = feeSummary?.assignment?.monthLedger?.find((l) => l.month === m);
                const isPaid = feeSummary?.paidMonths?.includes(m) || ledgerItem?.status === "PAID";
                const isNextDue = feeSummary?.nextDueMonth === m;
                const paidAmount = ledgerItem?.paidAmountPaise ? Math.round(ledgerItem.paidAmountPaise / 100) : 0;
                const pendingAmount = ledgerItem?.pendingAmountPaise
                  ? Math.round(ledgerItem.pendingAmountPaise / 100)
                  : feeSummary?.monthlyFeeRupees || 500;

                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => handleMonthToggle(m)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30"
                        : isPaid
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400"
                        : isNextDue
                        ? "bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:border-amber-400 ring-1 ring-amber-400/40"
                        : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1.5">
                      <span className={`font-extrabold text-xs truncate ${isSelected ? "text-white" : ""}`}>
                        {m}
                      </span>
                      {isSelected ? (
                        <span className="h-4 w-4 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      ) : isPaid ? (
                        <span className="h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0" title="Fee Paid">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      ) : isNextDue ? (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Next Due" />
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-1 w-full text-[10.5px]">
                      {isPaid ? (
                        <span className={`font-bold ${isSelected ? "text-blue-100" : "text-emerald-700 dark:text-emerald-400"}`}>
                          ✓ Paid {paidAmount > 0 ? `(₹${paidAmount})` : ""}
                        </span>
                      ) : isNextDue ? (
                        <span className={`font-bold ${isSelected ? "text-amber-200" : "text-amber-700 dark:text-amber-400"}`}>
                          ★ Next Due: ₹{pendingAmount}
                        </span>
                      ) : (
                        <span className={`font-medium ${isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                          Due: ₹{pendingAmount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Payment Method Section with Live Auto-Calculation */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              <span>3. Payment & Amount Details</span>
            </h3>

            {/* Live Auto-Reload Amount Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-blue-900 dark:text-blue-100">
                    Fee Auto-Calculation:
                  </span>{" "}
                  <span className="text-slate-600 dark:text-slate-300">
                    {selectedMonths.length} month(s) selected ({selectedMonths.join(", ") || "None"})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span>Base: <strong>₹{autoCalculatedAmount}</strong></span>
                {parseFloat(discountRupees || "0") > 0 && (
                  <span className="text-emerald-600">Discount: <strong>-₹{discountRupees}</strong></span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-extrabold text-xs shadow-2xs">
                  Net Payable: ₹{Math.max(0, parseFloat(amountPaidRupees || "0") - parseFloat(discountRupees || "0"))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Amount Paid (₹) *</label>
                  {isManualAmountOverride && (
                    <button
                      type="button"
                      onClick={() => {
                        setAmountPaidRupees(autoCalculatedAmount.toString());
                        setIsManualAmountOverride(false);
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Reset to Auto (₹{autoCalculatedAmount})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  value={amountPaidRupees}
                  onChange={(e) => {
                    setAmountPaidRupees(e.target.value);
                    setIsManualAmountOverride(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-extrabold text-base"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isManualAmountOverride ? "✏️ Custom amount entered" : `⚡ Auto-calculated for ${selectedMonths.length} month(s)`}
                </p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountRupees}
                  onChange={(e) => setDiscountRupees(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Direct discount reduction</p>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online Payment">Online Payment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/123456789"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-xs shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Submit Payment & Generate Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Receipt Modal */}
        <FeeReceiptModal
          payment={issuedPayment}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      </div>
    </EntitlementGate>
  );
}
