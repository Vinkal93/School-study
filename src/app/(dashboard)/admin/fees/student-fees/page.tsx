"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import {
  Search,
  UserCheck,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Share2,
  CreditCard,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import type { StudentFeeAssignment, StudentProfile, MonthLedgerItem } from "@/types";
import {
  getStudentFeeAssignment,
  provisionStudentFeeAssignment,
  reconcileStudentFeeLedger,
} from "@/lib/services/fee.service";
import { getStudents } from "@/lib/services/student.service";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import { FeeAdjustmentModal } from "@/components/fees/FeeAdjustmentModal";
import { Edit3, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function AdminStudentFeesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [assignment, setAssignment] = useState<StudentFeeAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMonthForAdjustment, setSelectedMonthForAdjustment] = useState<MonthLedgerItem | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // 1. Fetch real school students
  useEffect(() => {
    async function loadStudents() {
      if (!schoolId) return;
      setLoading(true);
      try {
        const list = await getStudents(schoolId, { status: "active" });
        setStudents(list);

        // Auto-select student from query param or first student
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

  // 2. Fetch authoritative fee ledger when selected student changes
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
        // Auto reconcile if previously assigned with 0 rates
        const reconciled = await reconcileStudentFeeLedger(schoolId, selectedStudent.id);
        if (reconciled) data = reconciled;
      }
      setAssignment(data);
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

  const filteredStudents = useMemo(() => {
    if (!searchStudentQuery) return students.slice(0, 10);
    const q = searchStudentQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [students, searchStudentQuery]);

  return (
    <EntitlementGate feature="fee_management" title="Student Fee Ledger" requiredPlan="Professional Plan">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Individual Student Fee Ledger</h1>
            <p className="text-xs text-slate-500 mt-1">
              Select any enrolled student to view their authoritative academic year fee status, ledger items, and receipts.
            </p>
          </div>

          {selectedStudent && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Fee Details</span>
              </button>
              <Link
                href={`/admin/fees/collect?studentId=${selectedStudent.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Collect Fee</span>
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading enrolled students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <GraduationCap className="h-12 w-12 mx-auto text-slate-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Students Enrolled Yet</h3>
            <p className="text-xs text-slate-500">
              Enroll students in the Student Directory to generate individual fee accounts and ledgers.
            </p>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm"
            >
              Go to Student Directory
            </Link>
          </div>
        ) : (
          <>
            {/* Student Selector Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name, adm no..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white shadow-xs"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={selectedStudent?.id || ""}
                    onChange={(e) => {
                      const found = students.find((s) => s.id === e.target.value);
                      if (found) setSelectedStudent(found);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Roll #{s.rollNumber ?? "-"} • {s.className})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Selected Student Details Banner */}
              {selectedStudent && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-base">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{selectedStudent.name}</span>
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                          {selectedStudent.admissionNumber || selectedStudent.studentId}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Class {selectedStudent.className} ({selectedStudent.sectionName || "A"}) • Roll #{selectedStudent.rollNumber ?? "-"}
                        {selectedStudent.phone && ` • 📞 ${selectedStudent.phone}`}
                      </p>
                    </div>
                  </div>

                  {assignment && (
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">Assigned</span>
                        <span className="text-slate-900 dark:text-white">₹{(assignment.totalAssignedPaise / 100).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-normal">Paid</span>
                        <span className="text-emerald-600">₹{(assignment.totalPaidPaise / 100).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-600 block font-normal">Outstanding</span>
                        <span className="text-rose-600">₹{(assignment.totalPendingPaise / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Month-Wise Fee Ledger Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {loadingLedger ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="text-xs">Loading ledger details...</p>
                </div>
              ) : !assignment ? (
                <div className="p-12 text-center text-xs text-slate-500">No fee ledger found for selected student.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4">Period Month</th>
                        <th className="py-3.5 px-4">Due Date</th>
                        <th className="py-3.5 px-4 text-right">Fee Rate</th>
                        <th className="py-3.5 px-4 text-right">Paid Amount</th>
                        <th className="py-3.5 px-4 text-right">Discount</th>
                        <th className="py-3.5 px-4 text-right">Late Fee</th>
                        <th className="py-3.5 px-4 text-right">Pending Balance</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {assignment.monthLedger.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{m.month}</span>
                              {m.isManuallyAdjusted && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold uppercase tracking-wider">
                                  Adjusted
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right">₹{(m.amountPaise / 100).toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right text-emerald-600 font-bold">
                            ₹{(m.paidAmountPaise / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500">
                            {m.discountPaise > 0 ? `₹${(m.discountPaise / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500">
                            {m.lateFeePaise > 0 ? `₹${(m.lateFeePaise / 100).toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-rose-600">
                            ₹{(m.pendingAmountPaise / 100).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
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
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedMonthForAdjustment(m);
                                setShowAdjustmentModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all shadow-xs"
                            >
                              <Edit3 className="h-3 w-3 text-blue-600" />
                              <span>Adjust</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Centralized Share Fee Modal */}
        {showShareModal && selectedStudent && (
          <ShareFeeModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            schoolId={schoolId}
            student={{
              id: selectedStudent.id,
              name: selectedStudent.name,
              admissionNumber: selectedStudent.admissionNumber || selectedStudent.studentId,
              rollNumber: selectedStudent.rollNumber,
              className: selectedStudent.className,
              sectionName: selectedStudent.sectionName,
              phone: selectedStudent.phone,
              parentPhone: selectedStudent.guardianPhone,
            }}
          />
        )}

        {/* Initial Fee Setup / Adjustment Modal */}
        {showAdjustmentModal && selectedStudent && selectedMonthForAdjustment && (
          <FeeAdjustmentModal
            isOpen={showAdjustmentModal}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedMonthForAdjustment(null);
            }}
            schoolId={schoolId}
            student={{
              id: selectedStudent.id,
              name: selectedStudent.name,
              admissionNumber: selectedStudent.admissionNumber || selectedStudent.studentId,
              className: selectedStudent.className,
            }}
            ledgerItem={selectedMonthForAdjustment}
            onSuccess={() => {
              fetchStudentLedger();
            }}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
