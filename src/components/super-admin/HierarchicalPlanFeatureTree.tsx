"use client";

import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Clock,
  CreditCard,
  Send,
  FileText,
  Bell,
  Sparkles,
  Database,
  ShieldCheck,
  Layers,
  Search,
  CheckCircle2,
  Lock,
  Eye,
  ChevronRight,
  ChevronDown,
  Check,
  Filter,
  RotateCcw,
  Sliders,
  Mail,
  Receipt,
  Scale,
  Building2,
  Percent,
  Printer,
  BarChart3,
  Upload,
  Activity,
  FileSpreadsheet,
  AlertTriangle,
  ExternalLink,
  Shield,
  Tag,
  SlidersHorizontal,
} from "lucide-react";
import {
  ADMIN_FEATURE_REGISTRY,
  getAdminFeatureTree,
  getSafeDefaultFeatureAccess,
  getEnabledFeatureKeys,
  isFeatureUnconfigured,
  type AdminFeatureItem,
  type AdminFeatureNode,
  type FeatureAccessMode,
  type FeaturePermission,
} from "@/lib/features/adminFeatureRegistry";
import { cn } from "@/lib/utils/cn";

// Icon lookup dictionary mapping string names to Lucide icons
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MessageSquare,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Clock,
  CreditCard,
  Send,
  FileText,
  Bell,
  Sparkles,
  Database,
  ShieldCheck,
  Layers,
  Mail,
  Receipt,
  Scale,
  Building2,
  Percent,
  Printer,
  BarChart3,
  Upload,
  Activity,
  FileSpreadsheet,
  AlertTriangle,
  ExternalLink,
  Shield,
  Sliders,
};

export interface HierarchicalPlanFeatureTreeProps {
  featureAccess: Record<string, FeatureAccessMode>;
  onChangeFeatureAccess: (access: Record<string, FeatureAccessMode>) => void;
  features?: string[];
  onChangeFeatures?: (features: string[]) => void;
  initialFeatureAccess?: Record<string, FeatureAccessMode>;
}

export function HierarchicalPlanFeatureTree({
  featureAccess = {},
  onChangeFeatureAccess,
  features = [],
  onChangeFeatures,
  initialFeatureAccess,
}: HierarchicalPlanFeatureTreeProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "showcase" | "hidden" | "new">("all");

  // Modules tree structure from single source of truth registry
  const featureTree: AdminFeatureNode[] = useMemo(() => {
    return getAdminFeatureTree();
  }, []);

  // Expand / collapse state per module
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    featureTree.forEach((m) => {
      initial[m.id] = true;
    });
    return initial;
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    featureTree.forEach((m) => {
      next[m.id] = true;
    });
    setExpandedModules(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    featureTree.forEach((m) => {
      next[m.id] = false;
    });
    setExpandedModules(next);
  };

  // Helper to retrieve access mode for a key
  const getMode = (key: string, defaultMode: FeatureAccessMode = "FULL_ACCESS"): FeatureAccessMode => {
    if (featureAccess[key] !== undefined) return featureAccess[key];
    return defaultMode;
  };

  // Detect unconfigured / newly added features
  const unconfiguredCount = useMemo(() => {
    return ADMIN_FEATURE_REGISTRY.filter((f) => isFeatureUnconfigured(f.key, featureAccess)).length;
  }, [featureAccess]);

  // Update a single feature access mode with parent-child cascade logic
  const handleSetFeatureAccess = (item: AdminFeatureItem, newMode: FeatureAccessMode) => {
    const updatedAccess: Record<string, FeatureAccessMode> = { ...featureAccess, [item.key]: newMode };

    // If alias exists, update alias too
    if (item.aliases) {
      item.aliases.forEach((alias) => {
        updatedAccess[alias] = newMode;
      });
    }

    // Cascade down: If a parent module is turned HIDDEN, its children become HIDDEN
    if (item.type === "module") {
      const children = ADMIN_FEATURE_REGISTRY.filter((f) => f.parentId === item.id);
      if (newMode === "HIDDEN") {
        children.forEach((c) => {
          updatedAccess[c.key] = "HIDDEN";
          if (c.aliases) c.aliases.forEach((a) => (updatedAccess[a] = "HIDDEN"));
        });
      } else if (newMode === "FULL_ACCESS") {
        // When parent is restored to FULL_ACCESS, ensure child defaults are active
        children.forEach((c) => {
          if (updatedAccess[c.key] === "HIDDEN") {
            updatedAccess[c.key] = c.defaultAccess;
            if (c.aliases) c.aliases.forEach((a) => (updatedAccess[a] = c.defaultAccess));
          }
        });
      }
    }

    // Cascade up: If child is enabled, ensure parent module is FULL_ACCESS or SHOWCASE
    if (item.parentId && newMode !== "HIDDEN") {
      const parent = ADMIN_FEATURE_REGISTRY.find((f) => f.id === item.parentId);
      if (parent && updatedAccess[parent.key] === "HIDDEN") {
        updatedAccess[parent.key] = newMode === "SHOWCASE" ? "SHOWCASE" : "FULL_ACCESS";
        if (parent.aliases) {
          parent.aliases.forEach((a) => (updatedAccess[a] = updatedAccess[parent.key]));
        }
      }
    }

    onChangeFeatureAccess(updatedAccess);

    if (onChangeFeatures) {
      const newEnabled = getEnabledFeatureKeys(updatedAccess);
      onChangeFeatures(newEnabled);
    }
  };

  // Quick Presets
  const handleApplyPreset = (preset: "core" | "full" | "showcase" | "hidden" | "safe_defaults") => {
    const updatedAccess: Record<string, FeatureAccessMode> = {};

    if (preset === "safe_defaults") {
      const merged = getSafeDefaultFeatureAccess(featureAccess);
      onChangeFeatureAccess(merged);
      if (onChangeFeatures) onChangeFeatures(getEnabledFeatureKeys(merged));
      return;
    }

    if (preset === "full") {
      ADMIN_FEATURE_REGISTRY.forEach((f) => {
        updatedAccess[f.key] = "FULL_ACCESS";
        if (f.aliases) f.aliases.forEach((a) => (updatedAccess[a] = "FULL_ACCESS"));
      });
    } else if (preset === "core") {
      const coreIds = ["dashboard", "student_management", "teacher_management", "class_management", "basic_attendance", "subscription_billing"];
      ADMIN_FEATURE_REGISTRY.forEach((f) => {
        const isCore = coreIds.includes(f.id) || (f.parentId && coreIds.includes(f.parentId));
        const mode = isCore ? "FULL_ACCESS" : "HIDDEN";
        updatedAccess[f.key] = mode;
        if (f.aliases) f.aliases.forEach((a) => (updatedAccess[a] = mode));
      });
    } else if (preset === "showcase") {
      const coreIds = ["dashboard", "student_management", "teacher_management", "class_management", "basic_attendance", "subscription_billing"];
      ADMIN_FEATURE_REGISTRY.forEach((f) => {
        const isCore = coreIds.includes(f.id) || (f.parentId && coreIds.includes(f.parentId));
        const mode = isCore ? "FULL_ACCESS" : "SHOWCASE";
        updatedAccess[f.key] = mode;
        if (f.aliases) f.aliases.forEach((a) => (updatedAccess[a] = mode));
      });
    } else if (preset === "hidden") {
      ADMIN_FEATURE_REGISTRY.forEach((f) => {
        const isEvergreen = f.id === "dashboard" || f.id === "subscription_billing";
        const mode = isEvergreen ? "FULL_ACCESS" : "HIDDEN";
        updatedAccess[f.key] = mode;
        if (f.aliases) f.aliases.forEach((a) => (updatedAccess[a] = mode));
      });
    }

    onChangeFeatureAccess(updatedAccess);
    if (onChangeFeatures) {
      onChangeFeatures(getEnabledFeatureKeys(updatedAccess));
    }
  };

  const handleReset = () => {
    if (initialFeatureAccess) {
      onChangeFeatureAccess(initialFeatureAccess);
      if (onChangeFeatures) {
        onChangeFeatures(getEnabledFeatureKeys(initialFeatureAccess));
      }
    }
  };

  // Filtered tree
  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();

    return featureTree
      .map((parent) => {
        const parentMode = getMode(parent.key, parent.defaultAccess);
        const parentMatchesSearch =
          !q ||
          parent.label.toLowerCase().includes(q) ||
          parent.description.toLowerCase().includes(q) ||
          parent.category.toLowerCase().includes(q);

        const filteredChildren = parent.children.filter((child) => {
          const childMode = getMode(child.key, child.defaultAccess);
          const childMatchesSearch =
            !q ||
            child.label.toLowerCase().includes(q) ||
            child.description.toLowerCase().includes(q) ||
            child.category.toLowerCase().includes(q);

          if (!childMatchesSearch) return false;

          if (statusFilter === "enabled") return childMode === "FULL_ACCESS";
          if (statusFilter === "showcase") return childMode === "SHOWCASE";
          if (statusFilter === "hidden") return childMode === "HIDDEN";
          if (statusFilter === "new") return isFeatureUnconfigured(child.key, featureAccess);

          return true;
        });

        // Filter parent based on statusFilter
        let parentPassesStatus = true;
        if (statusFilter === "enabled") parentPassesStatus = parentMode === "FULL_ACCESS" || filteredChildren.length > 0;
        else if (statusFilter === "showcase") parentPassesStatus = parentMode === "SHOWCASE" || filteredChildren.length > 0;
        else if (statusFilter === "hidden") parentPassesStatus = parentMode === "HIDDEN" || filteredChildren.length > 0;
        else if (statusFilter === "new") parentPassesStatus = isFeatureUnconfigured(parent.key, featureAccess) || filteredChildren.length > 0;

        if ((parentMatchesSearch || filteredChildren.length > 0) && parentPassesStatus) {
          return {
            ...parent,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as AdminFeatureNode[];
  }, [featureTree, search, statusFilter, featureAccess]);

  const enabledCount = useMemo(() => {
    return ADMIN_FEATURE_REGISTRY.filter((f) => getMode(f.key, f.defaultAccess) === "FULL_ACCESS").length;
  }, [featureAccess]);

  return (
    <div className="space-y-4">
      {/* 1. New Features Notification Banner */}
      {unconfiguredCount > 0 && (
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
            <Sparkles className="h-4 w-4 shrink-0 text-cyan-500 animate-spin-slow" />
            <span>
              <strong>{unconfiguredCount} new module(s)/feature(s)</strong> added to the Admin Registry. They will inherit safe defaults.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleApplyPreset("safe_defaults")}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shrink-0 shadow-xs transition"
          >
            Apply Safe Defaults
          </button>
        </div>
      )}

      {/* 2. Top Toolbar: Presets & Controls */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        {/* Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("core")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
            >
              Core Modules Only
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("full")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
            >
              Full Access All
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("showcase")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 transition"
            >
              Showcase All Non-Core
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("hidden")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Hide All
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              Collapse All
            </button>
            {initialFeatureAccess && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition"
                  title="Reset to initial plan version configuration"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features, modules, reports..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
              >
                <option value="all">All Features ({ADMIN_FEATURE_REGISTRY.length})</option>
                <option value="enabled">Enabled Only ({enabledCount})</option>
                <option value="showcase">Showcase Only</option>
                <option value="hidden">Hidden Only</option>
                {unconfiguredCount > 0 && (
                  <option value="new">✨ New Features Only ({unconfiguredCount})</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Hierarchical Feature Tree (Exact Admin Sidebar Mirror) */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredTree.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No modules match your search.</p>
            <p className="text-xs mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          filteredTree.map((parent) => {
            const parentMode = getMode(parent.key, parent.defaultAccess);
            const isParentDisabled = parentMode === "HIDDEN";
            const isExpanded = expandedModules[parent.id] ?? true;
            const hasChildren = parent.children.length > 0;
            const ParentIcon = ICON_MAP[parent.icon] || LayoutDashboard;
            const isParentNew = isFeatureUnconfigured(parent.key, featureAccess);

            return (
              <div key={parent.id} className="transition-colors">
                {/* Parent Module Header Row */}
                <div
                  className={cn(
                    "flex items-center justify-between p-3.5 sm:px-4 transition-colors",
                    isParentDisabled
                      ? "bg-slate-50/60 dark:bg-slate-900/40 opacity-70"
                      : parentMode === "SHOWCASE"
                      ? "bg-amber-50/20 dark:bg-amber-950/10"
                      : "bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    {/* Expand/Collapse Chevron */}
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(parent.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        aria-label="Toggle section"
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform duration-200", !isExpanded && "-rotate-90")}
                        />
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}

                    {/* Module Icon */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border",
                        parentMode === "FULL_ACCESS"
                          ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900"
                          : parentMode === "SHOWCASE"
                          ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900"
                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      )}
                    >
                      <ParentIcon className="h-4 w-4" />
                    </div>

                    {/* Label & Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {parent.label}
                        </span>
                        {hasChildren && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({parent.children.length} sub-features)
                          </span>
                        )}
                        {isParentNew && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                            ✨ New
                          </span>
                        )}
                        {!parent.planControlled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Baseline Core
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {parent.description}
                      </p>
                    </div>
                  </div>

                  {/* Parent Access State Selector */}
                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={parentMode}
                      onChange={(e) => handleSetFeatureAccess(parent, e.target.value as FeatureAccessMode)}
                      disabled={!parent.planControlled}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-xl border focus:outline-none transition shadow-2xs cursor-pointer",
                        !parent.planControlled
                          ? "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 cursor-not-allowed"
                          : parentMode === "FULL_ACCESS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : parentMode === "SHOWCASE"
                          ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                      )}
                    >
                      <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                      <option value="SHOWCASE">🔒 SHOWCASE</option>
                      <option value="HIDDEN">— HIDDEN</option>
                    </select>
                  </div>
                </div>

                {/* Sub-features / Children tree */}
                {hasChildren && isExpanded && (
                  <div
                    className={cn(
                      "bg-slate-50/50 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800/40 border-t border-slate-100 dark:border-slate-800/60 pl-8 sm:pl-12 pr-3.5 sm:pr-4 py-1",
                      isParentDisabled && "pointer-events-none opacity-50"
                    )}
                  >
                    {parent.children.map((child, idx) => {
                      const childMode = getMode(child.key, child.defaultAccess);
                      const isChildNew = isFeatureUnconfigured(child.key, featureAccess);
                      const isLastChild = idx === parent.children.length - 1;
                      const ChildIcon = ICON_MAP[child.icon] || FileText;

                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
                        >
                          {/* Tree branch line and feature details */}
                          <div className="flex items-center gap-2.5 min-w-0 pr-3">
                            <span className="font-mono text-slate-300 dark:text-slate-700 select-none text-sm">
                              {isLastChild ? "└─" : "├─"}
                            </span>

                            <ChildIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {child.label}
                                </span>
                                {isChildNew && (
                                  <span className="px-1.5 py-0.2 text-[8px] font-bold uppercase rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">
                                {child.description}
                              </p>
                            </div>
                          </div>

                          {/* Access Mode Selector / Switch */}
                          <div className="shrink-0 flex items-center gap-2">
                            {isParentDisabled ? (
                              <span className="text-[10px] font-medium text-slate-400 italic">
                                Module is Hidden
                              </span>
                            ) : (
                              <select
                                value={childMode}
                                onChange={(e) =>
                                  handleSetFeatureAccess(child, e.target.value as FeatureAccessMode)
                                }
                                className={cn(
                                  "px-2.5 py-1 text-[11px] font-bold rounded-lg border focus:outline-none transition cursor-pointer",
                                  childMode === "FULL_ACCESS"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                                    : childMode === "SHOWCASE"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
                                    : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                )}
                              >
                                <option value="FULL_ACCESS">✓ FULL ACCESS</option>
                                <option value="SHOWCASE">🔒 SHOWCASE</option>
                                <option value="HIDDEN">— HIDDEN</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
