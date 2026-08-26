"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  Layers,
  Power,
  ShieldAlert,
  Loader2,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSchools } from "@/lib/services/school.service";
import { AuditDetailDrawer } from "@/components/super-admin/AuditDetailDrawer";
import type { AuditLogEntry, School } from "@/types";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const { profile: currentUser } = useAuth();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector Drawer State
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter State
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadAuditLogs = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (schools.length === 0) {
        const schoolsData = await getSchools();
        setSchools(schoolsData);
      }

      const params = new URLSearchParams({
        performerUid: currentUser.uid,
        action: selectedAction,
        role: selectedRole,
        schoolId: selectedSchool,
        search,
        limit: "150",
      });

      const res = await fetch(`/api/super-admin/audit?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load audit logs");

      setLogs(data.logs || []);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.message || "Could not load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [selectedAction, selectedRole, selectedSchool, currentUser?.uid]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs();
  };

  const handleInspectRow = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case "SCHOOL_CREATED":
      case "SCHOOL_CREATE":
      case "STUDENT_CREATED":
      case "TEACHER_CREATED":
      case "ADMIN_CREATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            {action.replace("_", " ")}
          </span>
        );
      case "USER_RESTRICTED":
      case "USER_RESTRICT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            User Restricted
          </span>
        );
      case "USER_UNRESTRICTED":
      case "USER_UNRESTRICT":
      case "USER_ENABLED":
      case "SCHOOL_ENABLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            {action.replace("_", " ")}
          </span>
        );
      case "USER_DISABLED":
      case "SCHOOL_DISABLED":
      case "USER_STATUS_CHANGE":
      case "SCHOOL_STATUS_CHANGE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <Power className="h-3 w-3" />
            {action.replace("_", " ")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <Activity className="h-3 w-3" />
            {action?.replace(/_/g, " ") || "Event"}
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
            <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Platform Immutable Audit Log
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cryptographically sealed accountability trail of all platform modifications, user status changes, and administrative actions.
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Audit Feed
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
              placeholder="Search by Actor Name, Target, Reason, or Action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </form>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All Actions</option>
            <option value="SCHOOL_CREATED">School Created</option>
            <option value="SCHOOL_UPDATED">School Updated</option>
            <option value="SCHOOL_DISABLED">School Disabled</option>
            <option value="SCHOOL_ENABLED">School Enabled</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="USER_RESTRICTED">User Restricted</option>
            <option value="USER_UNRESTRICTED">User Unrestricted</option>
            <option value="USER_DISABLED">User Disabled</option>
            <option value="USER_ENABLED">User Enabled</option>
            <option value="TEACHER_CREATED">Teacher Created</option>
            <option value="STUDENT_CREATED">Student Created</option>
            <option value="ROLE_CHANGED">Role Changed</option>
            <option value="ADMIN_CREATED">Admin Created</option>
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="all">All Actor Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="school_admin">School Admin</option>
          </select>

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
        </div>
      </div>

      {/* Audit Log Table (7.3) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No audit events found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Time</th>
                  <th className="py-3.5 px-4 font-medium">Actor</th>
                  <th className="py-3.5 px-4 font-medium">Action</th>
                  <th className="py-3.5 px-4 font-medium">Target</th>
                  <th className="py-3.5 px-4 font-medium">School</th>
                  <th className="py-3.5 px-4 font-medium">Reason</th>
                  <th className="py-3.5 px-4 font-medium text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {paginatedLogs.map((log, idx) => {
                  const actorName = log.actorName || log.performedBy?.name || "System Admin";
                  const actorEmail = log.actorEmail || log.performedBy?.email || "";
                  const actorRole = log.actorRole || log.performedBy?.role || "super_admin";
                  const targetName = log.targetUserName || log.targetName || log.targetUserId || log.targetId || "—";

                  return (
                    <tr
                      key={log.id || idx}
                      onClick={() => handleInspectRow(log)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Recent"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{actorName}</p>
                          <p className="text-xs text-gray-500">{actorEmail}</p>
                          <span className="font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                            {actorRole}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {targetName}
                        </span>
                        <span className="block text-[11px] text-gray-400 capitalize">
                          {log.entityType || log.targetType || "entity"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400">
                        {log.targetSchoolName || log.targetSchoolId || log.actorSchoolId ? (
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {log.targetSchoolName || log.targetSchoolId || log.actorSchoolId}
                          </span>
                        ) : (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Platform Global
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {log.reason || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectRow(log);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Diff
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Structured Audit Detail Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
