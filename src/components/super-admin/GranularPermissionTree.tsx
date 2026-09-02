"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { GRANULAR_PERMISSIONS, type GranularPermissionDefinition } from "@/lib/billing/permissions";

export interface GranularPermissionTreeProps {
  /**
   * Current selected permission IDs (in Plan Edit mode) or override map (in School Override mode).
   */
  selectedPermissions?: string[];
  onChangeSelected?: (permissions: string[]) => void;

  /**
   * School Override Mode options
   */
  isOverrideMode?: boolean;
  overrides?: Record<string, "ALLOW" | "DENY" | "INHERIT">;
  onChangeOverrides?: (overrides: Record<string, "ALLOW" | "DENY" | "INHERIT">) => void;
  planDefaults?: Record<string, boolean>;
}

export function GranularPermissionTree({
  selectedPermissions = [],
  onChangeSelected,
  isOverrideMode = false,
  overrides = {},
  onChangeOverrides,
  planDefaults = {},
}: GranularPermissionTreeProps) {
  const [search, setSearch] = useState("");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    student_management: true,
    teacher_management: true,
    class_management: true,
    basic_attendance: true,
    advanced_reports: true,
    notices_announcements: true,
  });

  // Group permissions by module
  const modules = useMemo(() => {
    return GRANULAR_PERMISSIONS.filter((p) => p.category === "module");
  }, []);

  const getModuleChildren = (moduleId: string) => {
    return GRANULAR_PERMISSIONS.filter((p) => p.featureKey === moduleId && p.id !== moduleId);
  };

  // Search filter
  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return GRANULAR_PERMISSIONS;
    const query = search.toLowerCase();
    return GRANULAR_PERMISSIONS.filter(
      (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
    );
  }, [search]);

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => (next[m.id] = true));
    setExpandedModules(next);
  };

  const collapseAll = () => {
    setExpandedModules({});
  };

  // Plan Edit Mode handlers
  const handleTogglePlanPermission = (id: string) => {
    if (!onChangeSelected) return;

    const isCurrentlySelected = selectedPermissions.includes(id);
    let next: string[];

    const item = GRANULAR_PERMISSIONS.find((p) => p.id === id);
    if (!item) return;

    if (item.category === "module") {
      // Toggle entire module & all children
      const childIds = GRANULAR_PERMISSIONS.filter((p) => p.featureKey === id).map((p) => p.id);
      if (isCurrentlySelected) {
        next = selectedPermissions.filter((pId) => !childIds.includes(pId));
      } else {
        next = Array.from(new Set([...selectedPermissions, ...childIds]));
      }
    } else {
      // Toggle single item
      if (isCurrentlySelected) {
        next = selectedPermissions.filter((pId) => pId !== id);
      } else {
        // Automatically ensure parent module is selected
        next = Array.from(new Set([...selectedPermissions, id, item.featureKey]));
      }
    }

    onChangeSelected(next);
  };

  const handleSelectAllPlan = () => {
    if (onChangeSelected) {
      onChangeSelected(GRANULAR_PERMISSIONS.map((p) => p.id));
    }
  };

  const handleClearAllPlan = () => {
    if (onChangeSelected) {
      onChangeSelected([]);
    }
  };

  // School Override Mode handlers
  const handleSetOverride = (id: string, mode: "ALLOW" | "DENY" | "INHERIT") => {
    if (!onChangeOverrides) return;
    const next = { ...overrides, [id]: mode };
    onChangeOverrides(next);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{isOverrideMode ? "School-Specific Permission Overrides" : "Granular Feature & Permission Tree"}</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOverrideMode
              ? "Configure custom ALLOW / DENY overrides for this school or reset to Plan Default."
              : "Define exact page, tab, section, and action permissions for this plan version."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            Collapse All
          </button>
          {!isOverrideMode && (
            <>
              <button
                type="button"
                onClick={handleSelectAllPlan}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllPlan}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages, tabs, or action permissions..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Tree Content */}
      <div className="space-y-3 pt-1">
        {modules.map((mod) => {
          const children = getModuleChildren(mod.id);
          const isExpanded = expandedModules[mod.id] || search.trim().length > 0;
          const isModuleSelected = selectedPermissions.includes(mod.id);

          return (
            <div
              key={mod.id}
              className="rounded-xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden bg-gray-50/30 dark:bg-gray-900/20"
            >
              {/* Module Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-100/60 dark:bg-gray-900/60 border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleExpand(mod.id)}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-0.5"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  {!isOverrideMode ? (
                    <button
                      type="button"
                      onClick={() => handleTogglePlanPermission(mod.id)}
                      className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-900 dark:text-white text-left"
                    >
                      {isModuleSelected ? (
                        <CheckSquare className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                      )}
                      <span className="break-words">{mod.name}</span>
                    </button>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white break-words">{mod.name}</span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Module
                  </span>
                </div>

                {isOverrideMode && (
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSetOverride(mod.id, "ALLOW")}
                      className={`px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded ${
                        overrides[mod.id] === "ALLOW"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-green-100 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      ALLOW
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetOverride(mod.id, "DENY")}
                      className={`px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded ${
                        overrides[mod.id] === "DENY"
                          ? "bg-red-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-100 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      DENY
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetOverride(mod.id, "INHERIT")}
                      className="px-2 py-1 text-[10px] sm:text-[11px] font-medium rounded bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                    >
                      RESET
                    </button>
                  </div>
                )}
              </div>

              {/* Children Nodes */}
              {isExpanded && (
                <div className="p-2 sm:p-3 space-y-2 pl-3 sm:pl-7 border-t border-gray-100 dark:border-gray-800/40">
                  {children
                    .filter((c) => filteredPermissions.some((fp) => fp.id === c.id))
                    .map((child) => {
                      const isChildSelected = selectedPermissions.includes(child.id);
                      const currentOverride = overrides[child.id] || "INHERIT";
                      const planDefault = planDefaults[child.id] ?? true;
                      const effectiveAccess =
                        currentOverride === "ALLOW" ? true : currentOverride === "DENY" ? false : planDefault;

                      return (
                        <div
                          key={child.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            {!isOverrideMode ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePlanPermission(child.id)}
                                className="mt-0.5 shrink-0"
                              >
                                {isChildSelected ? (
                                  <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Square className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            ) : (
                              <div className="mt-0.5 shrink-0">
                                {effectiveAccess ? (
                                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-white break-words">{child.name}</span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                    child.category === "page"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                      : child.category === "tab"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  }`}
                                >
                                  {child.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{child.description}</p>
                            </div>
                          </div>

                          {/* Override Mode Control Buttons */}
                          {isOverrideMode && (
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <span className="text-[10px] text-gray-400 hidden sm:inline">
                                {currentOverride === "INHERIT"
                                  ? `Inherited (${planDefault ? "ALLOW" : "DENY"})`
                                  : `Override: ${currentOverride}`}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSetOverride(child.id, "ALLOW")}
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                    currentOverride === "ALLOW"
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-green-100 dark:bg-gray-800 dark:text-gray-400"
                                  }`}
                                >
                                  ALLOW
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetOverride(child.id, "DENY")}
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                    currentOverride === "DENY"
                                      ? "bg-red-600 text-white"
                                      : "bg-gray-100 text-gray-600 hover:bg-red-100 dark:bg-gray-800 dark:text-gray-400"
                                  }`}
                                >
                                  DENY
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetOverride(child.id, "INHERIT")}
                                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                >
                                  RESET
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
