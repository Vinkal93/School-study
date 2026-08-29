import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  GraduationCap,
  Bell,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Smartphone,
  School,
  HelpCircle,
} from "lucide-react";
import {
  StudentColourIcon,
  AttendanceColourIcon,
  TeacherColourIcon,
  AnalyticsColourIcon,
  NoticeColourIcon,
  SecurityColourIcon,
} from "@/components/common/ColouredIcons";
import { MarketingHeader, MarketingCTA } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema, getFaqSchema, getSoftwareAppSchema } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Core Features & Capabilities | School Study",
  description:
    "Explore School Study's core modules: student administration, teacher assignment, live attendance tracking, notice boards, and role-based portals.",
  canonicalUrl: "/features",
});

const FAQS = [
  {
    question: "What core operations can schools manage with School Study?",
    answer:
      "Schools can manage student admissions and rosters, faculty accounts and class assignments, daily attendance roll-call with monthly percentage calculations, and targeted campus circulars.",
  },
  {
    question: "Is School Study multi-tenant and secure for multiple institutions?",
    answer:
      "Yes. School Study implements rigorous tenant partitioning and Firestore security rules, ensuring every school's academic records, rosters, and attendance logs remain completely isolated.",
  },
  {
    question: "How do teachers take daily classroom attendance?",
    answer:
      "Teachers sign into their dedicated Teacher Portal from any mobile or desktop device, select their assigned class and section, and mark attendance with single taps for Present, Absent, or Late.",
  },
  {
    question: "Can students view their attendance and announcements?",
    answer:
      "Yes. Students can log into their student portal using their assigned admission number or credentials to view their calculated attendance percentage and relevant school announcements.",
  },
];

export default function FeaturesPage() {
  const breadcrumbData = [
    { name: "Features", url: "/features" },
  ];

  const schemas = [
    getBreadcrumbSchema(breadcrumbData),
    getFaqSchema(FAQS),
    getSoftwareAppSchema(),
  ];

  const features = [
    {
      title: "Student Roster & Profiles",
      description:
        "Maintain accurate student records with unique admission numbers, class and section mappings, and guardian contacts.",
      icon: StudentColourIcon,
      href: "/student-management",
      color: "blue",
      badge: "Student Hub",
    },
    {
      title: "Real-Time Attendance Tracking",
      description:
        "Empower faculty with fast daily roll-call (Present, Absent, Late), automatic monthly history logs, and student percentage views.",
      icon: AttendanceColourIcon,
      href: "/attendance-management",
      color: "emerald",
      badge: "Classroom Ops",
    },
    {
      title: "Teacher & Subject Assignments",
      description:
        "Manage faculty profiles, auto-generated login credentials, assigned class sections, and subject responsibilities.",
      icon: TeacherColourIcon,
      href: "/teacher-management",
      color: "purple",
      badge: "Faculty Desk",
    },
    {
      title: "Institutional Health & Growth",
      description:
        "A centralized administrative cockpit for school leaders to supervise rosters, faculty assignments, and institutional health.",
      icon: AnalyticsColourIcon,
      href: "/school-management",
      color: "amber",
      badge: "Administration",
    },
    {
      title: "Targeted Notices & Circulars",
      description:
        "Publish official school announcements with priority levels targeted to the whole campus, teachers, or specific grades.",
      icon: NoticeColourIcon,
      href: "/school-erp",
      color: "orange",
      badge: "Broadcasts",
    },
    {
      title: "Multi-Tenant Security Isolation",
      description:
        "Enterprise-grade Firestore rules and server-side authorization ensuring complete data privacy across individual school tenants.",
      icon: SecurityColourIcon,
      href: "/school-erp",
      color: "cyan",
      badge: "Security",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <MarketingHeader currentPath="/features" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm mb-6">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Platform Capabilities</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Powerful, Essential Features for Modern School Administration
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              School Study focuses on the essential operations schools need every day — reliable rosters, instant attendance, faculty workspaces, and student transparency.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/school-management"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition-all"
              >
                Explore School Management
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-500/40"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:scale-105 transition-transform">
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {item.badge}
                        </span>
                      </div>

                      <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h2>

                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 group-hover:gap-2 transition-all"
                      >
                        <span>Learn more</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Visible FAQ Section */}
        <section className="py-16 bg-slate-50/70 dark:bg-gray-900/40 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Frequently Asked Questions About School Study
              </h2>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
