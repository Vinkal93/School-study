"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Smartphone,
  Globe,
} from "lucide-react";
import { getLoginLogs } from "@/lib/services/audit.service";
import type { LoginLogEntry } from "@/types";
import { toast } from "sonner";

export default function LoginActivityPage() {
  const [logs, setLogs] = useState<LoginLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLoginLogs(100);
      setLogs(data);
    } catch (err) {
      toast.error("Failed to load login activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.role && log.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ? true : log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Platform Login Activity Stream
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time feed of authentication attempts, active sessions, and security flags across all schools.
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
          <label htmlFor="login-search" className="sr-only">Search login activity</label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="login-search"
            name="search"
            aria-label="Search login activity"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, UID, IP address..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Status:
          </span>
          {(["all", "success", "failed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {st} ({st === "all" ? logs.length : logs.filter((l) => l.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Login Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No login logs recorded yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Authentication requests will display here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">Timestamp</th>
                  <th className="py-3.5 px-4 font-medium">User Email</th>
                  <th className="py-3.5 px-4 font-medium">Role</th>
                  <th className="py-3.5 px-4 font-medium">Auth Result</th>
                  <th className="py-3.5 px-4 font-medium">Network / IP</th>
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
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{log.email}</p>
                        <p className="text-[11px] font-mono text-gray-400">{log.uid}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      {log.role}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {log.status === "success" ? "Authorized" : "Denied"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-gray-400" />
                        {log.ipAddress || "client-direct"}
                      </div>
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
