import {
  ShieldCheck,
  UserCog,
  GraduationCap,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { BROCHURE_SECTIONS } from "@/lib/cms/brochureData";

export function RolesSecuritySection() {
  const section = BROCHURE_SECTIONS.rolesSecurity;
  const features = section.features || [];

  return (
    <section
      id="section-10-roles"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5" />
            <span>Section 10 • Least-Privilege Portals</span>
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

        {/* 4 Portals in 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {features.map((feat, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-7 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-colors space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-sm">
                    0{i + 1}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
                    Role Portal
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              {/* Capabilities Checklist */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Guaranteed Permissions:
                </span>
                {feat.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Access Gateway Quick Links */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Instant Portal Access Gateways:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/login"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors inline-flex items-center gap-1"
            >
              <span>School Admin</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/teacher/login"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors inline-flex items-center gap-1"
            >
              <span>Teacher Workspace</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/student/login"
              className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors inline-flex items-center gap-1"
            >
              <span>Student Portal</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
