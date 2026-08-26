import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { MarketingHeader, MarketingCTA, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Student Management Software & Portal | School Study",
  description:
    "Student management made simple. Maintain student profiles, unique admission numbers, class sections, and transparent student attendance portals.",
  canonicalUrl: "/student-management",
});

export default function StudentManagementPage() {
  const breadcrumbData = [
    { name: "Features", url: "/features" },
    { name: "Student Management", url: "/student-management" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Student Management Made Simple",
      description:
        "Comprehensive student information management software for schools.",
      url: `${siteConfig.url}/student-management`,
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
      <MarketingHeader currentPath="/student-management" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm mb-6">
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Student Information System</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Student Management Made Simple
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Organize student records, manage class assignments, and give students direct access to their daily attendance and announcements.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/student/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/25 transition-all"
              >
                <GraduationCap className="h-4 w-4" />
                Student Portal Sign In
              </Link>
              <Link
                href="/attendance-management"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition-all"
              >
                Explore Attendance Management →
              </Link>
            </div>
          </div>
        </section>

        {/* Core Modules Section */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Core Student Management Workflows
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Designed to make student record-keeping accurate, clean, and accessible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 1. Student Profiles & Admission */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Student Profiles & Admission Numbers
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Store complete student records including full name, roll number, unique admission ID, class, section, guardian names, and contact phone numbers.
                </p>
                <Link href="/school-management" className="mt-4 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Manage via School Management System →
                </Link>
              </div>

              {/* 2. Class & Section Hub */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-6">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Class & Section Organization
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Easily filter and organize students by grade and division (e.g. Class 10-A, 10-B), with quick search across names and admission IDs.
                </p>
                <Link href="/teacher-management" className="mt-4 inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  View Assigned Faculty Desks →
                </Link>
              </div>

              {/* 3. Student & Parent Transparency */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Dedicated Student Portal
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Students log in with their assigned credentials or admission number to monitor their monthly attendance percentage and campus circulars.
                </p>
                <Link href="/attendance-management" className="mt-4 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Check Real-Time Attendance Logs →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Interconnected Modules */}
        <RelatedModules
          currentPath="/student-management"
          title="Interconnected Platform Workflows"
          subtitle="Explore how student records automatically link with attendance registers and teacher dashboards."
        />

        <MarketingCTA
          title="Transform Student Administration in Minutes"
          description="Keep your student rosters clean, organized, and accessible to faculty and parents."
        />
      </main>

      <Footer />
    </div>
  );
}
