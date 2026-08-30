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
  LogIn,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { MarketingHeader } from "@/components/marketing";
import { Footer } from "@/components/footer";
import { MarqueeText } from "@/components/common/MarqueeText";
import { FlipWords } from "@/components/common/FlipWords";
import { NumberTicker } from "@/components/common/NumberTicker";
import { BentoGridFeatures } from "@/components/marketing/BentoGridFeatures";
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
      <MarketingHeader currentPath="/" />

      {/* ==========================================
          MAIN CONTENT CONTAINER
      ========================================== */}
      <main id="main-content">
        {/* ==========================================
            HERO SECTION
        ========================================== */}
        <section className="relative pt-8 pb-16 lg:pt-12 lg:pb-24 overflow-hidden bg-gradient-to-b from-blue-50/50 via-sky-50/20 to-white dark:from-[#070b14] dark:via-[#0b1120] dark:to-[#070b14]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
              
              {/* LEFT COLUMN: Main Heading, Description, CTAs & Stats */}
              <div className="lg:col-span-5 space-y-6 text-center lg:text-left z-20">
                {/* Topic Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Next-Generation School ERP & Management</span>
                </div>

                {/* Primary H1 with FlipWords Animation */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.18]">
                  Simple School Management Software for{" "}
                  <FlipWords
                    words={["Modern Schools", "Smart Colleges", "Future Academies", "Growing Institutes", "Next-Gen Schools"]}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-300 bg-clip-text text-transparent font-black px-0"
                  />
                </h1>

                {/* Subheading */}
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  School Study is a powerful and intuitive school management system that helps institutions manage students, faculty, attendance, classes, fees, and more — all from one centralized, secure platform.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-95 transition-all"
                  >
                    <span>Get Started for Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/login"
                    className="relative w-full sm:w-auto inline-flex items-center justify-center p-[1.5px] rounded-xl overflow-hidden group shadow-sm active:scale-95 transition-transform"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "conic-gradient(from var(--angle, 0deg), transparent 25%, #06b6d4 40%, #3b82f6 50%, transparent 60%)",
                        animation: "shimmer-spin 2.5s linear infinite",
                      }}
                    />
                    <span className="relative z-10 inline-flex items-center justify-center gap-2 w-full h-full px-6 py-3 text-sm font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 rounded-[10.5px] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 transition-colors">
                      <LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Login Portal</span>
                    </span>
                  </Link>
                </div>

                {/* 4-Stat Trust Bar with NumberTicker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        <NumberTicker value={5000} suffix="+" />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Schools</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        <NumberTicker value={1.2} decimalPlaces={1} suffix="M+" />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Students Managed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        <NumberTicker value={99.9} decimalPlaces={1} suffix="%" />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Data Security</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        <NumberTicker value={24} suffix="/7" />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Support</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: Hero Person Image with Floating Feature Badges */}
              <div className="lg:col-span-3 relative flex items-center justify-center min-h-[420px] lg:min-h-[520px]">
                {/* Radial Glow Backdrop */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-tr from-blue-500/25 via-indigo-500/25 to-sky-400/20 dark:from-blue-600/30 dark:via-indigo-600/25 dark:to-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Person Cutout Image with Next.js optimization */}
                <div className="relative z-10 w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[400px]">
                  <img
                    src="/images/hero-person.png"
                    alt="School Study Management Representative"
                    width={400}
                    height={580}
                    className="w-full h-auto object-contain drop-shadow-2xl select-none"
                    loading="eager"
                  />
                </div>

                {/* Floating Badge 1: Student Management */}
                <div className="hidden sm:flex absolute top-12 -left-6 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 items-center gap-2.5 hover:scale-105 transition-transform">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Student</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Management</p>
                  </div>
                </div>

                {/* Floating Badge 2: Attendance Tracking */}
                <div className="hidden sm:flex absolute top-36 -left-8 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 items-center gap-2.5 hover:scale-105 transition-transform">
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Attendance</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tracking</p>
                  </div>
                </div>

                {/* Floating Badge 3: Fee Management */}
                <div className="hidden sm:flex absolute top-60 -left-6 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 items-center gap-2.5 hover:scale-105 transition-transform">
                  <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Fee</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Management</p>
                  </div>
                </div>

                {/* Floating Badge 4: Secure & Reliable */}
                <div className="hidden sm:flex absolute bottom-8 -right-2 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Secure & Reliable</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Your data is 100% safe</p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Interactive Dashboard Mockup Card */}
              <div className="lg:col-span-4 z-20">
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 shadow-2xl shadow-blue-500/10 space-y-4">
                  {/* Dashboard Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">Dashboard</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          2026-27 ▾
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Welcome back, Admin 👋</p>
                    </div>

                    <div className="relative h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Bell className="h-4 w-4" />
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    </div>
                  </div>

                  {/* 4 Mini Stat Badges (2x2 Grid) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Students</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">+12.5%</span>
                      </div>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-1">1,245</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Teachers</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">+8.3%</span>
                      </div>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-1">85</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Attendance</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">+5.2%</span>
                      </div>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-1">95%</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Fee Collection</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">+15.8%</span>
                      </div>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-1">₹2,45,100</p>
                    </div>
                  </div>

                  {/* Attendance Overview Chart Box */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Attendance Overview</span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">This Month ▾</span>
                    </div>

                    {/* SVG Curve Line Chart */}
                    <div className="relative h-24 w-full pt-2">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Area under curve */}
                        <path
                          d="M 10 50 C 60 55, 90 35, 140 45 C 190 20, 230 40, 270 20 L 270 80 L 10 80 Z"
                          fill="url(#chartGrad)"
                        />
                        {/* Smooth Line */}
                        <path
                          d="M 10 50 C 60 55, 90 35, 140 45 C 190 20, 230 40, 270 20"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Data Points */}
                        <circle cx="10" cy="50" r="3.5" fill="#2563eb" className="dark:fill-blue-400" />
                        <circle cx="95" cy="38" r="3.5" fill="#2563eb" className="dark:fill-blue-400" />
                        <circle cx="180" cy="28" r="3.5" fill="#2563eb" className="dark:fill-blue-400" />
                        <circle cx="270" cy="20" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" className="dark:stroke-slate-900" />
                      </svg>

                      {/* X-Axis Labels */}
                      <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 pt-1 font-medium">
                        <span>1 Jun</span>
                        <span>10 Jun</span>
                        <span>20 Jun</span>
                        <span>30 Jun</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Classes Box */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Today&apos;s Classes</span>
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">View All</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Physics</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">10:00 AM</span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Mathematics</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">11:30 AM</span>
                      </div>

                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Computer Science</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">01:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* TRUSTED BY SCHOOLS ACROSS INDIA BAR */}
            <div className="mt-14 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="text-center mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Trusted by Schools Across India
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Delhi Public School</span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Ryan International</span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">St. Xavier&apos;s School</span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <School className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">DAV Public School</span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <GraduationCap className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Sanskriti School</span>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-colors">
                  <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Modern Public School</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ==========================================
            POWERFUL MODULES FOR SMART SCHOOL MANAGEMENT
        ========================================== */}
        <section id="features" className="py-20 bg-slate-50/50 dark:bg-[#070b14] border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Powerful Modules for{" "}
                <span className="text-blue-600 dark:text-blue-400">Smart School Management</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                Everything you need to run your school or institute, all in one place.
              </p>
              <div className="w-12 h-1 bg-blue-600 dark:bg-blue-400 rounded-full mx-auto mt-4" />
            </div>

            <div id="modules" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              
              {/* 1. Student Management Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Student Management
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Manage student admission profiles, enrollment numbers, class sections, and guardian contact details with zero data duplication.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span>Admission & Enrollment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span>Class & Section Setup</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span>Guardian Directory</span>
                      </div>
                    </div>

                    {/* Right Graphic: Student Card Sheet */}
                    <div className="relative w-28 h-36 bg-blue-50/70 dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-2.5 shadow-md flex flex-col justify-between flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          👦
                        </div>
                        <span className="text-xs">🎓</span>
                      </div>
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">✓</span>
                          <div className="h-1.5 w-12 bg-blue-200 dark:bg-slate-600 rounded-full" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">✓</span>
                          <div className="h-1.5 w-14 bg-blue-200 dark:bg-slate-600 rounded-full" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">✓</span>
                          <div className="h-1.5 w-10 bg-blue-200 dark:bg-slate-600 rounded-full" />
                        </div>
                      </div>
                      <div className="h-4 w-full rounded-md bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center">
                        Active Roster
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/student-management"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore Student Management Software</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 2. Attendance Management Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Attendance Management
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Track student and faculty attendance in real-time with single-tap roll call, historical monthly summaries, and calculated attendance percentages.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Real-time Attendance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Attendance Reports</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span>Leave & Absence Tracking</span>
                      </div>
                    </div>

                    {/* Right Graphic: Attendance Mobile Preview */}
                    <div className="relative w-28 h-36 bg-slate-900 text-white rounded-2xl border-2 border-slate-700 p-2 shadow-lg flex flex-col justify-between text-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-slate-300">Today&apos;s Attendance</span>
                      <div className="h-10 w-10 mx-auto rounded-full border-2 border-emerald-400 flex items-center justify-center">
                        <span className="text-[9px] font-black text-emerald-400">92%</span>
                      </div>
                      <div className="text-[7px] text-slate-300 space-y-0.5 text-left pl-1">
                        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Present: 276</div>
                        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Absent: 16</div>
                        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Leave: 6</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/attendance-management"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore School Attendance Management</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 3. Teacher Management Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Teacher Management
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Assign class teachers, configure subject responsibilities, and generate automated faculty credentials seamlessly.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>Teacher Profiles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>Subject Assignments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span>Automated Credentials</span>
                      </div>
                    </div>

                    {/* Right Graphic: Teacher Lanyard ID Card */}
                    <div className="relative w-28 h-36 bg-gradient-to-b from-purple-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-purple-300 dark:border-purple-800 p-2 shadow-lg flex flex-col items-center justify-between text-center flex-shrink-0">
                      <div className="h-2 w-6 bg-purple-600 rounded-full mx-auto -mt-3 shadow" />
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
                        👨‍🏫
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-bold text-slate-900 dark:text-white leading-tight">Mr. Rahul Sharma</p>
                        <p className="text-[7px] text-purple-600 dark:text-purple-400 font-medium">Mathematics</p>
                      </div>
                      <div className="text-[8px] text-amber-500 font-black tracking-tighter">
                        ★★★★★
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/teacher-management"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore Teacher Management Software</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 4. Notices & Circulars Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-orange-300 dark:hover:border-orange-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Bell className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Notices & Circulars
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Publish administrative notices and circulars targeted to all school stakeholders, teachers, or specific student classes.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span>Instant Notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span>Targeted Communication</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span>Read Receipts & Alerts</span>
                      </div>
                    </div>

                    {/* Right Graphic: Megaphone & Circular Notice */}
                    <div className="relative w-28 h-36 bg-orange-50/70 dark:bg-slate-800/80 rounded-2xl border border-orange-200 dark:border-slate-700 p-2 shadow-md flex flex-col justify-between flex-shrink-0">
                      <div className="text-2xl text-center">📢</div>
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-orange-100 dark:border-slate-800 text-center space-y-1">
                        <span className="text-[8px] font-bold text-orange-600 dark:text-orange-400 block leading-tight">Important Notice</span>
                        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="h-1 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-orange-700 dark:text-orange-300">
                        <span>🔔 Broadcasted</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/school-management"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore School Administration Modules</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 5. Reports & Analytics Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-pink-300 dark:hover:border-pink-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Reports & Analytics
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Gain actionable institutional clarity with attendance trends, faculty-to-student ratios, and operational health metrics.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                        <span>Attendance Trends</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                        <span>Performance Analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                        <span>Custom Reports</span>
                      </div>
                    </div>

                    {/* Right Graphic: Multi-Chart Analytics */}
                    <div className="relative w-28 h-36 bg-pink-50/70 dark:bg-slate-800/80 rounded-2xl border border-pink-200 dark:border-slate-700 p-2 shadow-md flex flex-col justify-between flex-shrink-0">
                      <div className="h-12 w-full bg-white dark:bg-slate-900 rounded-lg p-1 shadow-sm flex items-end justify-around">
                        <div className="w-1.5 h-6 bg-pink-400 rounded-t" />
                        <div className="w-1.5 h-9 bg-pink-500 rounded-t" />
                        <div className="w-1.5 h-7 bg-pink-600 rounded-t" />
                        <div className="w-1.5 h-10 bg-purple-500 rounded-t" />
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-pink-600 dark:text-pink-400">
                        <span>📈 Insights Live</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/features"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore Analytics & Reporting Features</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* 6. Multi-Tenant Cloud Architecture Card */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm hover:shadow-xl hover:border-cyan-300 dark:hover:border-cyan-700/60 transition-all duration-300 flex flex-col justify-between group overflow-hidden">
                <div className="space-y-4">
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Multi-Tenant Isolation
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Strict tenant database boundaries ensure each school&apos;s records, academic files, and rosters remain completely isolated and secure.
                  </p>

                  {/* Split Content: Checklist + Graphic */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    {/* Left Checklist */}
                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span>Data Isolation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span>Secure Architecture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                        <span>Role-based Access</span>
                      </div>
                    </div>

                    {/* Right Graphic: 3D Database & Shield Stack */}
                    <div className="relative w-28 h-36 bg-cyan-50/70 dark:bg-slate-800/80 rounded-2xl border border-cyan-200 dark:border-slate-700 p-2 shadow-md flex flex-col items-center justify-between flex-shrink-0">
                      <div className="text-2xl">🛡️</div>
                      <div className="space-y-1 w-full flex flex-col items-center">
                        <div className="h-3 w-16 bg-cyan-500 rounded-full shadow" />
                        <div className="h-3 w-16 bg-cyan-600 rounded-full shadow" />
                        <div className="h-3 w-16 bg-cyan-700 rounded-full shadow" />
                      </div>
                      <span className="text-[8px] font-bold text-cyan-700 dark:text-cyan-300">🔒 100% Encrypted</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href="/school-erp"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 group-hover:translate-x-1 transition-all"
                  >
                    <span>Explore Multi-Tenant School ERP</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            BENTO GRID INTELLIGENT INFRASTRUCTURE
        ========================================== */}
        <BentoGridFeatures />

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
      </main>

      {/* ==========================================
          INTERACTIVE ANIMATED SCHOOL STUDY MARQUEE
      ========================================== */}
      <MarqueeText />

      {/* ==========================================
          ADVANCED MODERN PRODUCT FOOTER
      ========================================== */}
      <Footer />
    </div>
  );
}
