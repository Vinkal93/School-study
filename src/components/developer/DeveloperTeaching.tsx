"use client";

import { GraduationCap, HeartHandshake, Quote } from "lucide-react";

export function DeveloperTeaching() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10 lg:p-12 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-xl">
          {/* Section Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Classroom Perspective</span>
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            From Teaching to Technology
          </h2>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            <p>
              Working closely with students and educational environments provides a grounded perspective on software engineering.
            </p>
            <p>
              It makes it clearer to identify where software genuinely helps and where unnecessary complexity creates operational friction for teachers and office staff.
            </p>
            <p>
              This direct experience directly guides the user experience of School Study — ensuring workflows are natural, readable, and intuitive for school administrators, educators, and students rather than requiring specialized technical training.
            </p>
          </div>

          {/* Highlight Quote */}
          <div className="mt-8 flex items-start gap-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <HeartHandshake className="h-6 w-6 flex-shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Core Design Human Principle
              </span>
              <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                Technology should adapt to people, not the other way around.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
