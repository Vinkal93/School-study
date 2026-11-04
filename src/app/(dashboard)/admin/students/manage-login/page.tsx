"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Search,
  ArrowLeft,
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Sparkles,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Link as LinkIcon,
  Send,
  Phone,
  Info,
} from "lucide-react";

interface StudentLoginRecord {
  id: string;
  name: string;
  studentId: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  status: "active" | "disabled";
  portalAccess: boolean;
  hasAuthAccount: boolean;
  userId: string | null;
  lastPasswordResetAt: string | null;
  lastActiveAt: string | null;
}

interface ManageLoginStats {
  total: number;
  active: number;
  disabled: number;
  pending: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalFiltered: number;
  totalPages: number;
}

export default function ManageLoginPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = profile?.schoolName || "School Administration";

  // Data states
  const [students, setStudents] = useState<StudentLoginRecord[]>([]);
  const [stats, setStats] = useState<ManageLoginStats>({
    total: 0,
    active: 0,
    disabled: 0,
    pending: 0,
  });
  const [classesList, setClassesList] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalFiltered: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [portalStatusFilter, setPortalStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Copy tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal 1: Reset Password Modal
  const [resettingStudent, setResettingStudent] = useState<StudentLoginRecord | null>(null);
  const [resetMode, setResetMode] = useState<"password" | "link">("password");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modal 2: Access Toggle (Disable / Enable) Modal
  const [togglingStudent, setTogglingStudent] = useState<StudentLoginRecord | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [isToggling, setIsToggling] = useState(false);

  // Modal 3: WhatsApp Dispatch Modal
  const [whatsappStudent, setWhatsappStudent] = useState<StudentLoginRecord | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappResetLink, setWhatsappResetLink] = useState("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Students & Stats from API
  const fetchLoginRecords = useCallback(async () => {
    if (authLoading || !firebaseUser || !schoolId || schoolId === "system") {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "25",
        q: debouncedSearch,
        classId: selectedClass,
        status: portalStatusFilter,
      });

      const res = await fetch(`/api/admin/students/manage-login?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load login roster: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        if (data.stats) setStats(data.stats);
        if (data.classes) setClassesList(data.classes);
        if (data.pagination) setPagination(data.pagination);
      } else {
        toast.error(data.error || "Unable to fetch login data.");
      }
    } catch (err: any) {
      console.error("Manage Login Fetch Error:", err);
      toast.error(err?.message || "Connection error loading login records.");
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, firebaseUser, schoolId, currentPage, debouncedSearch, selectedClass, portalStatusFilter]);

  useEffect(() => {
    fetchLoginRecords();
  }, [fetchLoginRecords]);

  // Generate strong random password
  const generateRandomPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%";
    const all = upper + lower + numbers + symbols;

    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 0; i < 6; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length));
    }
    setNewPassword(pwd);
  };

  // Copy Username / Login Identifier
  const handleCopyUsername = (student: StudentLoginRecord) => {
    const identifier = student.studentId || student.admissionNumber || student.email;
    navigator.clipboard.writeText(identifier);
    setCopiedId(student.id);
    toast.success(`Copied username "${identifier}" to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (student: StudentLoginRecord) => {
    setResettingStudent(student);
    setResetMode("password");
    setGeneratedResetLink(null);
    setCopiedLink(false);
    generateRandomPassword();
  };

  // Submit Password Reset (Option A: Custom Password)
  const handleConfirmPasswordReset = async () => {
    if (!resettingStudent) return;
    if (!newPassword || newPassword.trim().length < 6) {
      toast.warning("Password must be at least 6 characters long.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/students/${resettingStudent.id}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password.");
      }

      toast.success(`Password for ${resettingStudent.name} updated successfully!`);

      // Copy credentials to clipboard for admin convenience
      const credText = `Student Login Credentials\nSchool: ${schoolName}\nStudent: ${resettingStudent.name}\nLogin ID / Username: ${resettingStudent.studentId || resettingStudent.admissionNumber || resettingStudent.email}\nNew Password: ${newPassword.trim()}\nLogin URL: ${window.location.origin}/student/login`;
      navigator.clipboard.writeText(credText).catch(() => {});

      // Refresh list
      fetchLoginRecords();
      setResettingStudent(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  // Generate Reset Link (Option B)
  const handleGenerateResetLink = async () => {
    if (!resettingStudent) return;

    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/students/${resettingStudent.id}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_reset_link" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.resetLink) {
        throw new Error(data.error || "Failed to generate password reset link.");
      }

      setGeneratedResetLink(data.resetLink);
      toast.success("Secure password reset link generated!");
    } catch (err: any) {
      toast.error(err?.message || "Could not generate reset link.");
    } finally {
      setIsResetting(false);
    }
  };

  // Open WhatsApp Modal
  const openWhatsAppModal = (student: StudentLoginRecord, prefilledLink?: string) => {
    setWhatsappStudent(student);
    const rawPhone = student.guardianPhone || student.phone || "";
    setWhatsappPhone(rawPhone);
    setWhatsappResetLink(prefilledLink || "");
  };

  // Dispatch WhatsApp
  const handleDispatchWhatsApp = async () => {
    if (!whatsappStudent) return;

    const phone = whatsappPhone.trim();
    if (!phone || phone.replace(/[^0-9]/g, "").length < 10) {
      toast.warning("Please provide a valid 10-digit mobile phone number.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const res = await fetch(`/api/admin/students/${whatsappStudent.id}/whatsapp-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: phone,
          resetLink: whatsappResetLink || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to prepare WhatsApp dispatch.");
      }

      if (data.mode === "api") {
        toast.success(data.message || "WhatsApp message dispatched successfully via gateway!");
        setWhatsappStudent(null);
      } else if (data.mode === "manual" && data.whatsappUrl) {
        toast.info("Opening WhatsApp with official pre-filled credentials...");
        window.open(data.whatsappUrl, "_blank");
        setWhatsappStudent(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send WhatsApp message.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Open Enable / Disable Confirmation Modal
  const openToggleAccessModal = (student: StudentLoginRecord) => {
    setTogglingStudent(student);
    setDisableReason("");
  };

  // Submit Enable / Disable Action
  const handleConfirmToggleAccess = async () => {
    if (!togglingStudent) return;

    const isCurrentlyActive = togglingStudent.status === "active";
    const action = isCurrentlyActive ? "disable" : "enable";

    setIsToggling(true);
    try {
      const res = await fetch(`/api/admin/students/${togglingStudent.id}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "disable" ? disableReason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action} student account.`);
      }

      toast.success(data.message || `Portal access for ${togglingStudent.name} is now ${data.status.toUpperCase()}`);

      // Optimistic state update
      setStudents((prev) =>
        prev.map((s) =>
          s.id === togglingStudent.id
            ? { ...s, status: data.status, portalAccess: data.status === "active" }
            : s
        )
      );

      // Refresh real stats
      fetchLoginRecords();
      setTogglingStudent(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update portal access state.");
    } finally {
      setIsToggling(false);
    }
  };

  // Export CSV Roster
  const handleExportCsv = () => {
    const params = new URLSearchParams({
      classId: selectedClass,
      status: portalStatusFilter,
      q: debouncedSearch,
    });
    window.location.href = `/api/admin/students/manage-login/export?${params.toString()}`;
    toast.success("Downloading official student credentials roster...");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/students" className="hover:text-blue-600 transition">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200 font-semibold">
              Manage Login
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Lock className="h-6 w-6" />
            </div>
            Student & Parent Login Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control student portal credentials, issue one-click password resets, and dispatch login details via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Students</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition active:scale-95"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV Slips</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Portal Accounts
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.pending > 0
              ? `${stats.pending} pending initial provisioning`
              : "All student portal accounts in system"}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/15 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Active Logins
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
            {stats.active}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Authorized for student portal access
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/15 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              Disabled / Blocked
            </span>
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-2">
            {stats.disabled}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            Access currently paused or suspended
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, login username/email, or guardian phone..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            {classesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => {
                setPortalStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                portalStatusFilter === "all"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setPortalStatusFilter("active");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                portalStatusFilter === "active"
                  ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-emerald-600"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setPortalStatusFilter("disabled");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                portalStatusFilter === "disabled"
                  ? "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-rose-600"
              }`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Main Credentials Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/75 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Portal Login Username / Email</th>
                <th className="py-3 px-4">Portal Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading verified login records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No login records match your filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isActive = student.status === "active";
                  const isCopied = copiedId === student.id;
                  const displayUsername = student.studentId || student.admissionNumber || student.email || "Pending Setup";

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              ID: {student.studentId || student.admissionNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium">
                        {student.className} {student.sectionName ? `(${student.sectionName})` : ""}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-800 dark:text-gray-200 select-all font-semibold">
                            {displayUsername}
                          </span>
                          {student.email && student.email !== displayUsername && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              ({student.email})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>{isActive ? "ACTIVE" : "BLOCKED"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Username */}
                          <button
                            type="button"
                            onClick={() => handleCopyUsername(student)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="Copy Login Username"
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {/* Share via WhatsApp */}
                          <button
                            type="button"
                            onClick={() => openWhatsAppModal(student)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Send Login Details via WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => openResetPasswordModal(student)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                          >
                            Reset Password
                          </button>

                          {/* Toggle Access (Enable / Disable) */}
                          <button
                            type="button"
                            onClick={() => openToggleAccessModal(student)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                              isActive
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Working Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {pagination.totalFiltered === 0 ? 0 : (currentPage - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {Math.min(currentPage * pagination.limit, pagination.totalFiltered)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {pagination.totalFiltered}
            </span>{" "}
            students {pagination.totalFiltered !== pagination.total ? `(filtered from ${pagination.total} total)` : ""}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-medium">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= pagination.totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: PASSWORD RESET MODAL */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Reset Portal Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Student: <strong className="text-gray-800 dark:text-gray-200">{resettingStudent.name}</strong>{" "}
                  ({resettingStudent.className})
                </p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setResetMode("password")}
                className={`py-2 rounded-lg transition ${
                  resetMode === "password"
                    ? "bg-white dark:bg-gray-900 text-blue-600 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Set New Password
              </button>
              <button
                type="button"
                onClick={() => setResetMode("link")}
                className={`py-2 rounded-lg transition ${
                  resetMode === "link"
                    ? "bg-white dark:bg-gray-900 text-blue-600 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Generate Reset Link
              </button>
            </div>

            {resetMode === "password" ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      New Password (Minimum 6 Characters)
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Generate Secure</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    This action will cryptographically update the student&apos;s Firebase Authentication credentials and immediately revoke all active browser sessions.
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setResettingStudent(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResetting || newPassword.trim().length < 6}
                    onClick={handleConfirmPasswordReset}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    {isResetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{isResetting ? "Updating in Firebase..." : "Update Password & Revoke Sessions"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Generate a secure, single-use password reset link. The student or guardian can set their own password directly without sharing it with the administrator.
                </p>

                {generatedResetLink ? (
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                      ✓ One-Time Reset Link Generated:
                    </span>
                    <input
                      readOnly
                      value={generatedResetLink}
                      className="w-full text-xs font-mono p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 select-all"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResetLink);
                          setCopiedLink(true);
                          toast.success("Reset link copied to clipboard!");
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const s = resettingStudent;
                          setResettingStudent(null);
                          openWhatsAppModal(s, generatedResetLink);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-200 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleGenerateResetLink}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      {isResetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <LinkIcon className="h-3.5 w-3.5" />
                      <span>{isResetting ? "Generating Link..." : "Generate One-Time Reset Link"}</span>
                    </button>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setResettingStudent(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ENABLE / DISABLE PORTAL ACCESS CONFIRMATION */}
      {togglingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  togglingStudent.status === "active"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"
                }`}
              >
                {togglingStudent.status === "active" ? (
                  <UserX className="h-5 w-5" />
                ) : (
                  <UserCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {togglingStudent.status === "active"
                    ? `Disable Portal Access: ${togglingStudent.name}`
                    : `Restore Portal Access: ${togglingStudent.name}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {togglingStudent.status === "active"
                    ? "Suspending access will disable this student's Firebase Auth account and terminate any active sessions."
                    : "Enabling access will restore student portal entry and permissions."}
                </p>
              </div>
            </div>

            {togglingStudent.status === "active" && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Optional Administrative Reason
                </label>
                <input
                  type="text"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="e.g. Fees overdue, transfer pending, administrative review"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTogglingStudent(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggling}
                onClick={handleConfirmToggleAccess}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 ${
                  togglingStudent.status === "active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isToggling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {isToggling
                    ? "Updating..."
                    : togglingStudent.status === "active"
                    ? "Confirm Disable"
                    : "Confirm Enable"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: WHATSAPP DISPATCH WORKFLOW */}
      {whatsappStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  <span>Share Login Details via WhatsApp</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Send official portal credentials to student or guardian.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Guardian / Contact Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {whatsappResetLink && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                    Included One-Time Password Reset Link
                  </label>
                  <input
                    readOnly
                    value={whatsappResetLink}
                    className="w-full text-xs font-mono p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 select-all"
                  />
                </div>
              )}

              {/* Message Preview Box */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Message Preview
                </label>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs font-sans text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {`Dear Parent / Guardian,
Greetings from ${schoolName}!

Here are the official login credentials for ${whatsappStudent.name} to access the Student & Guardian Portal:
👤 Portal Login ID: ${whatsappStudent.studentId || whatsappStudent.admissionNumber || whatsappStudent.email}
📧 Registered Email: ${whatsappStudent.email || "Registered with school"}
🔗 Portal Link: ${typeof window !== "undefined" ? window.location.origin : "https://school.sbci.online"}/student/login${whatsappResetLink ? `\n🌐 Set Password Link: ${whatsappResetLink}` : ""}

Please login to view academic notices, attendance, and fee invoices.
Regards,
${schoolName}`}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWhatsappStudent(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp || !whatsappPhone.trim()}
                onClick={handleDispatchWhatsApp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isSendingWhatsApp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{isSendingWhatsApp ? "Dispatching..." : "Send via WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
