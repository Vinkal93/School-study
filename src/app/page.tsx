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
  Send,
  Sparkles,
  School,
  Clock,
  ChevronRight,
  Shield,
  UserCog,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Footer } from "@/components/footer";
import { constructMetadata, getHomepageJsonLd } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "School Study — Modern School Management Software",
  description:
    "School Study is a modern, intuitive school management system to manage students, teachers, classes, and daily attendance from one simple platform.",
  canonicalUrl: "/",
});

export default function LandingPage() {
  const jsonLd = getHomepageJsonLd();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      {/* Structured Data (JSON-LD) */}
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
              Benefits
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
            <ThemeToggle />

            {/* Student Portal Link */}
            <Link
              href="/student/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition-all"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Student Portal
            </Link>

            {/* Sign In */}
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
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>All-in-One School Management System</span>
                </div>

                {/* Primary H1 */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
                  Simplify <span className="text-gray-900 dark:text-white">School.</span>
                  <br />
                  Improve <span className="text-blue-600 dark:text-blue-400">Education.</span>
                </h1>

                {/* Subheading */}
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  School Study is a powerful and easy-to-use platform that helps schools manage students, teachers, attendance, notices, and more — all in one place.
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

                {/* Feature Highlights Bar */}
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
                        Intuitive dashboards for school admins, class teachers, and students.
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
                  <div className="hidden sm:flex absolute -bottom-4 -right-2 sm:-right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl flex items-center gap-3">
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
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase bg-blue-50 dark:bg-blue-900/40 px-3.5 py-1.5 rounded-full">
                Core Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Everything You Need, In One School System
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Simple, powerful tools designed specifically for school administration, faculty workflows, and student engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 1. Student Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Student Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Maintain student profiles, admission details, class and section assignments, and emergency contacts.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Attendance Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Attendance Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Track attendance in real-time with single-tap roll call, monthly records, and percentage metrics.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Teacher Management */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Teacher Management
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Manage teacher profiles, automated login credentials, and classroom subject assignments.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Notices & Announcements */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      Notices & Announcements
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Send official circulars targeted to the entire school, faculty, students, or specific grades.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Reports & Analytics */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-pink-300 dark:hover:border-pink-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      Reports & Analytics
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Get detailed operational insights with attendance rates and class enrollment statistics.
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. Secure & Reliable */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      Secure & Reliable
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      Protected with multi-tenant isolation, IDOR defense, and secure role-based access control.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            HOW IT WORKS / PORTALS (BENEFITS)
        ========================================== */}
        <section id="modules" className="py-20 bg-gray-50/50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase bg-blue-50 dark:bg-blue-900/40 px-3.5 py-1.5 rounded-full">
                Built For Everyone
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Dedicated Portals for Every Role
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Tailored experiences for administrators, teachers, and students.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Admin Portal Card */}
              <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-lg transition-all space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">School Administrators</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Operational Command</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>Manage student and teacher rosters</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>Configure classes, grades, and sections</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>Publish institution-wide circulars</span>
                  </li>
                </ul>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Link
                    href="/admin/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Go to Admin Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Teacher Portal Card */}
              <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-lg transition-all space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <UserCog className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Class Teachers</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Classroom Management</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span>Single-tap daily attendance marking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span>View assigned class lists and student info</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span>Post classroom notices and reminders</span>
                  </li>
                </ul>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Link
                    href="/teacher/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <span>Go to Teacher Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Student Portal Card */}
              <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm hover:shadow-lg transition-all space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Students</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Academic Transparency</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>View personal attendance percentage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Read school and class announcements</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Access class timetables and profile</span>
                  </li>
                </ul>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Link
                    href="/student/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Go to Student Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            CTA BANNER
        ========================================== */}
        <section id="benefits" className="py-16 bg-white dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-blue-50/70 dark:bg-gray-900 border border-blue-100 dark:border-gray-800 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
              <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                <div className="h-20 w-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                  <School className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                    Ready to Transform Your School?
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    Use School Study to streamline your daily administration, attendance, and faculty communication.
                  </p>
                </div>
              </div>

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
                  Simple & Instant Setup
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================
          FOOTER
      ========================================== */}
      <Footer />
    </div>
  );
}
