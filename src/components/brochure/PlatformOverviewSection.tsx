import {
  Cloud,
  Layers,
  Lock,
  Smartphone,
  Server,
  Zap,
  CheckCircle2,
  Shield,
  Activity,
} from "lucide-react";
import { BROCHURE_SECTIONS } from "@/lib/cms/brochureData";

export function PlatformOverviewSection() {
  const section = BROCHURE_SECTIONS.platformArchitecture;

  const pillars = [
    {
      icon: Layers,
      title: "Strict Multi-Tenant Isolation",
      subtitle: "Zero Cross-School Data Leakage",
      description:
        "Every school operates within its own cryptographic security boundary. All Firestore reads, writes, and queries enforce tenant IDs at the database rule layer.",
      badge: "Database Security",
    },
    {
      icon: Zap,
      title: "Next.js 16 App Router Core",
      subtitle: "Sub-Second Navigation & Minimal JS",
      description:
        "Built on the latest React 19 architecture with server component boundaries, streaming SSR, and optimized client bundles (< 410 KB) for instant page loads.",
      badge: "Modern Frontend",
    },
    {
      icon: Smartphone,
      title: "Cross-Device Responsive & PWA",
      subtitle: "Desktop, Tablet & Mobile Native Feel",
      description:
        "Designed mobile-first. Teachers can take roll-call on an Android or iPhone with single-hand gestures, while accountants work on widescreen monitors.",
      badge: "Universal Access",
    },
    {
      icon: Lock,
      title: "Bank-Grade Encryption & Audit Logs",
      subtitle: "256-Bit SSL/TLS & Redundant Backups",
      description:
        "All data in transit is encrypted using 256-bit SSL/TLS. Every financial transaction, student record update, and admin login is logged with timestamped audit trails.",
      badge: "Enterprise Grade",
    },
  ];

  return (
    <section
      id="section-3-architecture"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Cloud className="h-3.5 w-3.5" />
            <span>Section 03 • Cloud Infrastructure & Reliability</span>
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

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={i}
                className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-7 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {p.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {p.title}
                  </h3>
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                    {p.subtitle}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Cloud SLA & Reliability Banner */}
        <div className="rounded-3xl border border-slate-900 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 dark:from-slate-900 dark:via-blue-950 dark:to-slate-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase">
                <Activity className="h-3.5 w-3.5" />
                <span>99.9% Uptime SLA Commitment</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Zero Heavy Hardware. Zero Server Maintenance.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Traditional school ERPs require costly local servers, UPS backups, local IT staff, and risk catastrophic data loss on disk crash. School Study is hosted on Google Cloud and Firebase infrastructure with automated multi-zone failover and daily redundant backups.
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col gap-2.5">
              {[
                "Automatic Cloud Snapshots",
                "Instant Auto-Scaling on Rush Hours",
                "Zero Local Server Costs",
                "Pan-India Fast Edge Delivery",
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-200 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
