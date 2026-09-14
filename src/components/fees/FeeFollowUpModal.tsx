"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  History,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  recordFeeFollowUp,
  getFeeFollowUps,
} from "@/lib/services/fee.service";
import type {
  StudentFeeAssignment,
  FeeFollowUp,
  FeeFollowUpStatus,
} from "@/types";
import { useAuth } from "@/hooks/use-auth";

export interface FeeFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  assignment: StudentFeeAssignment | null;
  onFollowUpRecorded?: () => void;
}

export function FeeFollowUpModal({
  isOpen,
  onClose,
  schoolId,
  assignment,
  onFollowUpRecorded,
}: FeeFollowUpModalProps) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<FeeFollowUpStatus>("Contacted");
  const [channel, setChannel] = useState<FeeFollowUp["contactChannel"]>("Call");
  const [contactPerson, setContactPerson] = useState("Father");
  const [contactPhone, setContactPhone] = useState("");
  const [promisedDate, setPromisedDate] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // History log
  const [history, setHistory] = useState<FeeFollowUp[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (assignment) {
      setContactPhone(assignment.phone || assignment.parentPhone || "");
      setStatus(assignment.latestFollowUpStatus || "Contacted");
    }
  }, [assignment]);

  // Load existing follow up notes
  useEffect(() => {
    async function loadHistory() {
      if (!isOpen || !schoolId || !assignment?.studentId) return;
      setLoadingHistory(true);
      try {
        const list = await getFeeFollowUps(schoolId, assignment.studentId);
        setHistory(list);
      } catch (err) {
        console.warn("Could not load follow up history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [isOpen, schoolId, assignment]);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please add follow-up notes or remarks.");
      return;
    }

    setIsSaving(true);
    try {
      await recordFeeFollowUp(
        schoolId,
        {
          studentId: assignment.studentId,
          studentName: assignment.studentName,
          admissionNumber: assignment.admissionNumber,
          className: assignment.className,
          status,
          contactChannel: channel,
          contactPerson,
          contactPhone,
          promisedDate: status === "Promised" ? promisedDate : undefined,
          nextFollowUpDate: nextFollowUpDate || undefined,
          notes: notes.trim(),
        },
        profile?.email || profile?.name || "School Admin"
      );

      toast.success("Fee follow-up interaction recorded successfully!");
      setNotes("");
      onFollowUpRecorded?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record follow-up.");
    } finally {
      setIsSaving(false);
    }
  };

  const statuses: FeeFollowUpStatus[] = [
    "Pending",
    "Contacted",
    "Promised",
    "Partially Paid",
    "Paid",
    "No Response",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Record Fee Follow-up & CRM Note
              </h2>
              <p className="text-xs text-slate-500">
                {assignment.studentName} • Adm #{assignment.admissionNumber} • Dues: ₹{(assignment.totalPendingPaise / 100).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Status Selection */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Interaction Status <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {statuses.map((st) => {
                  const isSel = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`px-2.5 py-2 rounded-xl border text-center font-extrabold transition-all cursor-pointer ${
                        isSel
                          ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Channel and Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="In-Person">In-Person School Visit</option>
                  <option value="SMS">SMS Reminder</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Father, Mother, Guardian"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Promised Date & Next Follow-up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Promised Payment Date (if given)
                </label>
                <input
                  type="date"
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Follow-up Reminder Date
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            {/* Notes Text Area */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Conversation Notes / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Detail the discussion, guardian's response, reason for delay, or committed installment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Follow-up Entry</span>
              </button>
            </div>
          </form>

          {/* Past History Log */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
              <History className="h-4 w-4 text-purple-600" />
              <span>Past Follow-up Timeline</span>
            </div>

            {loadingHistory ? (
              <div className="py-4 text-center text-slate-400">Loading timeline...</div>
            ) : history.length === 0 ? (
              <p className="text-slate-400 italic">No previous follow-up entries for this student.</p>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-purple-600 dark:text-purple-400">
                        {h.status} • {h.contactChannel} ({h.contactPerson || "Guardian"})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{h.notes}</p>
                    {h.promisedDate && (
                      <p className="text-[11px] text-amber-600 font-semibold">
                        Promised payment by: {h.promisedDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
