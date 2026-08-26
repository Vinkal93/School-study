"use client";

import { School, CheckCircle2, Quote, Sparkles } from "lucide-react";

export function WhySchoolStudy() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white p-8 shadow-sm sm:p-10 lg:p-12 dark:border-slate-800/80 dark:from-slate-900/90 dark:to-[#0A1222]/90 dark:shadow-xl">
          {/* Subtle Ambient Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15"
          />

          {/* Section Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Mission & Philosophy</span>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Why I Built School Study
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            <p>
              Educational institutions often have to manage students, teachers, attendance, communication, and daily administrative work across different fragmented tools or manual paperwork.
            </p>
            <p>
              School Study was created with a straightforward guiding premise:
            </p>
          </div>

          {/* Guiding Premise Highlight Card */}
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <Quote className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                School management software should be powerful without becoming complicated.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            <p>
              The first version of School Study intentionally focuses on the core institutional essentials — schools, administrators, teachers, students, attendance, and everyday operational management.
            </p>
            <p>
              Instead of trying to build hundreds of bloated features from day one, the product is being developed around real-world classroom usage, feedback from educators, and a long-term architectural vision for a complete education technology platform.
            </p>
          </div>

          {/* Guiding Motto Banner */}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center sm:p-6 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Engineering Motto
                </span>
                <span className="text-sm font-extrabold text-slate-900 sm:text-base dark:text-white">
                  Start simple. Solve real problems. Improve continuously.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
