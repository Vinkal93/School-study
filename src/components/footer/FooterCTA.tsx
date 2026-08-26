"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, PhoneCall, CheckCircle2 } from "lucide-react";

export function FooterCTA() {
  return (
    <div className="relative mb-16 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-8 shadow-sm transition-all sm:p-10 lg:p-12 dark:border-white/15 dark:from-slate-900/90 dark:to-[#0A1222]/90 dark:shadow-[0_0_25px_rgba(255,255,255,0.05)] backdrop-blur-xl">
      {/* Subtle Atmospheric Blue Glow (Dark mode enhancement) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15"
      />

      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        {/* Left Side: Headline & Description */}
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 dark:border-blue-700 dark:bg-blue-950/70 dark:text-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
            <span>Modern Education Management</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
            Ready to Transform Your School?
          </h2>

          <p className="text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-200">
            Modernize attendance, student records, and faculty workflows from one simple platform.
          </p>
        </div>

        {/* Right Side: Primary & Secondary Actions */}
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 dark:shadow-blue-600/30 dark:focus-visible:ring-offset-slate-950"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-95 dark:border-white/15 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-white/30 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-offset-slate-950"
          >
            <PhoneCall className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span>Contact Us</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
