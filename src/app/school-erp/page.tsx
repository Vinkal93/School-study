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
  CreditCard,
  Smartphone,
  BarChart3,
  Award,
  BookOpen,
  Send,
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
} from "lucide-react";
import { MarketingHeader, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import {
  constructMetadata,
  siteConfig,
  getBreadcrumbSchema,
  getSchoolErpCarouselSchema,
  getSoftwareAppSchema,
} from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "School Management ERP Software | Best Cloud School ERP in India",
  description:
    "Discover School Study, India's leading AI-powered School Management ERP Software for K-12, CBSE & ICSE schools. Automate admissions, online fee collection with Razorpay, real-time biometric attendance, and parent apps on one secure cloud platform.",
  canonicalUrl: "/school-erp",
  keywords: [
    "school management erp",
    "school management erp software",
    "School Management Software",
    "School Management System",
    "School ERP Software",
    "online school erp",
    "erp school management",
    "Cloud School ERP",
    "Best School Management Software 2026",
    "best school erp in india",
    "AI powered school analytics erp",
    "cloud based school management erp",
    "affordable all in one school erp",
    "cbse school erp software",
    "school erp with mobile app",
    "entab alternative",
    "fedena alternative",
    "edunext alternative",
    "myclassboard alternative",
  ],
});

export default function SchoolErpPage() {
  const breadcrumbData = [
    { name: "Home", url: "/" },
    { name: "Features", url: "/features" },
    { name: "School Management ERP", url: "/school-erp" },
  ];

  const faqs = [
    {
      question: "What is School Management ERP software?",
      answer:
        "School Management ERP (Enterprise Resource Planning) software is a centralized cloud platform that automates daily educational institution operations—including student admissions, academic grading, automated fee collections, real-time biometric attendance, faculty payroll, and parent communication.",
    },
    {
      question: "Why is School Study considered the best School Management ERP software in India?",
      answer:
        "School Study combines modern cloud multi-tenancy, AI-powered predictive attendance, instant WhatsApp alerts, Razorpay fee gateways, and 100% CBSE-compliant digital report cards in a sleek liquid-glass interface that requires zero IT training.",
    },
    {
      question: "How does School Study compare to legacy ERPs like Fedena, Entab CampusCare, and Edunext?",
      answer:
        "Unlike complex legacy ERPs like Fedena or Entab, School Study delivers an ultra-fast, zero-bloat modern interface, built-in mobile apps for parents and teachers, real-time multi-tenant database isolation, transparent pricing without hidden maintenance fees, and instant cloud setup in under 10 minutes.",
    },
    {
      question: "Does School Study School Management ERP support online fee collection and receipts?",
      answer:
        "Yes. School Study ERP features automated fee structure creation, installment reminders, online payment collection via Razorpay and UPI QR codes, instant digital PDF receipts, and an automated accounting cashbook.",
    },
    {
      question: "Is School Study ERP suitable for CBSE, ICSE, and State Board schools?",
      answer:
        "Yes. It supports custom grading scales, term-wise evaluations, scholastic and co-scholastic assessments, automated admit cards, and CBSE/ICSE aligned marksheet generation.",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "School Management ERP Software — Cloud School ERP for Modern Campuses",
      description:
        "India's leading AI-powered School Management ERP Software for modern K-12, CBSE, and international schools.",
      url: `${siteConfig.url}/school-erp`,
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
    getBreadcrumbSchema(breadcrumbData),
    getSoftwareAppSchema(),
    getSchoolErpCarouselSchema(),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFE] dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader currentPath="/school-erp" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* =========================================================================
            1. HERO SECTION: High-Intent Keyword Targeting
        ========================================================================= */}
        <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/60 via-[#F8FAFC] to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs mb-6">
              <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>AI-POWERED SCHOOL ANALYTICS • CLOUD-BASED ERP</span>
            </div>

            {/* Main H1 Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0B2545] dark:text-white max-w-4xl mx-auto leading-tight">
              School Management <span className="text-blue-600">ERP Software</span> for Modern Campuses
            </h1>

            {/* Keyword-Rich Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Streamline administrative, academic, financial, and communication processes from one unified, cloud-native School ERP. Engineered for K-12, CBSE, ICSE, and international educational institutions across India.
            </p>

            {/* Trust Entity Badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {[
                "AI Analytics & Predictive Attendance",
                "Automated Fees & Razorpay Gateway",
                "CBSE & ICSE Compliant",
                "Parent & Student Mobile Apps",
                "100% Multi-Tenant Isolation",
              ].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {badge}
                </span>
              ))}
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
              >
                <span>Launch School ERP</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all"
              >
                Schedule Guided Walkthrough
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. AI OVERVIEW / ENTITY DEFINITION CALLOUT
        ========================================================================= */}
        <section className="py-12 bg-white dark:bg-gray-950 border-y border-slate-100 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-blue-50/50 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-950">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles className="h-4 w-4" />
                <span>Search Engine &amp; AI Overview Summary</span>
              </div>
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                <strong>School ERP (Enterprise Resource Planning) systems</strong> streamline administrative, academic, and communication processes, offering a centralized platform for efficient school management. <strong>School Study</strong> modernizes school governance by eliminating paper files, accelerating online fee collections via Razorpay, automating biometric facial attendance, and providing mobile applications for parents, teachers, and leadership.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. CORE MODULES GRID: The 6 Pillars of Modern School ERP
        ========================================================================= */}
        <section className="py-16 bg-[#F8FAFC] dark:bg-gray-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <div className="text-xs font-black uppercase tracking-wider text-blue-600 mb-2">
                COMPLETE SCHOOL MANAGEMENT SUITE
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0B2545] dark:text-white">
                Everything Your Campus Needs to Operate, Automate, and Scale
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect every department—from student admissions to finance, classroom attendance, and parent communication—with zero data leaks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Module 1: Student Information System */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-blue-600 mb-1">01 / SIS MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Student Information System (SIS)
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Single secure record for student profiles, emergency guardian contacts, medical history, documents vault, and past academic records.
                </p>
                <Link href="/student-management" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  <span>Explore Student Information System</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Module 2: Fee & Billing Engine */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-emerald-600 mb-1">02 / FINANCE MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Automated Fee &amp; Billing Engine
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Class-wise fee structures, installment reminders, online payments via Razorpay &amp; UPI, automatic GST-compliant receipts, and cashbook accounting.
                </p>
                <Link href="/fee-management" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                  <span>Explore Fee Management Suite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Module 3: Real-Time Attendance Automation */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 mb-6">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-amber-600 mb-1">03 / ATTENDANCE MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Real-Time Biometric Attendance
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fast mark-up for homeroom teachers, RFID smart card campus gates, facial recognition, and automated instant WhatsApp/SMS parent notifications.
                </p>
                <Link href="/attendance-management" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
                  <span>Explore Attendance Automation</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Module 4: Multi-Tenant Campus Control */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 mb-6">
                  <School className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-purple-600 mb-1">04 / ARCHITECTURE MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Multi-Tenant Fleet Architecture
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Run single schools or 50+ institute branches with complete data isolation, centralized Super Admin audit logs, and custom roles.
                </p>
                <Link href="/school-management" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline">
                  <span>Explore School Fleet Management</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Module 5: Teacher Management & Workspace */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 mb-6">
                  <Workflow className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-sky-600 mb-1">05 / ACADEMIC MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Teacher Portal &amp; Timetables
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Automated conflict-free period scheduling, homework assignment uploads, digital grading books, and staff leave management.
                </p>
                <Link href="/teacher-management" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
                  <span>Explore Teacher Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Module 6: Mobile Apps for Parents & Students */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 mb-6">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div className="text-xs font-black text-rose-600 mb-1">06 / MOBILE MODULE</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Native Android &amp; PWA Apps
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Parents monitor fee receipts, homework, exam marks, and daily attendance on mobile. Includes downloadable Android APK and iOS PWA.
                </p>
                <Link href="/download" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">
                  <span>Explore Mobile Apps Suite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. COMPETITOR COMPARISON TABLE: Why Schools Switch to School Study
        ========================================================================= */}
        <section className="py-20 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-2">
                MARKET BENCHMARK &amp; ALTERNATIVE
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0B2545] dark:text-white">
                How School Study Compares to Legacy School ERPs
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                See why educational directors and CBSE/ICSE schools prefer School Study over slow, costly legacy ERPs like Fedena, Entab CampusCare, and Edunext.
              </p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 sm:p-5 font-bold text-slate-900 dark:text-white">Feature / Capability</th>
                    <th className="p-4 sm:p-5 font-black text-blue-600 bg-blue-50/50 dark:bg-blue-950/30">
                      School Study ERP
                    </th>
                    <th className="p-4 sm:p-5 font-semibold text-slate-600 dark:text-slate-400">
                      Entab CampusCare
                    </th>
                    <th className="p-4 sm:p-5 font-semibold text-slate-600 dark:text-slate-400">
                      Fedena ERP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      User Interface &amp; Speed
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-blue-600 bg-blue-50/20 dark:bg-blue-950/10">
                      ✨ Modern Liquid Glass 60FPS UI
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Traditional dense menus</td>
                    <td className="p-4 sm:p-5 text-slate-500">Complex legacy navigation</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      Campus Setup &amp; Deployment
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 bg-blue-50/20 dark:bg-blue-950/10">
                      ⚡ Instant Cloud (Under 10 mins)
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">2 to 4 weeks setup</td>
                    <td className="p-4 sm:p-5 text-slate-500">Requires server configuration</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      Online Fees &amp; Razorpay Gateway
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 bg-blue-50/20 dark:bg-blue-950/10">
                      ✓ Instant Receipts &amp; Ledger Sync
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Manual reconciliation</td>
                    <td className="p-4 sm:p-5 text-slate-500">Third-party plugin needed</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      Mobile Apps (Android &amp; PWA)
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 bg-blue-50/20 dark:bg-blue-950/10">
                      ✓ Included in all plans
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Extra per-student charge</td>
                    <td className="p-4 sm:p-5 text-slate-500">Separate module fee</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      Pricing &amp; Free Starter Tier
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 bg-blue-50/20 dark:bg-blue-950/10">
                      ✓ Free Starter Tier available
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">No free tier; high quote</td>
                    <td className="p-4 sm:p-5 text-slate-500">Annual recurring licensing</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                      Multi-Tenant Security
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-600 bg-blue-50/20 dark:bg-blue-950/10">
                      🔒 Zero-leak database isolation
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500">Shared database instances</td>
                    <td className="p-4 sm:p-5 text-slate-500">Self-hosted risk</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. FREQUENTLY ASKED QUESTIONS (Exact Search Matches for AI Overviews)
        ========================================================================= */}
        <section className="py-20 bg-slate-50 dark:bg-gray-900/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="text-xs font-black uppercase tracking-wider text-blue-600 mb-2">
                FREQUENTLY ASKED QUESTIONS
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0B2545] dark:text-white">
                Everything About School Management ERP
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Clear answers for school trustees, principals, and administrative IT directors.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs"
                >
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-2 flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-7">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Interconnected Modules */}
        <RelatedModules
          currentPath="/school-erp"
          title="Explore Related School ERP Modules"
          subtitle="Discover how all essential school operations connect seamlessly in School Study."
        />
      </main>

      <Footer />
    </div>
  );
}
