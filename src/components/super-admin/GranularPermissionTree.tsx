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
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  GRANULAR_PERMISSIONS,
  type GranularPermissionDefinition,
  getParentFeatureKey,
  getParentCapabilityKey,
} from "@/lib/billing/permissions";
import type { FeatureAccessMode } from "@/types";
import { cn } from "@/lib/utils/cn";

export interface GranularPermissionTreeProps {
  /**
   * 3-Way Feature Access Modes (in Plan Create / Edit mode)
   */
  featureAccess?: Record<string, FeatureAccessMode>;
  onChangeFeatureAccess?: (featureAccess: Record<string, FeatureAccessMode>) => void;

  /**
   * Selected permission IDs for legacy boolean list compatibility
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
  featureAccess = {},
  onChangeFeatureAccess,
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
    fee_management: true,
    timetable_bells: true,
    rules_policies: true,
    inquiries_portal: true,
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
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.aliases?.some((a) => a.toLowerCase().includes(query))
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

  // Helper to compute effective access mode for a node in plan mode
  const getEffectivePlanNodeMode = (nodeId: string): { mode: FeatureAccessMode; isExplicit: boolean } => {
    if (featureAccess[nodeId]) {
      return { mode: featureAccess[nodeId], isExplicit: true };
    }

    // Check parent in hierarchy
    const parentCapKey = getParentCapabilityKey(nodeId);
    if (parentCapKey && featureAccess[parentCapKey]) {
      return { mode: featureAccess[parentCapKey], isExplicit: false };
    }

    const parentModuleKey = getParentFeatureKey(nodeId);
    if (parentModuleKey && featureAccess[parentModuleKey]) {
      return { mode: featureAccess[parentModuleKey], isExplicit: false };
    }

    // Fallback to legacy selectedPermissions
    if (selectedPermissions.includes(nodeId) || (parentModuleKey && selectedPermissions.includes(parentModuleKey))) {
      return { mode: "FULL_ACCESS", isExplicit: false };
    }

    return { mode: "HIDDEN", isExplicit: false };
  };

  // Plan Edit Mode 3-way access change handler
  const handleSetNodeAccess = (nodeId: string, newMode: FeatureAccessMode | "INHERIT") => {
    const nextAccess = { ...featureAccess };

    if (newMode === "INHERIT") {
      delete nextAccess[nodeId];
    } else {
      nextAccess[nodeId] = newMode;
    }

    if (onChangeFeatureAccess) {
      onChangeFeatureAccess(nextAccess);
    }

    // Keep legacy selectedPermissions synchronized
    if (onChangeSelected) {
      let nextSelected = [...selectedPermissions];
      if (newMode === "FULL_ACCESS") {
        if (!nextSelected.includes(nodeId)) nextSelected.push(nodeId);
      } else if (newMode === "SHOWCASE" || newMode === "HIDDEN") {
        nextSelected = nextSelected.filter((k) => k !== nodeId);
      }
      onChangeSelected(nextSelected);
    }
  };

  const handleBulkSetMode = (mode: FeatureAccessMode) => {
    const nextAccess: Record<string, FeatureAccessMode> = {};
    for (const p of GRANULAR_PERMISSIONS) {
      nextAccess[p.id] = mode;
    }
    if (onChangeFeatureAccess) {
      onChangeFeatureAccess(nextAccess);
    }
    if (onChangeSelected) {
      if (mode === "FULL_ACCESS") {
        onChangeSelected(GRANULAR_PERMISSIONS.map((p) => p.id));
      } else {
        onChangeSelected([]);
      }
    }
  };

  const handleResetToInherited = () => {
    if (onChangeFeatureAccess) {
      onChangeFeatureAccess({});
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
            <span>{isOverrideMode ? "School-Specific Permission Overrides" : "Granular Feature & Capability Access Matrix"}</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOverrideMode
              ? "Configure custom ALLOW / DENY overrides for this school or reset to Plan Default."
              : "Configure 3-way access (FULL ACCESS, SHOWCASE, HIDDEN) for modules, pages, tabs, sections, and actions."}
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
                onClick={() => handleBulkSetMode("FULL_ACCESS")}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                All Full Access
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetMode("SHOWCASE")}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                All Showcase
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetMode("HIDDEN")}
                className="px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
              >
                All Hidden
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
          placeholder="Search modules, pages, tabs, actions, or exports..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Tree Content */}
      <div className="space-y-3 pt-1">
        {modules.map((mod) => {
          const children = getModuleChildren(mod.id);
          const isExpanded = expandedModules[mod.id] || search.trim().length > 0;
          const { mode: moduleMode, isExplicit: moduleIsExplicit } = getEffectivePlanNodeMode(mod.id);

          return (
            <div
              key={mod.id}
              className="rounded-xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden bg-gray-50/30 dark:bg-gray-900/20"
            >
              {/* Module Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-100/60 dark:bg-gray-900/60 border-b border-gray-200/60 dark:border-gray-800/60">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleExpand(mod.id)}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-0.5 shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white break-words">
                    {mod.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                    Module
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">({mod.id})</span>
                </div>

                {!isOverrideMode ? (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <select
                      value={featureAccess[mod.id] || moduleMode}
                      onChange={(e) => handleSetNodeAccess(mod.id, e.target.value as FeatureAccessMode)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none transition-colors",
                        moduleMode === "FULL_ACCESS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                          : moduleMode === "SHOWCASE"
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                          : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                      )}
                    >
                      <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                      <option value="SHOWCASE">🔒 SHOWCASE</option>
                      <option value="HIDDEN">— HIDDEN</option>
                    </select>
                  </div>
                ) : (
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
                      const { mode: childMode, isExplicit: childIsExplicit } = getEffectivePlanNodeMode(child.id);
                      const currentOverride = overrides[child.id] || "INHERIT";
                      const planDefault = planDefaults[child.id] ?? true;
                      const effectiveAccess =
                        currentOverride === "ALLOW" ? true : currentOverride === "DENY" ? false : planDefault;

                      return (
                        <div
                          key={child.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800/80 text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="mt-1 shrink-0">
                              {childMode === "FULL_ACCESS" ? (
                                <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : childMode === "SHOWCASE" ? (
                                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-white break-words">
                                  {child.name}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    child.category === "page"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                      : child.category === "tab"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                      : child.category === "action"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : child.category === "export"
                                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {child.category}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">({child.id})</span>
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{child.description}</p>
                            </div>
                          </div>

                          {!isOverrideMode ? (
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {!childIsExplicit && (
                                <span className="text-[10px] text-gray-400 italic hidden sm:inline">
                                  (Inherited from parent)
                                </span>
                              )}
                              <select
                                value={featureAccess[child.id] || "INHERIT"}
                                onChange={(e) =>
                                  handleSetNodeAccess(child.id, e.target.value as FeatureAccessMode | "INHERIT")
                                }
                                className={cn(
                                  "px-2 py-1 text-[11px] font-bold rounded-lg border focus:outline-none transition-colors",
                                  childMode === "FULL_ACCESS"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                                    : childMode === "SHOWCASE"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800"
                                    : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                )}
                              >
                                <option value="INHERIT">
                                  ⚡ Inherit ({moduleMode === "FULL_ACCESS" ? "FULL" : moduleMode === "SHOWCASE" ? "LOCK" : "HIDE"})
                                </option>
                                <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                                <option value="SHOWCASE">🔒 SHOWCASE</option>
                                <option value="HIDDEN">— HIDDEN</option>
                              </select>
                            </div>
                          ) : (
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
