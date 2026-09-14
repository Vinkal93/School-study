"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Database,
  Layers,
  Sparkles,
  HelpCircle,
  FileDown,
} from "lucide-react";
import type { SupportedImportModule, ImportPreviewResult } from "@/types/backup";
import { toast } from "sonner";

export default function SuperAdminImportPage() {
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [targetModule, setTargetModule] = useState<SupportedImportModule>("students");
  const [file, setFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/super-admin/schools")
      .then((r) => r.json())
      .then((d) => {
        if (d.schools && d.schools.length > 0) {
          setSchools(d.schools);
          setSelectedSchoolId(d.schools[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewResult(null);
    setImportResult(null);
    await processPreview(selectedFile, selectedSchoolId, targetModule);
  };

  const processPreview = async (selectedFile: File, schoolId: string, module: SupportedImportModule) => {
    if (!schoolId) {
      toast.error("Please select a target school.");
      return;
    }

    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("schoolId", schoolId);
      formData.append("targetModule", module);

      const res = await fetch("/api/super-admin/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPreviewResult(data);
        toast.success(`Parsed ${data.totalRows} rows from ${selectedFile.name}`);
      } else {
        toast.error(data.error || "Failed to parse import preview.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process preview.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || !file || !selectedSchoolId) return;

    const validRecords = previewResult.previewData.filter((r) => !r._hasErrors);
    if (validRecords.length === 0) {
      toast.error("There are no valid records to import.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to import ${validRecords.length} records into ${targetModule} for ${
          schools.find((s) => s.id === selectedSchoolId)?.name || selectedSchoolId
        }?\n\nAn automated pre-import disaster recovery snapshot will be created before writing.`
      )
    ) {
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/super-admin/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          targetModule,
          records: validRecords,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setImportResult(data);
        toast.success(
          `Imported ${data.importedCount} new, updated ${data.updatedCount} records successfully!`
        );
      } else {
        toast.error(data.error || "Import failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/super-admin/backup"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Data Backup &amp; Sync</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Controlled Excel &amp; Google Sheet Import
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Production-safe 10-step import pipeline. Features schema auto-detection, duplicate prevention, and automated pre-import recovery snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/backup"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors"
          >
            <Database className="h-4 w-4 text-emerald-500" />
            <span>Google Sheets Mirror</span>
          </Link>
        </div>
      </div>

      {/* Step 1 & 2: Target School and Module Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            1. Target School Tenant <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSchoolId}
            onChange={(e) => {
              setSelectedSchoolId(e.target.value);
              if (file) processPreview(file, e.target.value, targetModule);
            }}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Multi-tenant isolation: records will be saved strictly under this school.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            2. Target Business Module <span className="text-red-500">*</span>
          </label>
          <select
            value={targetModule}
            onChange={(e: any) => {
              setTargetModule(e.target.value);
              if (file) processPreview(file, selectedSchoolId, e.target.value);
            }}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white capitalize"
          >
            <option value="students">Students (Profiles &amp; Enrollments)</option>
            <option value="teachers">Teachers (Faculty Directory)</option>
            <option value="classes">Classes (Grade Levels &amp; Fees)</option>
            <option value="fees">Fees (Collections &amp; Receipts)</option>
            <option value="attendance">Attendance (Roll Call Records)</option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Select schema for automatic column mapping and validation.</p>
        </div>
      </div>

      {/* Step 3: File Upload Dropzone */}
      <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Upload Excel (.xlsx, .xls) or CSV File
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Drag and drop your spreadsheet here or click to browse.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={previewing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors"
          >
            {previewing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>{file ? `Replace: ${file.name}` : "Select Spreadsheet File"}</span>
          </button>
        </div>
      </div>

      {/* Step 4: Preview & Validation Metrics */}
      {previewResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Rows</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {previewResult.totalRows.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Valid New</span>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                {previewResult.newRows.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Will Update</span>
              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
                {previewResult.duplicateRows.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 shadow-xs">
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Invalid / Errors</span>
              <p className="text-2xl font-extrabold text-red-700 dark:text-red-300 mt-1">
                {previewResult.errorRows.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Column Auto-Mapping Preview */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
              Auto-Detected Column Mappings:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(previewResult.mappedFields).map(([fileCol, targetKey]) => (
                <span
                  key={fileCol}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <span className="font-mono text-slate-500">{fileCol}</span>
                  <span className="text-indigo-500 font-bold">&rarr;</span>
                  <span className="font-bold text-slate-900 dark:text-white">{targetKey}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Validation Errors Warning if present */}
          {previewResult.errorRows > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-red-800 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                <span>{previewResult.errorRows} Rows Flagged with Errors (Will be Skipped):</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-[11px] text-red-700 dark:text-red-400 max-h-32 overflow-y-auto">
                {previewResult.validationErrors.slice(0, 15).map((err, i) => (
                  <li key={i}>
                    Row {err.rowNumber}: {err.reason}
                  </li>
                ))}
                {previewResult.validationErrors.length > 15 && (
                  <li>...and {previewResult.validationErrors.length - 15} more errors</li>
                )}
              </ul>
            </div>
          )}

          {/* Interactive Data Preview Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Data Preview (First 50 Rows)
              </span>
              <span className="text-[11px] text-slate-400">
                Showing {Math.min(50, previewResult.previewData.length)} of {previewResult.totalRows}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row #</th>
                    <th className="py-2.5 px-3">Status</th>
                    {Object.values(previewResult.mappedFields).map((f) => (
                      <th key={f} className="py-2.5 px-3 capitalize">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewResult.previewData.map((row) => (
                    <tr
                      key={row._rowNumber}
                      className={
                        row._hasErrors
                          ? "bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-300"
                          : row._isDuplicate
                          ? "bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300"
                          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      }
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">{row._rowNumber}</td>
                      <td className="py-2 px-3 font-bold">
                        {row._hasErrors ? (
                          <span className="inline-flex items-center gap-1 text-red-600 text-[10px]">
                            <XCircle className="h-3 w-3" /> Error
                          </span>
                        ) : row._isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 text-[10px]">
                            <RefreshCw className="h-3 w-3" /> Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> New
                          </span>
                        )}
                      </td>
                      {Object.values(previewResult.mappedFields).map((f) => (
                        <td key={f} className="py-2 px-3 max-w-xs truncate">
                          {String(row[f] || "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Execution CTA Bar */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                  Automatic Pre-Import Recovery Snapshot
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A full backup snapshot will be recorded before any changes are written. If any issue occurs, immediate rollback is guaranteed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || previewResult.validRows === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>Import {previewResult.validRows} Valid Records</span>
            </button>
          </div>

          {/* Post-Import Results Banner */}
          {importResult && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Import Operation Completed Successfully!</span>
              </div>
              <p>
                Created <strong>{importResult.importedCount}</strong> new records and updated{" "}
                <strong>{importResult.updatedCount}</strong> existing records. (Skipped: {importResult.skippedCount}).
              </p>
              {importResult.preImportSnapshotId && (
                <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  Pre-import Recovery Point ID: {importResult.preImportSnapshotId}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
