"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Building2,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Power,
  Globe,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSchools } from "@/lib/services/school.service";
import type { ActivityLogEntry, LoginLogEntry, School, UserRole } from "@/types";
import { toast } from "sonner";

export default function PlatformActivityPage() {
  const { profile: currentUser } = useAuth();

  const [activeView, setActiveView] = useState<"activity" | "logins">("activity");
  const [logs, setLogs] = useState<any[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Load schools for dropdown filter
      if (schools.length === 0) {
        const schoolsData = await getSchools();
        setSchools(schoolsData);
      }

      // Query logs API
      const params = new URLSearchParams({
        performerUid: currentUser.uid,
        type: activeView,
        schoolId: selectedSchool,
        role: selectedRole,
        action: selectedAction,
        status: selectedStatus,
        search,
        limit: "150",
      });

      const res = await fetch(`/api/super-admin/activity?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load activity logs");

      setLogs(data.logs || []);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to query activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView, selectedSchool, selectedRole, selectedAction, selectedStatus, currentUser?.uid]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Pagination calculations
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Login
          </span>
        );
      case "LOGOUT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Clock className="h-3 w-3" />
            Logout
          </span>
        );
      case "CREATE_STUDENT":
      case "CREATE_TEACHER":
      case "CREATE_SCHOOL":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            {action.replace("_", " ")}
          </span>
        );
      case "MARK_ATTENDANCE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Attendance Marked
          </span>
        );
      case "ACCOUNT_RESTRICTED":
      case "USER_RESTRICT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            Restricted
          </span>
        );
      case "ACCOUNT_DISABLED":
      case "USER_STATUS_CHANGE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <Power className="h-3 w-3" />
            Status Changed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <Activity className="h-3 w-3" />
            {action?.replace(/_/g, " ") || "Activity"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Platform Activity & Login Explorer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time chronological telemetry for user sessions, academic operations, and administrative events.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Feed
        </button>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveView("activity")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeView === "activity"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Operational Activity Logs
        </button>
        <button
          onClick={() => setActiveView("logins")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeView === "logins"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Authentication & Login Stream
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Name, Email, User UID, or School..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </form>

          {/* School Filter */}
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All Schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="school_admin">School Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>

          {/* Action Filter (Activity view only) */}
          {activeView === "activity" && (
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE_STUDENT">Create Student</option>
              <option value="UPDATE_STUDENT">Update Student</option>
              <option value="CREATE_TEACHER">Create Teacher</option>
              <option value="UPDATE_TEACHER">Update Teacher</option>
              <option value="MARK_ATTENDANCE">Mark Attendance</option>
              <option value="CREATE_NOTICE">Create Notice</option>
              <option value="UPDATE_PROFILE">Update Profile</option>
              <option value="ACCOUNT_RESTRICTED">Account Restricted</option>
              <option value="ACCOUNT_DISABLED">Account Disabled</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All Results</option>
            <option value="success">Successful</option>
            <option value="failure">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No activity logs recorded
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Timestamp</th>
                  <th className="py-3.5 px-4 font-medium">User</th>
                  <th className="py-3.5 px-4 font-medium">Role</th>
                  <th className="py-3.5 px-4 font-medium">Action / Event</th>
                  <th className="py-3.5 px-4 font-medium">School Scope</th>
                  <th className="py-3.5 px-4 font-medium">Client Info</th>
                  <th className="py-3.5 px-4 font-medium text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3.5 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        {log.userId || log.uid ? (
                          <Link
                            href={`/super-admin/users/${log.userId || log.uid}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {log.userName || log.email || "User"}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {log.userName || log.email || "User"}
                          </span>
                        )}
                        <p className="text-xs text-gray-500">{log.userEmail || log.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold capitalize text-gray-700 dark:text-gray-300">
                        {log.role?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getActionBadge(log.action || (log.status === "success" ? "LOGIN" : "LOGIN_FAILED"))}
                      {log.entityName && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{log.entityName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {log.schoolName || log.schoolId ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {log.schoolName || log.schoolId}
                        </span>
                      ) : (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                          Platform Global
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      <p className="font-mono text-[11px]">{log.ipAddress || "client-direct"}</p>
                      <p className="text-[10px] text-gray-400">
                        {log.browser || "Browser"} · {log.platform || "OS"}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          log.status === "success"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {log.status === "success" ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            Failed
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && logs.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs">
            <span className="text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
