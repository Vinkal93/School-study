"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "Payment verification failed or payment was cancelled.";

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-6">
        {/* Failed Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center border-4 border-red-50 dark:border-red-900/50">
          <XCircle className="h-9 w-9 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Payment Failed
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
            {reason}
          </p>
        </div>

        {/* Buttons (Section 22) */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <Link
            href="/pricing"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Link>

          <Link
            href="/pricing"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
