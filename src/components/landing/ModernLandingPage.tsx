"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
  GraduationCap,
  BookOpen,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Clock,
  ChevronRight,
  ChevronDown,
  Star,
  Users,
  Bell,
  Play,
  Zap,
  Check,
  Layers,
  Lock,
  Smartphone,
  Calendar,
  DollarSign,
  HeartHandshake,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing";
import { Footer } from "@/components/footer";

export function ModernLandingPage() {
  const [activeTab, setActiveTab] = useState<"admin" | "teacher" | "student">("admin");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] right-[10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px]" />
        <div className="absolute top-[65%] left-[10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[5%] right-[20%] w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[150px]" />
      </div>

      {/* Modern Marketing Header */}
      <div className="relative z-50">
        <MarketingHeader currentPath="/" />
      </div>

      <main id="main-content" className="relative z-10">
        {/* ==========================================
            1. HERO SECTION
        ========================================== */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold mb-8 backdrop-blur-md shadow-lg shadow-indigo-500/5">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Modern UI 2.0 • Realtime School Operating System</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1] sm:leading-[1.1]">
            Run your entire school with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              unprecedented clarity.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Replace fragmented software and paper registers with an all-in-one platform for admissions, 
            attendance, period-wise timetables, fee tracking, teacher management, and student learning.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-base shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-base transition-all hover:border-slate-600"
            >
              <span>View Pricing Plans</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Multi-tenant Data Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Realtime Attendance & Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Automated Fee Receipts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>No App Download Needed (PWA)</span>
            </div>
          </div>

          {/* ==========================================
              INTERACTIVE PRODUCT SHOWCASE MOCKUP
          ========================================== */}
          <div className="mt-16 relative">
            <div className="relative mx-auto rounded-3xl p-2 bg-gradient-to-b from-indigo-500/30 via-slate-800/40 to-transparent shadow-2xl backdrop-blur-xl border border-indigo-500/20 max-w-6xl">
              
              {/* Mock Browser Header */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 text-left">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs font-mono text-slate-400 pl-2">
                      https://schoolstudy.app/admin
                    </span>
                  </div>

                  {/* Interactive Switch Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab("admin")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "admin"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Admin Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("teacher")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "teacher"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Teacher Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("student")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "student"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Student Portal
                    </button>
                  </div>
                </div>

                {/* Tab Preview Content */}
                {activeTab === "admin" && (
                  <div className="pt-4 space-y-4">
                    {/* Welcome Banner Mockup */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-blue-400">Greenfield Public School</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">Good Morning, Rahul Verma 👋</h3>
                        <p className="text-xs text-slate-400">Thursday, 28 Aug 2025 • ☀️ 28°C Sunny</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          98% Attendance Today
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                          ₹12.5L Collected
                        </span>
                      </div>
                    </div>

                    {/* 4 Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Students Enrolled</span>
                        <p className="text-xl font-black text-white mt-1">1,248</p>
                        <span className="text-[11px] text-emerald-400 font-semibold">↑ 12% vs last month</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Active Teachers</span>
                        <p className="text-xl font-black text-white mt-1">46</p>
                        <span className="text-[11px] text-emerald-400 font-semibold">↑ 4% vs last month</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Total Classes</span>
                        <p className="text-xl font-black text-white mt-1">32</p>
                        <span className="text-[11px] text-slate-400 font-semibold">Pre-K to 12th</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Monthly Collection</span>
                        <p className="text-xl font-black text-emerald-400 mt-1">₹12.5L</p>
                        <span className="text-[11px] text-emerald-400 font-semibold">↑ 18% this month</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "teacher" && (
                  <div className="pt-4 space-y-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-blue-900/20 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-emerald-400">Classroom Teaching Hub</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">Good Morning, Rahul Sir 👋</h3>
                        <p className="text-xs text-slate-400">&ldquo;A great teacher inspires tomorrow&rsquo;s leaders.&rdquo;</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                          Period 2: Class 7-B Next
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Today&rsquo;s Lectures</span>
                        <p className="text-lg font-bold text-white mt-1">4 Classes Scheduled</p>
                        <p className="text-xs text-slate-400 mt-0.5">Class 6-A, 7-B, 8-A, 9-C</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Pending Roll Call</span>
                        <p className="text-lg font-bold text-amber-400 mt-1">1 Class Pending</p>
                        <p className="text-xs text-slate-400 mt-0.5">Class 7-B Mathematics</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Homework Submissions</span>
                        <p className="text-lg font-bold text-emerald-400 mt-1">28 / 32 Submitted</p>
                        <p className="text-xs text-slate-400 mt-0.5">Linear Equations Review</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "student" && (
                  <div className="pt-4 space-y-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/20 border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-purple-400">Class 10-A • Roll No. 14</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">Hello, Aarav Sharma 👋</h3>
                        <p className="text-xs text-slate-400">Your next bell is Mathematics at 09:30 AM</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                          Overall Attendance: 94%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Today&rsquo;s Timetable</span>
                        <p className="text-sm font-bold text-white mt-1">Bell 2 • Mathematics</p>
                        <p className="text-xs text-slate-400 mt-0.5">Classroom 4 • Mr. Rahul Verma</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Homework Due</span>
                        <p className="text-sm font-bold text-amber-300 mt-1">Science Chapter 4 Notes</p>
                        <p className="text-xs text-slate-400 mt-0.5">Due tomorrow by 8:00 AM</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                        <span className="text-xs text-slate-400 font-medium">Fee Receipts</span>
                        <p className="text-sm font-bold text-emerald-400 mt-1">Term 2 Paid (₹4,500)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Instant PDF Receipt Ready</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            2. KEY PLATFORM PILLARS (BENTO GRID)
        ========================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Everything In One Place</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 tracking-tight">
              Engineered for the demands of modern education.
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Every tool your staff, educators, and guardians need, built into one cohesive, 
              fast, and delighting cloud platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Attendance */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Realtime Roll Call</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Take class attendance with a single tap. Instantly syncs with student profiles and parent 
                notifications. Export monthly logs in Excel and PDF in seconds.
              </p>
            </div>

            {/* Card 2: Fee Engine */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Fee Collection</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Configurable fee structures, installment tracking, automatic defaulter lists, 
                and instant branded receipts that can be downloaded anytime.
              </p>
            </div>

            {/* Card 3: Bell-Linked Timetables */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Bell-Linked Timetables</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Organize periods from Bell 1 to Bell 8. Teachers see their exact period schedule; 
                students receive notifications when their next bell starts.
              </p>
            </div>

            {/* Card 4: Teacher HR & Payroll */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Teacher HR & Payroll</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Complete 10-tab teacher dossiers: base salary, allowances, deductions, bank accounts, 
                fines & rewards ledger, and star rating performance feedback.
              </p>
            </div>

            {/* Card 5: School Rules Engine */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Policy & Disciplinary Rules</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Configurable institutional rules with safe review queues. Zero blind automatic salary deductions — 
                every infraction requires explicit administrator approval and audit logging.
              </p>
            </div>

            {/* Card 6: Study & Digital Materials */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Classroom Study Hub</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Teachers upload PDF notes, practice papers, and YouTube video tutorials. Students 
                access their class repository 24/7 without costly physical photocopies.
              </p>
            </div>
          </div>
        </section>

        {/* ==========================================
            3. LIVE STATS COUNTER
        ========================================== */}
        <section className="py-16 bg-slate-900/40 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl sm:text-5xl font-black text-white">99.9%</p>
                <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Cloud Platform Uptime</p>
              </div>
              <div>
                <p className="text-3xl sm:text-5xl font-black text-emerald-400">100%</p>
                <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Data Privacy & Isolation</p>
              </div>
              <div>
                <p className="text-3xl sm:text-5xl font-black text-blue-400">&lt; 2 min</p>
                <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Instant School Onboarding</p>
              </div>
              <div>
                <p className="text-3xl sm:text-5xl font-black text-purple-400">0</p>
                <p className="text-xs sm:text-sm font-medium text-slate-400 mt-2">Hardware Setup Required</p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            4. FAQ SECTION
        ========================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Common Questions</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How fast can our school get started?",
                a: "You can sign up and complete the 3-step School Setup Wizard in under 3 minutes. Your classes, sections, and admin credentials are ready immediately.",
              },
              {
                q: "Do teachers and students need to download an app from Play Store?",
                a: "No app download is required! School Study is a full Progressive Web App (PWA) that works flawlessly on any phone, tablet, or PC browser with zero installation.",
              },
              {
                q: "Is our school data private and isolated from other schools?",
                a: "Absolutely. Every school operates in an independent, authenticated multi-tenant partition. Teachers and students only see records belonging strictly to their school.",
              },
              {
                q: "Can we switch between Classic and Modern UI anytime?",
                a: "Yes! Super Admin has real-time control to switch any portal between Classic and Modern UI 2.0 with a single toggle.",
              },
              {
                q: "How does fee receipt generation work?",
                a: "When an administrator logs a fee payment, an official PDF receipt with the school's name, receipt number, date, and payment mode is generated instantly.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-200 hover:text-white transition-colors"
                >
                  <span className="text-base">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      openFaq === idx ? "rotate-180 text-indigo-400" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ==========================================
            5. FINAL CALL TO ACTION
        ========================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-purple-900/60 border border-indigo-500/30 overflow-hidden text-center shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Ready to transform your school operations?
              </h2>
              <p className="text-base text-slate-300 leading-relaxed">
                Join forward-thinking educators and administrators who save hours every week with School Study.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-base transition-all shadow-lg hover:scale-105"
                >
                  <span>Start Free Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950 text-white border border-slate-700 font-bold text-base transition-all"
                >
                  <span>Schedule Consultation</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Global Footer */}
      <Footer />
    </div>
  );
}
