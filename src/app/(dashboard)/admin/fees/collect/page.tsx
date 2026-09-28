"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { getStudents } from "@/lib/services/student.service";
import { getAcademicYears } from "@/lib/services/academic.service";
import {
  getFeeTransactions,
  getFeeStructures,
  getStudentFeeAssignment,
  provisionStudentFeeAssignment,
  collectFeePayment,
} from "@/lib/services/fee.service";
import { formatINR, paiseToRupees } from "@/lib/services/fee-foundation.service";
import {
  Receipt,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  BookOpen,
  MoreHorizontal,
  AlertCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  FileText,
  X,
  ChevronDown,
  User,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Zap,
  Loader2,
  Printer,
} from "lucide-react";
import type { StudentProfile, FeePayment, AcademicYear, StudentFeeAssignment } from "@/types";
import type {
  FeeDemand,
  PaymentMethod,
  FinancialPayment,
  FeeStructureDefinition,
} from "@/types/fee-foundation";
import { toast } from "sonner";

// 12 Academic Session Months (April to March)
const SESSION_MONTHS = [
  { key: "apr", name: "April", monthNum: 4, yearOffset: 0 },
  { key: "may", name: "May", monthNum: 5, yearOffset: 0 },
  { key: "jun", name: "June", monthNum: 6, yearOffset: 0 },
  { key: "jul", name: "July", monthNum: 7, yearOffset: 0 },
  { key: "aug", name: "August", monthNum: 8, yearOffset: 0 },
  { key: "sep", name: "September", monthNum: 9, yearOffset: 0 },
  { key: "oct", name: "October", monthNum: 10, yearOffset: 0 },
  { key: "nov", name: "November", monthNum: 11, yearOffset: 0 },
  { key: "dec", name: "December", monthNum: 12, yearOffset: 0 },
  { key: "jan", name: "January", monthNum: 1, yearOffset: 1 },
  { key: "feb", name: "February", monthNum: 2, yearOffset: 1 },
  { key: "mar", name: "March", monthNum: 3, yearOffset: 1 },
];

type ViewMode = "monthly" | "term" | "custom";
type PaymentMethodTab = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "CARD" | "OTHER";
type DiscountType = "NONE" | "FLAT" | "PERCENTAGE";

interface MonthStatusItem {
  key: string;
  name: string;
  periodLabel: string;
  amountRupees: number;
  status: "PAID" | "DUE" | "PENDING";
  demandId?: string;
  dueDate?: string;
  paidAmountPaise?: number;
  balanceAmountPaise?: number;
}

export default function AdminCollectFeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams?.get("studentId") || "";

  const { profile } = useAuth();
  const effectiveSchoolId =
    profile?.schoolId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("currentSchoolId") || ""
      : "");
  const schoolId = effectiveSchoolId;

  // Session & Academic Years
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [activeSession, setActiveSession] = useState("2026-27");
  const [activeSessionId, setActiveSessionId] = useState("ay_2026_27");

  // Students list & Selection
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Demands & Class Fee Structures
  const [demands, setDemands] = useState<FeeDemand[]>([]);
  const [classStructures, setClassStructures] = useState<FeeStructureDefinition[]>([]);
  const [studentAssignment, setStudentAssignment] = useState<StudentFeeAssignment | null>(null);
  const [loadingDemands, setLoadingDemands] = useState(false);

  // Fee rates auto-assigned for this student
  const [monthlyTuitionRateRupees, setMonthlyTuitionRateRupees] = useState<number>(500);
  const [admissionFeeRateRupees, setAdmissionFeeRateRupees] = useState<number>(1000);
  const [includeAdmissionFee, setIncludeAdmissionFee] = useState<boolean>(false);
  const [admissionFeePaid, setAdmissionFeePaid] = useState<boolean>(false);
  const [admissionFeeDemandId, setAdmissionFeeDemandId] = useState<string | null>(null);

  // View switch: Monthly, Term, Custom
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  // Months selection
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>([]);

  // Fee Details & Discounts
  const [selectedFeeHead, setSelectedFeeHead] = useState<string>("tuition");
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [lateFeeAmountRupees, setLateFeeAmountRupees] = useState<number>(0);

  // Payment Method & Details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodTab>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("500");
  const [isAmountManuallyEdited, setIsAmountManuallyEdited] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  // Modals
  const [submitting, setSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [issuedPayment, setIssuedPayment] = useState<FeePayment | null>(null);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [recentPayments, setRecentPayments] = useState<FeePayment[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // 1. Load initial academic years and students
  useEffect(() => {
    if (!schoolId) return;
    setLoadingStudents(true);

    Promise.all([
      getStudents(schoolId).catch(() => []),
      getAcademicYears(schoolId).catch(() => []),
    ])
      .then(([students, years]) => {
        setStudentsList(students);
        if (years && years.length > 0) {
          setAcademicYears(years);
          const current = years.find((y) => y.isCurrent) || years[0];
          setActiveSession(current.name || "2026-27");
          setActiveSessionId(current.id || "ay_2026_27");
        }

        // If studentId param is passed, preselect that student!
        if (studentIdParam && students.length > 0) {
          const target = students.find(
            (s) =>
              s.id === studentIdParam ||
              s.studentId === studentIdParam ||
              s.admissionNumber === studentIdParam
          );
          if (target) {
            handleSelectStudent(target);
          }
        }
      })
      .catch((err) => {
        console.error("Initial load error:", err);
      })
      .finally(() => setLoadingStudents(false));
  }, [schoolId, studentIdParam]);

  // Load Recent Collections
  const loadRecentCollections = async () => {
    if (!schoolId) return;
    setLoadingRecent(true);
    setShowRecentModal(true);
    try {
      const txs = await getFeeTransactions(schoolId);
      setRecentPayments(txs.slice(0, 20));
    } catch (err) {
      console.error("Failed to load recent collections:", err);
      toast.error("Failed to load recent collections.");
    } finally {
      setLoadingRecent(false);
    }
  };

  // 2. Fetch or auto-assign student's class fee structures and demands
  const loadStudentFeeSchedule = async (student: StudentProfile, sessionId?: string) => {
    if (!schoolId || !student?.id) return;
    setLoadingDemands(true);
    setSelectedMonthKeys([]);
    setIncludeAdmissionFee(false);
    setIsAmountManuallyEdited(false);

    const targetSessionId = sessionId || activeSessionId;

    try {
      // Step A: Load active fee structures for this school & student's class
      let monthlyRate = 500;
      let admissionRate = 1000;

      try {
        let structures = await getFeeStructures(schoolId, targetSessionId);
        if (!structures || structures.length === 0) {
          structures = await getFeeStructures(schoolId);
        }
        if (structures && structures.length > 0) {
          const cleanStudentClass = (student.className || "").toLowerCase().replace(/^(class|grade)\s*/i, "").trim();

          const classStructs = structures.filter((s) => {
            const sc = (s.className || "").toLowerCase().replace(/^(class|grade)\s*/i, "").trim();
            return sc === "all" || sc === "any" || sc === cleanStudentClass || s.className === student.className;
          });

          const tuitionStruct = classStructs.find(
            (s) => s.frequency === "monthly" || s.feeType === "tuition" || s.title?.toLowerCase().includes("tuition")
          ) || structures.find((s) => s.frequency === "monthly");

          if (tuitionStruct && tuitionStruct.amountPaise) {
            monthlyRate = tuitionStruct.amountPaise / 100;
          }

          const admissionStruct = classStructs.find(
            (s) => s.frequency === "one_time" || s.feeType === "admission" || s.title?.toLowerCase().includes("admission")
          );
          if (admissionStruct && admissionStruct.amountPaise) {
            admissionRate = admissionStruct.amountPaise / 100;
          }
        }
      } catch (err) {
        console.warn("Could not fetch class structures, using defaults:", err);
      }

      setMonthlyTuitionRateRupees(monthlyRate);
      setAdmissionFeeRateRupees(admissionRate);

      // Step B: Load or provision student's authoritative fee assignment (April to March)
      let assignment: StudentFeeAssignment | null = null;
      try {
        assignment = await getStudentFeeAssignment(schoolId, student.id, targetSessionId);

        // Check if assignment needs repair (missing, empty, zero rates, or falsely marked PAID months without real payment)
        const needsRepair =
          !assignment ||
          !assignment.monthLedger ||
          assignment.monthLedger.length === 0 ||
          assignment.monthLedger.some(
            (l) =>
              (l.amountPaise === 0 && monthlyRate > 0) ||
              (l.status === "PAID" &&
                (l.paidAmountPaise || 0) === 0 &&
                (!l.receiptNumbers || l.receiptNumbers.length === 0))
          );

        if (needsRepair) {
          assignment = await provisionStudentFeeAssignment(
            schoolId,
            {
              id: student.id,
              name: student.name,
              admissionNumber: student.admissionNumber || student.id,
              className: student.className || "Class",
              sectionName: student.sectionName || "A",
            },
            targetSessionId,
            monthlyRate
          );
        }
      } catch (assignErr) {
        console.warn("Student assignment lookup/provision note:", assignErr);
      }

      setStudentAssignment(assignment);

      // Check admission fee status
      const hasPaidAdmission =
        assignment?.monthLedger?.some(
          (l) =>
            l.month.toLowerCase().includes("admission") &&
            ((l.paidAmountPaise || 0) > 0 || (l.receiptNumbers && l.receiptNumbers.length > 0))
        ) || false;
      setAdmissionFeePaid(hasPaidAdmission);

      // Step C: Auto-select initial unpaid due month
      const firstDueMonth = SESSION_MONTHS.find((m) => {
        const item = assignment?.monthLedger?.find((l) =>
          l.month.toLowerCase().startsWith(m.name.toLowerCase())
        );
        if (item) {
          const isPaid =
            (item.paidAmountPaise > 0 && item.pendingAmountPaise <= 0) ||
            (item.receiptNumbers && item.receiptNumbers.length > 0);
          return !isPaid && item.pendingAmountPaise > 0;
        }
        return true;
      });

      if (firstDueMonth) {
        setSelectedMonthKeys([firstDueMonth.key]);
      } else {
        setSelectedMonthKeys(["apr"]);
      }
    } catch (err: any) {
      console.error("loadStudentFeeSchedule error:", err);
      toast.error(err.message || "Failed to load fee schedule.");
    } finally {
      setLoadingDemands(false);
    }
  };

  const handleSelectStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    setShowStudentModal(false);
    setStudentSearch("");
    loadStudentFeeSchedule(student);
  };

  // 3. Compute 12 Months Status Array
  const startSessionYear = parseInt(activeSession.slice(0, 4)) || 2026;
  const now = new Date();

  const monthsStatusList: MonthStatusItem[] = useMemo(() => {
    return SESSION_MONTHS.map((m, idx) => {
      const year = startSessionYear + m.yearOffset;
      const periodLabel = `${m.name} ${year}`;

      // Check studentAssignment.monthLedger first
      const ledgerItem = studentAssignment?.monthLedger?.find((l) =>
        l.month.toLowerCase().startsWith(m.name.toLowerCase())
      );

      // Check if existing demand matches this month as secondary
      const matchedDemand = demands.find(
        (d) =>
          d.period?.toLowerCase().includes(m.name.toLowerCase()) ||
          d.period?.toLowerCase().includes(m.key)
      );

      let status: "PAID" | "DUE" | "PENDING" = "PENDING";
      let amountRupees = monthlyTuitionRateRupees;
      let demandId: string | undefined = matchedDemand?.id;
      let dueDate: string | undefined = ledgerItem?.dueDate || matchedDemand?.dueDate;
      let paidAmountPaise = 0;
      let balanceAmountPaise = monthlyTuitionRateRupees * 100;

      if (ledgerItem) {
        amountRupees = ledgerItem.amountPaise > 0 ? ledgerItem.amountPaise / 100 : monthlyTuitionRateRupees;
        paidAmountPaise = ledgerItem.paidAmountPaise || 0;

        const isActuallyPaid =
          (paidAmountPaise > 0 && (ledgerItem.pendingAmountPaise <= 0 || paidAmountPaise >= amountRupees * 100)) ||
          (Array.isArray(ledgerItem.receiptNumbers) && ledgerItem.receiptNumbers.length > 0) ||
          (Array.isArray(ledgerItem.paymentIds) && ledgerItem.paymentIds.length > 0);

        if (isActuallyPaid) {
          status = "PAID";
          balanceAmountPaise = 0;
          paidAmountPaise = paidAmountPaise > 0 ? paidAmountPaise : amountRupees * 100;
        } else {
          balanceAmountPaise = Math.max(0, amountRupees * 100 - paidAmountPaise);
          const monthDueTime = ledgerItem.dueDate
            ? new Date(ledgerItem.dueDate).getTime()
            : new Date(year, m.monthNum - 1, 10).getTime();
          status = monthDueTime < now.getTime() ? "DUE" : "PENDING";
        }
      } else if (matchedDemand) {
        demandId = matchedDemand.id;
        dueDate = matchedDemand.dueDate;
        amountRupees =
          paiseToRupees(matchedDemand.grossAmountPaise || matchedDemand.netAmountPaise) || monthlyTuitionRateRupees;
        paidAmountPaise = matchedDemand.paidAmountPaise || 0;

        const isActuallyPaid =
          (matchedDemand.status === "PAID" && paidAmountPaise > 0) ||
          (matchedDemand.balanceAmountPaise <= 0 && paidAmountPaise > 0);

        if (isActuallyPaid) {
          status = "PAID";
          balanceAmountPaise = 0;
        } else {
          balanceAmountPaise = matchedDemand.balanceAmountPaise || amountRupees * 100;
          status = new Date(matchedDemand.dueDate).getTime() < now.getTime() ? "DUE" : "PENDING";
        }
      } else {
        // Virtual schedule based on calendar date
        const monthDueDate = new Date(year, m.monthNum - 1, 10);
        dueDate = monthDueDate.toISOString();
        balanceAmountPaise = amountRupees * 100;
        status = monthDueDate.getTime() < now.getTime() ? "DUE" : "PENDING";
      }

      return {
        key: m.key,
        name: m.name,
        periodLabel,
        amountRupees,
        status,
        demandId,
        dueDate,
        paidAmountPaise,
        balanceAmountPaise,
      };
    });
  }, [studentAssignment, demands, startSessionYear, monthlyTuitionRateRupees]);

  // Months due count for badge
  const dueMonthsCount = useMemo(() => {
    return monthsStatusList.filter((m) => m.status === "DUE").length;
  }, [monthsStatusList]);

  // Toggle single month selection
  const toggleMonth = (monthKey: string) => {
    const monthItem = monthsStatusList.find((m) => m.key === monthKey);
    if (monthItem?.status === "PAID") {
      toast.info(`${monthItem.name} fee is already paid!`);
      return;
    }

    setSelectedMonthKeys((prev) => {
      const exists = prev.includes(monthKey);
      const next = exists ? prev.filter((k) => k !== monthKey) : [...prev, monthKey];
      return next;
    });
    setIsAmountManuallyEdited(false);
  };

  // Select Term (Quarter)
  const selectTerm = (quarterIdx: number) => {
    const termMonths = [
      ["apr", "may", "jun"],
      ["jul", "aug", "sep"],
      ["oct", "nov", "dec"],
      ["jan", "feb", "mar"],
    ][quarterIdx];

    if (!termMonths) return;

    setSelectedMonthKeys((prev) => {
      const unpaidKeys = termMonths.filter(
        (k) => monthsStatusList.find((m) => m.key === k)?.status !== "PAID"
      );
      // Toggle
      const allSelected = unpaidKeys.every((k) => prev.includes(k));
      if (allSelected) {
        return prev.filter((k) => !termMonths.includes(k));
      } else {
        return Array.from(new Set([...prev, ...unpaidKeys]));
      }
    });
    setIsAmountManuallyEdited(false);
  };

  // Clear all selected months
  const clearAllSelected = () => {
    setSelectedMonthKeys([]);
    setIncludeAdmissionFee(false);
    setIsAmountManuallyEdited(false);
  };

  // 4. Financial Calculations
  const calculatedFeeAmount = useMemo(() => {
    let total = 0;
    for (const key of selectedMonthKeys) {
      const m = monthsStatusList.find((item) => item.key === key);
      total += m ? m.amountRupees : monthlyTuitionRateRupees;
    }
    if (includeAdmissionFee && !admissionFeePaid) {
      total += admissionFeeRateRupees;
    }
    return total;
  }, [selectedMonthKeys, monthsStatusList, monthlyTuitionRateRupees, includeAdmissionFee, admissionFeePaid, admissionFeeRateRupees]);

  const calculatedDiscount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (discountType === "FLAT") {
      return Math.min(val, calculatedFeeAmount);
    }
    if (discountType === "PERCENTAGE") {
      return Math.round((calculatedFeeAmount * Math.min(val, 100)) / 100);
    }
    return 0;
  }, [discountType, discountValue, calculatedFeeAmount]);

  const totalPayable = useMemo(() => {
    return Math.max(0, calculatedFeeAmount - calculatedDiscount + lateFeeAmountRupees);
  }, [calculatedFeeAmount, calculatedDiscount, lateFeeAmountRupees]);

  // Keep Received Amount in sync with Total Payable unless user manually modified it
  useEffect(() => {
    if (!isAmountManuallyEdited) {
      setReceivedAmount(String(totalPayable));
    }
  }, [totalPayable, isAmountManuallyEdited]);

  // Reset form
  const handleResetForm = () => {
    setSelectedMonthKeys(["sep"]);
    setIncludeAdmissionFee(false);
    setDiscountType("NONE");
    setDiscountValue("0");
    setLateFeeAmountRupees(0);
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setRemarks("");
    setIsAmountManuallyEdited(false);
    toast.info("Form reset to default.");
  };

  // 5. Submit Payment & Generate Receipt
  const handleCollectFee = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      setShowStudentModal(true);
      return;
    }

    if (selectedMonthKeys.length === 0 && !includeAdmissionFee) {
      toast.error("Please select at least one month or admission fee to collect.");
      return;
    }

    const payAmount = Number(receivedAmount);
    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("Please enter a valid received amount greater than ₹0.");
      return;
    }

    if (paymentMethod === "UPI" && !referenceNumber.trim()) {
      toast.error("Please enter UTR / Reference number for UPI payment.");
      return;
    }

    if (paymentMethod === "CHEQUE" && !referenceNumber.trim()) {
      toast.error("Please enter Cheque Number & Bank name.");
      return;
    }

    setSubmitting(true);

    try {
      const methodMap: Record<PaymentMethodTab, FeePayment["paymentMethod"]> = {
        CASH: "Cash",
        UPI: "UPI",
        BANK_TRANSFER: "Bank Transfer",
        CHEQUE: "Cheque",
        CARD: "Card",
        OTHER: "Other",
      };

      const selectedMonthsNames = selectedMonthKeys.map(
        (k) => monthsStatusList.find((m) => m.key === k)?.periodLabel || k
      );
      if (includeAdmissionFee && !admissionFeePaid) {
        selectedMonthsNames.push("Admission Fee");
      }

      const result = await collectFeePayment(
        schoolId,
        {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          admissionNumber: selectedStudent.admissionNumber || selectedStudent.id,
          className: selectedStudent.className || "Class",
          sectionName: selectedStudent.sectionName || "A",
          academicYearId: activeSessionId,
          feeType: includeAdmissionFee && selectedMonthKeys.length === 0 ? "admission" : "tuition",
          periodMonths: selectedMonthsNames,
          amountPaidRupees: payAmount,
          discountRupees: calculatedDiscount,
          paymentMethod: methodMap[paymentMethod] || "Cash",
          transactionRef: referenceNumber.trim(),
          remarks:
            remarks.trim() ||
            `Fee Collection for ${selectedMonthsNames.join(", ")}`,
          paymentDate: paymentDate || new Date().toISOString(),
        },
        profile?.uid || profile?.name || "admin"
      );

      toast.success(`Fee collected successfully! Receipt #${result.receiptNumber}`);
      setIssuedPayment(result.payment);
      setShowReceiptModal(true);

      // Refresh student fee schedule so newly paid months turn Green
      await loadStudentFeeSchedule(selectedStudent);
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err.message || "An error occurred while collecting fees.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students in search modal
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsList.slice(0, 20);
    const q = studentSearch.toLowerCase().trim();
    return studentsList
      .filter(
        (s) =>
          String(s.name || "").toLowerCase().includes(q) ||
          String(s.admissionNumber || "").toLowerCase().includes(q) ||
          String(s.studentId || "").toLowerCase().includes(q) ||
          (s.rollNumber !== undefined && String(s.rollNumber) === q) ||
          String(s.className || "").toLowerCase().includes(q) ||
          String(s.fatherName || "").toLowerCase().includes(q) ||
          String(s.phone || "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [studentsList, studentSearch]);

  return (
    <EntitlementGate feature="fee_collect" title="Collect Fee" requiredPlan="Professional Plan">
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ========================================================
            1. TOP BAR (Matching Image: Collect Fee, Back, View Recent)
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/admin/fees"
              className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
              title="Back to Fees"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Collect Fee
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Collect, adjust and generate receipts for student fees
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRecentCollections}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm"
          >
            <Clock className="w-4 h-4 text-slate-500" />
            <span>View Recent Collections</span>
          </button>
        </div>

        {/* ========================================================
            2. STUDENT HEADER CARD (Matching Image)
        ======================================================== */}
        {selectedStudent ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                {selectedStudent.name
                  ? selectedStudent.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "AS"}
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {selectedStudent.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  <span className="font-mono font-semibold">
                    {selectedStudent.admissionNumber || `ADM-${selectedStudent.id?.slice(-4)}`}
                  </span>{" "}
                  • Class:{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudent.className} {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ""}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Father:{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {selectedStudent.fatherName || "Rajesh Singh"}
                  </span>{" "}
                  • Mobile:{" "}
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {selectedStudent.phone || "9876543210"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Active Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                Active
              </span>

              {/* Regular Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                <Zap className="w-3.5 h-3.5" />
                Regular
              </span>

              {/* Dues Status Badge */}
              {dueMonthsCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <Calendar className="w-3.5 h-3.5" />
                  {dueMonthsCount} Months Due
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All Dues Clear
                </span>
              )}

              {/* Change Student Button */}
              <button
                type="button"
                onClick={() => setShowStudentModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-bold text-blue-600 dark:text-blue-400 transition-all shadow-sm active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change Student</span>
              </button>
            </div>
          </div>
        ) : (
          /* Blank state: Prompt to select student */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              No Student Selected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Please search and select a student to load their class fee schedule, calculate monthly dues from April to March, and record fee collections.
            </p>
            <button
              type="button"
              onClick={() => setShowStudentModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Select Student</span>
            </button>
          </div>
        )}

        {/* ========================================================
            3. MAIN TWO-COLUMN CONTENT AREA (When Student Selected)
        ======================================================== */}
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ----------------------------------------------------
                LEFT COLUMN (Select Months / Fees & Payment Method)
            ---------------------------------------------------- */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* CARD A: SELECT MONTHS / FEES */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
                
                {/* Header with Title and Session Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Select Months / Fees
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Session:</span>
                    <select
                      value={activeSession}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setActiveSession(newName);
                        const matched = academicYears.find((y) => y.name === newName);
                        if (matched) setActiveSessionId(matched.id);
                        if (selectedStudent) loadStudentFeeSchedule(selectedStudent, matched?.id);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                    >
                      {academicYears.length > 0 ? (
                        academicYears.map((ay) => (
                          <option key={ay.id} value={ay.name}>
                            {ay.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="2026-27">2026-27</option>
                          <option value="2025-26">2025-26</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* View Switcher: Monthly View | Term View | Custom + Quick Selection Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("monthly")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        viewMode === "monthly"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Monthly View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("term")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        viewMode === "term"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Term View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("custom")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        viewMode === "custom"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Quick Month Selection Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const unpaidDue = monthsStatusList.filter((m) => m.status === "DUE").map((m) => m.key);
                        if (unpaidDue.length > 0) {
                          setSelectedMonthKeys(unpaidDue);
                        } else {
                          const allUnpaid = monthsStatusList.filter((m) => m.status !== "PAID").map((m) => m.key);
                          setSelectedMonthKeys(allUnpaid);
                        }
                        setIsAmountManuallyEdited(false);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 text-xs font-bold text-blue-700 dark:text-blue-300 transition-all"
                    >
                      Select All Due {dueMonthsCount > 0 ? `(${dueMonthsCount})` : ""}
                    </button>
                    {selectedMonthKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllSelected}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all"
                      >
                        Clear Selection ({selectedMonthKeys.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* OPTIONAL ADMISSION FEE CARD (As requested by user: admission fee bhi optional add kar dena) */}
                <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  admissionFeePaid
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    : includeAdmissionFee
                    ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-500 shadow-sm"
                    : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="opt_admission_fee"
                      checked={admissionFeePaid || includeAdmissionFee}
                      disabled={admissionFeePaid}
                      onChange={(e) => {
                        setIncludeAdmissionFee(e.target.checked);
                        setIsAmountManuallyEdited(false);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <label htmlFor="opt_admission_fee" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          One-time Admission Fee
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          Optional Add
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        New enrollment or session registration charges for {selectedStudent.className}
                      </p>
                    </label>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{admissionFeeRateRupees.toLocaleString("en-IN")}
                    </span>
                    <div className="mt-0.5">
                      {admissionFeePaid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <Check className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {includeAdmissionFee ? "Selected" : "Not Included"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* TERM VIEW TABS (If Term View selected) */}
                {viewMode === "term" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {[
                      { name: "Term 1 (Apr - Jun)", idx: 0 },
                      { name: "Term 2 (Jul - Sep)", idx: 1 },
                      { name: "Term 3 (Oct - Dec)", idx: 2 },
                      { name: "Term 4 (Jan - Mar)", idx: 3 },
                    ].map((term) => (
                      <button
                        key={term.name}
                        type="button"
                        onClick={() => selectTerm(term.idx)}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 text-xs font-bold text-slate-800 dark:text-white text-center transition-all shadow-sm"
                      >
                        {term.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* 12 MONTHS GRID (Matching Image: April to March Academic Order) */}
                {loadingDemands ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-xs font-semibold">Calculating student class fee schedule...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {monthsStatusList.map((m) => {
                      const isSelected = selectedMonthKeys.includes(m.key);
                      const isPaid = m.status === "PAID";
                      const isDue = m.status === "DUE";

                      return (
                        <div
                          key={m.key}
                          onClick={() => toggleMonth(m.key)}
                          className={`relative p-4 rounded-2xl border transition-all select-none cursor-pointer ${
                            isPaid
                              ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-75 cursor-default"
                              : isSelected
                              ? "bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-600 dark:border-blue-500 shadow-sm"
                              : "bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          {/* Top Row: Month Name + Checkbox */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {m.name}
                            </span>
                            <input
                              type="checkbox"
                              checked={isPaid || isSelected}
                              disabled={isPaid}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleMonth(m.key);
                              }}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Middle: Amount per month */}
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                            ₹{m.amountRupees.toLocaleString("en-IN")}
                          </div>

                          {/* Bottom: Status Indicator */}
                          <div className="mt-2.5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Paid
                              </span>
                            ) : isDue ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CARD B: PAYMENT METHOD (Matching Image) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Payment Method
                  </h3>
                </div>

                {/* Method Switcher Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { key: "CASH", label: "Cash", icon: Banknote },
                    { key: "UPI", label: "UPI", icon: QrCode },
                    { key: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
                    { key: "CHEQUE", label: "Cheque", icon: BookOpen },
                    { key: "CARD", label: "Card", icon: CreditCard },
                    { key: "OTHER", label: "Other", icon: MoreHorizontal },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isActive = paymentMethod === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key as PaymentMethodTab)}
                        className={`py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95"
                            : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input Fields Row: Received Amount, Ref No, Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Received Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Received Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => {
                          setReceivedAmount(e.target.value);
                          setIsAmountManuallyEdited(true);
                        }}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="500"
                      />
                    </div>
                  </div>

                  {/* Reference No */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Reference No. (Optional)
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder={
                        paymentMethod === "UPI"
                          ? "Enter UPI UTR / Txn Ref"
                          : paymentMethod === "CHEQUE"
                          ? "Cheque No. & Bank Name"
                          : "Enter reference no."
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add any remarks..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

            </div>

            {/* ----------------------------------------------------
                RIGHT COLUMN (Fee Details, Payment Summary & Action)
            ---------------------------------------------------- */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* CARD C: FEE DETAILS */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Fee Details
                  </h3>
                </div>

                {/* Selected Months Tags */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Selected Months
                    </span>
                    {(selectedMonthKeys.length > 0 || includeAdmissionFee) && (
                      <button
                        type="button"
                        onClick={clearAllSelected}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {selectedMonthKeys.length === 0 && !includeAdmissionFee ? (
                      <span className="text-xs text-slate-400 italic">No months selected</span>
                    ) : (
                      <>
                        {includeAdmissionFee && !admissionFeePaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Admission Fee
                            <button
                              type="button"
                              onClick={() => setIncludeAdmissionFee(false)}
                              className="hover:text-rose-500 ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {selectedMonthKeys.map((key) => {
                          const item = monthsStatusList.find((m) => m.key === key);
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            >
                              {item?.periodLabel || key}
                              <button
                                type="button"
                                onClick={() => toggleMonth(key)}
                                className="hover:text-rose-500 ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* Fee Head Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fee Head
                  </label>
                  <select
                    value={selectedFeeHead}
                    onChange={(e) => setSelectedFeeHead(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tuition">Tuition Fee (₹{monthlyTuitionRateRupees}/month)</option>
                    <option value="admission">Admission Fee (₹{admissionFeeRateRupees} one-time)</option>
                    <option value="all">All Fee Heads</option>
                  </select>
                </div>

                {/* Amount per Month */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Amount per Month
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={monthlyTuitionRateRupees}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white select-none"
                    />
                  </div>
                </div>

                {/* Discount / Concession */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Discount / Concession
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NONE">No Discount</option>
                      <option value="FLAT">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {discountType === "PERCENTAGE" ? "%" : "₹"}
                      </span>
                      <input
                        type="number"
                        disabled={discountType === "NONE"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Late Fee (if applicable) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Late Fee (if applicable)
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      ₹ {lateFeeAmountRupees}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {lateFeeAmountRupees > 0 ? "Applied" : "Not Applicable"}
                    </span>
                  </div>
                </div>

                {/* Total Amount Pill */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Total Amount
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-sm">
                    ₹{calculatedFeeAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* CARD D: PAYMENT SUMMARY */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Payment Summary
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Fee Amount</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{calculatedFeeAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Discount</span>
                    <span className="font-bold text-emerald-600">
                      - ₹{calculatedDiscount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Late Fee</span>
                    <span className="font-bold text-rose-600">
                      + ₹{lateFeeAmountRupees.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      Total Payable
                    </span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      ₹{totalPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD E: BOTTOM ACTION BAR */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Reset form"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || (selectedMonthKeys.length === 0 && !includeAdmissionFee)}
                  onClick={handleCollectFee}
                  className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Collect Fee & Generate Receipt</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            MODAL 1: SELECT / CHANGE STUDENT MODAL
        ======================================================== */}
        {showStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Select Student
                  </h3>
                  <p className="text-xs text-slate-500">
                    Search by Name, Roll No, Admission No, Class, or Father Name
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type student name or admission number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Student Results List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    No students found matching &quot;{studentSearch}&quot;
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
                          {s.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            {s.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {s.admissionNumber || s.id} • Class:{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {s.className}
                            </span>
                            {s.fatherName && ` • Father: ${s.fatherName}`}
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all">
                        Select
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 2: RECENT COLLECTIONS MODAL
        ======================================================== */}
        {showRecentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Recent Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Latest fee transactions recorded for this school
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecentModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingRecent ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <span className="text-xs">Loading recent receipts...</span>
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No collections recorded yet.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {recentPayments.map((p) => (
                    <div
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600">
                            {p.receiptNumber}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {p.studentName}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {p.className} • Mode: {p.paymentMethod} •{" "}
                          {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 dark:text-white">
                          ₹{((p.amountPaidPaise || 0) / 100).toLocaleString("en-IN")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIssuedPayment(p);
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL 3: FEE RECEIPT MODAL
        ======================================================== */}
        {showReceiptModal && issuedPayment && (
          <FeeReceiptModal
            isOpen={showReceiptModal}
            onClose={() => setShowReceiptModal(false)}
            payment={issuedPayment}
          />
        )}

      </div>
    </EntitlementGate>
  );
}
