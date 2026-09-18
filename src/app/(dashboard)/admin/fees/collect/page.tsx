"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { getStudents } from "@/lib/services/student.service";
import { formatINR, paiseToRupees } from "@/lib/services/fee-foundation.service";
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
  Receipt,
  FileText,
  AlertTriangle,
  Building2,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import type { StudentProfile, FeePayment } from "@/types";
import type { FeeDemand, PaymentMethod, PaymentAllocation, FinancialPayment } from "@/types/fee-foundation";
import { toast } from "sonner";

export default function AdminCollectFeePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";

  // Students Search state
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Demands state
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [selectedDemandIds, setSelectedDemandIds] = useState<string[]>([]);

  // Payment Form state
  const [amountPaidRupees, setAmountPaidRupees] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Confirmation & Processing state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal state
  const [issuedPayment, setIssuedPayment] = useState<FeePayment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Load students for school
  useEffect(() => {
    if (!schoolId) return;
    setLoadingStudents(true);
    getStudents(schoolId)
      .then((data) => setStudentsList(data))
      .catch((err) => {
        console.error("Error loading students:", err);
        toast.error("Failed to load students list.");
      })
      .finally(() => setLoadingStudents(false));
  }, [schoolId]);

  // Close student search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsList.slice(0, 15);
    const q = studentSearch.toLowerCase().trim();
    return studentsList
      .filter(
        (s) =>
          String(s.name || "").toLowerCase().includes(q) ||
          String(s.admissionNumber || "").toLowerCase().includes(q) ||
          String(s.studentId || "").toLowerCase().includes(q) ||
          (s.rollNumber !== undefined && s.rollNumber !== null && String(s.rollNumber) === q) ||
          String(s.className || "").toLowerCase().includes(q) ||
          String(s.fatherName || s.guardianName || "").toLowerCase().includes(q) ||
          String(s.phone || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [studentsList, studentSearch]);

  // Fetch student demands when a student is selected
  const fetchStudentDemands = async (student: StudentProfile) => {
    if (!schoolId || !student?.id) return;
    setLoadingDemands(true);
    setSelectedDemandIds([]);
    try {
      const res = await fetch(
        `/api/fees/foundation/student-summary?schoolId=${encodeURIComponent(schoolId)}&studentId=${encodeURIComponent(
          student.id
        )}&academicYearId=ay_2026_27`
      );
      if (!res.ok) throw new Error("Failed to fetch student fee demands");
      const json = await res.json();
      const allDemands: FeeDemand[] = json.summary?.recentDemands || [];
      // Sort demands: oldest due date first
      allDemands.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setDemands(allDemands);

      // By default, select all unpaid demands
      const unpaid = allDemands.filter((d) => d.balanceAmountPaise > 0);
      const defaultSelectedIds = unpaid.map((d) => d.id);
      setSelectedDemandIds(defaultSelectedIds);

      // Default amount is the total balance of selected demands
      const totalDueRupees = unpaid.reduce((sum, d) => sum + paiseToRupees(d.balanceAmountPaise), 0);
      setAmountPaidRupees(totalDueRupees > 0 ? String(totalDueRupees) : "0");
    } catch (err: any) {
      console.error("fetchStudentDemands error:", err);
      toast.error(err.message || "Failed to load student dues.");
    } finally {
      setLoadingDemands(false);
    }
  };

  const handleSelectStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsDropdownOpen(false);
    setStudentSearch("");
    fetchStudentDemands(student);
  };

  // Toggle selection of individual demand
  const toggleDemandSelection = (demandId: string) => {
    setSelectedDemandIds((prev) => {
      const updated = prev.includes(demandId)
        ? prev.filter((id) => id !== demandId)
        : [...prev, demandId];

      // Auto update amount based on new selection
      const totalSelectedBalance = demands
        .filter((d) => updated.includes(d.id))
        .reduce((sum, d) => sum + paiseToRupees(d.balanceAmountPaise), 0);
      setAmountPaidRupees(String(totalSelectedBalance));

      return updated;
    });
  };

  // Select all unpaid demands
  const selectAllUnpaid = () => {
    const unpaid = demands.filter((d) => d.balanceAmountPaise > 0);
    setSelectedDemandIds(unpaid.map((d) => d.id));
    const total = unpaid.reduce((sum, d) => sum + paiseToRupees(d.balanceAmountPaise), 0);
    setAmountPaidRupees(String(total));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedDemandIds([]);
    setAmountPaidRupees("0");
  };

  // Compute live allocation plan preview based on entered amount
  const allocationPlan = useMemo(() => {
    const enteredPaise = Math.round(Number(amountPaidRupees || 0) * 100);
    if (enteredPaise <= 0) return [];

    const candidateDemands = demands.filter(
      (d) => selectedDemandIds.includes(d.id) && d.balanceAmountPaise > 0
    );

    let unallocated = enteredPaise;
    const plan: Array<{
      demand: FeeDemand;
      allocatedRupees: number;
      remainingBalanceRupees: number;
      willBePaid: boolean;
    }> = [];

    for (const d of candidateDemands) {
      if (unallocated <= 0) break;
      const needed = d.balanceAmountPaise;
      const allocated = Math.min(needed, unallocated);
      unallocated -= allocated;

      plan.push({
        demand: d,
        allocatedRupees: paiseToRupees(allocated),
        remainingBalanceRupees: paiseToRupees(Math.max(0, needed - allocated)),
        willBePaid: needed - allocated <= 0,
      });
    }

    return plan;
  }, [amountPaidRupees, demands, selectedDemandIds]);

  // Overall student stats
  const totalStudentBalanceRupees = useMemo(() => {
    return demands.reduce((sum, d) => sum + paiseToRupees(d.balanceAmountPaise), 0);
  }, [demands]);

  const totalSelectedBalanceRupees = useMemo(() => {
    return demands
      .filter((d) => selectedDemandIds.includes(d.id))
      .reduce((sum, d) => sum + paiseToRupees(d.balanceAmountPaise), 0);
  }, [demands, selectedDemandIds]);

  // Handle Form Submission Pre-check
  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Please search and select a student first.");
      return;
    }
    const numAmount = Number(amountPaidRupees);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than ₹0.");
      return;
    }
    if (selectedDemandIds.length === 0) {
      toast.error("Please select at least one fee demand to pay.");
      return;
    }
    if (paymentMethod === "UPI" && !referenceNumber.trim()) {
      toast.error("Please enter UTR / Transaction reference for UPI payment.");
      return;
    }
    if (paymentMethod === "CHEQUE" && !referenceNumber.trim()) {
      toast.error("Please enter Cheque Number & Bank name.");
      return;
    }
    setShowConfirmModal(true);
  };

  // Submit payment to server
  const handleConfirmAndCollect = async () => {
    if (!selectedStudent || !schoolId) return;

    setSubmitting(true);
    // Deterministic idempotency key for this payment action
    const idempotencyKey = `pay_client_${schoolId}_${selectedStudent.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const payload = {
        schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        admissionNumber: selectedStudent.admissionNumber || selectedStudent.id,
        className: selectedStudent.className || "",
        sectionName: selectedStudent.sectionName || "A",
        academicYearId: "ay_2026_27",
        amountPaidRupees: Number(amountPaidRupees),
        paymentMethod,
        targetDemandIds: selectedDemandIds,
        referenceNumber: referenceNumber.trim(),
        remarks: remarks.trim(),
        paymentDate: paymentDate || new Date().toISOString(),
        idempotencyKey,
      };

      const res = await fetch("/api/fees/foundation/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Payment collection failed.");
      }

      toast.success(`Fee collected successfully! Receipt #${json.receiptNumber}`);
      setShowConfirmModal(false);

      // Prepare data for FeeReceiptModal
      const payment: FinancialPayment = json.payment;
      const receiptModalData: FeePayment = {
        id: payment.id,
        schoolId: payment.schoolId,
        receiptNumber: payment.receiptNumber,
        studentId: payment.studentId,
        studentName: payment.studentName,
        admissionNumber: payment.admissionNumber,
        className: payment.className,
        sectionName: payment.sectionName,
        academicYearId: payment.academicYearId,
        feeType: "tuition",
        periodMonths: payment.periodMonths || [],
        amountPaidPaise: payment.amountPaise,
        discountPaise: 0,
        lateFeePaise: 0,
        netAmountPaise: payment.amountPaise,
        paymentMethod: (payment.paymentMethod === "CASH"
          ? "Cash"
          : payment.paymentMethod === "UPI"
          ? "UPI"
          : payment.paymentMethod === "BANK_TRANSFER"
          ? "Bank Transfer"
          : payment.paymentMethod === "CHEQUE"
          ? "Cheque"
          : payment.paymentMethod === "CARD"
          ? "Card"
          : "Other") as any,
        transactionRef: payment.referenceNumber,
        remarks: payment.remarks,
        paymentDate: payment.paymentDate,
        collectedBy: payment.collectedBy,
        collectedByName: payment.collectedByName,
        status: "SUCCESS",
        remainingDuePaise: payment.remainingDuePaise,
        createdAt: payment.createdAt,
      };

      setIssuedPayment(receiptModalData);
      setShowReceiptModal(true);

      // Refresh student demands
      fetchStudentDemands(selectedStudent);
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "An error occurred while processing payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntitlementGate feature="fee_collect" title="Fee Collection" requiredPlan="Professional Plan">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Fee Collection Terminal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Collect fees with exact invoice allocation, automated receipt generation, and real-time ledger updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Idempotent Financial Writes
            </span>
          </div>
        </div>

        {/* Student Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Select Student to Collect Fees
            </label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by Name, Admission Number, Class, Phone..."
                value={studentSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {loadingStudents && (
                <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>

            {/* Dropdown Results */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No students found matching &quot;{studentSearch}&quot;
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {s.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                            {s.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{s.admissionNumber || s.id}</span>
                            <span>•</span>
                            <span>{s.className} {s.sectionName ? `(${s.sectionName})` : ""}</span>
                            {s.fatherName && <span>• Father: {s.fatherName}</span>}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Select
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Student Banner */}
          {selectedStudent && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedStudent.name?.charAt(0) || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      {selectedStudent.name}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {selectedStudent.admissionNumber || selectedStudent.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Class: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedStudent.className} - {selectedStudent.sectionName || "A"}</span>
                    {selectedStudent.phone && <span> • Phone: {selectedStudent.phone}</span>}
                    {selectedStudent.fatherName && <span> • Guardian: {selectedStudent.fatherName}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Outstanding</div>
                  <div className={`text-lg font-bold ${totalStudentBalanceRupees > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatINR(totalStudentBalanceRupees, false)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fetchStudentDemands(selectedStudent)}
                  title="Reload fee ledger"
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDemands ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Outstanding Fee Demands List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Fee Invoices & Demands
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                      {demands.length} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllUnpaid}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors font-medium"
                    >
                      Select All Due
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {loadingDemands ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-sm">Loading fee schedule...</span>
                  </div>
                ) : demands.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-sm">
                    No fee demands generated for this student yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
                    {demands.map((demand) => {
                      const isSelected = selectedDemandIds.includes(demand.id);
                      const isPaid = demand.balanceAmountPaise <= 0;
                      const isOverdue = demand.status === "OVERDUE";

                      return (
                        <div
                          key={demand.id}
                          onClick={() => !isPaid && toggleDemandSelection(demand.id)}
                          className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                            isPaid
                              ? "bg-slate-50/60 dark:bg-slate-900/30 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 cursor-pointer"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isPaid}
                              onChange={() => !isPaid && toggleDemandSelection(demand.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {demand.feeHeadName}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ({demand.period})
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>Due: {new Date(demand.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                <span>•</span>
                                <span>Gross: {formatINR(demand.grossAmountPaise)}</span>
                                {demand.paidAmountPaise > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-600">Paid: {formatINR(demand.paidAmountPaise)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {formatINR(demand.balanceAmountPaise)}
                              </div>
                              <span
                                className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 ${
                                  isPaid
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                    : isOverdue
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                                    : demand.status === "PARTIAL"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                                }`}
                              >
                                {demand.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotal of Selected Demands */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Selected ({selectedDemandIds.length} invoices):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {formatINR(totalSelectedBalanceRupees, false)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Collection Form */}
            <div className="lg:col-span-5 space-y-4">
              <form
                onSubmit={handleInitiatePayment}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Collection Details
                </h2>

                {/* Amount to Pay */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Amount Paid (₹) <span className="text-rose-500">*</span>
                    </label>
                    {totalSelectedBalanceRupees > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmountPaidRupees(String(totalSelectedBalanceRupees))}
                        className="text-xs text-emerald-600 hover:underline font-medium"
                      >
                        Set Full Due (₹{totalSelectedBalanceRupees})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="0"
                      value={amountPaidRupees}
                      onChange={(e) => setAmountPaidRupees(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"] as PaymentMethod[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                          paymentMethod === mode
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {mode === "BANK_TRANSFER" ? "Bank Transfer" : mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference Number Field */}
                {(paymentMethod === "UPI" ||
                  paymentMethod === "BANK_TRANSFER" ||
                  paymentMethod === "CHEQUE" ||
                  paymentMethod === "CARD" ||
                  paymentMethod === "OTHER") && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      {paymentMethod === "UPI"
                        ? "UPI UTR / Reference No *"
                        : paymentMethod === "CHEQUE"
                        ? "Cheque Number & Bank Name *"
                        : "Reference / Transaction ID"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        paymentMethod === "UPI"
                          ? "e.g. 425619842100"
                          : paymentMethod === "CHEQUE"
                          ? "e.g. CHQ-004120 - SBI"
                          : "Transaction reference number"
                      }
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Payment Date Field */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Remarks Field */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Remarks / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid by father in school office"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Allocation Preview Box */}
                {allocationPlan.length > 0 && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                      <span>Allocation Preview</span>
                      <span>{allocationPlan.length} invoice(s) allocated</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {allocationPlan.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                          <span>
                            {item.demand.feeHeadName} ({item.demand.period})
                          </span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            +₹{item.allocatedRupees}{" "}
                            {item.willBePaid ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-1 py-0.5 rounded font-normal">
                                PAID
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-normal">
                                (Bal: ₹{item.remainingBalanceRupees})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collect Button */}
                <button
                  type="submit"
                  disabled={Number(amountPaidRupees || 0) <= 0 || selectedDemandIds.length === 0}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Receipt className="w-5 h-5" />
                  Review & Collect ₹{amountPaidRupees || 0}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Confirm Fee Collection
                </h3>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Student:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Admission No:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{selectedStudent.admissionNumber || selectedStudent.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Class:</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedStudent.className}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Payment Mode:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{paymentMethod}</span>
                </div>
                {referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reference:</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-900 dark:text-slate-100 font-bold">Total to Collect:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{amountPaidRupees}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                This transaction will create an immutable payment record and generate sequential receipt #{`REC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-XXXX`}.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmAndCollect}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Collecting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Collect
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instant Receipt Modal */}
        <FeeReceiptModal
          payment={issuedPayment}
          schoolName={schoolName}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setIssuedPayment(null);
          }}
        />
      </div>
    </EntitlementGate>
  );
}
