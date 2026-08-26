import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  Bell,
  BarChart3,
  ShieldCheck,
  Building2,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Laptop,
  BookOpen,
  Send,
  Sparkles,
  School,
  Clock,
  ChevronRight,
  Shield,
  UserCog,
  Workflow,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Footer } from "@/components/footer";
import { constructMetadata, getHomepageJsonLd, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "School Management Software for Modern Schools | School Study",
  description:
    "School Study is a modern school management platform for schools to manage students, teachers, classes and attendance from one simple system.",
  canonicalUrl: "/",
});

export default function LandingPage() {
  const jsonLd = getHomepageJsonLd();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      {/* ==========================================
          STRUCTURED DATA (JSON-LD)
      ========================================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ==========================================
          HEADER / NAVBAR
      ========================================== */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight block">
                School Study
              </span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase block -mt-0.5">
                Smart School Management
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="/" className="text-blue-600 dark:text-blue-400 font-semibold transition-colors">
              Home
            </Link>
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Features
            </a>
            <a href="#modules" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Modules
            </a>
            <a href="#benefits" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              How It Works
            </a>
            <Link href="/about-developer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              About Developer
            </Link>
            <a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Contact
            </a>
          </nav>

          {/* CTA Buttons & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Student Portal Link */}
            <Link
              href="/student/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition-all"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Student Portal
            </Link>

            {/* Portal Selection / Staff Login */}
            <Link
              href="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              Sign In
            </Link>

            {/* Get Started Button */}
            <Link
              href="/login"
              className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT CONTAINER
      ========================================== */}
      <main id="main-content">
        {/* ==========================================
            HERO SECTION
        ========================================== */}
        <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
                {/* Topic Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Next-Generation School ERP & Management</span>
                </div>

                {/* Primary H1 for Homepage SEO */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
                  Simple School Management Software for Modern Schools
                </h1>

                {/* Subheading answering What is School Study & What problem it solves */}
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  School Study is a powerful and intuitive school management system that enables educational institutions to manage students, faculty, daily attendance, class schedules, and notices — all from one centralized, secure platform.
                </p>

                {/* CTA Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 transition-all"
                  >
                    Get Started for Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/student/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all"
                  >
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                    Student Portal
                  </Link>
                </div>

                {/* Social Proof Counters Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Multi-Tenant</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">School Fleets</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Role-Based</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Student Portals</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Automated</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Teacher Desks</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Real-Time</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Live Attendance</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Visual Composition Column */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                {/* Decorative Background Blob */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-200/50 via-sky-100/50 to-indigo-100/40 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-full blur-3xl -z-10" />

                {/* Decorative Paper Airplane */}
                <div className="absolute top-4 right-10 hidden sm:block">
                  <Send className="h-7 w-7 text-blue-500 rotate-45 animate-pulse" />
                </div>

                {/* Central Card Composition */}
                <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-blue-500/10 via-white to-white dark:from-blue-900/20 dark:via-gray-900 dark:to-gray-900 p-4 sm:p-6 border border-blue-100/80 dark:border-gray-800 shadow-2xl shadow-blue-500/10">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-700 p-8 text-white min-h-[360px] flex flex-col justify-between shadow-inner">
                    {/* Background pattern */}
                    <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />

                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
                        <School className="h-3.5 w-3.5" />
                        Live Modern Campus Hub
                      </span>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        Empowering Next-Gen Classrooms
                      </div>
                      <p className="text-xs text-blue-100 max-w-xs leading-relaxed">
                        Intuitive dashboards for school admins, class teachers, students, and institutional leaders.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center font-bold text-xs">
                          🏫
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-none">Smart School ERP</p>
                          <p className="text-[10px] text-blue-200 mt-0.5">Automated Workflows</p>
                        </div>
                      </div>

                      <span className="text-xs font-bold bg-white text-blue-700 px-3 py-1.5 rounded-lg shadow-sm">
                        Active Term 2026-27
                      </span>
                    </div>
                  </div>

                  {/* Floating Stat Badge 1: Attendance Today */}
                  <div className="hidden sm:flex absolute -top-4 -left-2 sm:-left-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium block">Attendance Today</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-gray-900 dark:text-white">95%</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-950 px-1.5 py-0.5 rounded">+5.2%</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating Stat Badge 2: Total Students */}
                  <div className="hidden sm:flex absolute top-1/2 -left-4 sm:-left-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">Student Roster</span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">Admissions</span>
                      <span className="text-[10px] text-gray-400 block">Class & Section Hub</span>
                    </div>
                  </div>

                  {/* Floating Stat Badge 3: Notices */}
                  <div className="hidden sm:flex absolute top-6 -right-2 sm:-right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">Notices</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Broadcasts</span>
                    </div>
                  </div>

                  {/* Floating Stat Badge 4: Upcoming Schedule */}
                  <div className="hidden sm:flex absolute -bottom-4 -right-2 sm:-right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium block">Academic Year</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Timetables</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            EVERYTHING YOU NEED IN ONE PLATFORM (MODULES)
        ========================================== */}
        <section id="features" className="py-20 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Everything You Need, In <span className="text-blue-600 dark:text-blue-400">One School System</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                Streamline daily school administration with comprehensive modules built specifically for modern education management.
              </p>
            </div>

            <div id="modules" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. Student Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Student Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Manage student admission profiles, enrollment numbers, class sections, and guardian contact details with zero data duplication.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/student-management"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Explore Student Management Software</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* 2. Attendance Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Attendance Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Track student and faculty attendance in real-time with single-tap roll call, historical monthly summaries, and calculated attendance percentages.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/attendance-management"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:underline"
                  >
                    <span>Explore School Attendance Management</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* 3. Teacher Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Teacher Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Assign class teachers, configure subject responsibilities, and generate automated faculty credentials seamlessly.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/teacher-management"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <span>Explore Teacher Management Software</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* 4. Notices & Announcements */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      Notices & Circulars
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Publish administrative notices and circulars targeted to all school stakeholders, teachers, or specific student classes.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/school-management"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <span>Explore School Administration Modules</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* 5. Reports & Analytics */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      Reports & Analytics
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Gain actionable institutional clarity with attendance trends, faculty-to-student ratios, and operational health metrics.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/features"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    <span>Explore Analytics & Reporting Features</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* 6. Multi-Tenant Cloud Architecture */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all group flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Multi-Tenant Isolation
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Strict tenant database boundaries ensure each school&apos;s records, academic files, and rosters remain completely isolated and secure.
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/school-erp"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    <span>Explore Multi-Tenant School ERP</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            HOW IT WORKS (BENEFITS)
        ========================================== */}
        <section id="benefits" className="py-20 bg-slate-50/70 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                How School Study Works
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                Designed for clarity across four distinct stakeholder user roles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4 font-bold text-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  School Provisioning
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Super Admins register verified school tenants with unique institutional codes and dedicated admin accounts.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4 font-bold text-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Roster Configuration
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  School administrators define classes, add sections, and enroll teachers and students in one organized roster.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-4 font-bold text-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Classroom Operations
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Faculty take attendance on mobile or desktop, broadcast circulars, and manage class activities daily.
                </p>
              </div>

              {/* Step 4 */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 mb-4 font-bold text-sm">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Student & Parent Transparency
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Students and parents log in to view real-time attendance percentage, notices, and academic updates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            CTA BANNER
        ========================================== */}
        <section className="py-12 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-blue-50/70 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
              {/* School Building Graphic + Text */}
              <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                <div className="h-20 w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                  <School className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                    Ready to Transform Your School?
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    Modernize attendance, student records, and faculty workflows from one simple platform.
                  </p>
                </div>
              </div>

              {/* Action Button & No Credit Card Badge */}
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
                  Instant access • No credit card required
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================
          ADVANCED MODERN PRODUCT FOOTER
      ========================================== */}
      <Footer />
    </div>
  );
}
