"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Building2,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getAuditLogs } from "@/lib/services/audit.service";
import type { AuditLogEntry, AuditAction } from "@/types";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | AuditAction>("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.targetName && log.targetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.targetId && log.targetId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.performedBy.name && log.performedBy.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.performedBy.email && log.performedBy.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === "all" ? true : log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case "USER_STATUS_CHANGE":
      case "USER_RESTRICT":
      case "USER_UNRESTRICT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {action.replace(/_/g, " ")}
          </span>
        );
      case "SCHOOL_CREATE":
      case "SCHOOL_STATUS_CHANGE":
      case "SCHOOL_UPDATE":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            {action.replace(/_/g, " ")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            {action.replace(/_/g, " ")}
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
            <ShieldAlert className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Platform Audit & Security Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Chronological audit trail of all privileged actions, status modifications, and tenant configurations.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <label htmlFor="audit-search" className="sr-only">Search audit logs</label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="audit-search"
            name="search"
            aria-label="Search audit logs"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search target, admin email, reason..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Action:
          </span>
          {(
            [
              "all",
              "USER_STATUS_CHANGE",
              "SCHOOL_CREATE",
              "SCHOOL_STATUS_CHANGE",
              "PLATFORM_CONFIG_CHANGE",
            ] as const
          ).map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                actionFilter === act
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {act === "all" ? "All Actions" : act.replace(/_/g, " ")} (
              {act === "all" ? logs.length : logs.filter((l) => l.action === act).length})
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No audit logs found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Administrative actions will automatically generate immutable records here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Timestamp</th>
                  <th className="py-3.5 px-4 font-medium">Action</th>
                  <th className="py-3.5 px-4 font-medium">Target</th>
                  <th className="py-3.5 px-4 font-medium">Performed By</th>
                  <th className="py-3.5 px-4 font-medium">Changes & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {log.timestamp?.toDate
                          ? log.timestamp.toDate().toLocaleString()
                          : "Recent"}
                      </div>
                    </td>
                    <td className="py-4 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {log.targetName || log.targetId}
                        </p>
                        <p className="font-mono text-[11px] text-gray-400">
                          {log.targetType.toUpperCase()}: {log.targetId.slice(0, 12)}...
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {log.performedBy.name || "Super Admin"}
                        </p>
                        <p className="text-xs text-gray-500">{log.performedBy.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {log.reason || "Administrative update"}
                      </p>
                      {log.previousState && log.newState && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-1">
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {JSON.stringify(log.previousState)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded">
                            {JSON.stringify(log.newState)}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
