"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  User,
  Edit,
  ClipboardCheck,
  CreditCard,
  Award,
  ArrowRightLeft,
  IdCard,
  Download,
  MessageSquare,
  TrendingUp,
  FileCheck2,
  UserX,
} from "lucide-react";
import type { StudentProfile } from "@/types";

interface StudentActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  onViewProfile?: (student: StudentProfile) => void;
  onEditStudent: (student: StudentProfile) => void;
  onViewFees: (student: StudentProfile) => void;
  onAssignClass: (student: StudentProfile) => void;
  onDeactivateStudent: (student: StudentProfile) => void;
}

export function StudentActionsSheet({
  isOpen,
  onClose,
  student,
  onViewProfile,
  onEditStudent,
  onViewFees,
  onAssignClass,
  onDeactivateStudent,
}: StudentActionsSheetProps) {
  const router = useRouter();

  if (!isOpen || !student) return null;

  const studentName = student.name || (student as any).fullName || "Student";
  const admNo = student.admissionNumber || student.studentId || "";

  const handleAction = (cb: () => void) => {
    onClose();
    cb();
  };

  const handleWhatsApp = () => {
    const rawPhone = student.guardianPhone || student.phone;
    if (!rawPhone) {
      alert("No phone number found for this student.");
      return;
    }
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const target = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `Hello from School Administration regarding ${studentName} (Admission: ${admNo}).`;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const actions = [
    {
      id: "view_profile",
      label: "View Profile",
      icon: User,
      color: "text-blue-600 dark:text-blue-400",
      action: () => {
        if (onViewProfile) {
          onViewProfile(student);
        } else {
          router.push(`/admin/students/${student.id}`);
        }
      },
    },
    {
      id: "edit_student",
      label: "Edit Student",
      icon: Edit,
      color: "text-slate-600 dark:text-slate-300",
      action: () => onEditStudent(student),
    },
    {
      id: "view_attendance",
      label: "View Attendance",
      icon: ClipboardCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      action: () => router.push(`/admin/attendance`),
    },
    {
      id: "view_fees",
      label: "View Fees",
      icon: CreditCard,
      color: "text-purple-600 dark:text-purple-400",
      action: () => onViewFees(student),
    },
    {
      id: "view_results",
      label: "View Results",
      icon: Award,
      color: "text-amber-600 dark:text-amber-400",
      action: () => router.push(`/admin/reports`),
    },
    {
      id: "assign_class",
      label: "Assign Class / Section",
      icon: ArrowRightLeft,
      color: "text-indigo-600 dark:text-indigo-400",
      action: () => onAssignClass(student),
    },
    {
      id: "id_card",
      label: "Generate ID Card",
      icon: IdCard,
      color: "text-teal-600 dark:text-teal-400",
      action: () => router.push(`/admin/students/${student.id}`),
    },
    {
      id: "whatsapp",
      label: "Send Message (WhatsApp)",
      icon: MessageSquare,
      color: "text-emerald-500",
      action: handleWhatsApp,
    },
    {
      id: "promote",
      label: "Promote to Next Class",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      action: () => router.push(`/admin/classes/transfer?studentId=${student.id}`),
    },
    {
      id: "tc",
      label: "Issue Transfer Certificate",
      icon: FileCheck2,
      color: "text-orange-600 dark:text-orange-400",
      action: () => router.push(`/admin/classes/transfer?studentId=${student.id}`),
    },
    {
      id: "deactivate",
      label: "Deactivate Student",
      icon: UserX,
      color: "text-rose-600 dark:text-rose-400",
      isDestructive: true,
      action: () => onDeactivateStudent(student),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 ease-out z-10">
        {/* Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {studentName}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {admNo} • Class {student.className} ({student.sectionName || "A"})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleAction(act.action)}
                className={`w-full flex items-center gap-3.5 py-3 px-2 text-left text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer ${
                  act.isDestructive
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${act.color}`} />
                <span className="truncate">{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
