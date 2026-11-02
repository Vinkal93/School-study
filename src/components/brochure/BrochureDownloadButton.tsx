"use client";

import { useState } from "react";
import { Download, Printer, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { generateBrochurePDF } from "@/lib/utils/brochure-pdf";

interface BrochureDownloadButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "floating";
}

export function BrochureDownloadButton({
  className = "",
  variant = "primary",
}: BrochureDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Generate the exact 12-page vector PDF
      const doc = await generateBrochurePDF();

      // Trigger download
      doc.save("School-Study-Official-Product-Brochure.pdf");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("Failed to generate brochure PDF:", err);
      const msg = err instanceof Error ? err.message : "Unable to compile PDF. Please use browser print.";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (variant === "floating") {
    return (
      <div className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 print:hidden ${className}`}>
        <button
          type="button"
          onClick={handlePrint}
          aria-label="Print or save brochure as PDF"
          className="h-11 w-11 rounded-full bg-slate-900/90 dark:bg-slate-800 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border border-white/10"
          title="Print / Save via Browser"
        >
          <Printer className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          aria-label="Download Official Vector PDF Brochure"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating Vector PDF (12 Pages)...</span>
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Downloaded Brochure!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Download Official PDF (12 Pages)</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 print:hidden ${className}`}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all min-h-[46px] disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Compiling Official PDF (12 Pages)...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <span>Brochure Downloaded Successfully!</span>
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            <span>Download Official PDF (12 Pages)</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-all min-h-[46px] border border-slate-200/80 dark:border-white/10"
      >
        <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span>Print / Save View</span>
      </button>

      {error && (
        <div className="w-full flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
