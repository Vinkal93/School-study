"use client";

import { useState } from "react";
import {
  AlertTriangle,
  X,
  Calendar,
  FileText,
  User,
  CheckCircle2,
  Loader2,
  Tag,
  ShieldAlert,
} from "lucide-react";
import type { ComplaintCategory, ComplaintSeverity } from "@/types/complaint";
import { toast } from "sonner";

interface RegisterComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    studentId?: string;
    uid?: string;
    name: string;
    className?: string;
    sectionName?: string;
    rollNumber?: string | number;
  };
  onSuccess?: () => void;
}

const CATEGORIES: { value: ComplaintCategory; label: string; description: string }[] = [
  { value: "DISCIPLINE", label: "Discipline", description: "Disruptive conduct or rule violation" },
  { value: "ATTENDANCE", label: "Attendance", description: "Unexcused absence or chronic lateness" },
  { value: "ACADEMIC", label: "Academic", description: "Incomplete homework or exam irregularities" },
  { value: "BEHAVIOR", label: "Behavior", description: "Inappropriate language or disrespect" },
  { value: "FEES", label: "Fee Default", description: "Pending institutional fees or dues" },
  { value: "MISCONDUCT", label: "Misconduct", description: "Bullying, harassment, or safety breaches" },
  { value: "OTHER", label: "Other", description: "General non-classified concern" },
];

const SEVERITIES: { value: ComplaintSeverity; label: string; color: string; badge: string }[] = [
  { value: "LOW", label: "Low", color: "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40", badge: "bg-blue-500" },
  { value: "MEDIUM", label: "Medium", color: "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40", badge: "bg-amber-500" },
  { value: "HIGH", label: "High", color: "border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/40", badge: "bg-orange-500" },
  { value: "CRITICAL", label: "Critical", color: "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40", badge: "bg-rose-500" },
];

export function RegisterComplaintModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: RegisterComplaintModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("DISCIPLINE");
  const [severity, setSeverity] = useState<ComplaintSeverity>("MEDIUM");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please enter a title and detailed description.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id || student.studentId,
          studentUid: student.uid || student.id,
          studentName: student.name,
          className: student.className || "",
          sectionName: student.sectionName || "",
          title: title.trim(),
          category,
          severity,
          incidentDate,
          description: description.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit complaint.");
      }

      toast.success(`Complaint registered successfully for ${student.name}.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to register complaint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Register Student Complaint
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official disciplinary or behavioral record for faculty & administration.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Read-Only Student Identification Banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {student.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Target Student
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Class: {student.className || "—"} {student.sectionName ? `(${student.sectionName})` : ""}{" "}
                • Roll #{student.rollNumber ?? "—"}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
            {student.studentId || student.id}
          </span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Complaint Title */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Complaint Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Repeated disruption during Mathematics session"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Category & Severity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label} ({c.description})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                Severity Level <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                      severity === s.value
                        ? `${s.color} ring-2 ring-rose-500 font-extrabold shadow-xs`
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Date */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Incident Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Detailed Incident Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened, location, witnesses, or prior warnings given..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Additional Confidential Notes */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Additional Follow-up / Administrative Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Guardian notified via phone call at 11:30 AM"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Submit Complaint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
