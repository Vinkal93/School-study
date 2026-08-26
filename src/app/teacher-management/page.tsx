import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  School,
} from "lucide-react";
import { MarketingHeader, MarketingCTA, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Teacher Management & Classroom Assignment Software | School Study",
  description:
    "Manage teachers and classes in one place. Provision faculty accounts, assign homeroom classes, allocate subject responsibilities, and streamline attendance workflows.",
  canonicalUrl: "/teacher-management",
});

export default function TeacherManagementPage() {
  const breadcrumbData = [
    { name: "Features", url: "/features" },
    { name: "Teacher Management", url: "/teacher-management" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Manage Teachers and Classes in One Place",
      description:
        "Faculty management and classroom assignment software for modern schools.",
      url: `${siteConfig.url}/teacher-management`,
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
      <MarketingHeader currentPath="/teacher-management" />
      <Breadcrumbs items={breadcrumbData} />

      <main>
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-sm mb-6">
              <GraduationCap className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Faculty Administration</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Manage Teachers and Classes in One Place
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Equip your faculty with a clutter-free digital workspace to mark daily attendance, review assigned student directories, and broadcast announcements.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/teacher/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md shadow-purple-500/25 transition-all"
              >
                Teacher Portal Sign In
                <ArrowRight className="h-4 w-4" />
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

        {/* Feature Cards Section */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                How School Study Simplifies Teacher Administration
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Built to empower teachers so they can spend more time teaching and less time doing paperwork.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 1. Teacher Accounts */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 mb-6">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Teacher Accounts & Credentials
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  School administrators add faculty members with name, email, phone, and subjects. The platform automatically generates secure login credentials.
                </p>
                <Link href="/school-management" className="mt-4 inline-block text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Manage via School Management System →
                </Link>
              </div>

              {/* 2. Class & Subject Assignments */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Class & Subject Allocation
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Assign specific classes and divisions (e.g. Class 8-B) to teachers. Designated class teachers get direct access to their assigned student roster.
                </p>
                <Link href="/student-management" className="mt-4 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Explore Student Management Profiles →
                </Link>
              </div>

              {/* 3. Fast Attendance Mark-up */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fast Classroom Roll-Call
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Teachers open their mobile browser in class, mark attendance for their students with single clicks, and submit instantly to the school database.
                </p>
                <Link href="/attendance-management" className="mt-4 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Review Daily Attendance Workflows →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Related Interconnected Modules */}
        <RelatedModules
          currentPath="/teacher-management"
          title="Related Educational Management Modules"
          subtitle="Discover how teacher management integrates with student rosters and school ERP features."
        />

        <MarketingCTA
          title="Equip Your Faculty With School Study"
          description="Give your teachers an intuitive workspace that simplifies classroom management and daily roll call."
        />
      </main>

      <Footer />
    </div>
  );
}
