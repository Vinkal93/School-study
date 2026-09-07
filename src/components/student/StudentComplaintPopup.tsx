"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, ArrowRight, X, Clock, Calendar, Tag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToStudentComplaints } from "@/lib/services/complaint.service";
import type { StudentComplaint } from "@/types/complaint";

export function StudentComplaintPopup() {
  const { profile, firebaseUser } = useAuth();
  const router = useRouter();

  const [unacknowledgedComplaint, setUnacknowledgedComplaint] = useState<StudentComplaint | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const schoolId = profile?.schoolId || "";
  const studentUid = profile?.uid || firebaseUser?.uid || "";
  const isStudent = profile?.role === "student";

  useEffect(() => {
    if (!isStudent || !schoolId || !studentUid) return;

    // Realtime subscription for complaints targeting this student
    const unsub = subscribeToStudentComplaints(schoolId, studentUid, (complaints) => {
      // Find the most recent active complaint that has not been dismissed or acknowledged
      const unacked = complaints.find((c) => {
        if (c.status !== "OPEN" && c.status !== "UNDER_REVIEW") return false;
        try {
          const ackKey = `ss_complaint_ack_${c.id}`;
          return localStorage.getItem(ackKey) !== "true";
        } catch (e) {
          return false;
        }
      });

      if (unacked) {
        setUnacknowledgedComplaint(unacked);
        setIsOpen(true);
      }
    });

    return () => unsub();
  }, [isStudent, schoolId, studentUid]);

  if (!isOpen || !unacknowledgedComplaint) return null;

  const handleAcknowledge = () => {
    try {
      localStorage.setItem(`ss_complaint_ack_${unacknowledgedComplaint.id}`, "true");
    } catch (e) {}
    setIsOpen(false);
  };

  const handleViewDetails = () => {
    handleAcknowledge();
    router.push(`/student/notifications?tab=complaint&id=${unacknowledgedComplaint.id}`);
  };

  const severityColor =
    unacknowledgedComplaint.severity === "CRITICAL"
      ? "bg-rose-500 text-white"
      : unacknowledgedComplaint.severity === "HIGH"
      ? "bg-orange-500 text-white"
      : unacknowledgedComplaint.severity === "MEDIUM"
      ? "bg-amber-500 text-white"
      : "bg-blue-500 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden animate-scaleUp">
        {/* Banner Top */}
        <div className="bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">New Complaint Registered</h3>
              <p className="text-[11px] text-rose-100">Disciplinary notice regarding your account</p>
            </div>
          </div>
          <button
            onClick={handleAcknowledge}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Title & Badges */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${severityColor}`}>
                {unacknowledgedComplaint.severity} Severity
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {unacknowledgedComplaint.category}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
              {unacknowledgedComplaint.title}
            </h4>
          </div>

          {/* Description Snippet */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="line-clamp-3">{unacknowledgedComplaint.description}</p>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Incident: {unacknowledgedComplaint.incidentDate}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              By: {unacknowledgedComplaint.createdByRole === "teacher" ? "Faculty Teacher" : "Administration"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleAcknowledge}
              className="w-1/2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className="w-1/2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
