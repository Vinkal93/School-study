"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Database,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileDown,
  RefreshCw,
  Sparkles,
  Layers,
  GraduationCap,
  Users,
  BookOpen,
  DollarSign,
  FileCode,
  FileText,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { SchoolClass } from "@/types";
import type { SupportedImportModule, ImportPreviewResult } from "@/types/backup";
import confetti from "canvas-confetti";

export default function AdminBackupPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "import" ? "import" : "export";

  const { profile, firebaseUser } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [activeTab, setActiveTab] = useState<"export" | "import">(initialTab);

  // -------------------------------------------------------------
  // EXPORT STATE
  // -------------------------------------------------------------
  const [exportModule, setExportModule] = useState<SupportedImportModule | "all">("all");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv" | "json">("xlsx");
  const [exportClassId, setExportClassId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Classes for filtering student exports
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    getClassesWithSections(schoolId)
      .then((cls) => setClasses(cls))
      .catch(() => {});
  }, [schoolId]);

  const handleTriggerExport = async (
    mod: SupportedImportModule | "all" = exportModule,
    fmt: "xlsx" | "csv" | "json" = exportFormat
  ) => {
    if (!schoolId) {
      toast.error("School ID not found.");
      return;
    }
    setIsExporting(true);
    try {
      let downloaded = false;

      // 1. Direct client-side export (Immediate, uses active browser authentication, zero 500 errors)
      try {
        const { exportSchoolDataClient } = await import("@/lib/services/import-export-client.service");
        const { blob, filename } = await exportSchoolDataClient(schoolId, mod, fmt, {
          classId: exportClassId || undefined,
        });

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        toast.success(`Successfully downloaded ${filename}!`);
        downloaded = true;
      } catch (clientErr) {
        console.warn("Notice: Client export issue, falling back to server API:", clientErr);
      }

      // 2. Server-side API export fallback
      if (!downloaded) {
        const token = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
        const url = `/api/admin/backup/export?module=${mod}&format=${fmt}${
          mod === "students" && exportClassId ? `&classId=${exportClassId}` : ""
        }`;

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const blob = await res.blob();
          const disposition = res.headers.get("Content-Disposition");
          let filename = `school_${mod}_backup.${fmt}`;
          if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
          }

          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);

          toast.success(`Successfully downloaded ${filename}!`);
        } else {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Server export failed with status ${res.status}`);
        }
      }
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(err.message || "Failed to generate backup.");
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // IMPORT STATE
  // -------------------------------------------------------------
  const [importModule, setImportModule] = useState<SupportedImportModule>("students");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewResult(null);
    setImportCompleted(null);
    await processFilePreview(file, importModule);
  };

  const processFilePreview = async (file: File, module: SupportedImportModule) => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetModule", module);

      const res = await fetch("/api/admin/backup/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPreviewResult(data);
        toast.success(`Parsed ${data.totalRows} records from ${file.name}`);
      } else {
        toast.error(data.error || "Failed to parse file.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing import preview.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || !selectedFile) return;

    const validRows = previewResult.previewData.filter((r) => !r._hasErrors);
    if (validRows.length === 0) {
      toast.error("There are no valid rows to import.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to import ${validRows.length} ${importModule} records into your school database?`
      )
    ) {
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/backup/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetModule: importModule,
          records: previewResult.previewData,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setImportCompleted(data);
        toast.success(
          `Import complete! ${data.importedCount} created, ${data.updatedCount} updated.`
        );
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } else {
        toast.error(data.error || "Failed to execute import.");
      }
    } catch (err: any) {
      toast.error(err.message || "Import execution error.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = (mod: SupportedImportModule, fmt: "xlsx" | "csv") => {
    window.open(`/api/admin/backup/template?module=${mod}&format=${fmt}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-indigo-600" />
            School Data Backup & Import/Export Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Backup your entire school database in Excel, CSV, or JSON format, and restore or import records anytime.
          </p>
        </div>

        {/* Primary Tab Switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab("export")}
            className={`py-2 px-4 rounded-lg flex items-center gap-2 transition ${
              activeTab === "export"
                ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export & Backup</span>
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`py-2 px-4 rounded-lg flex items-center gap-2 transition ${
              activeTab === "import"
                ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import & Restore</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXPORT & BACKUP DATA                                    */}
      {/* ============================================================== */}
      {activeTab === "export" && (
        <div className="space-y-6">
          {/* Master Full Backup Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Full School Master Backup
                </span>
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  Download Complete School Database
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads all student profiles, teachers, classes, sections, and fee transactions in a single multi-sheet Excel (.xlsx) workbook or structured JSON archive.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleTriggerExport("all", "xlsx")}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Master Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleTriggerExport("all", "json")}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <FileCode className="h-4 w-4" />
                  <span>Master JSON (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Individual Module Export Cards */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Module-Wise Data Exports
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Students Export Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">STUDENTS</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-3">
                    Students Roster
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Admissions, roll numbers, class, section, parents contact & status.
                  </p>

                  {/* Class filter dropdown */}
                  <div className="mt-3">
                    <select
                      value={exportClassId}
                      onChange={(e) => setExportClassId(e.target.value)}
                      className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleTriggerExport("students", "xlsx")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition text-center"
                  >
                    .XLSX
                  </button>
                  <button
                    onClick={() => handleTriggerExport("students", "csv")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition text-center"
                  >
                    .CSV
                  </button>
                  <button
                    onClick={() => handleTriggerExport("students", "json")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition text-center"
                  >
                    .JSON
                  </button>
                </div>
              </div>

              {/* 2. Teachers Export Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">STAFF</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-3">
                    Teachers Directory
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Employee ID, qualification, designation, assigned class & contacts.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleTriggerExport("teachers", "xlsx")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition text-center"
                  >
                    .XLSX
                  </button>
                  <button
                    onClick={() => handleTriggerExport("teachers", "csv")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition text-center"
                  >
                    .CSV
                  </button>
                  <button
                    onClick={() => handleTriggerExport("teachers", "json")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition text-center"
                  >
                    .JSON
                  </button>
                </div>
              </div>

              {/* 3. Classes Export Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">ACADEMIC</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-3">
                    Classes & Sections
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Standards, division sections, tuition fee amounts & sequence orders.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleTriggerExport("classes", "xlsx")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition text-center"
                  >
                    .XLSX
                  </button>
                  <button
                    onClick={() => handleTriggerExport("classes", "csv")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition text-center"
                  >
                    .CSV
                  </button>
                  <button
                    onClick={() => handleTriggerExport("classes", "json")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition text-center"
                  >
                    .JSON
                  </button>
                </div>
              </div>

              {/* 4. Fees Export Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">FINANCE</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-3">
                    Fee Ledgers
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Student assignments, paid fees, pending dues balances & statuses.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => handleTriggerExport("fees", "xlsx")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 transition text-center"
                  >
                    .XLSX
                  </button>
                  <button
                    onClick={() => handleTriggerExport("fees", "csv")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition text-center"
                  >
                    .CSV
                  </button>
                  <button
                    onClick={() => handleTriggerExport("fees", "json")}
                    disabled={isExporting}
                    className="flex-1 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition text-center"
                  >
                    .JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: IMPORT & RESTORE DATA                                   */}
      {/* ============================================================== */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Module Selector & Templates Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  1. Select Module to Import / Restore
                </h3>
                <p className="text-xs text-gray-500">
                  Choose which entity records you are importing from your file.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
                {(["students", "teachers", "classes", "fees"] as SupportedImportModule[]).map(
                  (mod) => (
                    <button
                      key={mod}
                      onClick={() => {
                        setImportModule(mod);
                        setPreviewResult(null);
                        setSelectedFile(null);
                        setImportCompleted(null);
                      }}
                      className={`py-1.5 px-3 rounded-lg capitalize transition ${
                        importModule === mod
                          ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                      }`}
                    >
                      {mod}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Template Download Prompts */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <FileDown className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Need a standard format? Download the sample template for <strong>{importModule}</strong>:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadTemplate(importModule, "xlsx")}
                  className="py-1 px-3 rounded-lg bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                >
                  Excel Template (.xlsx)
                </button>
                <button
                  onClick={() => downloadTemplate(importModule, "csv")}
                  className="py-1 px-3 rounded-lg bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                >
                  CSV Template (.csv)
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 text-center hover:border-indigo-500 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Upload file for {importModule}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Supports Excel (.xlsx, .xls), Comma-Separated (.csv), or JSON (.json) files
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                {isParsing ? "Reading & Analyzing File..." : "Browse File on Device"}
              </button>

              {selectedFile && (
                <div className="pt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW & VALIDATION SUMMARY */}
          {previewResult && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 2. File Analysis & Column Detection
                </span>
                <span className="text-xs text-gray-500">
                  Total Rows: <strong>{previewResult.totalRows}</strong>
                </span>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Total Rows</div>
                  <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">
                    {previewResult.totalRows}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Valid Rows</div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {previewResult.validRows}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
                  <div className="text-[10px] uppercase font-bold text-amber-600">Duplicates / Updates</div>
                  <div className="text-base font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {previewResult.duplicateRows}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                  <div className="text-[10px] uppercase font-bold text-rose-600">Errors</div>
                  <div className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    {previewResult.errorRows}
                  </div>
                </div>
              </div>

              {/* Column Mapping Preview */}
              <div>
                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Detected Column Mappings
                </h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(previewResult.mappedFields).map(([detected, canonical]) => (
                    <span
                      key={detected}
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-medium text-gray-500">{detected}</span>
                      <ArrowRight className="h-3 w-3 text-indigo-500" />
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{canonical}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* First 5 Preview Rows */}
              <div>
                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Data Preview (First 5 Rows)
                </h5>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        {previewResult.detectedColumns.slice(0, 6).map((col) => (
                          <th key={col} className="py-2.5 px-3">
                            {col}
                          </th>
                        ))}
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
                      {previewResult.previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td className="py-2 px-3 font-mono text-[11px]">{idx + 1}</td>
                          {previewResult.detectedColumns.slice(0, 6).map((col) => (
                            <td key={col} className="py-2 px-3 truncate max-w-[120px]">
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                          <td className="py-2 px-3">
                            {row._hasErrors ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                                Invalid
                              </span>
                            ) : row._isDuplicate ? (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                                Update
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                                New
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  disabled={isImporting || previewResult.validRows === 0}
                  onClick={handleExecuteImport}
                  className="py-2.5 px-6 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Writing Records to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Import {previewResult.validRows} Records into {importModule}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* IMPORT SUCCESS RESULT */}
          {importCompleted && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h4 className="text-sm font-bold">Data Import Successfully Completed!</h4>
              </div>
              <p className="text-xs leading-relaxed">
                Created <strong>{importCompleted.importedCount}</strong> new records, updated{" "}
                <strong>{importCompleted.updatedCount}</strong> existing records, and skipped{" "}
                <strong>{importCompleted.skippedCount}</strong> invalid rows.
              </p>
              <div className="pt-2">
                <Link
                  href={
                    importModule === "students"
                      ? "/admin/students"
                      : importModule === "teachers"
                      ? "/admin/teachers"
                      : importModule === "classes"
                      ? "/admin/classes"
                      : "/admin/fees"
                  }
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline hover:no-underline"
                >
                  View {importModule} in School Portal <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
