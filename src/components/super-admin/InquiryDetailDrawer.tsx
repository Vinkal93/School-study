"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Shield,
  MessageSquare,
  Send,
  Loader2,
  ChevronRight,
  ArrowRight,
  Archive,
  RotateCcw,
  Sparkles,
  Check,
  Calendar,
} from "lucide-react";
import {
  Inquiry,
  InquiryNote,
  InquiryActivity,
  InquiryStatus,
  InquiryPriority,
} from "@/lib/inquiries";
import { toast } from "sonner";

interface InquiryDetailDrawerProps {
  inquiryId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function InquiryDetailDrawer({
  inquiryId,
  onClose,
  onUpdate,
}: InquiryDetailDrawerProps) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [notes, setNotes] = useState<InquiryNote[]>([]);
  const [activities, setActivities] = useState<InquiryActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline">("overview");

  // Action states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  const fetchDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/inquiries/${id}`);
      if (!res.ok) throw new Error("Failed to fetch inquiry detail");
      const json = await res.json();
      setInquiry(json.inquiry);
      setNotes(json.notes || []);
      setActivities(json.activities || []);

      // Auto-mark as viewed on server
      if (json.inquiry && !json.inquiry.viewedAt) {
        fetch(`/api/super-admin/inquiries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "markViewed" }),
        }).catch(() => {});
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load inquiry detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inquiryId) {
      fetchDetail(inquiryId);
    } else {
      setInquiry(null);
    }
  }, [inquiryId]);

  if (!inquiryId) return null;

  const handleStatusChange = async (targetStatus: InquiryStatus) => {
    if (!inquiry) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/super-admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      toast.success(json.message || `Status updated to ${targetStatus}`);
      setInquiry(json.inquiry);
      fetchDetail(inquiry.id);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
      setShowResolveModal(false);
    }
  };

  const handlePriorityChange = async (newPriority: InquiryPriority) => {
    if (!inquiry) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/super-admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update priority");

      toast.success(`Priority updated to ${newPriority}`);
      setInquiry(json.inquiry);
      fetchDetail(inquiry.id);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update priority.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry || !newNoteText.trim()) return;
    setSubmittingNote(true);

    try {
      const res = await fetch(`/api/super-admin/inquiries/${inquiry.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNoteText.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add note");

      toast.success("Internal note added.");
      setNewNoteText("");
      fetchDetail(inquiry.id);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to add internal note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            NEW
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            IN PROGRESS
          </span>
        );
      case "WAITING_FOR_RESPONSE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            WAITING RESPONSE
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            RESOLVED
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            CLOSED
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: InquiryPriority) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500 text-white px-2 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-xs">
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
            HIGH
          </span>
        );
      case "NORMAL":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 text-[11px] font-medium">
            NORMAL
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 text-[11px] font-medium">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Inquiry Details
                  </h2>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    #{inquiryId.slice(0, 8)}
                  </span>
                </div>
                {inquiry && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Received {new Date(inquiry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Content Body */}
          {loading || !inquiry ? (
            <div className="flex-1 p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Loading inquiry context...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Badges & Status Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {getStatusBadge(inquiry.status)}
                  {getPriorityBadge(inquiry.priority)}
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Source: {inquiry.source}
                  </span>
                </div>

                {/* Priority Change Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Priority:</span>
                  <select
                    value={inquiry.priority}
                    onChange={(e) => handlePriorityChange(e.target.value as InquiryPriority)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Quick Actions
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {inquiry.status !== "IN_PROGRESS" && (
                    <button
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900/40 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors"
                    >
                      Mark In Progress
                    </button>
                  )}

                  {inquiry.status !== "WAITING_FOR_RESPONSE" && (
                    <button
                      onClick={() => handleStatusChange("WAITING_FOR_RESPONSE")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/40 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-colors"
                    >
                      Mark Waiting
                    </button>
                  )}

                  {inquiry.status !== "RESOLVED" && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {inquiry.status !== "CLOSED" && (
                    <button
                      onClick={() => handleStatusChange("CLOSED")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                    >
                      Close Inquiry
                    </button>
                  )}

                  {(inquiry.status === "RESOLVED" || inquiry.status === "CLOSED") && (
                    <button
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold border border-blue-200 transition-colors inline-flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Sender & Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span>Sender Name</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{inquiry.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{inquiry.organization}</span>
                  </p>
                  {inquiry.location && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{inquiry.location}</span>
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                    <span>Direct Contact Actions</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {inquiry.email && (
                      <a
                        href={`mailto:${inquiry.email}?subject=Re:%20${encodeURIComponent(inquiry.subject)}`}
                        className="inline-flex items-center gap-2 w-full px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email: {inquiry.email}</span>
                      </a>
                    )}
                    {inquiry.phone && (
                      <a
                        href={`tel:${inquiry.phone}`}
                        className="inline-flex items-center gap-2 w-full px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call: {inquiry.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Original Immutable Message */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Subject & Submitted Message
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {inquiry.subject}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                    {inquiry.message}
                  </p>
                </div>
              </div>

              {/* Navigation Tabs (Overview, Notes, Timeline) */}
              <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2 transition-colors border-b-2 ${
                    activeTab === "overview"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Overview Details
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === "notes"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <span>Internal Notes</span>
                  <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px]">
                    {notes.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`pb-2 transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === "timeline"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <span>Activity Timeline</span>
                  <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px]">
                    {activities.length}
                  </span>
                </button>
              </div>

              {/* Tab 1: Overview Details */}
              {activeTab === "overview" && (
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-600">Created At:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {new Date(inquiry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-600">Last Updated:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {new Date(inquiry.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    {inquiry.viewedAt && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-600">First Viewed:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {new Date(inquiry.viewedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {inquiry.resolvedAt && (
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-600">Resolved At:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-bold">
                          {new Date(inquiry.resolvedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Internal Notes */}
              {activeTab === "notes" && (
                <div className="space-y-4">
                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <label htmlFor="inquiry-internal-note-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Add Internal Note (Staff Only)
                    </label>
                    <textarea
                      id="inquiry-internal-note-input"
                      name="note"
                      aria-label="Add internal note for staff"
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="e.g. Called school admin. Demo scheduled for Monday 11:00 AM."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingNote || !newNoteText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {submittingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span>Save Internal Note</span>
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-3 pt-2">
                    {notes.length === 0 ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic text-center py-4">
                        No internal notes recorded yet.
                      </p>
                    ) : (
                      notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-slate-900 dark:text-white">{n.authorName}</span>
                            <span>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                            {n.note}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Activity Timeline */}
              {activeTab === "timeline" && (
                <div className="space-y-4 pt-1">
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {activities.map((act) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-white dark:ring-slate-950">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                            <span>{act.message}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            By {act.actorName} • {new Date(act.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Resolve Action */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Mark Inquiry as Resolved?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  This will mark the status as RESOLVED and stamp your resolution timestamp in Firestore.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange("RESOLVED")}
                disabled={updatingStatus}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
              >
                Confirm Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
