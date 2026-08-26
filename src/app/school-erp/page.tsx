import type { Metadata } from "next";
import Link from "next/link";
import {
  Workflow,
  School,
  ShieldCheck,
  Zap,
  Users,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { MarketingHeader, MarketingCTA } from "@/components/marketing";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Simple School ERP Software for Modern Institutions | School Study",
  description:
    "A simple, practical school ERP software for everyday school management. Manage multi-tenant school rosters, attendance, faculty, and notices cleanly without complexity.",
  canonicalUrl: "/school-erp",
});

export default function SchoolErpPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Simple School ERP Software for Everyday School Management",
    description:
      "Practical cloud school ERP focused on daily school management essentials.",
    url: `${siteConfig.url}/school-erp`,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader currentPath="/school-erp" />

      <main>
        {/* Hero Section */}
        <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm mb-6">
              <Workflow className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Pragmatic Cloud ERP</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              A Simple School ERP for Everyday School Management
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Most legacy school ERPs are overloaded with confusing, bloated menus. School Study delivers a clean, focused ERP experience centered around what schools actually use every day.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
              >
                Sign In to Platform
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition-all"
              >
                Explore Modules →
              </Link>
            </div>
          </div>
        </section>

        {/* What Our MVP Focuses On */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Built Around the Real Essentials of School Operations
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Rather than claiming untested, complicated enterprise features, School Study focuses on making daily core workflows fast, reliable, and accessible from any web device.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <School className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Multi-Tenant Fleet Architecture
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Support single schools or multiple educational branches simultaneously with rigorous tenant-level data isolation and centralized Super Admin onboarding.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Unique School ID and domain partitioning</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Strict Firestore tenant isolation rules</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Daily Attendance Automation
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fast mark-up tools for homeroom teachers to record classroom attendance with instant calculation of student attendance percentages.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Single-tap Present / Absent / Late recording</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Historical monthly records & trend analytics</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Student & Faculty Registries
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Clean directory management with structured admission numbers, class sections, guardian phone contacts, and assigned teachers.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    <span>Zero duplicate admission number conflicts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    <span>Automated teacher credential allocation</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 mb-6">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Instant Web App Access
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  No complex desktop installations. School Study runs entirely in the cloud, fully responsive across mobile phones, tablets, and desktop workstations.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>Next.js App Router performance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>Automatic Light & Dark theme support</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <MarketingCTA
          title="Ready for a Simpler School ERP?"
          description="Get started with School Study and experience clean, clutter-free school operations."
        />
      </main>

      <Footer />
    </div>
  );
}
