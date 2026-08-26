import Link from "next/link";
import { ArrowRight, CheckCircle2, School } from "lucide-react";

interface MarketingCTAProps {
  title?: string;
  description?: string;
}

export function MarketingCTA({
  title = "Ready to Transform Your School?",
  description = "Modernize attendance, student records, and faculty workflows from one simple platform.",
}: MarketingCTAProps) {
  return (
    <section className="py-16 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-blue-50/70 dark:bg-slate-900/90 border border-blue-100 dark:border-white/15 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.04)] backdrop-blur-md">
          <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
              <School className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl font-medium">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 transition-all"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Instant access • No credit card required</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
