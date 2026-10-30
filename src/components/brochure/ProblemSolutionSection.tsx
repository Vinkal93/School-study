import { AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { BROCHURE_SECTIONS, PROBLEM_SOLUTION_DATA } from "@/lib/cms/brochureData";

export function ProblemSolutionSection() {
  const section = BROCHURE_SECTIONS.problemSolution;

  return (
    <section
      id="section-2-problem-solution"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Section 02 • Operational Transformation</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {section.title}
          </h2>

          <p className="text-sm sm:text-base font-semibold text-teal-700 dark:text-teal-400">
            {section.subtitle}
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {section.description}
          </p>
        </div>

        {/* Comparison Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROBLEM_SOLUTION_DATA.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 shadow-sm hover:shadow-md transition-shadow space-y-5"
            >
              {/* Problem Block */}
              <div className="space-y-2 p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Archaic Pain Point
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-rose-100">
                  {item.traditionalPain}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.traditionalDetail}
                </p>
              </div>

              {/* Solution Block */}
              <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      School Study Cloud Solution
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-emerald-100 mt-1">
                    {item.schoolStudySolution}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                    {item.schoolStudyDetail}
                  </p>
                </div>

                {/* Impact Metric Pill */}
                <div className="pt-3 mt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Measurable Result:
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/60 px-2.5 py-1 rounded-full shadow-xs">
                    <TrendingUp className="h-3 w-3" />
                    <span>{item.impactMetric}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
