"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  Sliders,
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  CreditCard,
  BookOpen,
  FileText,
  Award,
  Bell,
  Clock,
  ChevronRight,
  X,
  Filter,
  Layers,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  FeatureDefinition,
  GlobalFeatureState,
  SchoolFeatureOverride,
  FeatureControlOverview,
  RolloutMode,
  OverrideType,
} from "@/types/featureControl";
import { FEATURE_REGISTRY } from "@/lib/feature-control/featureRegistry";

interface SchoolSimple {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function SuperAdminFeatureControlPage() {
  const [activeTab, setActiveTab] = useState<
    "modules" | "features" | "actions" | "rollout" | "overrides" | "audit"
  >("modules");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Server state
  const [globalStates, setGlobalStates] = useState<Record<string, GlobalFeatureState>>({});
  const [overrides, setOverrides] = useState<SchoolFeatureOverride[]>([]);
  const [schools, setSchools] = useState<SchoolSimple[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<FeatureControlOverview | null>(null);

  // Modal / Drawer state
  const [selectedFeature, setSelectedFeature] = useState<FeatureDefinition | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Override form state
  const [newOverrideSchoolId, setNewOverrideSchoolId] = useState("");
  const [newOverrideFeatureId, setNewOverrideFeatureId] = useState("");
  const [newOverrideType, setNewOverrideType] = useState<OverrideType>("ALLOW");
  const [newOverrideLimit, setNewOverrideLimit] = useState("");
  const [newOverrideReason, setNewOverrideReason] = useState("");

  // Rollout editor state
  const [rolloutFeatureId, setRolloutFeatureId] = useState("");
  const [rolloutMode, setRolloutMode] = useState<RolloutMode>("ON_FOR_ALL");
  const [selectedSchoolsForRollout, setSelectedSchoolsForRollout] = useState<string[]>([]);
  const [rolloutReason, setRolloutReason] = useState("");

  // 1. Initial Data Fetch
  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/super-admin/features");
      const data = await res.json();
      if (data.success) {
        setGlobalStates(data.globalStates || {});
        setOverrides(data.overrides || []);
        setSchools(data.schools || []);
        setAuditLogs(data.auditLogs || []);
        setOverview(data.overview || null);
      }
    } catch (err) {
      console.error("Failed to load feature control data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // 2. Real-time Firestore sync on siteSettings/feature_controls
    const db = getFirebaseDb();
    if (!db) return;

    const unsubControls = onSnapshot(
      doc(db, "siteSettings", "feature_controls"),
      (snap) => {
        if (snap.exists()) {
          const states = snap.data()?.states || {};
          setGlobalStates(states);
        }
      },
      (err) => console.warn("Feature controls real-time listener notice:", err)
    );

    return () => unsubControls();
  }, [fetchData]);

  // Handle instant toggle for a feature/module/action
  const handleToggleState = async (
    feature: FeatureDefinition,
    currentEnabled: boolean,
    customReason?: string
  ) => {
    try {
      setActionLoading(true);
      const newEnabled = !currentEnabled;
      const res = await fetch("/api/super-admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId: feature.id,
          enabled: newEnabled,
          rolloutMode: newEnabled ? "ON_FOR_ALL" : "OFF",
          reason: customReason || `Toggled via Feature Control Dashboard to ${newEnabled ? "ON" : "OFF"}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGlobalStates((prev) => ({
          ...prev,
          [feature.id]: data.state,
        }));
        // Update local overview
        fetchData();
      } else {
        alert(data.error || "Failed to update feature state");
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle feature");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save Rollout Settings
  const handleSaveRollout = async () => {
    if (!rolloutFeatureId) {
      alert("Please select a target feature.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/super-admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId: rolloutFeatureId,
          rolloutMode,
          selectedSchoolIds: selectedSchoolsForRollout,
          enabled: rolloutMode !== "OFF",
          reason: rolloutReason || `Rollout configured as ${rolloutMode}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGlobalStates((prev) => ({
          ...prev,
          [rolloutFeatureId]: data.state,
        }));
        alert("Rollout settings saved successfully.");
        setRolloutReason("");
        fetchData();
      } else {
        alert(data.error || "Failed to save rollout");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save rollout");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit School Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOverrideSchoolId || !newOverrideFeatureId) {
      alert("Please select both a school and a feature.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch("/api/super-admin/features/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: newOverrideSchoolId,
          featureId: newOverrideFeatureId,
          overrideType: newOverrideType,
          limitValue: newOverrideLimit ? Number(newOverrideLimit) : undefined,
          reason: newOverrideReason || `Manual override set to ${newOverrideType}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsOverrideModalOpen(false);
        setNewOverrideSchoolId("");
        setNewOverrideFeatureId("");
        setNewOverrideType("ALLOW");
        setNewOverrideLimit("");
        setNewOverrideReason("");
        fetchData();
      } else {
        alert(data.error || "Failed to set school override");
      }
    } catch (err: any) {
      alert(err.message || "Failed to set school override");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Override
  const handleDeleteOverride = async (id?: string, schoolId?: string, featureId?: string) => {
    if (!confirm("Are you sure you want to remove this school override? Default inheritance will be restored.")) {
      return;
    }

    try {
      setActionLoading(true);
      const url = id
        ? `/api/super-admin/features/overrides?id=${id}`
        : `/api/super-admin/features/overrides?schoolId=${schoolId}&featureId=${featureId}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setOverrides((prev) => prev.filter((o) => o.id !== id));
        fetchData();
      } else {
        alert(data.error || "Failed to remove override");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete override");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Registry Lists
  const filteredRegistry = useMemo(() => {
    return FEATURE_REGISTRY.filter((item) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Module filter
      const matchesModule =
        moduleFilter === "ALL" || item.moduleKey === moduleFilter;

      // Status filter
      const state = globalStates[item.id] || globalStates[item.key];
      const isOff = state && (state.rolloutMode === "OFF" || state.enabled === false);
      const isBeta = state && state.rolloutMode === "BETA";
      const isSelected = state && state.rolloutMode === "SELECTED_SCHOOLS";

      let matchesStatus = true;
      if (statusFilter === "ACTIVE") matchesStatus = !isOff;
      else if (statusFilter === "INACTIVE") matchesStatus = Boolean(isOff);
      else if (statusFilter === "BETA") matchesStatus = Boolean(isBeta || isSelected);

      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [searchQuery, moduleFilter, statusFilter, globalStates]);

  const modulesList = useMemo(
    () => filteredRegistry.filter((f) => f.category === "module"),
    [filteredRegistry]
  );
  const featuresList = useMemo(
    () => filteredRegistry.filter((f) => f.category === "feature"),
    [filteredRegistry]
  );
  const actionsList = useMemo(
    () => filteredRegistry.filter((f) => f.category === "action"),
    [filteredRegistry]
  );

  const getModuleIcon = (key: string) => {
    switch (key) {
      case "students":
        return <GraduationCap className="h-5 w-5 text-blue-500" />;
      case "teachers":
        return <Users className="h-5 w-5 text-indigo-500" />;
      case "attendance":
        return <Calendar className="h-5 w-5 text-emerald-500" />;
      case "fees":
        return <CreditCard className="h-5 w-5 text-amber-500" />;
      case "homework":
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case "reports":
        return <FileText className="h-5 w-5 text-cyan-500" />;
      case "exams":
        return <Award className="h-5 w-5 text-rose-500" />;
      case "notices":
        return <Bell className="h-5 w-5 text-orange-500" />;
      case "timetable":
        return <Clock className="h-5 w-5 text-teal-500" />;
      default:
        return <Layers className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (item: FeatureDefinition) => {
    const state = globalStates[item.id] || globalStates[item.key];
    if (state && (state.rolloutMode === "OFF" || state.enabled === false)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <XCircle className="h-3.5 w-3.5" />
          DISABLED (OFF)
        </span>
      );
    }
    if (state && state.rolloutMode === "BETA") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
          <Sparkles className="h-3.5 w-3.5" />
          BETA TEST
        </span>
      );
    }
    if (state && state.rolloutMode === "SELECTED_SCHOOLS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          <Building2 className="h-3.5 w-3.5" />
          {state.selectedSchoolIds?.length || 0} SCHOOLS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ACTIVE (ON)
      </span>
    );
  };

  const isItemEnabled = (item: FeatureDefinition) => {
    const state = globalStates[item.id] || globalStates[item.key];
    if (!state) return true;
    return state.rolloutMode !== "OFF" && state.enabled !== false;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumbs & Live Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <span>Super Admin</span>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100 font-bold">
              Feature Control Center
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Sliders className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>Platform Feature Control Center</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Authoritative real-time governance of modules, granular features, action kill switches, and school overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
            </span>
            <span>Real-time Active</span>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh Registry"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Core Modules
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overview?.totalModules || 9}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {overview?.activeModules || 9} Active
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {overview?.disabledModules ? `${overview.disabledModules} Disabled` : "All modules online"}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Granular Features
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overview?.totalFeatures || 27}
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {overview?.activeFeatures || 27} Active
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {overview?.betaFeatures ? `${overview.betaFeatures} in Beta` : "Global production"}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Action Kill Switches
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overview?.activeActions || 8}
            </span>
            <span
              className={`text-xs font-bold ${
                overview?.dangerousActionsKilled
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {overview?.dangerousActionsKilled ? `${overview.dangerousActionsKilled} Killed` : "All Armed"}
            </span>
          </div>
          <div className="text-[10px] text-gray-400">Dangerous operations protected</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            School Overrides
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overrides.length}
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              Custom Rules
            </span>
          </div>
          <div className="text-[10px] text-gray-400">Per-campus allow/deny</div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Affected Campuses
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {overview?.affectedSchoolsCount || 0}
            </span>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              Active Targets
            </span>
          </div>
          <div className="text-[10px] text-gray-400">Selective rollout & rules</div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800 scrollbar-none">
        {[
          { id: "modules", label: "Modules", count: modulesList.length },
          { id: "features", label: "Granular Features", count: featuresList.length },
          { id: "actions", label: "Action Kill Switches", count: actionsList.length },
          { id: "rollout", label: "Rollout / Beta", count: null },
          { id: "overrides", label: "School Overrides", count: overrides.length },
          { id: "audit", label: "Audit History", count: auditLogs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? "bg-indigo-700 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 4. Global Search & Filters (For Modules, Features, Actions) */}
      {["modules", "features", "actions"].includes(activeTab) && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by module, feature name, key or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Modules</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="attendance">Attendance</option>
              <option value="fees">Fees</option>
              <option value="homework">Homework</option>
              <option value="reports">Reports</option>
              <option value="exams">Exams</option>
              <option value="notices">Notices</option>
              <option value="timetable">Timetable</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (ON)</option>
              <option value="INACTIVE">Disabled (OFF)</option>
              <option value="BETA">Beta / Limited</option>
            </select>
          </div>
        </div>
      )}

      {/* 5. TAB 1: MODULES CONTROL */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulesList.map((mod) => {
              const enabled = isItemEnabled(mod);
              const state = globalStates[mod.id] || globalStates[mod.key];
              const childFeatures = FEATURE_REGISTRY.filter(
                (f) => f.moduleKey === mod.moduleKey && f.category === "feature"
              );

              return (
                <div
                  key={mod.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all p-5 space-y-4 shadow-sm flex flex-col justify-between ${
                    enabled
                      ? "border-gray-200 dark:border-gray-700"
                      : "border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/60">
                          {getModuleIcon(mod.moduleKey)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-gray-900 dark:text-white">
                            {mod.name}
                          </h3>
                          <span className="text-[11px] font-mono text-gray-400">
                            {mod.key}
                          </span>
                        </div>
                      </div>

                      {/* Instant Reactive ON/OFF Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={actionLoading}
                          onChange={() => handleToggleState(mod, enabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {mod.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(mod)}
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        {childFeatures.length} sub-features
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                    <span className="text-[10px] text-gray-400">
                      {state?.updatedAt
                        ? `Updated: ${new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : "Inherited Default"}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedFeature(mod);
                        setIsDrawerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TAB 2: GRANULAR FEATURES */}
      {activeTab === "features" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-4">Feature Name</th>
                  <th className="py-3.5 px-4">Module</th>
                  <th className="py-3.5 px-4">Key / Identifier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Endpoints</th>
                  <th className="py-3.5 px-4 text-center">State Toggle</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {featuresList.map((feat) => {
                  const enabled = isItemEnabled(feat);

                  return (
                    <tr
                      key={feat.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {feat.isDangerous && (
                            <span title="High Impact Feature">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            </span>
                          )}
                          <span>{feat.name}</span>
                        </div>
                        <p className="text-[11px] font-normal text-gray-400 max-w-sm truncate">
                          {feat.description}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-300">
                          {feat.moduleKey}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                        {feat.key}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(feat)}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                        {feat.apiEndpoints?.length ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                            {feat.apiEndpoints[0].method} {feat.apiEndpoints[0].path}
                          </span>
                        ) : (
                          "Client UI"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={actionLoading}
                            onChange={() => handleToggleState(feat, enabled)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setRolloutFeatureId(feat.id);
                              const st = globalStates[feat.id];
                              setRolloutMode(st?.rolloutMode || "ON_FOR_ALL");
                              setSelectedSchoolsForRollout(st?.selectedSchoolIds || []);
                              setActiveTab("rollout");
                            }}
                            className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg font-bold"
                          >
                            Rollout
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFeature(feat);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: ACTION KILL SWITCHES */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-amber-900 dark:text-amber-200">
                Action / API Emergency Kill Switches
              </strong>
              <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                Toggling an action switch immediately halts the corresponding API endpoint and client button triggers across all school tenant portals in real time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionsList.map((action) => {
              const enabled = isItemEnabled(action);
              const isKilled = !enabled;

              return (
                <div
                  key={action.id}
                  className={`p-5 rounded-2xl border transition-all shadow-sm space-y-4 ${
                    isKilled
                      ? "bg-red-50/50 dark:bg-red-950/30 border-red-300 dark:border-red-900"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isKilled
                              ? "bg-red-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {isKilled ? "BLOCKED / KILLED" : "ARMED / ALLOWED"}
                        </span>
                        {action.isDangerous && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Critical Operation
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        {action.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {action.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleState(action, enabled)}
                      disabled={actionLoading}
                      className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        isKilled
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {isKilled ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          <span>RESTORE</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>KILL SWITCH</span>
                        </>
                      )}
                    </button>
                  </div>

                  {action.apiEndpoints && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-[11px] font-mono space-y-1">
                      <span className="text-gray-400 font-bold block text-[10px] uppercase">
                        Guarded APIs:
                      </span>
                      {action.apiEndpoints.map((ep, i) => (
                        <div key={i} className="text-gray-700 dark:text-gray-300">
                          <strong className="text-indigo-600 dark:text-indigo-400">
                            {ep.method}
                          </strong>{" "}
                          {ep.path}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. TAB 4: ROLLOUT / BETA */}
      {activeTab === "rollout" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span>Feature Rollout & Beta Deployment</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure deployment stages: turn features OFF globally, roll out to ALL, or restrict to BETA testing and SELECTED SCHOOLS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  1. Select Target Feature / Module
                </label>
                <select
                  value={rolloutFeatureId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setRolloutFeatureId(id);
                    const st = globalStates[id];
                    setRolloutMode(st?.rolloutMode || "ON_FOR_ALL");
                    setSelectedSchoolsForRollout(st?.selectedSchoolIds || []);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Feature / Module --</option>
                  {FEATURE_REGISTRY.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.category.toUpperCase()}] {f.name} ({f.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  2. Rollout Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: "ON_FOR_ALL", label: "On for All", desc: "Available platform-wide" },
                    { mode: "BETA", label: "Beta Testing", desc: "Pilot beta cohort" },
                    { mode: "SELECTED_SCHOOLS", label: "Selected Schools", desc: "Explicitly chosen schools" },
                    { mode: "OFF", label: "Disabled (OFF)", desc: "Completely locked" },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => setRolloutMode(item.mode as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        rolloutMode === item.mode
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-white"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  3. Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Pilot release for early adopter schools"
                  value={rolloutReason}
                  onChange={(e) => setRolloutReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleSaveRollout}
                disabled={actionLoading || !rolloutFeatureId}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "Saving..." : "Apply Rollout Configuration"}
              </button>
            </div>

            {/* School Selector when in BETA or SELECTED_SCHOOLS */}
            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Select Participating Schools ({selectedSchoolsForRollout.length})
                </span>
                <span className="text-[10px] text-gray-400">
                  {rolloutMode === "ON_FOR_ALL" || rolloutMode === "OFF"
                    ? "Not applicable for global modes"
                    : "Toggle participating campuses"}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {schools.map((sch) => {
                  const isSelected = selectedSchoolsForRollout.includes(sch.id);
                  const disabled = rolloutMode === "ON_FOR_ALL" || rolloutMode === "OFF";

                  return (
                    <label
                      key={sch.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-100/60 dark:bg-indigo-950/60 border-indigo-400 text-indigo-950 dark:text-white font-bold"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSchoolsForRollout((prev) => [...prev, sch.id]);
                            } else {
                              setSelectedSchoolsForRollout((prev) =>
                                prev.filter((id) => id !== sch.id)
                              );
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{sch.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">
                        {sch.code || sch.id.slice(0, 8)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: SCHOOL OVERRIDES */}
      {activeTab === "overrides" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                School-Specific Overrides
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Grant or restrict features for individual schools regardless of global plan entitlements.
              </p>
            </div>

            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add School Override</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3.5 px-4">School</th>
                    <th className="py-3.5 px-4">Target Feature</th>
                    <th className="py-3.5 px-4">Override Type</th>
                    <th className="py-3.5 px-4">Custom Limit</th>
                    <th className="py-3.5 px-4">Reason / Author</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {overrides.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No school overrides configured. All schools inherit global settings & plan rules.
                      </td>
                    </tr>
                  ) : (
                    overrides.map((ovr) => {
                      const sch = schools.find((s) => s.id === ovr.schoolId);
                      const feat = FEATURE_REGISTRY.find(
                        (f) => f.id === ovr.featureId || f.key === ovr.featureId
                      );

                      return (
                        <tr
                          key={ovr.id || `${ovr.schoolId}_${ovr.featureId}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                            {sch?.name || ovr.schoolId}
                            <span className="block text-[10px] font-mono text-gray-400">
                              {sch?.code || ovr.schoolId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {feat?.name || ovr.featureId}
                            </span>
                            <span className="block text-[10px] font-mono text-gray-400">
                              {ovr.featureId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                ovr.overrideType === "ALLOW"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                  : ovr.overrideType === "DENY"
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                              }`}
                            >
                              {ovr.overrideType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">
                            {ovr.limitValue !== undefined ? ovr.limitValue : "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {ovr.reason || "Administrative override"}
                            <span className="block text-[10px] text-gray-400">
                              By: {ovr.updatedBy || "super_admin"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-gray-400">
                            {ovr.updatedAt
                              ? new Date(ovr.updatedAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() =>
                                handleDeleteOverride(ovr.id, ovr.schoolId, ovr.featureId)
                              }
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete Override"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 6: AUDIT HISTORY */}
      {activeTab === "audit" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Feature Governance Audit Trail
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Immutable chronological log of all feature toggles, kill switch activations, and school override adjustments.
              </p>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {auditLogs.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Feature / Action</th>
                  <th className="py-3.5 px-4">Target Scope</th>
                  <th className="py-3.5 px-4">Previous State</th>
                  <th className="py-3.5 px-4">New State</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No feature changes recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {log.featureName || log.featureId}
                        <span className="block text-[10px] font-mono text-gray-400">
                          {log.featureId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.target === "GLOBAL"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                          }`}
                        >
                          {log.target}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                        {log.previousState
                          ? log.previousState.rolloutMode ||
                            (log.previousState.enabled !== undefined ? String(log.previousState.enabled) : "DEFAULT")
                          : "DEFAULT"}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {log.newState
                          ? log.newState.rolloutMode ||
                            (log.newState.enabled !== undefined ? String(log.newState.enabled) : "SET")
                          : "REMOVED"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {log.actorEmail || log.actorId}
                      </td>
                      <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                        {log.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. SLIDE-OVER DETAIL DRAWER */}
      {isDrawerOpen && selectedFeature && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-gray-800 shadow-2xl p-6 space-y-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2.5">
                    {getModuleIcon(selectedFeature.moduleKey)}
                    <div>
                      <h2 className="text-base font-black text-gray-900 dark:text-white">
                        {selectedFeature.name}
                      </h2>
                      <span className="text-xs font-mono text-gray-400">
                        {selectedFeature.id}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                      Description
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {selectedFeature.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Category
                      </span>
                      <div className="text-xs font-bold text-gray-900 dark:text-white uppercase mt-0.5">
                        {selectedFeature.category}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Parent Module
                      </span>
                      <div className="text-xs font-bold text-gray-900 dark:text-white capitalize mt-0.5">
                        {selectedFeature.moduleKey}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                      Current Live Status
                    </span>
                    <div className="mt-1.5 flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <div>{getStatusBadge(selectedFeature)}</div>

                      <button
                        onClick={() =>
                          handleToggleState(
                            selectedFeature,
                            isItemEnabled(selectedFeature)
                          )
                        }
                        disabled={actionLoading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                          isItemEnabled(selectedFeature)
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {isItemEnabled(selectedFeature) ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {selectedFeature.apiEndpoints && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Target API Endpoints
                      </span>
                      <div className="mt-1.5 space-y-1.5 font-mono text-[11px]">
                        {selectedFeature.apiEndpoints.map((ep, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                          >
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {ep.method}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300">
                              {ep.path}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. ADD SCHOOL OVERRIDE MODAL */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span>Configure School Feature Override</span>
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target School Campus *
                </label>
                <select
                  value={newOverrideSchoolId}
                  onChange={(e) => setNewOverrideSchoolId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Target School --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || s.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Feature or Module *
                </label>
                <select
                  value={newOverrideFeatureId}
                  onChange={(e) => setNewOverrideFeatureId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Feature or Module --</option>
                  {FEATURE_REGISTRY.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.category.toUpperCase()}] {f.name} ({f.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "ALLOW", label: "Explicit Allow", desc: "Grant feature" },
                  { type: "DENY", label: "Explicit Deny", desc: "Block feature" },
                  { type: "CUSTOM_LIMIT", label: "Custom Limit", desc: "Set numeric quota" },
                ].map((btn) => (
                  <button
                    key={btn.type}
                    type="button"
                    onClick={() => setNewOverrideType(btn.type as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      newOverrideType === btn.type
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-white font-bold"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="text-xs">{btn.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{btn.desc}</div>
                  </button>
                ))}
              </div>

              {newOverrideType === "CUSTOM_LIMIT" && (
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Custom Limit Value *
                  </label>
                  <input
                    type="number"
                    value={newOverrideLimit}
                    onChange={(e) => setNewOverrideLimit(e.target.value)}
                    required
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Reason / Administrative Justification
                </label>
                <input
                  type="text"
                  value={newOverrideReason}
                  onChange={(e) => setNewOverrideReason(e.target.value)}
                  placeholder="e.g. Special campus pilot approved by Management"
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}