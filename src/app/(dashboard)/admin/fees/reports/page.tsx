"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { FileText, Download, Table, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminFeeReportsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!schoolId) return;
    setExporting(true);
    try {
      const res = await fetch("/api/fees/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, format: "csv" }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fee_collection_report_${schoolId}.csv`;
        a.click();
        toast.success("Fee report CSV exported!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to export report.");
      }
    } catch (err) {
      toast.error("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <EntitlementGate feature="fee_reports" title="Fee Reports & Analytics" requiredPlan="Professional Plan">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Reports & Data Exports</h1>
          <p className="text-xs text-slate-500 mt-1">Generate daily/monthly collection summaries, class-wise reports, and export CSV/PDF ledgers.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Collection Report (CSV)</h3>
              <p className="text-slate-500 mt-1">Full transaction log with receipt numbers, amounts, discounts, and payment modes.</p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-sm"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>Export CSV Ledger</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Class-Wise Dues Report</h3>
              <p className="text-slate-500 mt-1">Breakdown of assigned fees, paid collections, and outstanding dues per class grade.</p>
            </div>
            <button
              onClick={() => toast.info("Generating Class Summary...")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-sm"
            >
              <FileText className="h-4 w-4" />
              <span>Generate Class Report</span>
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Defaulters List Export</h3>
              <p className="text-slate-500 mt-1">Printable list of students with overdue balances for sending due notices.</p>
            </div>
            <button
              onClick={() => toast.info("Exporting Defaulter Roster...")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Export Defaulters Roster</span>
            </button>
          </div>
        </div>
      </div>
    </EntitlementGate>
  );
}
