"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  CreditCard,
  KeyRound,
  Share2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  User,
  Shield,
  Loader2,
  Printer,
  Copy,
  Check,
  MessageSquare,
  History,
  Lock,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentById, transferStudentClass } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import {
  getStudentFeeSummary,
  type StudentFeeSummary,
} from "@/lib/services/fee.service";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import { FeeReceiptModal } from "@/components/fees/FeeReceiptModal";
import type { StudentProfile, SchoolClass, FeePayment } from "@/types";

export default function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const studentId = params.id;
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const router = useRouter();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "transfer" | "credentials" | "fees">("overview");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<FeePayment | null>(null);

  // Transfer State
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [transferReason, setTransferReason] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Credentials State
  const [credStatus, setCredStatus] = useState<{ hasAuthAccount: boolean; email?: string } | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [issuedCreds, setIssuedCreds] = useState<{
    studentName: string;
    email: string;
    temporaryPassword: string;
    portalUrl: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // 1. Fetch Student, Classes & Fee Summary
  const loadStudentData = async () => {
    if (!schoolId || !studentId) return;
    setLoading(true);
    try {
      const [stu, clsList] = await Promise.all([
        getStudentById(schoolId, studentId),
        getClassesWithSections(schoolId),
      ]);

      if (!stu) {
        toast.error("Student not found.");
        return;
      }

      setStudent(stu);
      setClasses(clsList);

      // Load fee summary
      try {
        const fees = await getStudentFeeSummary(schoolId, {
          id: stu.id,
          name: stu.name,
          admissionNumber: stu.admissionNumber || stu.studentId,
          className: stu.className,
          sectionName: stu.sectionName,
        });
        setFeeSummary(fees);
      } catch (fErr) {
        console.warn("Notice: could not load fee summary", fErr);
      }
    } catch (err: any) {
      console.error("Failed to load student detail:", err);
      toast.error("Failed to load student record.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [schoolId, studentId]);

  // 2. Fetch Credentials Status
  useEffect(() => {
    async function checkCreds() {
      if (!studentId) return;
      try {
        const res = await fetch(`/api/admin/students/${studentId}/credentials`);
        if (res.ok) {
          const data = await res.json();
          setCredStatus({ hasAuthAccount: data.hasAuthAccount, email: data.email });
        }
      } catch (err) {
        // Non-fatal
      }
    }
    checkCreds();
  }, [studentId]);

  // 3. Execute Class Transfer with Audit Trail
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !targetClassId || !targetSectionId) {
      toast.error("Please select target class and section.");
      return;
    }

    const targetClass = classes.find((c) => c.id === targetClassId);
    const targetSection = targetClass?.sections?.find((s) => s.id === targetSectionId);

    setIsTransferring(true);
    try {
      const { newRollNumber } = await transferStudentClass(
        schoolId,
        student.id,
        targetClassId,
        targetClass?.name || "",
        targetSectionId,
        targetSection?.name || "",
        transferDate,
        transferReason || "Class Transfer",
        profile?.email || profile?.name || "School Administrator"
      );

      toast.success(
        `Transferred to ${targetClass?.name} (${targetSection?.name}) with Roll #${newRollNumber}!`
      );
      setTargetClassId("");
      setTargetSectionId("");
      setTransferReason("");
      await loadStudentData();
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer student.");
    } finally {
      setIsTransferring(false);
    }
  };

  // 4. Issue / Reset Credentials
  const handleIssueCredentials = async (action: "create_account" | "reset_password") => {
    setCredLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to manage credentials.");

      setIssuedCreds(data.credentials);
      setCredStatus({ hasAuthAccount: true, email: data.credentials.email });
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to update credentials.");
    } finally {
      setCredLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold">Loading student profile & financial ledger...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 text-center space-y-4">
        <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Student Record Not Found</h3>
        <p className="text-xs text-slate-500">The requested student could not be located in this school.</p>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Directory</span>
        </Link>
      </div>
    );
  }

  const fmtRupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/students"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">{student.name}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  student.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
                }`}
              >
                {student.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Roll #{student.rollNumber ?? "-"} • Admission ID: {student.admissionNumber || student.studentId} • Class {student.className} ({student.sectionName})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Fee Details</span>
          </button>
          <Link
            href={`/admin/fees/collect?studentId=${student.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Collect Fee</span>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs font-bold overflow-x-auto">
        {[
          { id: "overview", label: "Student Overview", icon: User },
          { id: "transfer", label: "Class Transfer & History", icon: ArrowRightLeft },
          { id: "credentials", label: "Login Account & Portal", icon: KeyRound },
          { id: "fees", label: "Fee Ledger & Statements", icon: CreditCard },
        ].map((t) => {
          const Icon = t.icon;
          const isAct = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isAct
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: OVERVIEW & PROFILE CARD
      ========================================================= */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Left Column */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-center">
            <div className="relative mx-auto w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500/20 shadow-md">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-600 to-indigo-700 text-white text-3xl font-black">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{student.name}</h2>
              <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {student.studentId || student.admissionNumber}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-bold text-slate-900 dark:text-white">#{student.rollNumber ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Section:</span>
                <span className="font-bold text-slate-900 dark:text-white">{student.className} ({student.sectionName || "A"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gender:</span>
                <span className="font-bold capitalize text-slate-900 dark:text-white">{student.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-bold text-slate-900 dark:text-white">{student.dob || "—"}</span>
              </div>
            </div>
          </div>

          {/* Academic & Contact Details Right Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                Contact & Guardian Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-blue-500" /> Student Phone
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">{student.phone || "—"}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-500" /> Student Login Email
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{student.email || "—"}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-500" /> Guardian / Parent
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {student.guardianName || "—"} {student.guardianRelation ? `(${student.guardianRelation})` : ""}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" /> Guardian Phone
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">{student.guardianPhone || "—"}</p>
                </div>

                <div className="sm:col-span-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" /> Residential Address
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white">{student.address || "—"}</p>
                </div>
              </div>
            </div>

            {/* Quick Financial Snapshot */}
            {feeSummary && (
              <div className="p-6 rounded-3xl bg-linear-to-br from-slate-900 to-slate-800 text-white space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Financial Summary (Live)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
                    {feeSummary.assignment.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400">Total Assigned</span>
                    <p className="text-lg font-black mt-0.5">{fmtRupees(feeSummary.assignment.totalAssignedPaise)}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-emerald-400">Total Paid</span>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">₹{feeSummary.totalPaidRupees.toFixed(2)}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-rose-400">Pending Dues</span>
                    <p className="text-lg font-black text-rose-400 mt-0.5">₹{feeSummary.totalPendingRupees.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CLASS TRANSFER & AUDIT HISTORY
      ========================================================= */}
      {activeTab === "transfer" && (
        <div className="space-y-6">
          {/* Transfer Form Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Transfer Student to New Class / Section
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seamlessly move student between classes. Roll number is automatically generated and future dues are recomputed.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Current Class Placement</span>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                  Class {student.className} ({student.sectionName || "A"}) • Current Roll No: #{student.rollNumber ?? "-"}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800">
                Active Placement
              </span>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={targetClassId}
                    onChange={(e) => {
                      setTargetClassId(e.target.value);
                      setTargetSectionId("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">Select Target Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!targetClassId}
                    value={targetSectionId}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold disabled:opacity-50"
                  >
                    <option value="">Select Target Section</option>
                    {classes
                      .find((c) => c.id === targetClassId)
                      ?.sections?.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Effective Transfer Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Reason / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Promotion, section rebalancing, guardian request"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  🛡️ Data Safety & Integrity Protection
                </p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-400 leading-relaxed">
                  All past attendance records, verified fee payment receipts, and exam scores are permanently preserved. Only future unpaid ledger items are updated to reflect the new class's fee structure.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isTransferring || !targetClassId || !targetSectionId}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Executing Transfer...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Confirm Class Transfer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Transfer History Audit Log Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Class Transfer Audit History
              </h3>
            </div>

            {(!student.transferHistory || student.transferHistory.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No past class transfers recorded. Student is in their original admission placement.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">From Class</th>
                      <th className="py-3 px-4">To Class</th>
                      <th className="py-3 px-4">New Roll No</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Transferred By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {student.transferHistory.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{tr.transferDate}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {tr.fromClassName} ({tr.fromSectionName})
                        </td>
                        <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                          {tr.toClassName} ({tr.toSectionName})
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">#{tr.toRollNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{tr.reason || "Class Transfer"}</td>
                        <td className="py-3 px-4 text-slate-400">{tr.transferredBy || "Admin"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: LOGIN CREDENTIALS & ACCOUNT MANAGEMENT
      ========================================================= */}
      {activeTab === "credentials" && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Student Portal Credentials & Account
              </h3>
              <p className="text-xs text-slate-500">
                Manage student login credentials securely. Plaintext passwords are never saved in database.
              </p>
            </div>
          </div>

          {/* Account Status Badge */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Firebase Auth Status</span>
              <p className="font-extrabold text-slate-900 dark:text-white">
                {credStatus?.hasAuthAccount ? "🟢 Verified Login Account Linked" : "🟡 Login Account Pending Provisioning"}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
              {student.email}
            </span>
          </div>

          {/* Security Notice */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-blue-600" /> Enterprise Zero-Plaintext Security
            </p>
            <p className="text-[11px] text-blue-800/90 dark:text-blue-400 leading-relaxed">
              When resetting credentials, an ephemeral one-time password is generated and directly written to Firebase Auth without being stored in plain text anywhere in Firestore or user logs.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!credStatus?.hasAuthAccount ? (
              <button
                type="button"
                onClick={() => handleIssueCredentials("create_account")}
                disabled={credLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {credLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>Provision Student Login Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleIssueCredentials("reset_password")}
                disabled={credLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {credLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>Reset Password & Issue Temporary Credentials</span>
              </button>
            )}
          </div>

          {/* Issued Credentials Slip Card */}
          {issuedCreds && (
            <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Newly Generated Student Credentials
                </span>
                <span className="text-[10px] text-emerald-600 uppercase font-bold">Ready to Deliver</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Login Username / Email:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{issuedCreds.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Temporary Password:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                    {issuedCreds.temporaryPassword}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const slip = `🎓 School Study — Student Login Credentials\nStudent: ${issuedCreds.studentName}\nUsername: ${issuedCreds.email}\nTemporary Password: ${issuedCreds.temporaryPassword}\nPortal Login: ${window.location.origin}/student/login`;
                    navigator.clipboard.writeText(slip);
                    setCopiedCreds(true);
                    toast.success("Credentials copied to clipboard!");
                    setTimeout(() => setCopiedCreds(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {copiedCreds ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCreds ? "Copied!" : "Copy Credential Slip"}</span>
                </button>

                {student.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const slip = `🎓 *School Study — Student Portal Credentials*\n\nDear Parent,\nHere are the official login credentials for *${issuedCreds.studentName}*:\n\n• *Username / Email:* ${issuedCreds.email}\n• *Temporary Password:* ${issuedCreds.temporaryPassword}\n• *Portal Link:* ${window.location.origin}/student/login\n\nPlease log in and update your password on first login.`;
                      const cleanPhone = student.phone?.replace(/[^0-9]/g, "");
                      const target = cleanPhone?.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      window.open(`https://wa.me/${target}?text=${encodeURIComponent(slip)}`, "_blank");
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5 fill-current" />
                    <span>Send via WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 4: FEE LEDGER & STATEMENTS
      ========================================================= */}
      {activeTab === "fees" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Student Fee Ledger & Account Statement
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative academic cycle ledger tracking month-by-month dues, receipts, and concessions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Fee Statement</span>
                </button>
                <Link
                  href={`/admin/fees/collect?studentId=${student.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Record Fee Payment</span>
                </Link>
              </div>
            </div>

            {/* Financial Metrics Cards */}
            {feeSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-semibold block">Total Invoiced</span>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {fmtRupees(feeSummary.assignment.totalAssignedPaise)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold block">Total Paid</span>
                  <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    ₹{feeSummary.totalPaidRupees.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900">
                  <span className="text-rose-700 dark:text-rose-300 font-semibold block">Outstanding Dues</span>
                  <p className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    ₹{feeSummary.totalPendingRupees.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
                  <span className="text-purple-700 dark:text-purple-300 font-semibold block">Ledger Status</span>
                  <p className="text-base font-black text-purple-700 dark:text-purple-300 mt-0.5 uppercase">
                    {feeSummary.assignment.status}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Month Ledger Table */}
          {feeSummary && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Academic Year Month-by-Month Ledger
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Period Month</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Fee Rate</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Discounts</th>
                      <th className="py-3 px-4 text-right">Pending</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {feeSummary.assignment.monthLedger.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{m.month}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">₹{(m.amountPaise / 100).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-bold">
                          ₹{(m.paidAmountPaise / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {m.discountPaise > 0 ? `₹${(m.discountPaise / 100).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                          ₹{(m.pendingAmountPaise / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              m.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : m.status === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historical Payment Receipts */}
          {feeSummary && feeSummary.recentPayments.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Verified Payment Receipts History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Receipt No.</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Covered Periods</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {feeSummary.recentPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {pay.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{pay.periodMonths?.join(", ") || "General"}</td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">
                          {pay.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600">
                          ₹{(pay.amountPaidPaise / 100).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptPayment(pay)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
                          >
                            <Printer className="h-3 w-3" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Centralized Share Fee Details Modal */}
      {showShareModal && (
        <ShareFeeModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          schoolId={schoolId}
          student={{
            id: student.id,
            name: student.name,
            admissionNumber: student.admissionNumber || student.studentId,
            rollNumber: student.rollNumber,
            className: student.className,
            sectionName: student.sectionName,
            phone: student.phone,
            parentPhone: student.guardianPhone,
          }}
        />
      )}

      {/* Official Receipt Print Modal */}
      {selectedReceiptPayment && (
        <FeeReceiptModal
          payment={selectedReceiptPayment}
          schoolName={(profile as any)?.schoolName || "School Study Institution"}
          isOpen={Boolean(selectedReceiptPayment)}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  );
}
