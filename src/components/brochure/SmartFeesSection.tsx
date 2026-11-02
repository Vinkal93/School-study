import {
  CreditCard,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShieldAlert,
} from "lucide-react";
import { BROCHURE_SECTIONS } from "@/lib/cms/brochureData";

export function SmartFeesSection() {
  const section = BROCHURE_SECTIONS.smartFees;
  const features = section.features || [];

  return (
    <section
      id="section-5-fees"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Section 05 • Financial Automation</span>
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
                  <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    0{i + 1}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                    Finance
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
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods & Zero Leakage Callout */}
        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Multi-Mode Payment Recording Supported
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Cash counter, Bank NEFT/RTGS, UPI QR, and Cheque entries with automated receipts and reconciliation.
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/80 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-xs">
            100% Audit-Ready
          </span>
        </div>
      </div>
    </section>
  );
}
