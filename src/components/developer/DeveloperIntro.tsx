"use client";

import { User, Sparkles, Code2, Compass } from "lucide-react";

export function DeveloperIntro() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10 lg:p-12 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-xl">
          {/* Section Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Introduction</span>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Meet the Developer
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            <p>
              <strong className="text-slate-900 dark:text-white">Vinkal Prajapati</strong> is a developer, educator, and technology creator focused on building practical digital solutions for education and everyday users.
            </p>
            <p>
              His work combines software development, education, product design, and real-world problem solving. Instead of building technology only for the sake of technology, his approach focuses on creating products that are simple to understand, useful in everyday life, and capable of growing with their users.
            </p>
            <p>
              Through his work in education and software development, Vinkal has explored web applications, mobile applications, educational tools, school management systems, productivity software, and technology-focused content.
            </p>
            <p>
              School Study is one of his efforts to bring practical technology into the daily operations of educational institutions.
            </p>
          </div>

          {/* Core Values Strip */}
          <div className="mt-8 grid grid-cols-1 gap-4 pt-6 border-t border-slate-100 sm:grid-cols-3 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Code2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Pragmatic Engineering
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Human-Centered UI
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Compass className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Long-Term Reliability
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
