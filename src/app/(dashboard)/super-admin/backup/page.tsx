"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Terminal,
  Play,
  Upload,
  ShieldCheck,
  Power,
  Search,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  FileSpreadsheet,
  Activity,
  KeyRound,
  FileDown,
} from "lucide-react";
import { AppsScriptModal } from "@/components/backup/AppsScriptModal";
import { BackupNowModal } from "@/components/backup/BackupNowModal";
import type { GoogleSheetsConfig, SyncLogEntry, BackupSyncStatus } from "@/types/backup";
import { toast } from "sonner";

export default function SuperAdminBackupPage() {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("global");
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form Fields
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetName, setSpreadsheetName] = useState("");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [webAppUrl, setWebAppUrl] = useState("");
  const [syncSecret, setSyncSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncSchedule, setSyncSchedule] = useState<"realtime" | "hourly" | "daily_2am" | "manual">("daily_2am");
  const [testDiagnostics, setTestDiagnostics] = useState<{
    status: "idle" | "success" | "failed";
    message: string;
    step?: string;
    reason?: string;
    httpStatus?: number;
    suggestedFix?: string;
    latencyMs?: number;
    spreadsheetName?: string;
    spreadsheetId?: string;
  } | null>(null);

  // Modals
  const [isAppsScriptOpen, setIsAppsScriptOpen] = useState(false);
  const [isBackupNowOpen, setIsBackupNowOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "logs">("config");

  // 1. Load Schools & Config
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Fetch schools list
      const sRes = await fetch("/api/super-admin/schools");
      const sData = await sRes.json().catch(() => ({}));
      if (sRes.ok && Array.isArray(sData.schools)) {
        setSchools(sData.schools.map((s: any) => ({ id: s.id, name: s.name })));
      }

      await loadConfig(selectedSchoolId);
      await loadLogs(selectedSchoolId);
    } catch (err) {
      console.error("Failed to load initial backup data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/super-admin/backup/config?schoolId=${schoolId}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.config) {
        setConfig(data.config);
        setSpreadsheetId(data.config.spreadsheetId || "");
        setSpreadsheetName(data.config.spreadsheetName || "");
        setSpreadsheetUrl(data.config.spreadsheetUrl || "");
        setWebAppUrl(data.config.webAppUrl || "");
        setSyncSecret(data.config.syncSecret || "");
        setAutoSyncEnabled(data.config.autoSyncEnabled ?? true);
        setSyncSchedule(data.config.syncSchedule || "daily_2am");
      } else {
        setConfig(null);
        setSpreadsheetId("");
        setSpreadsheetName("");
        setSpreadsheetUrl("");
        setWebAppUrl("");
        setSyncSecret("");
        setAutoSyncEnabled(true);
        setSyncSchedule("daily_2am");
      }
    } catch (err) {
      console.error("Failed to load backup config:", err);
    }
  };

  const loadLogs = async (schoolId: string) => {
    try {
      const url = schoolId === "all" ? "/api/super-admin/backup/logs" : `/api/super-admin/backup/logs?schoolId=${schoolId}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to load sync logs:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSchoolChange = (newSchoolId: string) => {
    setSelectedSchoolId(newSchoolId);
    loadConfig(newSchoolId);
    loadLogs(newSchoolId);
  };

  // Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webAppUrl.trim()) {
      toast.error("Please enter the Google Apps Script Web App URL.");
      return;
    }

    setSaving(true);
    try {
      const schoolObj = schools.find((s) => s.id === selectedSchoolId);
      const payload = {
        schoolId: selectedSchoolId,
        schoolName: selectedSchoolId === "global" ? "All Schools (Global Master)" : schoolObj?.name || selectedSchoolId,
        spreadsheetId: spreadsheetId.trim(),
        spreadsheetName: spreadsheetName.trim() || (selectedSchoolId === "global" ? "School Study - Global Backup" : `${schoolObj?.name} Backup`),
        spreadsheetUrl: spreadsheetUrl.trim(),
        webAppUrl: webAppUrl.trim(),
        syncSecret: syncSecret.trim(),
        autoSyncEnabled,
        syncSchedule,
      };

      const res = await fetch("/api/super-admin/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success("Google Sheets configuration saved!");
        await loadConfig(selectedSchoolId);
      } else {
        toast.error(data.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      toast.error("Please enter Web App URL first.");
      return;
    }
    setTestingConnection(true);
    setTestDiagnostics(null);
    try {
      const res = await fetch("/api/super-admin/backup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          webAppUrl: webAppUrl.trim(),
          syncSecret: syncSecret.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`✓ Google Sheets Connected (${data.latencyMs || 0}ms)`);
        setTestDiagnostics({
          status: "success",
          message: data.message || "Google Sheets Connected",
          step: "completed",
          latencyMs: data.latencyMs,
          spreadsheetName: data.spreadsheetName,
          spreadsheetId: data.spreadsheetId,
        });
        if (data.spreadsheetName && !spreadsheetName) setSpreadsheetName(data.spreadsheetName);
        if (data.spreadsheetId && !spreadsheetId) setSpreadsheetId(data.spreadsheetId);
      } else {
        toast.error(`✕ Connection Failed: ${data.reason || data.message || "Unknown error"}`);
        setTestDiagnostics({
          status: "failed",
          message: data.message || "Connection Failed",
          step: data.step || "Apps Script",
          reason: data.reason || data.error || "Unknown error occurred",
          httpStatus: data.httpStatus || res.status,
          suggestedFix: data.suggestedFix || "Check Google Apps Script deployment settings.",
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Connection test failed.");
      setTestDiagnostics({
        status: "failed",
        message: "Connection Failed",
        step: "network_connection",
        reason: err.message || "Network error",
        httpStatus: 500,
        suggestedFix: "Check your local network and verify server is online.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Disconnect Sheet
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this Google Sheet backup?")) return;
    try {
      await fetch("/api/super-admin/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          webAppUrl: "",
          autoSyncEnabled: false,
          lastSyncStatus: undefined,
        }),
      });
      toast.success("Disconnected successfully.");
      loadConfig(selectedSchoolId);
    } catch (err: any) {
      toast.error("Failed to disconnect.");
    }
  };

  // Health Calculation
  const isConnected = Boolean(config?.webAppUrl);
  const healthStatus: BackupSyncStatus = config?.lastSyncStatus || (isConnected ? "healthy" : "failed");
  const selectedSchoolObj = schools.find((s) => s.id === selectedSchoolId);
  const selectedSchoolName = selectedSchoolId === "global" ? "All Schools (Global Master)" : selectedSchoolObj?.name || selectedSchoolId;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Database className="h-3.5 w-3.5" />
            <span>DISASTER RECOVERY &amp; LIVE SHEETS MIRROR</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Data Backup &amp; Google Sheets Sync
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Firestore remains primary source of truth. Google Sheets serves as live mirror, readable backup, and reporting engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAppsScriptOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
          >
            <Terminal className="h-4 w-4 text-indigo-500" />
            <span>Generate Apps Script</span>
          </button>

          <Link
            href="/super-admin/import"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
          >
            <Upload className="h-4 w-4 text-purple-500" />
            <span>Import Data</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (!isConnected) {
                toast.error("Please configure and connect a Google Sheet Web App first.");
                return;
              }
              setIsBackupNowOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Backup Now</span>
          </button>
        </div>
      </div>

      {/* Target Tenant Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Backup Scope &amp; Tenant Isolation
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {selectedSchoolName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Select School:</label>
          <select
            value={selectedSchoolId}
            onChange={(e) => handleSchoolChange(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
          >
            <option value="global">Global Master Sheet (All Schools)</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Health & Status Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connection State */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Google Sheets Bridge</span>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/80 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {config?.spreadsheetName || "No spreadsheet linked"}
          </p>
        </div>

        {/* Card 2: Health Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Backup Health</span>
          <div className="flex items-center gap-2">
            {healthStatus === "healthy" || healthStatus === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : healthStatus === "warning" ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {healthStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {config?.lastSyncAt ? `Synced ${new Date(config.lastSyncAt).toLocaleTimeString("en-IN")}` : "No sync completed"}
          </p>
        </div>

        {/* Card 3: Last Backup Time */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Last Sync</span>
          <div className="flex items-center gap-1.5 font-bold text-base text-slate-900 dark:text-white">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>
              {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleDateString("en-IN") : "Never"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {config?.lastSyncError ? `⚠️ ${config.lastSyncError}` : "Zero sync errors"}
          </p>
        </div>

        {/* Card 4: Schedule */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</span>
          <div className="flex items-center gap-1.5 font-bold text-base text-slate-900 dark:text-white">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span className="capitalize">{syncSchedule.replace("_", " ")}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Auto-sync: {autoSyncEnabled ? "Enabled (Active)" : "Disabled"}
          </p>
        </div>
      </div>

      {/* Tabs: Configuration vs Logs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={`pb-3 px-2 font-bold text-xs border-b-2 transition-all ${
            activeTab === "config"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Google Sheet Connection &amp; Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-2 font-bold text-xs border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Sync Activity Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: Configuration Form */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Apps Script Web App Credentials
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target: {selectedSchoolName}
                </p>
              </div>
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Apps Script Web App URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deploy your Google Sheet script as Web App (Execute as: Me, Who has access: Anyone) and paste URL here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={spreadsheetName}
                    onChange={(e) => setSpreadsheetName(e.target.value)}
                    placeholder="e.g. Lord Buddha Public School Backup"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Direct Google Sheet URL (Optional)
                </label>
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sync Secret Token <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showSecret ? "Hide" : "Reveal"}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? "text" : "password"}
                  required
                  value={syncSecret}
                  onChange={(e) => setSyncSecret(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Both School Study and the deployed Apps Script authenticate every request with this shared token.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Backup Frequency
                  </label>
                  <select
                    value={syncSchedule}
                    onChange={(e: any) => setSyncSchedule(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="daily_2am">Daily Snapshot (Everyday at 2:00 AM)</option>
                    <option value="hourly">Hourly Near-Realtime Sync</option>
                    <option value="realtime">Event-Triggered Live Sync</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="autoSync"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="autoSync" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Enable Automated Synchronization
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !webAppUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  >
                    {testingConnection ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                    <span>Test Connection</span>
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
              </div>

              {testDiagnostics && (
                <div className={`mt-4 rounded-xl border p-4 text-xs font-mono transition-all ${
                  testDiagnostics.status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
                }`}>
                  <div className="flex items-center justify-between font-bold text-sm mb-2 font-sans">
                    <span className="flex items-center gap-2">
                      {testDiagnostics.status === "success" ? "✓ Google Sheets Connected" : "✕ Connection Failed"}
                    </span>
                    {testDiagnostics.latencyMs !== undefined && (
                      <span className="text-xs opacity-75 font-mono">{testDiagnostics.latencyMs} ms</span>
                    )}
                  </div>
                  <div className="space-y-1 font-sans text-xs">
                    {testDiagnostics.status === "success" ? (
                      <>
                        <div><span className="font-semibold">Web App:</span> Connected</div>
                        <div><span className="font-semibold">Spreadsheet:</span> {testDiagnostics.spreadsheetName || "Global master"}</div>
                        {testDiagnostics.spreadsheetId && (
                          <div className="font-mono text-[11px] opacity-80 truncate"><span className="font-semibold font-sans">ID:</span> {testDiagnostics.spreadsheetId}</div>
                        )}
                        <div><span className="font-semibold">Response:</span> OK</div>
                      </>
                    ) : (
                      <>
                        <div><span className="font-semibold">Step:</span> {testDiagnostics.step}</div>
                        <div><span className="font-semibold">Reason:</span> {testDiagnostics.reason}</div>
                        {testDiagnostics.httpStatus && (
                          <div><span className="font-semibold">HTTP Status:</span> {testDiagnostics.httpStatus}</div>
                        )}
                        {testDiagnostics.suggestedFix && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-[11px]">
                            <span className="font-bold">Suggested Fix:</span> {testDiagnostics.suggestedFix}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Side Help & Instructions */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 text-xs">
                <Terminal className="h-4 w-4" />
                <span>Need Deployment Code?</span>
              </div>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                Click <strong>Generate Apps Script</strong> to produce the battle-tested script ready to paste inside your Google Sheet. It handles primary-key row upserts with zero duplicate rows.
              </p>
              <button
                type="button"
                onClick={() => setIsAppsScriptOpen(true)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Open Apps Script Generator
              </button>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                Synchronized Sheet Tabs (10 Modules):
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Students</strong> (Adm No, Roll No, Class, Status)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Teachers</strong> (Teacher Code, Designation, Email)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Classes</strong> (Grade Levels, Sections, Fees, Class Teacher)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Attendance</strong> (Daily Roll Call, Marked By)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Fees</strong> (Collections, Receipts, Modes, Paid At)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Subscriptions</strong> (SaaS Plan, Price, Auto-Renew)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Notices</strong> (Circulars, Audiences, Priority)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Admins</strong> (School Administrators)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong>Audit Logs</strong> (Security &amp; Mutation Trails)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Sync Activity Logs */}
      {activeTab === "logs" && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Historical Synchronization Records
            </span>
            <button
              type="button"
              onClick={() => loadLogs(selectedSchoolId)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No synchronization events recorded yet for this scope.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">School Scope</th>
                    <th className="py-3 px-4">Records Mirrored</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 font-semibold capitalize text-slate-800 dark:text-slate-200">
                        {log.syncType}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {log.schoolName}
                      </td>
                      <td className="py-3 px-4">
                        {log.recordCounts ? (
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {Object.entries(log.recordCounts).map(([mod, cnt]) => (
                              <span
                                key={mod}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                              >
                                {mod}: {cnt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">0 records</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {(log.durationMs / 1000).toFixed(1)}s
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === "success" || log.status === "healthy"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300"
                              : log.status === "warning"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          {log.status === "success" || log.status === "healthy" ? "✓ SUCCESS" : log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Apps Script Generator */}
      <AppsScriptModal
        isOpen={isAppsScriptOpen}
        onClose={() => setIsAppsScriptOpen(false)}
        schoolName={selectedSchoolName}
        defaultSecret={syncSecret || "SCHOOL_STUDY_SECURE_SYNC_SECRET"}
      />

      {/* Modal: Backup Now Checklist */}
      <BackupNowModal
        isOpen={isBackupNowOpen}
        onClose={() => setIsBackupNowOpen(false)}
        schoolId={selectedSchoolId}
        schoolName={selectedSchoolName}
        onComplete={() => {
          loadConfig(selectedSchoolId);
          loadLogs(selectedSchoolId);
        }}
      />
    </div>
  );
}
