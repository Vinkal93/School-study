"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Activity,
  Layers,
  Shield,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  X,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAllSchools } from "@/lib/services/school.service";
import {
  fetchImportExportAuditLogs,
  type ImportExportAuditLog,
} from "@/lib/services/import-export-audit.service";
import type { School } from "@/types";
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";

export default function ImportExportAuditPage() {
  const { profile: currentUser } = useAuth();

  const [logs, setLogs] = useState<ImportExportAuditLog[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector Drawer State
  const [selectedLog, setSelectedLog] = useState<ImportExportAuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "import" | "export">("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (schools.length === 0) {
        const schoolsData = await getAllSchools();
        setSchools(schoolsData);
      }

      const auditData = await fetchImportExportAuditLogs({
        schoolId: selectedSchool,
        type: selectedType,
        entity: selectedEntity,
        status: selectedStatus,
        search,
        limitCount: 300,
      });
      setLogs(auditData);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err?.message || "Could not load import/export logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedType, selectedEntity, selectedSchool, selectedStatus]);

  // Derived filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedSchool !== "all" && l.schoolId !== selectedSchool) return false;
      if (selectedType !== "all" && l.type !== selectedType) return false;
      if (selectedEntity !== "all" && l.entity?.toLowerCase() !== selectedEntity.toLowerCase()) return false;
      if (selectedStatus !== "all" && l.status !== selectedStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesOp = l.operationId?.toLowerCase().includes(q);
        const matchesSchool = l.schoolName?.toLowerCase().includes(q);
        const matchesFile = l.filename?.toLowerCase().includes(q);
        const matchesUser = l.performedBy?.toLowerCase().includes(q);
        const matchesEntity = l.entity?.toLowerCase().includes(q);
        if (!matchesOp && !matchesSchool && !matchesFile && !matchesUser && !matchesEntity) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedSchool, selectedType, selectedEntity, selectedStatus, search]);

  // Dynamic KPI Stats calculated from current filtered dataset
  const stats = useMemo(() => {
    let imports = 0;
    let exports = 0;
    let success = 0;
    let partialOrFailed = 0;
    let totalRows = 0;

    filteredLogs.forEach((l) => {
      if (l.type === "import") imports++;
      if (l.type === "export") exports++;
      if (l.status === "success") success++;
      if (l.status === "failed" || l.status === "partial") partialOrFailed++;
      totalRows += l.totalRows || 0;
    });

    return {
      total: filteredLogs.length,
      overallTotal: logs.length,
      imports,
      exports,
      success,
      partialOrFailed,
      totalRows,
    };
  }, [filteredLogs, logs.length]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const schoolMap = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200/50">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Import & Export Audit Center
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Authoritative operational audit trail of bulk data provisioning, migrations, and backups.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin/audit"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            <Shield className="h-3.5 w-3.5" />
            Platform Security Audit
          </Link>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards (Dynamic Filter-Aware) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Operations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Operations</span>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-[11px] text-gray-400">
            {stats.total !== stats.overallTotal ? `Filtered (${stats.overallTotal} Total)` : "All Logged"}
          </p>
        </div>

        {/* Imports */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Imports</span>
            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.imports}</p>
          <p className="text-[11px] text-gray-400">Ingestion Jobs</p>
        </div>

        {/* Exports */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Exports</span>
            <ArrowUpFromLine className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">{stats.exports}</p>
          <p className="text-[11px] text-gray-400">Data Backups</p>
        </div>

        {/* Success */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.success}</p>
          <p className="text-[11px] text-gray-400">100% Successful</p>
        </div>

        {/* Partial / Failed */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Issues</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">{stats.partialOrFailed}</p>
          <p className="text-[11px] text-gray-400">Errors or Skips</p>
        </div>

        {/* Total Rows Ingested */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Rows Processed</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">{stats.totalRows}</p>
          <p className="text-[11px] text-gray-400">Cumulative Records</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-950 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Operation ID, School, File, Performed By..."
              className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-2 text-xs md:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* School Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id.slice(0, 6)})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Types</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Entities</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="classes">Classes</option>
              <option value="fees">Fees</option>
              <option value="all">All Modules (Full Backup)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-1">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">Status</option>
              <option value="success">Success</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Prompt if active */}
        {(selectedSchool !== "all" || selectedType !== "all" || selectedEntity !== "all" || selectedStatus !== "all" || search.trim()) && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span>
              Showing <strong>{filteredLogs.length}</strong> matching records out of <strong>{logs.length}</strong> total operations.
            </span>
            <button
              onClick={() => {
                setSelectedSchool("all");
                setSelectedType("all");
                setSelectedEntity("all");
                setSelectedStatus("all");
                setSearch("");
              }}
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/60 font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3.5">Operation</th>
                <th className="px-4 py-3.5">School Scope</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">Source / File</th>
                <th className="px-4 py-3.5 text-center">Rows</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Performed By</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    <p className="mt-2 text-xs">Loading operational audit records...</p>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-500">
                    <FileSpreadsheet className="mx-auto h-10 w-10 stroke-[1.5] text-gray-300 dark:text-gray-700" />
                    <p className="mt-3 font-semibold text-sm text-gray-900 dark:text-white">
                      No Import/Export Audit Logs Found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {logs.length === 0
                        ? "Execute a bulk spreadsheet import or export to generate operational logs."
                        : "No logs matched your active filter parameters."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isImport = log.type === "import";
                  const schoolName = schoolMap.get(log.schoolId) || log.schoolName || log.schoolId;

                  return (
                    <tr key={log.id || log.operationId} className="hover:bg-gray-50/70 dark:hover:bg-gray-900/30 transition-colors">
                      {/* Operation Type */}
                      <td className="px-4 py-3 font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            isImport
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50"
                          }`}
                        >
                          {isImport ? (
                            <ArrowDownToLine className="h-3 w-3" />
                          ) : (
                            <ArrowUpFromLine className="h-3 w-3" />
                          )}
                          {isImport ? "IMPORT" : "EXPORT"}
                        </span>
                      </td>

                      {/* School */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                          {schoolName}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{log.schoolId}</div>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-3 capitalize font-medium">{log.entity}</td>

                      {/* Source / Filename */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] truncate max-w-[160px] text-gray-800 dark:text-gray-200" title={log.filename}>
                          {log.filename || `${log.entity}_data`}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">{log.source || "XLSX"}</div>
                      </td>

                      {/* Rows & Breakdown */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-gray-900 dark:text-white">{log.totalRows}</span>
                        {isImport && (
                          <div className="text-[10px] text-gray-400">
                            +{log.createdCount} / upd {log.updatedCount}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {log.status === "success" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Success
                          </span>
                        )}
                        {log.status === "partial" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400">
                            Partial ({log.failedCount} err)
                          </span>
                        )}
                        {log.status === "failed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400">
                            <XCircle className="h-2.5 w-2.5" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Performed By */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                          {log.performedBy || "Administrator"}
                        </div>
                        <div className="text-[10px] text-gray-400 capitalize">{log.role || "Admin"}</div>
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp || log.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-xs">
            <span className="text-gray-500">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredLogs.length} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:border-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer Modal */}
      {drawerOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">Operation Inspection</h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <span className="text-gray-400">Operation ID:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{selectedLog.operationId}</p>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <p className="font-bold text-gray-900 dark:text-white uppercase">{selectedLog.type}</p>
                </div>
                <div>
                  <span className="text-gray-400">Entity:</span>
                  <p className="font-bold text-gray-900 dark:text-white capitalize">{selectedLog.entity}</p>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedLog.durationMs || 0} ms</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-gray-400">School Scope:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {schoolMap.get(selectedLog.schoolId) || selectedLog.schoolName || selectedLog.schoolId}
                </p>
                <p className="font-mono text-[10px] text-gray-400">{selectedLog.schoolId}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-gray-400 text-[10px]">Total</span>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{selectedLog.totalRows}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px]">Created</span>
                  <p className="font-bold text-sm text-emerald-600">{selectedLog.createdCount}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px]">Updated</span>
                  <p className="font-bold text-sm text-blue-600">{selectedLog.updatedCount}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px]">Failed</span>
                  <p className="font-bold text-sm text-rose-600">{selectedLog.failedCount}</p>
                </div>
              </div>

              {selectedLog.errorSummary && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Error Summary:</span>
                  <p className="mt-1 text-rose-600 dark:text-rose-300 font-mono text-[11px] leading-relaxed">
                    {selectedLog.errorSummary}
                  </p>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                <div>
                  <span className="text-gray-400">Executed by:</span>{" "}
                  <strong>{selectedLog.performedBy}</strong> ({selectedLog.role})
                </div>
                <div>
                  <span className="text-gray-400">Timestamp:</span>{" "}
                  {new Date(selectedLog.timestamp).toISOString()}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
