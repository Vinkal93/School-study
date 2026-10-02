"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import {
  getStudents,
  toggleStudentStatus,
  updateStudent,
} from "@/lib/services/student.service";
import type { StudentProfile, StudentStatus } from "@/types";
import { toast } from "sonner";
import {
  Activity,
  UserCheck,
  UserX,
  ShieldAlert,
  FileText,
  Search,
  ArrowLeft,
  Lock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";

export default function StudentStatusPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
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
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive" | "suspended" | "left">("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  // Selection for bulk status updates
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Status Change Dialog State
  const [changingStudent, setChangingStudent] = useState<StudentProfile | null>(null);
  const [targetStatus, setTargetStatus] = useState<StudentStatus>("active");
  const [statusReason, setStatusReason] = useState("");
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);

  // Get unique classes for filter
  const classNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // KPI Calculations
  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let suspended = 0;
    let left = 0;

    students.forEach((s) => {
      const st = s.status ? String(s.status).toLowerCase() : "active";
      if (st === "active") active++;
      else if (st === "inactive") inactive++;
      else if (st === "suspended") suspended++;
      else if (st === "left" || st === "dropped" || st === "transferred" || st === "graduated") left++;
      else active++;
    });

    const total = students.length;
    return {
      total,
      active,
      inactive,
      suspended,
      left,
      activePct: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const currentStatus = s.status ? String(s.status).toLowerCase() : "active";

      const matchesSearch =
        !q ||
        (s.name && String(s.name).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        (s.admissionNumber && String(s.admissionNumber).toLowerCase().includes(q)) ||
        (s.className && String(s.className).toLowerCase().includes(q));

      const matchesClass =
        selectedClassFilter === "all" ? true : s.className === selectedClassFilter;

      let matchesStatus = true;
      if (statusTab === "active") matchesStatus = currentStatus === "active";
      else if (statusTab === "inactive") matchesStatus = currentStatus === "inactive";
      else if (statusTab === "suspended") matchesStatus = currentStatus === "suspended";
      else if (statusTab === "left")
        matchesStatus =
          currentStatus === "left" ||
          currentStatus === "dropped" ||
          currentStatus === "transferred" ||
          currentStatus === "graduated";

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, statusTab, selectedClassFilter]);

  // Handle Select All Checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Status Dialog
  const openStatusChangeDialog = (student: StudentProfile, newStatus: StudentStatus) => {
    setChangingStudent(student);
    setTargetStatus(newStatus);
    setStatusReason("");
  };

  // Submit Status Change
  const handleConfirmStatusChange = async () => {
    if (!changingStudent || !schoolId) return;

    setIsSubmittingChange(true);
    try {
      if (targetStatus === "active" || targetStatus === "inactive") {
        await toggleStudentStatus(schoolId, changingStudent.id, changingStudent.userId, targetStatus);
      }

      await updateStudent(schoolId, changingStudent.id, {
        status: targetStatus,
        statusChangeReason: statusReason || `Status updated to ${targetStatus}`,
        statusChangedDate: new Date().toISOString(),
      });

      // Update local cache optimistically
      setStudentsCache((prev) =>
        (prev || []).map((s) =>
          s.id === changingStudent.id
            ? {
                ...s,
                status: targetStatus,
                statusChangeReason: statusReason || `Status updated to ${targetStatus}`,
              }
            : s
        )
      );

      toast.success(
        `Updated status of "${changingStudent.name}" to ${targetStatus.toUpperCase()}!`
      );
      setChangingStudent(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update student status.");
    } finally {
      setIsSubmittingChange(false);
    }
  };

  // Bulk Status Update Handler
  const handleBulkStatusChange = async (bulkTarget: StudentStatus) => {
    if (selectedStudentIds.length === 0 || !schoolId) return;

    setIsBulkUpdating(true);
    try {
      const promises = selectedStudentIds.map(async (studentId) => {
        const student = students.find((s) => s.id === studentId);
        if (student) {
          if (bulkTarget === "active" || bulkTarget === "inactive") {
            await toggleStudentStatus(schoolId, student.id, student.userId, bulkTarget).catch(() => {});
          }
          await updateStudent(schoolId, student.id, {
            status: bulkTarget,
            statusChangeReason: `Bulk update to ${bulkTarget}`,
            statusChangedDate: new Date().toISOString(),
          }).catch(() => {});
        }
      });

      await Promise.all(promises);

      toast.success(`Successfully updated ${selectedStudentIds.length} students to ${bulkTarget}!`);
      setSelectedStudentIds([]);
      refetch(true);
    } catch (err: any) {
      toast.error("Failed to complete bulk status update.");
    } finally {
      setIsBulkUpdating(false);
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
              Active / Inactive
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400">
              <Activity className="h-6 w-6" />
            </div>
            Active / Inactive Status Governance
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800">
              <Lock className="h-3 w-3" />
              <span>Lifecycle Control</span>
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control student enrollment states, manage temporary leaves, disciplinary suspensions, and TC issuance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Students</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/15 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Active Enrolled
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
            {stats.active}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.activePct}% of total capacity
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Inactive / Leave
            </span>
            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.inactive}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            On extended/medical leave
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/15 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              Suspended
            </span>
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-2">
            {stats.suspended}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            Disciplinary / Fee hold
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/15 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              TC Issued / Left
            </span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-2">
            {stats.left}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Transfer certificates issued
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Records
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.total}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cumulative institution ledger
          </p>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID, or roll number..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="all">All Classes</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Tab Toggle */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusTab === "all"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusTab("active")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusTab === "active"
                  ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-emerald-600"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusTab("inactive")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusTab === "inactive"
                  ? "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setStatusTab("suspended")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusTab === "suspended"
                  ? "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-rose-600"
              }`}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900 text-xs font-medium text-pink-900 dark:text-pink-200">
          <div className="flex items-center gap-2">
            <span className="font-bold">{selectedStudentIds.length}</span> students selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("active")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              Set Active
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("inactive")}
              className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition"
            >
              Set Inactive
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkStatusChange("suspended")}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
            >
              Suspend
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Students Status Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/75 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedStudentIds.length === filteredStudents.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Status Reason</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-pink-500" />
                    Loading student records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No students match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const statusStr = student.status ? String(student.status).toLowerCase() : "active";
                  const isSelected = selectedStudentIds.includes(student.id);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition ${
                        isSelected ? "bg-pink-50/30 dark:bg-pink-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(student.id)}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/admin/students/${student.id}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition"
                            >
                              {student.name}
                            </Link>
                            <div className="text-[11px] text-gray-400">
                              {student.phone || student.guardianPhone || "No contact"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {student.studentId || student.admissionNumber || "-"}
                      </td>

                      <td className="py-3 px-4 text-xs font-medium">
                        {student.className} - {student.sectionName}
                      </td>

                      <td className="py-3 px-4 text-xs font-mono">
                        #{student.rollNumber ?? "-"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            statusStr === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : statusStr === "inactive"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                              : statusStr === "suspended"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              statusStr === "active"
                                ? "bg-emerald-500"
                                : statusStr === "inactive"
                                ? "bg-gray-400"
                                : statusStr === "suspended"
                                ? "bg-rose-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <span>{statusStr.toUpperCase()}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                        {student.statusChangeReason || "Enrolled officially"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {statusStr !== "active" && (
                            <button
                              type="button"
                              onClick={() => openStatusChangeDialog(student, "active")}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                            >
                              Activate
                            </button>
                          )}
                          {statusStr === "active" && (
                            <button
                              type="button"
                              onClick={() => openStatusChangeDialog(student, "inactive")}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 transition"
                            >
                              Leave
                            </button>
                          )}
                          {statusStr !== "suspended" && (
                            <button
                              type="button"
                              onClick={() => openStatusChangeDialog(student, "suspended")}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 transition"
                            >
                              Suspend
                            </button>
                          )}
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

      {/* STATUS CHANGE MODAL */}
      {changingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Change Status: {changingStudent.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select target status and provide an administrative audit reason.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  New Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as StudentStatus)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="active">Active (Full Access & Portal Login)</option>
                  <option value="inactive">Inactive (Medical / Temporary Leave)</option>
                  <option value="suspended">Suspended (Disciplinary Hold / Fee Block)</option>
                  <option value="left">Left (TC Issued / Transferred)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Reason / Administrative Note
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Approved 3-month medical leave; pending fee cleared..."
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setChangingStudent(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingChange}
                onClick={handleConfirmStatusChange}
                className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {isSubmittingChange ? "Updating..." : "Confirm Status Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
