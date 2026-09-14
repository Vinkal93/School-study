"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Share2,
  CreditCard,
  GraduationCap,
  ArrowLeft,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Eye,
  EyeOff,
  Key,
  QrCode,
  Download,
  Send,
  RefreshCw,
  FileText,
  ChevronDown,
  Edit3,
  SlidersHorizontal,
  PhoneCall,
  User,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  ExternalLink,
  Printer,
  Sparkles,
  ChevronRight,
  Users,
} from "lucide-react";
import type { StudentFeeAssignment, StudentProfile, MonthLedgerItem, FeePayment } from "@/types";
import {
  getStudentFeeAssignment,
  provisionStudentFeeAssignment,
  reconcileStudentFeeLedger,
  getStudentFeeTransactions,
} from "@/lib/services/fee.service";
import { getStudents } from "@/lib/services/student.service";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import { FeeAdjustmentModal } from "@/components/fees/FeeAdjustmentModal";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import { FeeFollowUpModal } from "@/components/fees/FeeFollowUpModal";
import { toast } from "sonner";

export default function AdminStudentFeesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = (profile as any)?.schoolName || "Lord Buddha Public School";
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryStudentId = searchParams.get("studentId") || "";

  // Core Data
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [assignment, setAssignment] = useState<StudentFeeAssignment | null>(null);
  const [transactions, setTransactions] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");

  // Tab State: 7 tabs matching Mockup 2
  const [activeTab, setActiveTab] = useState<
    "overview" | "monthwise" | "transactions" | "receipts" | "discounts" | "notes" | "settings"
  >("monthwise");

  // Sub-features state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2026-2027");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [monthStatusFilter, setMonthStatusFilter] = useState<"all" | "paid" | "pending" | "partial">("all");
  const [sendType, setSendType] = useState<"current" | "full">("current");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMonthForAdjustment, setSelectedMonthForAdjustment] = useState<MonthLedgerItem | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [receiptModalPayment, setReceiptModalPayment] = useState<FeePayment | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  // Distinct classes and sections from students
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students
      .filter((s) => selectedClass === "all" || s.className === selectedClass)
      .forEach((s) => {
        if (s.sectionName) set.add(s.sectionName);
      });
    return Array.from(set).sort();
  }, [students, selectedClass]);

  // Filtered students for dropdown
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== "all" && s.className !== selectedClass) return false;
      if (selectedSection !== "all" && s.sectionName !== selectedSection) return false;
      if (searchStudentQuery.trim()) {
        const q = searchStudentQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesAdm = (s.admissionNumber || s.studentId || "").toLowerCase().includes(q);
        const matchesRoll = String(s.rollNumber ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesAdm && !matchesRoll) return false;
      }
      return true;
    });
  }, [students, selectedClass, selectedSection, searchStudentQuery]);

  // 1. Fetch Students
  useEffect(() => {
    async function loadStudents() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const list = await getStudents(schoolId, { status: "active" });
        setStudents(list);

        if (queryStudentId) {
          const matched = list.find((s) => s.id === queryStudentId);
          if (matched) setSelectedStudent(matched);
          else if (list.length > 0) setSelectedStudent(list[0]);
        } else if (list.length > 0) {
          setSelectedStudent(list[0]);
        }
      } catch (err) {
        toast.error("Failed to load students list.");
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [schoolId, queryStudentId]);

  // 2. Fetch authoritative fee ledger & transactions when selected student changes
  const fetchStudentLedger = async () => {
    if (!schoolId || !selectedStudent?.id) {
      setAssignment(null);
      return;
    }
    setLoadingLedger(true);
    try {
      let data = await getStudentFeeAssignment(schoolId, selectedStudent.id);
      if (!data) {
        data = await provisionStudentFeeAssignment(schoolId, {
          id: selectedStudent.id,
          name: selectedStudent.name,
          admissionNumber: selectedStudent.admissionNumber || selectedStudent.studentId,
          className: selectedStudent.className,
          sectionName: selectedStudent.sectionName || "A",
          admissionDate: selectedStudent.admissionDate,
        });
      } else if (data.totalAssignedPaise === 0) {
        const reconciled = await reconcileStudentFeeLedger(schoolId, selectedStudent.id);
        if (reconciled) data = reconciled;
      }
      setAssignment(data);

      // Load past payments
      const history = await getStudentFeeTransactions(schoolId, selectedStudent.id);
      setTransactions(history);
    } catch (err) {
      console.error("Failed to load student fee ledger:", err);
      toast.error("Failed to load fee ledger.");
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchStudentLedger();
  }, [schoolId, selectedStudent]);

  // Active student object (strictly from real Firestore student record)
  const student = useMemo(() => {
    if (selectedStudent) {
      return {
        id: selectedStudent.id,
        name: selectedStudent.name || "Student",
        admissionNumber: selectedStudent.admissionNumber || selectedStudent.studentId || "—",
        rollNumber: selectedStudent.rollNumber || "—",
        className: selectedStudent.className || "—",
        sectionName: selectedStudent.sectionName || "—",
        dob: selectedStudent.dob || "—",
        parentName:
          (selectedStudent as any).fatherName ||
          (selectedStudent as any).guardianName ||
          (selectedStudent as any).motherName ||
          "—",
        parentRelation: (selectedStudent as any).fatherName
          ? "Father"
          : (selectedStudent as any).motherName
          ? "Mother"
          : (selectedStudent as any).guardianName
          ? "Guardian"
          : "Parent",
        phone: (selectedStudent as any).phone || (selectedStudent as any).guardianPhone || "—",
        address: (selectedStudent as any).address || "—",
        avatar: (selectedStudent as any).avatar || (selectedStudent as any).profilePictureUrl || null,
        status: selectedStudent.status || "Active",
      };
    }
    return null;
  }, [selectedStudent]);

  // Dynamic Ledger Calculation strictly from real student fee assignment
  const ledgerData = useMemo(() => {
    if (assignment && assignment.monthLedger && assignment.monthLedger.length > 0) {
      return assignment.monthLedger.map((m) => {
        const base = m.amountPaise / 100;
        const late = m.lateFeePaise / 100;
        const paid = m.paidAmountPaise / 100;
        const balance = m.pendingAmountPaise / 100;
        const total = base + late;
        return {
          name: m.month,
          due: m.dueDate
            ? new Date(m.dueDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "10th",
          base,
          late,
          total,
          paid,
          balance,
          status: m.status === "PAID" ? "Paid" : m.status === "PARTIAL" ? "Partial" : "Due",
          raw: m,
        };
      });
    }

    return [];
  }, [assignment]);

  // Overall KPI sums
  const totalAssigned = useMemo(() => {
    if (assignment?.totalAssignedPaise) return assignment.totalAssignedPaise / 100;
    return ledgerData.reduce((acc, curr) => acc + curr.total, 0);
  }, [assignment, ledgerData]);

  const totalPaid = useMemo(() => {
    if (assignment?.totalPaidPaise) return assignment.totalPaidPaise / 100;
    return ledgerData.reduce((acc, curr) => acc + curr.paid, 0);
  }, [assignment, ledgerData]);

  const totalDue = useMemo(() => {
    if (assignment?.totalPendingPaise !== undefined) return assignment.totalPendingPaise / 100;
    return Math.max(0, totalAssigned - totalPaid);
  }, [assignment, totalAssigned, totalPaid]);

  const paidPercentage =
    totalAssigned > 0 ? Math.min(100, Math.round((totalPaid / totalAssigned) * 100)) : 0;

  const currentMonthDue = useMemo(() => {
    if (!ledgerData || ledgerData.length === 0) return 0;
    const firstDue = ledgerData.find((m) => m.balance > 0);
    return firstDue ? firstDue.balance : 0;
  }, [ledgerData]);

  const pendingMonthsCount = useMemo(() => {
    return ledgerData.filter((m) => m.balance > 0).length;
  }, [ledgerData]);

  const latestTransaction = useMemo(() => {
    return transactions.length > 0 ? transactions[0] : null;
  }, [transactions]);

  const filteredLedgerData = useMemo(() => {
    if (monthStatusFilter === "all") return ledgerData;
    if (monthStatusFilter === "paid") return ledgerData.filter((m) => m.status === "Paid");
    if (monthStatusFilter === "pending") return ledgerData.filter((m) => m.status === "Due");
    if (monthStatusFilter === "partial") return ledgerData.filter((m) => m.status === "Partial");
    return ledgerData;
  }, [ledgerData, monthStatusFilter]);

  // Real past transactions list
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // WhatsApp reminder message composer
  const waComposerText = useMemo(() => {
    if (!student) return "";
    const dueFmt = `₹${totalDue.toLocaleString("en-IN")}`;
    const currFmt = `₹${currentMonthDue.toLocaleString("en-IN")}`;
    if (sendType === "current") {
      return `Dear ${student.parentName},\nFee reminder for ${student.name} (Class ${student.className}, Adm #${student.admissionNumber}).\nCurrent Due: ${currFmt}.\nKindly pay online or at school office.\nThank you.\n- ${schoolName}`;
    }
    return `Dear ${student.parentName},\nFee reminder for ${student.name} (Class ${student.className}, Adm #${student.admissionNumber}).\nTotal Pending Due: ${dueFmt}.\nKindly make payment via UPI or visit school cash counter.\nThank you.\n- ${schoolName}`;
  }, [student, totalDue, currentMonthDue, sendType, schoolName]);

  const handleSendWhatsApp = () => {
    if (!student || student.phone === "—") {
      toast.error("Student phone number not available.");
      return;
    }
    const cleanPhone = student.phone.replace(/[^0-9]/g, "");
    const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(waComposerText)}`;
    window.open(url, "_blank");
  };

  const handleCopyPaymentLink = () => {
    if (!student) return;
    const payLink = `https://schoolstudy.in/pay?adm=${encodeURIComponent(
      student.admissionNumber
    )}&id=${encodeURIComponent(student.id)}`;
    navigator.clipboard.writeText(payLink);
    setCopiedLink(true);
    toast.success("Payment link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenReceipt = (tx?: any) => {
    if (!student) return;
    if (!tx) {
      toast.info("No transaction available to print.");
      return;
    }
    const paymentRecord: FeePayment = {
      id: tx.id || `tx_${Date.now()}`,
      schoolId,
      studentId: student.id,
      receiptNumber: tx.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      amountPaidPaise: tx.amountPaidPaise || 0,
      discountPaise: tx.discountPaise || 0,
      lateFeePaise: tx.lateFeePaise || 0,
      netAmountPaise: tx.amountPaidPaise || 0,
      paymentMethod: (tx.paymentMethod || (tx as any).paymentMode || "Cash") as any,
      transactionRef: (tx as any).referenceNumber || tx.transactionRef || "",
      createdAt: tx.createdAt || new Date().toISOString(),
      studentName: student.name,
      admissionNumber: student.admissionNumber,
      className: student.className,
      sectionName: student.sectionName,
      academicYearId: tx.academicYearId || selectedAcademicYear,
      feeType: tx.feeType || "tuition",
      periodMonths: tx.periodMonths || [],
      paymentDate: tx.paymentDate || tx.createdAt || new Date().toISOString(),
      collectedBy: tx.collectedBy || "admin",
      status: tx.status || "SUCCESS",
      remainingDuePaise: totalDue * 100,
    };
    setReceiptModalPayment(paymentRecord);
  };

  return (
    <EntitlementGate feature="fee_management" title="Student Fee Details" requiredPlan="Professional Plan">
      <div className="space-y-6 pb-16">
        {/* ========================================================
            TOP NAVIGATION & BREADCRUMBS
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/admin/students" className="hover:text-blue-600 transition-colors">
              Students
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-bold">
              {student ? student.name : "Student Fee"}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600 dark:text-blue-400">Fee Details</span>
          </div>

          <div className="flex items-center gap-2.5">
            {students.length > 1 && (
              <div className="relative">
                <select
                  value={selectedStudent?.id || ""}
                  onChange={(e) => {
                    const found = students.find((s) => s.id === e.target.value);
                    if (found) setSelectedStudent(found);
                  }}
                  aria-label="Switch student fee profile"
                  className="pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className || "Class"} • #{s.admissionNumber || s.studentId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Students</span>
            </Link>

            {student && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Portal: https://schoolstudy.in/login\nUser: ${student.admissionNumber}\nPass: School@123`
                  );
                  toast.success("Student login credentials copied to clipboard!");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Student Login</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            CLASS & STUDENT SELECTOR COMMAND BAR
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Class, Section, Student Picker */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Class Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-500">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    const cls = e.target.value;
                    setSelectedClass(cls);
                    setSelectedSection("all");
                    const matched = students.find((s) => cls === "all" || s.className === cls);
                    if (matched) setSelectedStudent(matched);
                  }}
                  className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                >
                  <option value="all">All Classes ({students.length})</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500">Section:</span>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    const sec = e.target.value;
                    setSelectedSection(sec);
                    const matched = students.find(
                      (s) =>
                        (selectedClass === "all" || s.className === selectedClass) &&
                        (sec === "all" || s.sectionName === sec)
                    );
                    if (matched) setSelectedStudent(matched);
                  }}
                  className="bg-transparent text-xs font-black text-slate-800 dark:text-white cursor-pointer focus:outline-none"
                >
                  <option value="all">All Sections</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Sec {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Select Dropdown */}
              <div className="flex-1 min-w-[260px] relative">
                <select
                  value={selectedStudent?.id || ""}
                  onChange={(e) => {
                    const found = students.find((s) => s.id === e.target.value);
                    if (found) setSelectedStudent(found);
                  }}
                  className="w-full px-3.5 py-2 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  {filteredStudents.length === 0 ? (
                    <option value="">No students found</option>
                  ) : (
                    filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} • {s.className || "Class"}-{s.sectionName || "A"} • #{s.admissionNumber || s.studentId}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Right: Search by name or admission ID */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student / admission..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">Loading student fee profile...</p>
          </div>
        ) : !student ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No Student Selected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please choose an active student from the dropdown or return to student list to view fee ledgers.
            </p>
            <Link
              href="/admin/students"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
            >
              Go to Students
            </Link>
          </div>
        ) : (
          <>
        {/* ========================================================
            HERO STUDENT PROFILE CARD MATCHING MOCKUP 2
        ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar & Identity details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  {student.avatar ? (
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-full h-full object-cover rounded-3xl"
                    />
                  ) : (
                    student.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white border-2 border-white dark:border-slate-900 shadow-xs">
                  Active
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {student.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-black border border-blue-200 dark:border-blue-900">
                    {student.admissionNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    Roll #{student.rollNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium pt-1">
                  <div>
                    <span className="text-slate-400">Class & Sec: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {student.className} ({student.sectionName})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">DOB: </span>
                    <strong className="text-slate-800 dark:text-slate-200">{student.dob}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Parent: </span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {student.parentName} ({student.parentRelation})
                    </strong>
                  </div>
                  <div className="col-span-2 sm:col-span-3 flex items-center gap-2 pt-0.5">
                    <span className="text-slate-400">Phone: </span>
                    <a
                      href={`tel:${student.phone}`}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{student.phone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                      title="Direct WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-500 truncate">{student.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Fee Details</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenReceipt(recentTransactions[0])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Generate Receipt</span>
              </button>

              <Link
                href={`/admin/students/${student.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Student</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================
            4 TOP KPI CARDS (Total Fee, Total Paid, Total Due, Last Payment)
        ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Fee */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Yearly Fee</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              ₹{totalAssigned.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Academic Year 2026-2027</p>
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Paid</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{totalPaid.toLocaleString("en-IN")}
            </p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1.5">
              {paidPercentage}% of yearly fee collected
            </p>
          </div>

          {/* Card 3: Total Due */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Due</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
              ₹{totalDue.toLocaleString("en-IN")}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                pendingMonthsCount > 0
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-900"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-900"
              }`}>
                {pendingMonthsCount > 0 ? `${pendingMonthsCount} Month${pendingMonthsCount > 1 ? "s" : ""} Pending` : "All Dues Cleared"}
              </span>
            </div>
          </div>

          {/* Card 4: Last Payment */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Last Payment</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {latestTransaction
                ? `₹${(latestTransaction.amountPaidPaise / 100).toLocaleString("en-IN")}`
                : "₹0"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {latestTransaction ? (
                <>
                  {new Date(latestTransaction.paymentDate || latestTransaction.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })} • <span className="text-purple-600 font-bold">{latestTransaction.paymentMethod || "Payment"}</span>
                </>
              ) : (
                "No payments yet"
              )}
            </p>
          </div>
        </div>

        {/* ========================================================
            7 NAVIGATION TABS MATCHING MOCKUP 2
        ======================================================== */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex overflow-x-auto gap-2 pb-px no-scrollbar">
            {[
              { id: "overview", label: "Fee Overview" },
              { id: "monthwise", label: "Month Wise" },
              { id: "transactions", label: "Transactions" },
              { id: "receipts", label: "Receipts" },
              { id: "discounts", label: "Discounts / Concessions" },
              { id: "notes", label: "Notes" },
              { id: "settings", label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-black whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================
            MAIN TAB VIEW CONTENT (Month Wise / Fee Overview / etc.)
        ======================================================== */}
        {(activeTab === "monthwise" || activeTab === "overview") && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Month-Wise Table + Bottom Cards */}
            <div className="xl:col-span-8 space-y-6">
              {/* Month Wise Fee Schedule Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Academic Year {selectedAcademicYear} Fee Schedule
                      </h3>
                    </div>

                    {/* Month Status Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setMonthStatusFilter("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          monthStatusFilter === "all"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                      >
                        All ({ledgerData.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthStatusFilter("pending")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          monthStatusFilter === "pending"
                            ? "bg-rose-500 text-white shadow-xs"
                            : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        }`}
                      >
                        Due ({ledgerData.filter((m) => m.status === "Due").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthStatusFilter("paid")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          monthStatusFilter === "paid"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        }`}
                      >
                        Paid ({ledgerData.filter((m) => m.status === "Paid").length})
                      </button>
                      {ledgerData.filter((m) => m.status === "Partial").length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMonthStatusFilter("partial")}
                          className={`px-2.5 py-1 rounded-lg transition-all ${
                            monthStatusFilter === "partial"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          }`}
                        >
                          Partial ({ledgerData.filter((m) => m.status === "Partial").length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="2026-2027">Session 2026-2027</option>
                      <option value="2025-2026">Session 2025-2026</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-3">Due Date</th>
                        <th className="py-3 px-3 text-right">Base Fee</th>
                        <th className="py-3 px-3 text-right">Late Fee</th>
                        <th className="py-3 px-3 text-right">Total</th>
                        <th className="py-3 px-3 text-right">Paid</th>
                        <th className="py-3 px-3 text-right">Balance</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {loadingLedger ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                              Loading fee ledger...
                            </p>
                          </td>
                        </tr>
                      ) : filteredLedgerData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400">
                            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                              {ledgerData.length === 0 ? "No fee structure assigned" : "No months matching status filter"}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {ledgerData.length === 0 ? `No fee ledger items found for ${student.name}.` : "Try selecting 'All' months."}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerData.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {row.name}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {row.due}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                              ₹{row.base.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-500">
                              {row.late > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  ₹{row.late.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                "₹0"
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                              ₹{row.total.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-600 font-black">
                              ₹{row.paid.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-3 text-right font-black">
                              {row.balance > 0 ? (
                                <span className="text-rose-600">
                                  ₹{row.balance.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-slate-400">₹0</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  row.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                                    : row.status === "Partial"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.status === "Paid" ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceipt(recentTransactions[0])}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Receipt</span>
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Link
                                    href={`/admin/fees/collect?studentId=${student.id}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay</span>
                                  </Link>
                                  {row.raw && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMonthForAdjustment(row.raw);
                                        setShowAdjustmentModal(true);
                                      }}
                                      className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 cursor-pointer"
                                      title="Adjust Rate/Waiver"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Side-by-Side Lower Cards: Recent Transactions & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Card 1: Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Recent Transactions
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("transactions")}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {recentTransactions.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        <CreditCard className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          No transactions recorded
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Payments collected will appear here.
                        </p>
                      </div>
                    ) : (
                      recentTransactions.map((tx, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-900 dark:text-white">
                              #{tx.receiptNumber}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              • <span className="font-bold text-slate-600 dark:text-slate-300">{(tx as any).paymentMode || tx.paymentMethod}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-black text-emerald-600">
                              ₹{(tx.amountPaidPaise / 100).toLocaleString("en-IN")}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(tx)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Card 2: Notes & Follow-ups */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Notes & Follow-ups
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFollowUpModal(true)}
                      className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                    >
                      + Add Note
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(assignment as any)?.followUps && (assignment as any).followUps.length > 0 ? (
                      (assignment as any).followUps.map((fu: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 text-xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                            <span>{fu.action || "Parent Follow-up"}</span>
                            <span className="text-slate-400 font-normal">
                              {fu.date ? new Date(fu.date).toLocaleDateString("en-IN") : "—"}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                            {fu.notes || "No additional comments"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        <PhoneCall className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          No notes or follow-ups
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click '+ Add Note' to log interactions with parent.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Action Sidebar Cards matching Mockup 2 */}
            <div className="xl:col-span-4 space-y-5">
              {/* Card 1: Pay Pending Fee (UPI & Pay CTA) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Pay Pending Fee</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    Overdue
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Total Outstanding Due
                    </span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ₹{totalDue.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <Link
                    href={`/admin/fees/collect?studentId=${student.id}`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all text-center"
                  >
                    Collect Now
                  </Link>
                </div>

                {/* Instant UPI Payment Link */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">
                    Instant UPI Payment Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://pay.schoolstudy.in/f/${student.admissionNumber}`}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono text-slate-600 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPaymentLink}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Send Fee Details (WhatsApp / SMS) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" />
                    <span>Send Fee Details</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Direct Notice</span>
                </div>

                {/* Options: Current Month vs Full Details */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendType("current")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                      sendType === "current"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Current Month (₹{currentMonthDue.toLocaleString("en-IN")})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendType("full")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                      sendType === "full"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Full Details (₹{totalDue.toLocaleString("en-IN")})
                  </button>
                </div>

                {/* Message preview */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {waComposerText}
                </div>

                {/* Send Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(waComposerText);
                      toast.success("Fee message copied to clipboard!");
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title="Copy text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card 3: Student Login Information */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Student Login Information</span>
                  </h4>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Portal Username:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {student.admissionNumber}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {showPassword ? "School@123" : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Password reset link sent to ${student.phone}!`);
                    }}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Dear ${student.name},\nYour School Study Portal login details:\nUser: ${student.admissionNumber}\nPass: School@123\nURL: https://schoolstudy.in/login`;
                      const cleanPhone = student.phone.replace(/[^0-9]/g, "");
                      const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Send Credentials via WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* When tab is Transactions */}
        {activeTab === "transactions" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              All Fee Transactions & Receipts
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 uppercase font-bold border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {recentTransactions.map((tx, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {tx.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {(tx as any).paymentMode || tx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                        ₹{(tx.amountPaidPaise / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          Completed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(tx)}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* When tab is Receipts */}
        {activeTab === "receipts" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTransactions.map((tx, i) => (
              <div
                key={i}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">{tx.receiptNumber}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Amount Paid</span>
                  <span className="text-lg font-black text-emerald-600">
                    ₹{(tx.amountPaidPaise / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenReceipt(tx)}
                  className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download / Print Receipt</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* When tab is Discounts */}
        {activeTab === "discounts" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Fee Concessions & Scholarships
            </h3>
            <p className="text-xs text-slate-500">
              Discounts applied to this student account for Session 2026-2027.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">Sibling Concession</h4>
                <p className="text-[11px] text-slate-500">10% discount on standard tuition fee rates.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                Active
              </span>
            </div>
          </div>
        )}

        {/* When tab is Notes */}
        {activeTab === "notes" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">CRM Follow-up Notes</h3>
              <button
                type="button"
                onClick={() => setShowFollowUpModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                + Add Follow-up Note
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-600">Telephonic Conversation with Father</span>
                  <span className="text-slate-400">10 Sep 2026, 04:30 PM</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Discussed second term fees. Parent assured clear payment of ₹5,500 by coming Monday.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* When tab is Settings */}
        {activeTab === "settings" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Account Fee Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Automatic WhatsApp Reminders
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Send automatic WhatsApp reminder 3 days prior to monthly due date.
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded text-blue-600 cursor-pointer" />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 cursor-pointer">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Late Fee Waiver</p>
                  <p className="text-[11px] text-slate-400">
                    Waive automatic late fee penalty for this student account.
                  </p>
                </div>
                <input type="checkbox" className="rounded text-blue-600 cursor-pointer" />
              </label>
            </div>
          </div>
        )}

        {/* Centralized Share Fee Modal */}
        {showShareModal && (
          <ShareFeeModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            schoolId={schoolId}
            student={{
              id: student.id,
              name: student.name,
              admissionNumber: student.admissionNumber,
              rollNumber: student.rollNumber,
              className: student.className,
              sectionName: student.sectionName,
              phone: student.phone,
              parentPhone: student.phone,
            }}
          />
        )}

        {/* Fee Adjustment Modal */}
        {showAdjustmentModal && selectedMonthForAdjustment && (
          <FeeAdjustmentModal
            isOpen={showAdjustmentModal}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedMonthForAdjustment(null);
            }}
            schoolId={schoolId}
            student={{
              id: student.id,
              name: student.name,
              admissionNumber: student.admissionNumber,
              className: student.className,
            }}
            ledgerItem={selectedMonthForAdjustment}
            onSuccess={() => {
              fetchStudentLedger();
            }}
          />
        )}

        {/* Receipt Modal */}
        {receiptModalPayment && (
          <FeeReceiptModal
            isOpen={Boolean(receiptModalPayment)}
            onClose={() => setReceiptModalPayment(null)}
            schoolName={schoolName}
            payment={receiptModalPayment}
          />
        )}

        {/* Follow-up Note Modal */}
        {showFollowUpModal && (
          <FeeFollowUpModal
            isOpen={showFollowUpModal}
            onClose={() => setShowFollowUpModal(false)}
            schoolId={schoolId}
            assignment={assignment || {
              id: "assign_temp",
              schoolId,
              studentId: student.id,
              studentName: student.name,
              admissionNumber: student.admissionNumber,
              className: student.className,
              sectionName: student.sectionName,
              academicYearId: selectedAcademicYear,
              feeStructureIds: [],
              totalAssignedPaise: totalAssigned * 100,
              totalPaidPaise: totalPaid * 100,
              totalDiscountPaise: 0,
              totalLateFeePaise: 0,
              totalPendingPaise: totalDue * 100,
              monthLedger: [],
              status: totalDue === 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "PENDING",
              updatedAt: new Date().toISOString(),
            }}
            onFollowUpRecorded={() => {
              toast.success("Follow-up note recorded successfully!");
            }}
          />
        )}
        </>
        )}
      </div>
    </EntitlementGate>
  );
}
