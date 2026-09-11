"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Check,
  Filter,
  MoreVertical,
  Download,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export type HeroTableStatus =
  | "active"
  | "inactive"
  | "paused"
  | "on_leave"
  | "vacation"
  | "pending"
  | "trial"
  | "paid"
  | "unpaid";

export interface HeroTableRow {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  role?: string;
  team?: string;
  status: HeroTableStatus | string;
  meta?: Record<string, any>;
  [key: string]: any;
}

export interface HeroTableColumn<T = HeroTableRow> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

export interface HeroTableProps<T extends HeroTableRow = HeroTableRow> {
  data: T[];
  columns?: HeroTableColumn<T>[];
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  statusFilterOptions?: { label: string; value: string }[];
  onRowClick?: (row: T) => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  enableSelection?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  className?: string;
}

/**
 * Status Chip with HeroUI styling
 */
export function HeroStatusChip({
  status,
  label,
}: {
  status: HeroTableStatus | string;
  label?: string;
}) {
  const norm = status.toLowerCase();

  const getStyle = () => {
    switch (norm) {
      case "active":
      case "completed":
      case "paid":
      case "approved":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "paused":
      case "pending":
      case "in_progress":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "vacation":
      case "on_leave":
      case "leave":
        return "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      case "inactive":
      case "failed":
      case "blocked":
      case "rejected":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "trial":
      case "basic":
      default:
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    }
  };

  const getDotStyle = () => {
    switch (norm) {
      case "active":
      case "completed":
      case "paid":
        return "bg-emerald-500";
      case "paused":
      case "pending":
        return "bg-amber-500";
      case "vacation":
      case "on_leave":
        return "bg-orange-500";
      case "inactive":
      case "failed":
      case "blocked":
        return "bg-rose-500";
      default:
        return "bg-sky-500";
    }
  };

  const displayLabel = label || norm.replace("_", " ").toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide shadow-2xs capitalize",
        getStyle()
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", getDotStyle())} />
      <span>{displayLabel}</span>
    </span>
  );
}

/**
 * Avatar User Cell with HeroUI presentation
 */
export function HeroUserCell({
  name,
  subtitle,
  avatarUrl,
}: {
  name: string;
  subtitle?: string;
  avatarUrl?: string;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          {initials}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
          {name}
        </span>
        {subtitle && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[160px] sm:max-w-[220px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Modern HeroUI Table Component
 */
export function HeroTable<T extends HeroTableRow = HeroTableRow>({
  data,
  columns,
  title,
  description,
  searchPlaceholder = "Search by name, role, email...",
  statusFilterOptions = [
    { label: "All Status", value: "all" },
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "On Leave", value: "on_leave" },
    { label: "Inactive", value: "inactive" },
  ],
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onAddNew,
  addNewLabel = "Add New",
  isLoading = false,
  emptyMessage = "No records found matching your filters.",
  enableSelection = true,
  onSelectionChange,
  className,
}: HeroTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy ID utility
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      toast.success("Record ID copied!");
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.role && item.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        selectedStatus === "all" ||
        item.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [data, searchTerm, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredData.map((d) => d.id));
      setSelectedIds(allIds);
      if (onSelectionChange) onSelectionChange(filteredData);
    } else {
      setSelectedIds(new Set());
      if (onSelectionChange) onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);

    if (onSelectionChange) {
      const selected = data.filter((d) => next.has(d.id));
      onSelectionChange(selected);
    }
  };

  const isAllSelected =
    filteredData.length > 0 && selectedIds.size === filteredData.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < filteredData.length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Table Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        {(title || description || onAddNew) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>

            {onAddNew && (
              <button
                type="button"
                onClick={onAddNew}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{addNewLabel}</span>
              </button>
            )}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Right Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Dropdown */}
            {statusFilterOptions.length > 0 && (
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {statusFilterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Selection Status Badge */}
            {selectedIds.size > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                <span>{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-blue-500 hover:text-blue-700 underline text-[10px]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {enableSelection && (
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
              )}

              {columns ? (
                columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "py-3 px-4 whitespace-nowrap",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.label}
                  </th>
                ))
              ) : (
                <>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role / Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-medium">
            {isLoading ? (
              <tr>
                <td
                  colSpan={enableSelection ? 5 : 4}
                  className="py-12 text-center text-slate-400"
                >
                  <div className="inline-flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={enableSelection ? 5 : 4}
                  className="py-12 text-center text-slate-400 font-normal"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const isSelected = selectedIds.has(row.id);

                return (
                  <tr
                    key={row.id || idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer",
                      isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                    )}
                  >
                    {enableSelection && (
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectRow(row.id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns ? (
                      columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "py-3 px-4 whitespace-nowrap",
                            col.align === "center" && "text-center",
                            col.align === "right" && "text-right"
                          )}
                        >
                          {col.render ? col.render(row, idx) : row[col.key]}
                        </td>
                      ))
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <HeroUserCell
                            name={row.name}
                            subtitle={row.subtitle || row.email}
                            avatarUrl={row.avatarUrl}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {row.role || "Member"}
                            </span>
                            {row.team && (
                              <span className="text-[11px] text-slate-400">
                                {row.team}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <HeroStatusChip status={row.status} />
                        </td>
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {/* Copy ID Button */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(row.id, e)}
                              title="Copy ID"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              {copiedId === row.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* View Action */}
                            {onView && (
                              <button
                                type="button"
                                onClick={() => onView(row)}
                                title="View Details"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Edit Action */}
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(row)}
                                title="Edit Record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Delete Action */}
                            {onDelete && (
                              <button
                                type="button"
                                onClick={() => onDelete(row)}
                                title="Delete Record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <span className="text-slate-400">
            Total: {filteredData.length} records
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="px-2 font-semibold text-slate-700 dark:text-slate-200">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HeroTable;
