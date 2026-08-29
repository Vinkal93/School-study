import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  BarChart3,
  Smartphone,
} from "lucide-react";
import { MarketingHeader, MarketingCTA, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Simple School Attendance Management Software | School Study",
  description:
    "Simple school attendance management software. Mark daily roll-call (Present, Absent, Late), track monthly attendance history, and empower students with real-time percentage visibility.",
  canonicalUrl: "/attendance-management",
});

export default function AttendanceManagementPage() {
  const breadcrumbData = [
    { name: "Features", url: "/features" },
    { name: "Attendance Management", url: "/attendance-management" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Simple School Attendance Management",
      description:
        "School attendance management software with real-time tracking, monthly logs, and student percentage analytics.",
      url: `${siteConfig.url}/attendance-management`,
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
    getBreadcrumbSchema(breadcrumbData),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader currentPath="/attendance-management" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm mb-6">
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Real-Time Attendance Automation</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Simple School Attendance Management
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Ditch paper registers. Record daily student attendance in seconds from mobile or desktop with instant calculation of monthly percentages.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/25 transition-all"
              >
                Mark Attendance Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/student-management"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition-all"
              >
                Explore Student Management →
              </Link>
            </div>
          </div>
        </section>

        {/* Attendance Features Grid */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Clean, Transparent Attendance Tracking for the Entire School
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                A unified workflow connecting teachers in the classroom to administrators and parents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 1. Status Marking */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Present, Absent & Late Statuses
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Easily toggle between <strong className="text-emerald-600">Present</strong>, <strong className="text-red-600">Absent</strong>, and <strong className="text-amber-600">Late</strong> statuses per student with single-tap controls.
                </p>
                <Link href="/teacher-management" className="mt-4 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  See Teacher Roll-Call Desk →
                </Link>
              </div>

              {/* 2. Monthly History & Logs */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Monthly Logs & History
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Review complete historical records by date, class, or individual student. Never lose attendance sheets again.
                </p>
                <Link href="/school-management" className="mt-4 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Review in School Management Dashboard →
                </Link>
              </div>

              {/* 3. Student Percentage Visibility */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 mb-6">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live Attendance Percentage
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Students log into their portal to view their overall attendance percentage, helping them maintain institutional eligibility.
                </p>
                <Link href="/student-management" className="mt-4 inline-block text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Check Student Portal Features →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Interconnected Modules */}
        <RelatedModules
          currentPath="/attendance-management"
          title="Related Attendance & Administration Features"
          subtitle="Discover how automated attendance links directly to student profiles and faculty workflows."
        />
      </main>

      <Footer />
    </div>
  );
}
