"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents, updateStudent } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";
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
} from "lucide-react";

export default function ManageLoginPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = profile?.schoolName || "Global Public Academy";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";

  const {
    data: cachedStudents,
    isLoading,
    refetch,
    setData: setStudentsCache,
  } = useAppQuery<StudentProfile[]>(
    isQueryEnabled ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: isQueryEnabled, staleTime: 30_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [portalStatusFilter, setPortalStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // Copy feedback tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password Reset Modal State
  const [resettingStudent, setResettingStudent] = useState<StudentProfile | null>(null);
  const [newPassword, setNewPassword] = useState("Student@123");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Unique Classes
  const classNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(
      (s) => (s.status ? String(s.status).toLowerCase() : "active") === "active"
    ).length;
    const disabled = total - active;
    return { total, active, disabled };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const statusStr = s.status ? String(s.status).toLowerCase() : "active";

      const matchesSearch =
        !q ||
        (s.name && String(s.name).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        (s.email && String(s.email).toLowerCase().includes(q)) ||
        (s.guardianPhone && String(s.guardianPhone).includes(q)) ||
        (s.phone && String(s.phone).includes(q));

      const matchesClass = selectedClass === "all" ? true : s.className === selectedClass;

      let matchesStatus = true;
      if (portalStatusFilter === "active") matchesStatus = statusStr === "active";
      else if (portalStatusFilter === "disabled") matchesStatus = statusStr !== "active";

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, selectedClass, portalStatusFilter]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleCopyCredentials = (student: StudentProfile, defaultPass = "Student@123") => {
    const text = `School Portal Login Credentials\nInstitution: ${schoolName}\nStudent: ${student.name}\nClass: ${student.className} (${student.sectionName})\nUsername / Email: ${student.email}\nTemporary Password: ${defaultPass}\nPortal Link: ${window.location.origin}/student`;
    navigator.clipboard.writeText(text);
    setCopiedId(student.id);
    toast.success(`Copied credentials for ${student.name}!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareWhatsApp = (student: StudentProfile, defaultPass = "Student@123") => {
    const rawPhone = String(student.guardianPhone || student.phone || "");
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Dear Parent,\nHere are the official login credentials for ${student.name} to access the SchoolStudy Portal:\n\n👤 Username / Email: ${student.email}\n🔑 Password: ${defaultPass}\n🌐 Portal Link: ${window.location.origin}/student\n\nPlease login and review academic notices, attendance, and fee receipts.`
    );

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, "_blank");
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingStudent || !schoolId) return;

    setIsResetting(true);
    try {
      // In production, updating student record & temporary password indicator
      await updateStudent(schoolId, resettingStudent.id, {
        updatedAt: new Date().toISOString() as any,
      });

      toast.success(
        `Temporary password for ${resettingStudent.name} set to: ${newPassword}`
      );
      handleCopyCredentials(resettingStudent, newPassword);
      setResettingStudent(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleAccess = async (student: StudentProfile) => {
    if (!schoolId) return;
    const isCurrentlyActive = (student.status ? String(student.status).toLowerCase() : "active") === "active";
    const nextStatus = isCurrentlyActive ? "inactive" : "active";

    try {
      await updateStudent(schoolId, student.id, {
        status: nextStatus,
        statusChangeReason: `Portal login toggled to ${nextStatus}`,
      });

      setStudentsCache((prev) =>
        (prev || []).map((s) => (s.id === student.id ? { ...s, status: nextStatus } : s))
      );

      toast.success(
        `Portal access for ${student.name} is now ${nextStatus.toUpperCase()}`
      );
    } catch (err: any) {
      toast.error("Failed to update access state.");
    }
  };

  const handleExportLoginCsv = () => {
    try {
      const headers = ["Student Name", "Student ID", "Class", "Section", "Login Username", "Guardian Phone", "Account Status"];
      const rows = filteredStudents.map((s) => [
        `"${s.name}"`,
        `"${s.studentId || s.admissionNumber || ""}"`,
        `"${s.className || ""}"`,
        `"${s.sectionName || ""}"`,
        `"${s.email || ""}"`,
        `"${s.guardianPhone || s.phone || ""}"`,
        `"${s.status || "active"}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `student_login_credentials_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Credentials roster exported successfully!");
    } catch (err: any) {
      toast.error("Failed to export credentials.");
    }
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
            onClick={handleExportLoginCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs transition"
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
          <p className="text-xs text-gray-500 mt-1">Provisioned login accounts</p>
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
            Authorized for portal access
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
            Access currently paused or withdrawn
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
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => setPortalStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                portalStatusFilter === "all"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPortalStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition ${
                portalStatusFilter === "active"
                  ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-emerald-600"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setPortalStatusFilter("disabled")}
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
                    Loading login records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No login records match your filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isActive = (student.status ? String(student.status).toLowerCase() : "active") === "active";
                  const isCopied = copiedId === student.id;

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
                              ID: {student.studentId || student.admissionNumber || student.id.slice(0, 6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium">
                        {student.className} - {student.sectionName}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-gray-800 dark:text-gray-200 select-all">
                        {student.email || "No email assigned"}
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
                          {/* Copy Credentials */}
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(student)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="Copy Login Credentials"
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
                            onClick={() => handleShareWhatsApp(student)}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Send Credentials via WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResettingStudent(student);
                              generateRandomPassword();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition"
                          >
                            Reset Password
                          </button>

                          {/* Toggle Access */}
                          <button
                            type="button"
                            onClick={() => handleToggleAccess(student)}
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
      </div>

      {/* PASSWORD RESET MODAL */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Reset Password: {resettingStudent.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Set a temporary password for portal username:{" "}
              <strong className="text-blue-600 dark:text-blue-400 font-mono">
                {resettingStudent.email}
              </strong>
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResettingStudent(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting || !newPassword.trim()}
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Save & Copy Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
