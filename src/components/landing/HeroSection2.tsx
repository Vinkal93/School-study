"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Play,
  Check,
  Users,
  IndianRupee,
  Calendar,
  FileText,
  BarChart3,
  Smartphone,
  School,
  ShieldCheck,
  Heart,
  Search,
  Bell,
  BookOpen,
  Award,
} from "lucide-react";

interface HeroSection2Props {
  onWatchVideoClick?: () => void;
}

export function HeroSection2({ onWatchVideoClick }: HeroSection2Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#EEF4FF] via-[#F8FAFC] to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-6 sm:pt-10 pb-16 lg:pb-24">
      {/* Background Glows and Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-100px] left-1/4 w-[500px] h-[500px] rounded-full bg-blue-400/15 blur-[120px] dark:bg-blue-600/10" />
        <div className="absolute top-[100px] right-10 w-[450px] h-[450px] rounded-full bg-indigo-400/15 blur-[130px] dark:bg-indigo-600/10" />
        <div className="absolute top-[350px] left-10 w-[350px] h-[350px] rounded-full bg-sky-300/20 blur-[100px] dark:bg-sky-500/10" />
      </div>

      {/* Hand-Drawn Annotation: Top Right */}
      <div className="hidden xl:flex items-center gap-1.5 absolute top-8 right-16 z-10 text-blue-600 dark:text-blue-400 font-serif italic text-sm select-none pointer-events-none">
        <span>Better Schools, Happier Students</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m14.14-14.14l-1.41 1.41" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================
            MAIN HERO GRID: LEFT (Copy & CTAs) + RIGHT (Girl & Mockups)
        ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center pt-2">
          
          {/* LEFT COLUMN: Headings, CTAs, Trust Points, 6 Module Tiles */}
          <div className="lg:col-span-6 space-y-6 text-left z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs hover:bg-blue-100/80 transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Trusted by 500+ Schools &amp; Institutes</span>
              <span className="text-blue-400 dark:text-blue-500 font-bold">&gt;</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
              All-in-One <br />
              <span className="text-blue-600 dark:text-blue-500">School Management</span> <br />
              <span className="relative inline-block mt-1">
                <span className="text-slate-900 dark:text-white">Made Simple</span>
                {/* Hand-drawn underline accent */}
                <svg
                  viewBox="0 0 250 18"
                  fill="none"
                  className="absolute left-0 -bottom-2 w-full h-3.5 text-blue-400/80 dark:text-blue-500 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 13 C 60 4, 150 2, 246 10 C 180 15, 90 16, 25 15"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
              Manage students, fees, attendance, exams, staff, and more &mdash; with School Study. 
              A powerful, easy-to-use platform for modern schools and coaching institutes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Link>

              <button
                type="button"
                onClick={onWatchVideoClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-sm sm:text-base shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
                </div>
                <span>Watch Video</span>
              </button>
            </div>

            {/* Trust Points Checklist */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 stroke-[3]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 stroke-[3]" />
                <span>Quick setup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 stroke-[3]" />
                <span>Dedicated support</span>
              </div>
            </div>

            {/* 6 Quick Feature Icon Tiles */}
            <div className="pt-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
                {/* 1. Student Management */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Student Management
                  </span>
                </div>

                {/* 2. Fee Management */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Fee Management
                  </span>
                </div>

                {/* 3. Attendance Tracking */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Attendance Tracking
                  </span>
                </div>

                {/* 4. Exams & Results */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Exams &amp; Results
                  </span>
                </div>

                {/* 5. Reports & Analytics */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Reports &amp; Analytics
                  </span>
                </div>

                {/* 6. Web & Mobile Access */}
                <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    Web &amp; Mobile Access
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Realistic Browser Dashboard + School Girl PNG + Mobile Phone */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[480px] sm:min-h-[560px] lg:min-h-[640px]">
            
            {/* Hand-Drawn Annotation: Empowering Education */}
            <div className="absolute top-2 left-4 sm:left-12 z-20 hidden sm:flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-serif italic text-base -rotate-6 select-none pointer-events-none">
              <span>Empowering Education</span>
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="text-blue-500">
                <path d="M2 15 C8 10, 14 5, 20 2 M20 2 L15 3 M20 2 L18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            {/* Hand-Drawn Annotation: Manage Anywhere */}
            <div className="absolute bottom-16 right-0 sm:right-6 z-30 hidden sm:flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-serif italic text-sm rotate-3 select-none pointer-events-none">
              <div className="flex flex-col items-center">
                <span>Manage Anywhere</span>
                <svg width="30" height="25" viewBox="0 0 30 25" fill="none" className="text-blue-500">
                  <path d="M5 5 Q15 20 25 15 M25 15 L20 12 M25 15 L22 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* 1. LAYER IN BACKGROUND: Desktop Browser ERP Mockup */}
            <div className="absolute right-0 sm:right-4 top-10 sm:top-14 w-[92%] sm:w-[86%] lg:w-[92%] max-w-[580px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden p-4 sm:p-5 text-left select-none opacity-95 transition-all">
              {/* Browser Mockup Topbar */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                    S
                  </div>
                  <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                    School Study
                  </span>
                </div>

                <div className="flex-1 max-w-[200px] relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    placeholder="Search students, fees, exams..."
                    className="w-full pl-7 pr-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-default"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Bell className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      PR
                    </div>
                    <div className="hidden sm:block text-[9px] leading-none">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Principal</p>
                      <p className="text-slate-400 text-[8px]">SBCI Public School</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Greeting & Date */}
              <div className="pt-3 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    Good Morning, Principal!
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Here&rsquo;s what&rsquo;s happening today.
                  </p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Mon, 15 Sep 2025
                </span>
              </div>

              {/* 4 Mini Stat Boxes */}
              <div className="grid grid-cols-4 gap-2 pt-1 pb-3">
                <div className="p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[9px] text-slate-500 block">Total Students</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">1,248</span>
                    <span className="text-[8px] text-emerald-600 font-bold">+12%</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[9px] text-slate-500 block">Total Teachers</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">56</span>
                    <span className="text-[8px] text-emerald-600 font-bold">+8%</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[9px] text-slate-500 block">Fees Collected</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">₹5.62L</span>
                    <span className="text-[8px] text-emerald-600 font-bold">+18%</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[9px] text-slate-500 block">Attendance</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">92%</span>
                    <span className="text-[8px] text-emerald-600 font-bold">+3%</span>
                  </div>
                </div>
              </div>

              {/* Student Overview Bar Chart Simulation */}
              <div className="grid grid-cols-12 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="col-span-8 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    <span>Student Attendance Overview</span>
                    <span className="text-[8px] text-blue-600">This Year ⌵</span>
                  </div>
                  {/* CSS Bars */}
                  <div className="flex items-end justify-between h-14 px-1 gap-1.5">
                    {[
                      { month: "Jan", h: "60%" },
                      { month: "Feb", h: "75%" },
                      { month: "Mar", h: "88%" },
                      { month: "Apr", h: "92%" },
                      { month: "May", h: "95%" },
                      { month: "Jun", h: "70%" },
                      { month: "Jul", h: "85%" },
                      { month: "Aug", h: "90%" },
                      { month: "Sep", h: "94%" },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t-sm ${
                            i === 8
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-blue-200 dark:bg-blue-900/60"
                          }`}
                          style={{ height: bar.h }}
                        />
                        <span className="text-[7px] text-slate-400">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Events Mini Widget */}
                <div className="col-span-4 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Upcoming Events</span>
                    <span className="text-[7px] text-blue-500">View All</span>
                  </div>
                  <div className="space-y-1 text-[8px]">
                    <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-blue-600 block">15 Sep • PTM Meeting</span>
                      <span className="text-slate-400">Class 10 Section A</span>
                    </div>
                    <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-emerald-600 block">18 Sep • Half Yearly</span>
                      <span className="text-slate-400">All Classes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FOREGROUND LAYER: The School Girl PNG */}
            <div className="relative z-20 pointer-events-none mt-8 sm:mt-12 lg:mt-6 -mr-6 sm:-mr-12 lg:-mr-16 flex justify-center">
              <img
                src="/images/hero-student.png"
                alt="School girl smiling and holding study books"
                className="w-[280px] sm:w-[380px] lg:w-[440px] xl:w-[480px] h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.22)] select-none"
                loading="eager"
              />
            </div>

            {/* 3. FOREGROUND OVERLAY: Sleek Mobile Phone PWA Mockup */}
            <div className="absolute right-0 sm:right-2 bottom-[-10px] sm:bottom-0 z-30 w-[170px] sm:w-[210px] rounded-[2rem] bg-slate-900 text-white p-2.5 shadow-2xl border-[3px] border-slate-800 backdrop-blur-md select-none transform translate-y-2 sm:translate-y-0 hover:scale-105 transition-transform">
              {/* Notch / Speaker */}
              <div className="w-16 h-3.5 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              </div>

              {/* Phone App Content */}
              <div className="bg-slate-950/80 rounded-2xl p-2.5 space-y-2">
                {/* App Header */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-extrabold text-blue-400">School Study</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                {/* Student Profile Card */}
                <div className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[9px]">
                  <p className="font-black text-white">Hi, Rohan 👋</p>
                  <p className="text-[8px] text-slate-400">Class 10 • Section A</p>
                </div>

                {/* 4 Feature Buttons in Phone */}
                <div className="grid grid-cols-2 gap-1.5 text-[8px] font-bold text-center">
                  <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-300 flex flex-col items-center">
                    <Calendar className="h-3.5 w-3.5 text-sky-400 mb-0.5" />
                    <span>Attendance</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 flex flex-col items-center">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-400 mb-0.5" />
                    <span>Fees</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-300 flex flex-col items-center">
                    <BookOpen className="h-3.5 w-3.5 text-purple-400 mb-0.5" />
                    <span>Homework</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 flex flex-col items-center">
                    <Award className="h-3.5 w-3.5 text-amber-400 mb-0.5" />
                    <span>Results</span>
                  </div>
                </div>

                {/* Bottom Navigation Bar */}
                <div className="flex items-center justify-around pt-1 border-t border-slate-800 text-[7px] text-slate-400">
                  <span className="text-blue-400 font-bold">Home</span>
                  <span>Class</span>
                  <span>Notice</span>
                  <span>Profile</span>
                </div>
              </div>
            </div>

            {/* 4. Book Spine Stack & Planter on the right */}
            <div className="hidden xl:flex flex-col items-center absolute bottom-2 -right-14 z-20 pointer-events-none select-none">
              <div className="space-y-1 text-center font-black text-[9px] text-white">
                <div className="px-3 py-1 rounded bg-indigo-600 shadow-md">LEARN</div>
                <div className="px-3 py-1 rounded bg-blue-600 shadow-md">GROW</div>
                <div className="px-3 py-1 rounded bg-sky-600 shadow-md">SUCCEED</div>
              </div>
            </div>

          </div>

        </div>

        {/* =========================================================
            PARTNER / SCHOOL TRUST LOGOS STRIP
        ========================================================= */}
        <div className="mt-14 sm:mt-20 pt-8 border-t border-slate-200/60 dark:border-slate-800/80 text-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-6">
            Trusted by leading schools and institutes
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16 opacity-75 grayscale hover:grayscale-0 transition-all">
            {/* School 1 */}
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-black text-xs">
                SBCI
              </div>
              <div className="text-left leading-tight">
                <span>SBCI Computer</span>
                <span className="block text-[10px] text-slate-400 font-normal">Institute</span>
              </div>
            </div>

            {/* School 2 */}
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <School className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <span>Bright Future</span>
                <span className="block text-[10px] text-slate-400 font-normal">Public School</span>
              </div>
            </div>

            {/* School 3 */}
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <span>New Era</span>
                <span className="block text-[10px] text-slate-400 font-normal">Coaching Classes</span>
              </div>
            </div>

            {/* School 4 */}
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <School className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <span>Sunrise</span>
                <span className="block text-[10px] text-slate-400 font-normal">Academy</span>
              </div>
            </div>

            {/* School 5 */}
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
                <Award className="h-4 w-4" />
              </div>
              <div className="text-left leading-tight">
                <span>Modern</span>
                <span className="block text-[10px] text-slate-400 font-normal">International School</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            KEY IMPACT STATS FLOATING CARD
        ========================================================= */}
        <div className="mt-10 sm:mt-14 relative">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center sm:text-left">
              
              {/* Stat 1 */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    500+
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    Schools &amp; Institutes
                  </p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    1,00,000+
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    Students Managed
                  </p>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    99.9%
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    Uptime &amp; Security
                  </p>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Heart className="h-6 w-6 fill-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    4.8/5
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    Customer Satisfaction
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Hand-Drawn Annotation: Bottom Right */}
          <div className="hidden lg:flex items-center gap-1.5 absolute -bottom-7 right-4 text-blue-600 dark:text-blue-400 font-serif italic text-xs select-none pointer-events-none">
            <svg width="20" height="18" viewBox="0 0 24 20" fill="none" className="text-blue-500">
              <path d="M2 15 C8 10, 14 5, 20 2 M20 2 L15 3 M20 2 L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Together for a Brighter Tomorrow</span>
          </div>
        </div>

      </div>
    </section>
  );
}
