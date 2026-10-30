import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Smartphone,
} from "lucide-react";
import { BROCHURE_SECTIONS } from "@/lib/cms/brochureData";

export function AttendanceSection() {
  const section = BROCHURE_SECTIONS.attendance;
  const features = section.features || [];

  return (
    <section
      id="section-6-attendance"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span>Section 06 • Daily Attendance Automation</span>
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

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {features.map((feat, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
                    0{i + 1}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full">
                    Roll-Call
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              {/* Benefits Checklist */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Key Advantages:
                </span>
                {feat.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rapid 30-Second Roll-Call Banner */}
        <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Under 30 Seconds per Classroom
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Single tap 'Mark All Present' with quick toggle for absent students saves up to 45 minutes of teacher instructional time daily.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/80 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 shadow-xs">
            Teacher-Approved Workflow
          </span>
        </div>
      </div>
    </section>
  );
}
