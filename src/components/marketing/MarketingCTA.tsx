import Link from "next/link";
import { ArrowRight, CheckCircle2, School } from "lucide-react";

interface MarketingCTAProps {
  title?: string;
  description?: string;
}

export function MarketingCTA({
  title = "Ready to Modernize Your School Operations?",
  description = "Join institutions using School Study to simplify student rosters, faculty assignments, and attendance.",
}: MarketingCTAProps) {
  return (
    <section className="py-16 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-blue-50/70 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
              <School className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 transition-all"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Instant setup • Multi-tenant isolation
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
