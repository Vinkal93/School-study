"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  Filter,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
  Lock,
  Eye,
  Flame,
  Check,
  X,
  Loader2,
  FileCode,
  Tag,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type {
  SecurityCategory,
  SecuritySeverity,
  FindingStatus,
  SecurityTestDefinition,
  SecurityFinding,
  SecurityIncident,
  SecurityTestRun,
  SecurityScoreCard,
  FrontendPatternResult,
} from "@/types/security-center";

export default function SecurityCommandCenterPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();

  const getAuthToken = useCallback(async () => {
    if (firebaseUser) {
      return await firebaseUser.getIdToken().catch(() => "");
    }
    return "";
  }, [firebaseUser]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getAuthToken();
      const headers = new Headers(options.headers || {});
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
    [getAuthToken]
  );

  // Primary Data States
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [catalog, setCatalog] = useState<SecurityTestDefinition[]>([]);
  const [runs, setRuns] = useState<SecurityTestRun[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [scoreCard, setScoreCard] = useState<SecurityScoreCard | null>(null);
  const [frontendChecks, setFrontendChecks] = useState<FrontendPatternResult[]>([]);

  // Navigation & Filtering States
  const [activeTab, setActiveTab] = useState<
    "overview" | "red-team" | "blue-team" | "incidents" | "attack-surface" | "reports"
  >("overview");
  const [targetEnv, setTargetEnv] = useState<"STAGING" | "PRODUCTION">("STAGING");
  const [selectedCategory, setSelectedCategory] = useState<SecurityCategory | "ALL">("ALL");
  const [testSearch, setTestSearch] = useState("");
  const [findingSearch, setFindingSearch] = useState("");
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("ALL");
  const [findingStatusFilter, setFindingStatusFilter] = useState<string>("ALL");

  // Selected Detail Modal States
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [retestingFindingId, setRetestingFindingId] = useState<string | null>(null);
  const [updatingFinding, setUpdatingFinding] = useState(false);

  // New Finding Modal States
  const [showNewFindingModal, setShowNewFindingModal] = useState(false);
  const [newFindingForm, setNewFindingForm] = useState({
    title: "",
    category: "AUTH" as SecurityCategory,
    severity: "HIGH" as SecuritySeverity,
    affectedComponent: "",
    description: "",
    expected: "",
    actual: "",
    impact: "",
    remediation: "",
  });

  // New Incident Modal States
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [newIncidentForm, setNewIncidentForm] = useState({
    title: "",
    severity: "HIGH" as SecuritySeverity,
    affectedSystem: "",
    initialEvent: "",
  });

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/super-admin/security-center");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load security center data");
      }
      setCatalog(json.data.catalog || []);
      setRuns(json.data.runs || []);
      setFindings(json.data.findings || []);
      setIncidents(json.data.incidents || []);
      setScoreCard(json.data.scoreCard || null);
      setFrontendChecks(json.data.frontendChecks || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Security Center");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, firebaseUser, fetchData]);

  // Run Test Suite
  const handleRunTests = async (category: SecurityCategory | "ALL" = "ALL") => {
    setRunningTests(true);
    toast.info(`Running defensive security suite (${category})...`);
    try {
      const res = await authFetch("/api/super-admin/security-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, environment: targetEnv }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Execution failed");
      }
      toast.success(
        `Security test run complete: ${json.data.testRun.passed}/${json.data.testRun.testsExecuted} passed.`
      );
      setRuns((prev) => [json.data.testRun, ...prev]);
      setScoreCard(json.data.scoreCard);
      // Refresh findings
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete test run");
    } finally {
      setRunningTests(false);
    }
  };

  // Retest a specific finding
  const handleRetestFinding = async (findingId: string) => {
    setRetestingFindingId(findingId);
    try {
      const res = await authFetch("/api/super-admin/security-center/retest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Retest execution failed");
      }
      if (json.data.retestResult === "PASS") {
        toast.success(`Retest PASSED: Verification evidence recorded!`);
      } else {
        toast.error(`Retest FAILED: Invariant assertion still failing.`);
      }
      // Update locally
      setSelectedFinding(json.data.finding);
      setFindings((prev) => prev.map((f) => (f.id === findingId ? json.data.finding : f)));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to retest finding");
    } finally {
      setRetestingFindingId(null);
    }
  };

  // Update Finding Status / Owner
  const handleUpdateFindingStatus = async (
    findingId: string,
    newStatus: FindingStatus,
    remediationText?: string
  ) => {
    setUpdatingFinding(true);
    try {
      const res = await authFetch(`/api/super-admin/security-center/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          remediation: remediationText !== undefined ? remediationText : selectedFinding?.remediation,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update finding");
      }
      toast.success(`Finding status updated to ${newStatus}`);
      setSelectedFinding(json.data);
      setFindings((prev) => prev.map((f) => (f.id === findingId ? json.data : f)));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Update rejected");
    } finally {
      setUpdatingFinding(false);
    }
  };

  // Create New Finding
  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/super-admin/security-center/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFindingForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create finding");
      }
      toast.success("Security finding logged into Blue Team registry.");
      setShowNewFindingModal(false);
      setNewFindingForm({
        title: "",
        category: "AUTH",
        severity: "HIGH",
        affectedComponent: "",
        description: "",
        expected: "",
        actual: "",
        impact: "",
        remediation: "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create finding");
    }
  };

  // Create Incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch("/api/super-admin/security-center/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncidentForm),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to declare incident");
      }
      toast.success("Security incident declared and tracked.");
      setShowNewIncidentModal(false);
      setNewIncidentForm({
        title: "",
        severity: "HIGH",
        affectedSystem: "",
        initialEvent: "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to declare incident");
    }
  };

  // Filtered Catalog Tests
  const filteredTests = useMemo(() => {
    return catalog.filter((t) => {
      const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
      const matchesSearch =
        !testSearch ||
        t.id.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(testSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, testSearch]);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesSearch =
        !findingSearch ||
        f.id.toLowerCase().includes(findingSearch.toLowerCase()) ||
        f.title.toLowerCase().includes(findingSearch.toLowerCase()) ||
        f.description.toLowerCase().includes(findingSearch.toLowerCase());
      const matchesSeverity = findingSeverityFilter === "ALL" || f.severity === findingSeverityFilter;
      const matchesStatus = findingStatusFilter === "ALL" || f.status === findingStatusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [findings, findingSearch, findingSeverityFilter, findingStatusFilter]);

  // Health Status Styling
  const getHealthBadge = (health: string | undefined) => {
    switch (health) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> HEALTHY
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> WARNING
          </span>
        );
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
            <ShieldAlert className="h-3.5 w-3.5" /> CRITICAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Info className="h-3.5 w-3.5" /> NOT VERIFIED
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: SecuritySeverity) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case "HIGH":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">HIGH</span>;
      case "MEDIUM":
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
      case "LOW":
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30">INFO</span>;
    }
  };

  const getStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">OPEN</span>;
      case "TRIAGED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">TRIAGED</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">IN PROGRESS</span>;
      case "FIXED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">FIXED</span>;
      case "RETEST_REQUIRED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">RETEST REQ</span>;
      case "VERIFIED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VERIFIED</span>;
      case "CLOSED":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">CLOSED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-500/10 text-gray-500">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading Super Admin Security Operations Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Security Command Center
                  </h1>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Red Team + Blue Team
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Internal defensive testing, vulnerability lifecycle verification, and audit controls.
                </p>
              </div>
            </div>
          </div>

          {/* Scope & Mode Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-950">
              <span className="px-2 text-slate-500">Target Env:</span>
              <button
                onClick={() => setTargetEnv("STAGING")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  targetEnv === "STAGING"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                STAGING
              </button>
              <button
                onClick={() => setTargetEnv("PRODUCTION")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  targetEnv === "PRODUCTION"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                PROD (SAFE)
              </button>
            </div>

            <button
              onClick={() => handleRunTests("ALL")}
              disabled={runningTests}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              {runningTests ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Suite...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Run Red Team Suite
                </>
              )}
            </button>

            <button
              onClick={() => setShowNewFindingModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="h-4 w-4 text-rose-500" />
              Log Finding
            </button>
          </div>
        </div>

        {/* Safety Boundary Notice */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Scope Constraint Active:</strong> School Study authorized routes & test fixtures only. Zero destructive automation. Strict audit logs enabled.
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">
            {profile?.email || "Super Admin"}
          </span>
        </div>
      </div>

      {/* Top Scorecard & Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Verified Security Score */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-rose-500" />
              Security Score
            </span>
            {scoreCard?.trend === "UP" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
            {scoreCard?.trend === "DOWN" && <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {scoreCard?.score !== null && scoreCard?.score !== undefined ? `${scoreCard.score}/100` : "—"}
            </span>
            <div>{getHealthBadge(scoreCard?.health)}</div>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {scoreCard?.score !== null ? `${scoreCard?.coveragePercentage}% test coverage` : "No tests run yet"}
          </p>
        </div>

        {/* Metric 2: Open Findings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>Open Findings</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {scoreCard ? scoreCard.openFindings + scoreCard.inProgressFindings : 0}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-rose-500 font-bold">{scoreCard?.criticalFindings || 0} Critical</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-amber-500 font-bold">{scoreCard?.highFindings || 0} High</span>
          </div>
        </div>

        {/* Metric 3: Verified Fixes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Verified Fixes</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {scoreCard?.verifiedFixes || 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {scoreCard?.awaitingRetestFindings || 0} awaiting retest
          </p>
        </div>

        {/* Metric 4: Test Catalog Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-indigo-500" />
            <span>Red Team Catalog</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {scoreCard?.passedTests || 0} / {catalog.length}
          </div>
          <p className="text-[11px] text-slate-400">
            {scoreCard?.failedTests || 0} failed assertions
          </p>
        </div>

        {/* Metric 5: Active Incidents */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-rose-500" />
            <span>Active Incidents</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").length}
          </div>
          <p className="text-[11px] text-slate-400">
            {incidents.filter((i) => i.status === "RESOLVED").length} resolved
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-sm font-medium gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Activity className="h-4 w-4" />
          Overview & Scoring
        </button>

        <button
          onClick={() => setActiveTab("red-team")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "red-team"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Terminal className="h-4 w-4" />
          Red Team Operations
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {catalog.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("blue-team")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "blue-team"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Blue Team Findings
          <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            {findings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("incidents")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "incidents"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Flame className="h-4 w-4" />
          Incidents & Timeline
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {incidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("attack-surface")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "attack-surface"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Lock className="h-4 w-4" />
          Attack Surface & Code Patterns
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "reports"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          Audit Reports
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Score Calculation Breakdown Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Evidence-Based Posture Assessment
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {scoreCard?.explanation || "Calculated dynamically based on real test execution results and verified remediations."}
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Test Execution Base (75 pts max)</span>
                <p className="text-slate-500">
                  {scoreCard?.passedTests || 0} passing out of {catalog.length} cataloged assertions across 16 core categories.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Vulnerability Deductions</span>
                <p className="text-slate-500">
                  Critical: -25 pts | High: -15 pts | Medium: -6 pts | Low: -2 pts | Failed Retest: -10 pts.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Verified Remediation Credit</span>
                <p className="text-slate-500">
                  +{((scoreCard?.verifiedFixes || 0) * 4)} pts earned from verified fixes with documented retest evidence (up to +25).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Runs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Test Execution Panels */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Play className="h-4 w-4 text-rose-500" />
                  Quick Security Verification Suites
                </h3>
                <span className="text-[11px] text-slate-400">Defensive Invariants</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { cat: "AUTH" as SecurityCategory, label: "Authentication & Token Cryptography", desc: "Token expiry, header spoofing rejection, missing Bearer guards" },
                  { cat: "RBAC" as SecurityCategory, label: "Role-Based Access Control Boundaries", desc: "Student privilege escalation block, teacher barrier, admin separation" },
                  { cat: "TENANT" as SecurityCategory, label: "Multi-Tenant Isolation Constraints", desc: "Cross-school query poisoning, student record leakage" },
                  { cat: "FINANCE" as SecurityCategory, label: "Financial Integrity & Tamper Proofing", desc: "Razorpay HMAC signature check, paise rounding, order price validation" },
                ].map((item) => (
                  <div
                    key={item.cat}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-950 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">
                          {item.cat}
                        </span>
                        {item.label}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleRunTests(item.cat)}
                      disabled={runningTests}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shadow-2xs transition-colors shrink-0"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Test
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Run History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Recent Execution Runs
                </h3>
                <span className="text-[11px] text-slate-400">{runs.length} runs recorded</span>
              </div>

              {runs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No execution runs recorded yet. Click &quot;Run Red Team Suite&quot; to begin.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {runs.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{run.id}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">
                            {run.environment}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {run?.startTime ? new Date(run.startTime).toLocaleTimeString() : "Recent"} • Operator: {run?.operator || "System"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {run.passed} passed
                        </span>
                        {run.failed > 0 && (
                          <span className="ml-1 text-rose-500 font-bold">
                            / {run.failed} failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. RED TEAM OPERATIONS TAB */}
      {activeTab === "red-team" && (
        <div className="space-y-6">
          {/* Controls & Search */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search test ID, name, description..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white w-64"
                />
              </div>

              {/* Category Filter Pills */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Categories ({catalog.length})</option>
                {[
                  "AUTH", "RBAC", "TENANT", "API", "FIRESTORE", "STORAGE",
                  "SESSION", "ENTITLEMENT", "BILLING", "FINANCE", "REPORTS",
                  "REALTIME", "INPUT", "SECRETS", "CONFIGURATION", "BUSINESS_LOGIC"
                ].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Showing {filteredTests.length} authorized test specifications
              </span>
              <button
                onClick={() => handleRunTests(selectedCategory)}
                disabled={runningTests}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {runningTests ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                Execute {selectedCategory === "ALL" ? "All" : selectedCategory}
              </button>
            </div>
          </div>

          {/* Test Catalog Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Test ID</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Specification & Verification Invariant</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Target Endpoint</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {test.id}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {test.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white">{test.name}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{test.description}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          Expected: {test.expectedResult}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {getSeverityBadge(test.risk)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {test.httpMethod && <span className="font-bold mr-1 text-slate-500">{test.httpMethod}</span>}
                        {test.endpoint || "In-memory guard"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRunTests(test.category)}
                          disabled={runningTests}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Play className="h-3 w-3 fill-current text-rose-500" />
                          Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. BLUE TEAM FINDINGS TAB */}
      {activeTab === "blue-team" && (
        <div className="space-y-6">
          {/* Controls & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search finding ID, title, details..."
                  value={findingSearch}
                  onChange={(e) => setFindingSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white w-64"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={findingSeverityFilter}
                onChange={(e) => setFindingSeverityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={findingStatusFilter}
                onChange={(e) => setFindingStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="TRIAGED">Triaged</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FIXED">Fixed</option>
                <option value="RETEST_REQUIRED">Retest Required</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewFindingModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              Log New Finding
            </button>
          </div>

          {/* Findings Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Finding ID</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Title & Affected Component</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Retest Status</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {filteredFindings.map((finding) => (
                    <tr
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding)}
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {finding.id}
                      </td>
                      <td className="px-4 py-3">
                        {getSeverityBadge(finding.severity)}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">{finding.title}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {finding.affectedComponent}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(finding.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            finding.retestStatus === "PASSED"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : finding.retestStatus === "FAILED"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {finding.retestStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {finding.owner || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFinding(finding);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Eye className="h-3 w-3 text-slate-400" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. INCIDENTS & TIMELINE TAB */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Security Incidents & Response Registry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Formal incident response tracking, timeline history, and containment actions.</p>
            </div>
            <button
              onClick={() => setShowNewIncidentModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Declare Incident
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{incident.id}</span>
                      {getSeverityBadge(incident.severity)}
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {incident.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{incident.title}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Affected: {incident.affectedSystem}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Incident Timeline
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {incident.timeline?.map((item, idx) => (
                      <div key={idx} className="text-xs flex items-start gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-slate-700 dark:text-slate-300">{item.event}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString()} • {item.actor}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Taken */}
                {incident.actions && incident.actions.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Remediation Actions
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                      {incident.actions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ATTACK SURFACE & CODE PATTERN TAB */}
      {activeTab === "attack-surface" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-500" />
              Automated Code Pattern & Surface Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Static verification of client-side role guards, billing integrity invariants, and server-authoritative boundary enforcement.
            </p>

            <div className="mt-4 space-y-3">
              {frontendChecks.map((check, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-slate-400" />
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">{check.file}</span>
                      {getSeverityBadge(check.risk)}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Pattern Checked:</strong> {check.pattern}
                    </p>
                    <p className="text-slate-500 text-[11px]">{check.recommendation}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    <Check className="h-3 w-3 inline mr-1" /> {check.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT REPORTS TAB */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-rose-500" />
                  Official Security Compliance & Audit Reports
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Export complete security scorecards, verified findings registries, and retest evidence documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/super-admin/security-center/reports?type=SUMMARY&format=csv"
                  download
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                >
                  <Download className="h-4 w-4 text-emerald-500" />
                  Export Findings (CSV)
                </a>

                <a
                  href="/api/super-admin/security-center/reports?type=EXECUTIVE&format=json"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Executive Audit (JSON)
                </a>
              </div>
            </div>

            {/* Preview Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs space-y-2 text-slate-800 dark:text-slate-200">
              <div className="text-slate-400"># Platform Security Audit Summary</div>
              <div>School Study Platform Security Command Center</div>
              <div>Generated by: {profile?.email || "Super Admin"}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
              <div>Overall Posture: {scoreCard?.health} ({scoreCard?.score !== null ? `${scoreCard?.score}/100` : "Not Verified"})</div>
              <div>Active Vulnerabilities: {findings.filter((f) => f.status === "OPEN").length} open</div>
              <div>Verified Closed Remediations: {findings.filter((f) => f.status === "CLOSED" || f.status === "VERIFIED").length}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FINDING DETAIL & RETEST DRAWER */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-500">{selectedFinding.id}</span>
                  {getSeverityBadge(selectedFinding.severity)}
                  {getStatusBadge(selectedFinding.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedFinding.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Affected: {selectedFinding.affectedComponent}
                </p>
              </div>

              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Description & Impact */}
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Vulnerability Description</h4>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{selectedFinding.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Expected Behavior:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{selectedFinding.expected}</p>
                </div>
                <div>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">Actual Behavior:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">{selectedFinding.actual}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Remediation Plan & Fix Reference</h4>
                <textarea
                  value={selectedFinding.remediation || ""}
                  onChange={(e) =>
                    setSelectedFinding({ ...selectedFinding, remediation: e.target.value })
                  }
                  rows={2}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:ring-2 focus:ring-rose-500"
                  placeholder="Enter code changes, commits, or remediation notes..."
                />
              </div>

              {/* Retest History Panel */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                    Retest History & Verification Evidence
                  </h4>
                  <button
                    onClick={() => handleRetestFinding(selectedFinding.id)}
                    disabled={retestingFindingId === selectedFinding.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {retestingFindingId === selectedFinding.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCw className="h-3 w-3" />
                    )}
                    Execute Retest Now
                  </button>
                </div>

                {selectedFinding.retestHistory && selectedFinding.retestHistory.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {selectedFinding.retestHistory.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span
                            className={
                              rec.retestResult === "PASS"
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-rose-500 font-bold"
                            }
                          >
                            Result: {rec.retestResult}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {new Date(rec.retestedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                          Evidence: {rec.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-[11px] italic">
                    No retests logged yet. Run a retest after implementing code fix.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleUpdateFindingStatus(selectedFinding.id, "IN_PROGRESS")}
                  disabled={updatingFinding}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateFindingStatus(selectedFinding.id, "FIXED")}
                  disabled={updatingFinding}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Mark Fixed
                </button>
                <button
                  onClick={() => handleUpdateFindingStatus(selectedFinding.id, "RETEST_REQUIRED")}
                  disabled={updatingFinding}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Require Retest
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* STRICT LIFECYCLE RULE: Cannot close without passed retest */}
                <button
                  onClick={() => handleUpdateFindingStatus(selectedFinding.id, "CLOSED")}
                  disabled={selectedFinding.retestStatus !== "PASSED" || updatingFinding}
                  title={
                    selectedFinding.retestStatus !== "PASSED"
                      ? "Lifecycle Invariant: Finding cannot be closed without verification evidence and passed retest."
                      : "Close verified finding"
                  }
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  Close Finding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG NEW FINDING */}
      {showNewFindingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Security Finding</h3>
              <button
                onClick={() => setShowNewFindingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFinding} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newFindingForm.title}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, title: e.target.value })}
                  placeholder="e.g. Unauthenticated Access to School Finance API"
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newFindingForm.category}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, category: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {["AUTH", "RBAC", "TENANT", "API", "FIRESTORE", "FINANCE", "INPUT"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                  <select
                    value={newFindingForm.severity}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, severity: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Affected Component</label>
                <input
                  type="text"
                  required
                  value={newFindingForm.affectedComponent}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, affectedComponent: e.target.value })}
                  placeholder="e.g. /api/schools/[id]/route.ts"
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description & Impact</label>
                <textarea
                  rows={2}
                  required
                  value={newFindingForm.description}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, description: e.target.value })}
                  placeholder="Detailed description of vulnerability..."
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFindingModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-xs"
                >
                  Log Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLARE INCIDENT */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Declare Security Incident</h3>
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newIncidentForm.title}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, title: e.target.value })}
                  placeholder="e.g. Inbound API Rate Limit Spike / Anomaly"
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                  <select
                    value={newIncidentForm.severity}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, severity: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Affected System</label>
                  <input
                    type="text"
                    required
                    value={newIncidentForm.affectedSystem}
                    onChange={(e) => setNewIncidentForm({ ...newIncidentForm, affectedSystem: e.target.value })}
                    placeholder="e.g. Authentication Pipeline"
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Timeline Event</label>
                <textarea
                  rows={2}
                  required
                  value={newIncidentForm.initialEvent}
                  onChange={(e) => setNewIncidentForm({ ...newIncidentForm, initialEvent: e.target.value })}
                  placeholder="Details of the detection or event..."
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewIncidentModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-xs"
                >
                  Declare Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
