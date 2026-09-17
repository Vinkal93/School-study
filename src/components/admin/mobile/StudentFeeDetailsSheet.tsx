"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  ExternalLink,
  Receipt,
  FileText,
  Calendar,
  IndianRupee,
} from "lucide-react";
import type { StudentProfile } from "@/types";
import { getStudentFeeSummary, type StudentFeeSummary } from "@/lib/services/fee.service";
import { formatStudentFeeMessage } from "@/lib/services/fee-share.service";

interface StudentFeeDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  schoolId: string;
}

export function StudentFeeDetailsSheet({
  isOpen,
  onClose,
  student,
  schoolId,
}: StudentFeeDetailsSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentFeeSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && student && schoolId) {
      setLoading(true);
      getStudentFeeSummary(schoolId, {
        id: student.id,
        name: student.name || (student as any).fullName || "Student",
        admissionNumber: student.admissionNumber || student.studentId,
        className: student.className,
        sectionName: student.sectionName,
        admissionDate: student.admissionDate,
      })
        .then((res) => {
          if (isMounted) {
            setSummary(res);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load student fee summary:", err);
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, student, schoolId]);

  if (!isOpen || !student) return null;

  const studentName = student.name || (student as any).fullName || "Student";
  const admNo = student.admissionNumber || student.studentId || "N/A";
  const classDisplay = student.className
    ? `Class ${student.className}${student.sectionName ? `-${student.sectionName}` : ""}`
    : "No Class Assigned";

  const totalAssignedRupees = summary ? (summary.assignment?.totalAssignedPaise || 0) / 100 : 0;
  const totalPaidRupees = summary ? summary.totalPaidRupees : 0;
  const totalDueRupees = summary ? summary.totalPendingRupees : 0;

  const handleCollectFee = () => {
    onClose();
    router.push(`/admin/fees/collect?studentId=${student.id}`);
  };

  const handleShareWhatsApp = () => {
    if (!summary) return;
    const msg = formatStudentFeeMessage({
      schoolName: "School Portal",
      studentName,
      admissionNumber: admNo,
      className: student.className,
      sectionName: student.sectionName,
      mode: "PAYMENT_REMINDER",
      summary,
    });
    const phone = (student.guardianPhone || student.phone || "").replace(/[^0-9]/g, "");
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "PARTIAL":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Partial
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Due
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header drag-indicator / bar */}
        <div className="flex flex-col items-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Fee Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {studentName} • Adm #{admNo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Subtitle / Class summary banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{classDisplay}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {summary?.feeStructureTitle || "Standard Tuition & Institute Fee"}
              </p>
            </div>
            {summary?.monthlyFeeRupees ? (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-lg">
                ₹{summary.monthlyFeeRupees.toLocaleString("en-IN")}/mo
              </span>
            ) : null}
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Fees
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {loading ? "..." : `₹${totalAssignedRupees.toLocaleString("en-IN")}`}
              </p>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50">
              <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Paid
              </p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {loading ? "..." : `₹${totalPaidRupees.toLocaleString("en-IN")}`}
              </p>
            </div>
            <div className="bg-rose-50/70 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200/70 dark:border-rose-800/50">
              <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Due
              </p>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-1">
                {loading ? "..." : `₹${totalDueRupees.toLocaleString("en-IN")}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleCollectFee}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              Collect / Pay Now
            </button>
            <button
              onClick={handleShareWhatsApp}
              disabled={loading || !summary}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              WhatsApp Reminder
            </button>
          </div>

          {/* Month Ledger Breakdown */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Billing Breakdown</span>
              <span className="text-[11px] font-medium text-slate-400">
                {summary?.assignment?.monthLedger?.length || 0} periods
              </span>
            </h3>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !summary?.assignment?.monthLedger || summary.assignment.monthLedger.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No fee ledger assigned for this academic session yet.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.assignment.monthLedger.map((item, index) => {
                  const amountRupees = item.amountPaise / 100;
                  const paidRupees = item.paidAmountPaise / 100;
                  const pendingRupees = item.pendingAmountPaise / 100;

                  return (
                    <div
                      key={index}
                      className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.month}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Fee: ₹{amountRupees.toLocaleString("en-IN")} • Paid: ₹{paidRupees.toLocaleString("en-IN")}
                        </span>
                        {pendingRupees > 0 && (
                          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            Due: ₹{pendingRupees.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(item.status)}
                        {item.receiptNumbers && item.receiptNumbers.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{item.receiptNumbers[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
