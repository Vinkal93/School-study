"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Check,
  Building2,
  GraduationCap,
  BookOpen,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Clock,
  ChevronDown,
  Star,
  Users,
  Play,
  FileText,
  TrendingUp,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  ArrowLeft,
  X,
  Send,
  School,
  UserCheck,
  Heart,
  Smile,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "@/context/theme-context";

export function ModernLandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSuccess(true);
      setTimeout(() => setNewsletterSuccess(false), 4000);
      setNewsletterEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* ==========================================
          1. MODERN TOP NAVIGATION HEADER
      ========================================== */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none block">
                SchoolStudy
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                Smart Schools, Brighter Futures
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/features"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Features
            </Link>

            {/* Solutions Dropdown Menu */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span>Solutions</span>
                <ChevronDown className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
                <Link
                  href="/school-erp"
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  For Schools & Academies
                </Link>
                <Link
                  href="/school-management"
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  For Coaching Institutes
                </Link>
                <Link
                  href="/teacher-management"
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  For Faculty & Teachers
                </Link>
              </div>
            </div>

            <Link
              href="/pricing"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>

            {/* Resources Dropdown Menu */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span>Resources</span>
                <ChevronDown className="h-3.5 w-3.5 group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all">
                <Link
                  href="/download"
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Mobile PWA Apps
                </Link>
                <Link
                  href="/about-developer"
                  className="block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  About Platform
                </Link>
              </div>
            </div>

            <Link
              href="/contact"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme mode"
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Login Link */}
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              Login
            </Link>

            {/* Get Started Button */}
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition-all hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ==========================================
            2. HERO SECTION
        ========================================== */}
        <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Heading & CTAs */}
              <div className="lg:col-span-6 space-y-6 text-left">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  <span>All-in-One School Management Platform</span>
                </div>

                {/* Main Hero Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                  Simplify School Management.{" "}
                  <span className="text-blue-600 dark:text-blue-500 block">
                    Empower Education.
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-xl">
                  A modern, easy-to-use platform for schools, institutes and coaching centers. 
                  Manage students, teachers, attendance, fees, exams and more &mdash; all in one place.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDemoModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold text-sm transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Play className="h-2.5 w-2.5 fill-white ml-0.5" />
                    </div>
                    <span>Watch Demo</span>
                  </button>
                </div>

                {/* Trust Points */}
                <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Easy Setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>No Credit Card Required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                    <span>Trusted by 500+ Schools</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Dashboard Mockup Showcase */}
              <div className="lg:col-span-6 relative">
                {/* Decorative background blob */}
                <div className="absolute -top-12 -right-12 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

                {/* Floating Top Badge */}
                <div className="relative z-20 mx-auto lg:ml-8 max-w-md mb-[-24px] sm:mb-[-28px]">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span>Make Schools Smarter with Technology ✨</span>
                  </div>
                </div>

                {/* The Realistic Dashboard Mockup Card */}
                <div className="relative z-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-6 text-left">
                  {/* Mock Browser Topbar */}
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        S
                      </div>
                      <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                        SchoolStudy
                      </span>
                    </div>

                    {/* Search Mockup */}
                    <div className="flex-1 max-w-xs relative hidden sm:block">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        placeholder="Search students, classes..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-default"
                      />
                    </div>

                    {/* Right User Capsule */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        <Bell className="h-3.5 w-3.5" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                        RV
                      </div>
                    </div>
                  </div>

                  {/* Greeting Row */}
                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Good Morning!
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Here&rsquo;s what&rsquo;s happening today.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      2025-26 ⌵
                    </span>
                  </div>

                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
                    <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">1,248</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Students</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">46</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Teachers</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
                      <div className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">92%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Attendance</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">₹12.5L</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Fee Collected</span>
                    </div>
                  </div>

                  {/* Attendance & Schedule Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    {/* Attendance Mini Graph */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Attendance Overview</span>
                        <span className="text-emerald-500">+12%</span>
                      </div>
                      {/* SVG Mini Wave */}
                      <svg viewBox="0 0 200 60" className="w-full h-14 mt-2">
                        <path
                          d="M0,45 Q40,30 80,40 T160,20 T200,30"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2.5"
                        />
                      </svg>
                      <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-1">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>
                    </div>

                    {/* Today's Schedule Mini List */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold block">Today&rsquo;s Schedule</span>
                      {[
                        { time: "08:00", title: "Class 6-A • Mathematics" },
                        { time: "09:00", title: "Class 7-B • Science" },
                        { time: "10:00", title: "Class 8-A • English" },
                        { time: "11:00", title: "Class 9-A • Computer" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {item.time}
                          </span>
                          <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hand-drawn Callout Annotation */}
                <div className="hidden sm:flex items-center gap-2 absolute -bottom-8 -right-4 z-20 text-slate-500 font-serif italic text-xs">
                  <svg width="40" height="30" viewBox="0 0 40 30" fill="none" className="text-blue-500">
                    <path
                      d="M5 25 C15 20, 25 10, 35 5 M35 5 L28 6 M35 5 L33 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Education made simple for everyone</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            3. FOUR PORTAL PERSONA CARDS (Exact match)
        ========================================== */}
        <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: School Admin Portal (Blue) */}
              <div className="rounded-3xl p-6 bg-blue-50/40 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 hover:border-blue-300 transition-all flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <School className="h-6 w-6" />
                    </div>
                    <Link
                      href="/admin/login"
                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      School Admin Portal
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Manage your entire school with ease and efficiency.
                    </p>
                  </div>

                  <Link
                    href="/admin/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                  >
                    <span>Explore Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Persona Illustration Box */}
                <div className="mt-6 pt-4 border-t border-blue-100/80 dark:border-slate-700/60 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-200 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center text-blue-600 font-bold text-2xl shadow-inner">
                    👩‍💼
                  </div>
                </div>
              </div>

              {/* Card 2: Teacher Portal (Green) */}
              <div className="rounded-3xl p-6 bg-emerald-50/40 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700 hover:border-emerald-300 transition-all flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <Link
                      href="/teacher/login"
                      className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Teacher Portal
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Plan, teach and track student progress effortlessly.
                    </p>
                  </div>

                  <Link
                    href="/teacher/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
                  >
                    <span>Explore Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Persona Illustration Box */}
                <div className="mt-6 pt-4 border-t border-emerald-100/80 dark:border-slate-700/60 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-200 to-teal-100 dark:from-emerald-950 dark:to-teal-900 flex items-center justify-center text-emerald-600 font-bold text-2xl shadow-inner">
                    👨‍🏫
                  </div>
                </div>
              </div>

              {/* Card 3: Student Portal (Rose / Pink) */}
              <div className="rounded-3xl p-6 bg-rose-50/40 dark:bg-slate-800/60 border border-rose-100 dark:border-slate-700 hover:border-rose-300 transition-all flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                      <Users className="h-6 w-6" />
                    </div>
                    <Link
                      href="/student/login"
                      className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Student Portal
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Learn, submit homework and track your progress.
                    </p>
                  </div>

                  <Link
                    href="/student/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline pt-1"
                  >
                    <span>Explore Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Persona Illustration Box */}
                <div className="mt-6 pt-4 border-t border-rose-100/80 dark:border-slate-700/60 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-200 to-pink-100 dark:from-rose-950 dark:to-pink-900 flex items-center justify-center text-rose-600 font-bold text-2xl shadow-inner">
                    👩‍🎓
                  </div>
                </div>
              </div>

              {/* Card 4: Parent Portal (Purple) */}
              <div className="rounded-3xl p-6 bg-purple-50/40 dark:bg-slate-800/60 border border-purple-100 dark:border-slate-700 hover:border-purple-300 transition-all flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                      <Heart className="h-6 w-6" />
                    </div>
                    <Link
                      href="/student/login"
                      className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Parent Portal
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Stay informed about your child&rsquo;s academic journey.
                    </p>
                  </div>

                  <Link
                    href="/student/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
                  >
                    <span>Explore Now</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Persona Illustration Box */}
                <div className="mt-6 pt-4 border-t border-purple-100/80 dark:border-slate-700/60 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-200 to-indigo-100 dark:from-purple-950 dark:to-indigo-900 flex items-center justify-center text-purple-600 font-bold text-2xl shadow-inner">
                    👨‍👦
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            4. SIX FEATURE TILES STRIP
        ========================================== */}
        <section className="py-14 bg-[#F8FAFC] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              
              {/* Feature 1 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Student Management
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Complete student lifecycle management
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Attendance Tracking
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Real-time attendance with reports
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 mx-auto flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Fee Management
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Automated fee collection & reminders
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 mx-auto flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Exam & Results
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Create exams, manage results
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Homework & Study
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Assign homework & share study material
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 mx-auto flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Reports & Analytics
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Insights for better decision making
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            5. KEY STATS IMPACT ROW
        ========================================== */}
        <section className="py-12 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    500+
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Schools & Institutes
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    1,00,000+
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Students Empowered
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    99.9%
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Uptime & Reliability
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center shrink-0">
                  <Star className="h-6 w-6 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    4.8/5
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Customer Satisfaction
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==========================================
            6. TESTIMONIALS: LOVED BY EDUCATORS EVERYWHERE
        ========================================== */}
        <section className="py-20 bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              
              {/* Left Header */}
              <div className="lg:col-span-4 space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black tracking-wider uppercase">
                  Testimonials
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Loved by Educators Everywhere
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  See what school administrators, teachers and parents say about SchoolStudy.
                </p>

                {/* Arrow Controls */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    aria-label="Previous testimonial"
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next testimonial"
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Right 3 Testimonial Cards */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Review 1 */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-3xl text-blue-500 font-serif leading-none block">&ldquo;</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      SchoolStudy has made our school management so much easier. The interface is clean and very user-friendly.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                        PS
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          Priya Sharma
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Principal, Greenfield Public School
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review 2 */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-3xl text-emerald-500 font-serif leading-none block">&ldquo;</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      Attendance and fee management are now effortless. Highly recommended for all schools.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0">
                        AV
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          Amit Verma
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          School Administrator, Sunrise Academy
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review 3 */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-3xl text-purple-500 font-serif leading-none block">&ldquo;</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      As a teacher, it saves me hours of work. I can focus more on teaching now.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                        NS
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          Neha Singh
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Mathematics Teacher, Bright Future School
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            7. CALL TO ACTION BANNER (Dark Navy Gradient)
        ========================================== */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Left Copy */}
            <div className="space-y-2 z-10 max-w-xl text-center md:text-left">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                Ready to Transform Your School?
              </h2>
              <p className="text-xs sm:text-sm text-blue-200">
                Join hundreds of schools already using SchoolStudy.
              </p>
            </div>

            {/* Right Buttons + Hand-drawn note */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-slate-100 text-blue-900 font-extrabold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-transparent hover:bg-white/10 text-white border border-white/40 font-bold text-sm transition-all"
              >
                <span>Contact Sales</span>
              </Link>

              {/* Hand-drawn note */}
              <div className="hidden lg:flex items-center gap-1.5 absolute -bottom-8 -right-2 text-blue-200 font-serif italic text-[11px] whitespace-nowrap">
                <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="text-blue-300">
                  <path d="M2 15 C8 10, 14 5, 20 2 M20 2 L15 3 M20 2 L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Better Education Together</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================
          8. MODERN FOOTER
      ========================================== */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pt-16 pb-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Col 1: Brand & Socials */}
            <div className="md:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none block">
                    SchoolStudy
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Smart Schools, Brighter Futures
                  </span>
                </div>
              </Link>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                A complete school management platform built for modern education.
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-3 pt-2 text-slate-400">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-700 hover:text-white flex items-center justify-center transition-colors"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.762-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><Link href="/" className="hover:text-blue-600 transition-colors">Home</Link></li>
                <li><Link href="/features" className="hover:text-blue-600 transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Blogs</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Col 3: Solutions */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider">
                Solutions
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><Link href="/school-erp" className="hover:text-blue-600 transition-colors">For Schools</Link></li>
                <li><Link href="/school-management" className="hover:text-blue-600 transition-colors">For Institutes</Link></li>
                <li><Link href="/teacher-management" className="hover:text-blue-600 transition-colors">For Coaching Centers</Link></li>
                <li><Link href="/features" className="hover:text-blue-600 transition-colors">For Colleges</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Custom Solutions</Link></li>
              </ul>
            </div>

            {/* Col 4: Resources */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider">
                Resources
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Help Center</Link></li>
                <li><Link href="/features" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
                <li><button type="button" onClick={() => setDemoModalOpen(true)} className="hover:text-blue-600 transition-colors">Video Tutorials</button></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/contact" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            {/* Col 5: Newsletter */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider">
                Newsletter
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Get the latest updates and news.
              </p>

              <form onSubmit={handleNewsletterSubmit} className="relative">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
              {newsletterSuccess && (
                <p className="text-[10px] font-bold text-emerald-500 animate-in fade-in">
                  Thank you for subscribing!
                </p>
              )}
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} SchoolStudy. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ==========================================
          INTERACTIVE DEMO MODAL
      ========================================== */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Play className="h-4 w-4 fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    SchoolStudy Platform Tour
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    A quick 2-minute overview of all major portals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Mockup Frame */}
            <div className="aspect-video w-full rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3 relative overflow-hidden border border-slate-800">
              <div className="w-16 h-16 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                <Play className="h-7 w-7 fill-white ml-1" />
              </div>
              <h4 className="text-sm font-bold text-white">Interactive Interactive Tour Demo</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Explore real-time roll call, fee receipt generation, timetable period bells, and full multi-tenant school administration.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <Link
                href="/register"
                onClick={() => setDemoModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                Start Free Onboarding
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
