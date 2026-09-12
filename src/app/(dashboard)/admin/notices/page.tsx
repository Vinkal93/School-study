"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  Pin,
  Archive,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Megaphone,
  Check,
  CheckCheck,
  Eye,
  Clock,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import {
  getNoticesForAdmin,
  createNotice,
  toggleNoticeStatus,
  deleteNotice,
  getNoticeDeliveryDetails,
  type NoticeDeliverySummary,
} from "@/lib/services/notice.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { Notice, NoticeAudience, NoticeStatus, SchoolClass, NoticeRecipientStatus } from "@/types";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { toast } from "sonner";

export default function AdminNoticesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("ALL_AUDIENCES");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  // Publish Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<NoticeAudience>("ALL");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);

  // Notice Read Receipts & WhatsApp Delivery Tracking Modal State
  const [trackingNotice, setTrackingNotice] = useState<Notice | null>(null);
  const [deliveryData, setDeliveryData] = useState<NoticeDeliverySummary | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<"ALL" | "read" | "delivered" | "sent">("ALL");

  const loadData = async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("notices_announcements")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [noticesList, clsList] = await Promise.all([
        getNoticesForAdmin(schoolId),
        getClassesWithSections(schoolId),
      ]);
      setNotices(noticesList);
      setClasses(clsList);
    } catch (err) {
      console.error("Failed to load notices:", err);
      toast.error("Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleOpenTracking = async (notice: Notice) => {
    setTrackingNotice(notice);
    setIsTrackingLoading(true);
    setRecipientSearch("");
    setRecipientStatusFilter("ALL");
    try {
      const details = await getNoticeDeliveryDetails(schoolId, notice);
      setDeliveryData(details);
    } catch (err) {
      console.error("Failed to load notice delivery details:", err);
      toast.error("Failed to load delivery receipts.");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handlePublishNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter a title and message.");
      return;
    }

    if (audience === "CLASS" && !selectedClassId) {
      toast.error("Please select a target class for class-specific notice.");
      return;
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId);

    setIsSubmitting(true);
    try {
      await createNotice(
        schoolId,
        {
          title: title.trim(),
          message: message.trim(),
          audience,
          classId: selectedClassId,
          className: selectedClass?.name || "",
          date,
        },
        profile?.uid || "",
        profile?.name || "School Administration"
      );

      toast.success("Notice published successfully!");
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error("Failed to publish notice:", err);
      toast.error(err.message || "Failed to publish notice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setAudience("ALL");
    setSelectedClassId("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleToggleStatus = async (notice: Notice) => {
    const nextStatus: NoticeStatus = notice.status === "active" ? "archived" : "active";
    try {
      await toggleNoticeStatus(schoolId, notice.id, nextStatus);
      setNotices((prev) =>
        prev.map((n) => (n.id === notice.id ? { ...n, status: nextStatus } : n))
      );
      toast.success(`Notice moved to ${nextStatus}.`);
    } catch (err) {
      toast.error("Failed to update notice status.");
    }
  };

  const handleDeleteNotice = (notice: Notice) => {
    setDeletingNotice(notice);
  };

  const handleConfirmDeleteNotice = async () => {
    if (!deletingNotice) return;
    setIsDeletingNotice(true);
    try {
      await deleteNotice(schoolId, deletingNotice.id);
      setNotices((prev) => prev.filter((n) => n.id !== deletingNotice.id));
      toast.success(`Notice "${deletingNotice.title}" deleted.`);
      setDeletingNotice(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete notice.");
    } finally {
      setIsDeletingNotice(false);
    }
  };

  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAudience =
      audienceFilter === "ALL_AUDIENCES" ? true : n.audience === audienceFilter;

    const matchesStatus =
      statusFilter === "all" ? true : n.status === statusFilter;

    return matchesSearch && matchesAudience && matchesStatus;
  });

  const activeCount = notices.filter((n) => n.status === "active").length;
  const teacherNotices = notices.filter((n) => n.audience === "TEACHERS").length;
  const studentNotices = notices.filter((n) => n.audience === "STUDENTS").length;

  return (
    <EntitlementGate
      feature="notices_announcements"
      title="School Notice Board & Circulars"
      description="Broadcast official school announcements, circulars, and target notices to teachers, students, or specific classes."
      requiredPlan="Professional Plan"
    >
      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            School Notice Board & Circulars
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Publish announcements targeted to entire school, teachers, students, or specific grades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              if (profile?.role !== "super_admin" && !canAccess("notices_announcements")) {
                toast.error("Notices & Announcements is not included in your current plan. Please upgrade to unlock.");
                return;
              }
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Publish Notice
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Notices</span>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{notices.length}</p>
          </div>
          <Megaphone className="h-8 w-8 text-blue-500 opacity-80" />
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Active Circulars</span>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-0.5">{activeCount}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-600 opacity-80" />
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Faculty Notices</span>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-0.5">{teacherNotices}</p>
          </div>
          <Users className="h-8 w-8 text-purple-600 opacity-80" />
        </div>

        <div className="rounded-xl border border-pink-200 bg-pink-50/50 p-4 shadow-sm dark:border-pink-900/40 dark:bg-pink-950/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-pink-700 dark:text-pink-400">Student Circulars</span>
            <p className="text-2xl font-bold text-pink-800 dark:text-pink-300 mt-0.5">{studentNotices}</p>
          </div>
          <GraduationCap className="h-8 w-8 text-pink-600 opacity-80" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars, notices..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Audience Filter */}
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="ALL_AUDIENCES">All Audiences</option>
            <option value="ALL">Entire School (ALL)</option>
            <option value="TEACHERS">Teachers Only</option>
            <option value="STUDENTS">Students Only</option>
            <option value="CLASS">Class Specific</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(["all", "active", "archived"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notices Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
            <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No notices found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Publish circulars to inform teachers and students of events and notices.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Publish First Notice
            </button>
          </div>
        ) : (
          filteredNotices.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-5 shadow-sm transition-all ${
                n.status === "active"
                  ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                  : "border-gray-200 bg-gray-50/50 opacity-75 dark:border-gray-800 dark:bg-gray-900/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      n.audience === "ALL"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : n.audience === "TEACHERS"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                        : n.audience === "STUDENTS"
                        ? "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300"
                        : "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                    }`}
                  >
                    <Pin className="h-3 w-3" />
                    Target: {n.audience} {n.className ? `(${n.className})` : ""}
                  </span>

                  <span className="text-xs text-gray-400">• {n.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(n)}
                    className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {n.status === "active" ? "Archive" : "Restore"}
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                  <button
                    onClick={() => handleDeleteNotice(n)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {n.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {n.message}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span>Posted by <strong className="font-semibold text-gray-700 dark:text-gray-300">{n.createdByName || "Admin"}</strong></span>
                </div>

                {/* WhatsApp-Style Read & Delivery Receipts Indicator */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenTracking(n)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors font-medium text-xs shadow-2xs"
                    title="Track recipient delivery and read status (WhatsApp ticks)"
                  >
                    {Object.keys(n.readBy || {}).length > 0 ? (
                      <span className="flex items-center text-sky-600 dark:text-sky-400 font-bold" title="Read by users">
                        <CheckCheck className="h-4 w-4 text-sky-500" />
                      </span>
                    ) : Object.keys(n.deliveredTo || {}).length > 0 ? (
                      <span className="flex items-center text-gray-400" title="Delivered to users (logged in)">
                        <CheckCheck className="h-4 w-4 text-gray-400" />
                      </span>
                    ) : (
                      <span className="flex items-center text-gray-400" title="Dispatched / Sent (Offline)">
                        <Check className="h-4 w-4 text-gray-400" />
                      </span>
                    )}
                    <span>
                      {Object.keys(n.readBy || {}).length} Read
                    </span>
                    <span className="text-sky-300 dark:text-sky-700">•</span>
                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                      Track Receipts →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==========================================
          MODAL: PUBLISH NEW NOTICE
      ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <EntitlementGate feature="notices_announcements" title="Notices & Announcements Locked" requiredPlan="Professional Plan">
            <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Publish School Notice
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Sends circular to students, teachers, or specific grades.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublishNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notice Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. School Closed on Friday for Holiday"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as NoticeAudience)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="ALL">Entire School (Students & Teachers)</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="CLASS">Specific Class Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {audience === "CLASS" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Target Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notice Message / Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write the full circular announcement..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Notice"
                  )}
                </button>
              </div>
            </form>
          </div>
        </EntitlementGate>
      </div>
    )}

      {/* Notice Delivery & Read Receipts Modal (WhatsApp-Style Ticks) */}
      {trackingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Live Delivery Tracking
                  </span>
                  <span className="text-xs text-gray-400">• Posted {trackingNotice.date}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {trackingNotice.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                  Target: {trackingNotice.audience} {trackingNotice.className ? `(${trackingNotice.className})` : ""}
                </p>
              </div>
              <button
                onClick={() => setTrackingNotice(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* WhatsApp Tick Explanations & KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800">
                  <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Total Recipients</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {deliveryData?.summary.total || 0}
                  </div>
                </div>

                {/* Double Blue Tick: Read */}
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    <CheckCheck className="h-4 w-4 text-sky-500 shrink-0" />
                    <span>Read (Seen)</span>
                  </div>
                  <div className="text-xl font-bold text-sky-900 dark:text-sky-200 mt-0.5">
                    {deliveryData?.summary.read || 0}
                    <span className="text-xs font-normal text-sky-600 dark:text-sky-400 ml-1">
                      ({deliveryData?.summary.readPercentage || 0}%)
                    </span>
                  </div>
                </div>

                {/* Double Grey Tick: Delivered Unread */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <CheckCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Delivered</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-200 mt-0.5">
                    {deliveryData?.summary.delivered || 0}
                  </div>
                </div>

                {/* Single Grey Tick: Offline / Sent */}
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    <Check className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Offline (Sent)</span>
                  </div>
                  <div className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5">
                    {deliveryData?.summary.offline || 0}
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search candidate by name or class..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg text-xs overflow-x-auto">
                  {(["ALL", "read", "delivered", "sent"] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setRecipientStatusFilter(filterKey)}
                      className={`px-2.5 py-1 rounded-md font-medium text-[11px] whitespace-nowrap transition-colors ${
                        recipientStatusFilter === filterKey
                          ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {filterKey === "ALL"
                        ? `All (${deliveryData?.summary.total || 0})`
                        : filterKey === "read"
                        ? `Read (${deliveryData?.summary.read || 0})`
                        : filterKey === "delivered"
                        ? `Delivered (${deliveryData?.summary.delivered || 0})`
                        : `Offline (${deliveryData?.summary.offline || 0})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Recipients Table */}
              {isTrackingLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                  <span className="text-xs text-gray-500">Checking delivery receipts...</span>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="px-3.5 py-2.5">Candidate Name</th>
                          <th className="px-3.5 py-2.5">Role</th>
                          <th className="px-3.5 py-2.5">Class / Dept</th>
                          <th className="px-3.5 py-2.5">Status (WhatsApp Ticks)</th>
                          <th className="px-3.5 py-2.5 text-right">Read Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950">
                        {(() => {
                          const list = (deliveryData?.recipients || []).filter((r) => {
                            if (recipientStatusFilter !== "ALL" && r.status !== recipientStatusFilter) return false;
                            if (recipientSearch) {
                              const q = recipientSearch.toLowerCase();
                              return (
                                r.name.toLowerCase().includes(q) ||
                                (r.className && r.className.toLowerCase().includes(q)) ||
                                (r.email && r.email.toLowerCase().includes(q))
                              );
                            }
                            return true;
                          });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                                  No candidates match the selected filter.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((c) => (
                            <tr key={c.userId} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-medium text-gray-900 dark:text-white">
                                {c.name}
                                {c.email && (
                                  <div className="text-[10px] text-gray-400 font-normal">{c.email}</div>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    c.role === "teacher"
                                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                  }`}
                                >
                                  {c.role}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-gray-600 dark:text-gray-300">
                                {c.className || "—"}
                              </td>
                              <td className="px-3.5 py-2.5">
                                {c.status === "read" ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[11px] font-semibold">
                                    <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                                    <span>Read</span>
                                  </div>
                                ) : c.status === "delivered" ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                                    <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Delivered (Unread)</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                                    <Check className="h-3.5 w-3.5 text-amber-500" />
                                    <span>Offline (Not Seen)</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                {c.readAt ? (
                                  new Date(c.readAt).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                ) : c.deliveredAt ? (
                                  <span className="text-gray-400">Active {new Date(c.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                ) : (
                                  <span className="text-gray-400">Offline</span>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20 text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-gray-400" /> Single Tick = Offline</span>
                <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5 text-gray-400" /> Double Grey = Logged In</span>
                <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium"><CheckCheck className="h-3.5 w-3.5 text-sky-500" /> Double Blue = Read</span>
              </div>
              <button
                onClick={() => setTrackingNotice(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingNotice)}
        onClose={() => setDeletingNotice(null)}
        onConfirm={handleConfirmDeleteNotice}
        title="Delete Notice"
        itemName={deletingNotice?.title}
        itemId={deletingNotice?.id}
        isDeleting={isDeletingNotice}
        message="Are you sure you want to permanently delete this announcement? This action will remove it from all student, parent, and teacher portals."
      />
      </div>
    </EntitlementGate>
  );
}
