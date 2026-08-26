import type { Metadata } from "next";
import Link from "next/link";
import {
  School,
  Users,
  GraduationCap,
  ClipboardCheck,
  Bell,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { MarketingHeader, MarketingCTA, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "School Management Software Built for Modern Schools | School Study",
  description:
    "Discover School Study's school management system. Easily administer students, teachers, classes, daily attendance, and notices in one unified platform.",
  canonicalUrl: "/school-management",
});

export default function SchoolManagementPage() {
  const breadcrumbData = [
    { name: "Features", url: "/features" },
    { name: "School Management", url: "/school-management" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "School Management Software Built for Modern Schools",
      description:
        "Modern school management software designed for school administrators, faculty, and students.",
      url: `${siteConfig.url}/school-management`,
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
      <MarketingHeader currentPath="/school-management" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm mb-6">
              <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Institutional Administration</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              School Management Software Built for Modern Schools
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Eliminate paperwork and scattered spreadsheets. School Study brings student records, faculty rosters, attendance tracking, and official notices into a simple, collaborative system.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
              >
                Access Admin Portal
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

        {/* Pillars Section */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Everything School Administrators Need to Run Daily Operations
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Built specifically to solve the administrative challenges educational institutions face every day.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 1. Student Administration */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Student Administration
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enroll new students, generate admission identifiers, and assign students to their respective classes and sections seamlessly.
                </p>
                <Link href="/student-management" className="mt-4 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Explore Student Management →
                </Link>
              </div>

              {/* 2. Faculty & Teacher Management */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 mb-6">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Teacher Management
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Provision faculty logins, delegate class teachers, and allocate subjects to streamline classroom responsibility.
                </p>
                <Link href="/teacher-management" className="mt-4 inline-block text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Explore Teacher Management →
                </Link>
              </div>

              {/* 3. Real-Time Attendance */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Attendance Tracking
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Teachers record daily attendance in seconds. Administrators and students immediately view calculated attendance averages.
                </p>
                <Link href="/attendance-management" className="mt-4 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Explore Attendance Tracking →
                </Link>
              </div>

              {/* 4. Classes & Sections */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 mb-6">
                  <School className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Class & Section Hub
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Easily structure grades (e.g. Class 1 to 12) with custom section divisions (A, B, C) and designated head teachers.
                </p>
                <Link href="/school-erp" className="mt-4 inline-block text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Explore School ERP Architecture →
                </Link>
              </div>

              {/* 5. Broadcast Notices */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 mb-6">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Notices & Announcements
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Publish campus-wide circulars or target notices to specific departments, teachers, or student cohorts instantly.
                </p>
              </div>

              {/* 6. Administrative Dashboard */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-6">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Actionable Dashboards
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  A high-level dashboard displaying total student counts, active teachers, today&apos;s attendance percentage, and recent notices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Related Interconnected Modules */}
        <RelatedModules
          currentPath="/school-management"
          title="Connect with Key Academic Modules"
          subtitle="School Study seamlessly connects administrators with teachers, students, and attendance rosters."
        />

        <MarketingCTA
          title="Empower Your School Administrators Today"
          description="Switch to School Study for clean rosters, effortless attendance, and transparent school management."
        />
      </main>

      <Footer />
    </div>
  );
}
