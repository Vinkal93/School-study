"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowRight,
  Sparkles,
  Shield,
  Lock,
  Database,
  UserCheck,
  KeyRound,
  Smartphone,
  GraduationCap,
  Users,
  BookOpen,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  Building2,
  Library,
  FileText,
  CheckCircle2,
  Play,
  X,
  Send,
  Calendar,
  Layers,
  Award,
  Globe,
  Radio,
  ScanLine,
  Truck,
  QrCode,
  School,
  Heart,
  HelpCircle,
  Eye,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";

export function LiquidGlassLandingPage() {
  // Modal state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Offerings tabs
  const [activeOfferingTab, setActiveOfferingTab] = useState<string>("erp");

  // Suite category filter
  const [activeSuiteTab, setActiveSuiteTab] = useState<string>("all");

  // Mobile app active role
  const [activeAppRole, setActiveAppRole] = useState<"parents" | "teachers" | "leadership">("parents");

  // Stories accordion
  const [openAccordion, setOpenAccordion] = useState<number>(0);

  // Why choose OS tabs
  const [activeWhyTab, setActiveWhyTab] = useState<number>(0);

  // Demo form in bottom section
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    schoolName: "",
    role: "Principal",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.phone) return;
    setIsSubmitted(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE] text-[#0F172A] font-sans antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* =========================================================================
          1. TOP CONTACT & SOCIAL STRIP (Clean White Light Glass)
      ========================================================================= */}
      <div className="w-full bg-white border-b border-slate-100 text-xs text-slate-600 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Left contact info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-900 font-semibold">Sales :</span>
              <a
                href="tel:+918860080313"
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Phone className="h-3.5 w-3.5" /> +91 8860080313
              </a>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <a
              href="mailto:sales@brightstudy.in"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              <Mail className="h-3.5 w-3.5" /> sales@brightstudy.in
            </a>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="flex items-center gap-1 text-slate-500">
              Parent Help Desk (Mon-Fri) :
              <a
                href="mailto:parents@brightstudy.in"
                className="text-blue-600 hover:underline ml-1"
              >
                parents@brightstudy.in
              </a>
            </span>
          </div>

          {/* Right social icons */}
          <div className="flex items-center gap-3 text-slate-500">
            <span className="text-slate-700 font-medium">Follow Us:</span>
            <div className="flex items-center gap-2.5">
              <a
                href="#"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors text-[11px] font-bold"
                aria-label="Facebook"
              >
                f
              </a>
              <a
                href="#"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-pink-50 hover:text-pink-600 flex items-center justify-center transition-colors text-[11px] font-bold"
                aria-label="Instagram"
              >
                in
              </a>
              <a
                href="#"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors text-[11px] font-bold"
                aria-label="LinkedIn"
              >
                li
              </a>
              <a
                href="#"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors text-[11px] font-bold"
                aria-label="X"
              >
                X
              </a>
              <a
                href="#"
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors text-[11px] font-bold"
                aria-label="YouTube"
              >
                yt
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. STICKY LIQUID GLASS NAVIGATION BAR
      ========================================================================= */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-[2px] shadow-sm group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black tracking-tight text-[#0B2545]">
                  Bright<span className="text-blue-600">study</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  ERP 2026
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">
                Learn • Score • Grow • Brighter Tomorrow
              </p>
            </div>
          </Link>

          {/* Navigation Links with Chevrons */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
            <div className="relative group cursor-pointer py-2">
              <span className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                Platforms <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:rotate-180" />
              </span>
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-xl p-3 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                <Link href="#offerings" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">ERP</div>
                  <div>
                    <div className="font-bold text-slate-900">School ERP</div>
                    <div className="text-[11px] text-slate-500">Admissions, Fees &amp; Admin</div>
                  </div>
                </Link>
                <Link href="#suite" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">LMS</div>
                  <div>
                    <div className="font-bold text-slate-900">Digital LMS</div>
                    <div className="text-[11px] text-slate-500">Content, Homework &amp; Quizzes</div>
                  </div>
                </Link>
                <Link href="#mobile-app" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">App</div>
                  <div>
                    <div className="font-bold text-slate-900">Mobile Apps</div>
                    <div className="text-[11px] text-slate-500">Parent, Teacher &amp; Admin</div>
                  </div>
                </Link>
                <Link href="#why-faster" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">AI</div>
                  <div>
                    <div className="font-bold text-slate-900">AI Intelligence</div>
                    <div className="text-[11px] text-slate-500">Smart Forecasts &amp; Alerts</div>
                  </div>
                </Link>
              </div>
            </div>

            <div className="relative group cursor-pointer py-2">
              <span className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                School Optimisation <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:rotate-180" />
              </span>
            </div>

            <Link href="#stories" className="hover:text-blue-600 transition-colors">
              Success Stories
            </Link>

            <Link href="#security" className="hover:text-blue-600 transition-colors">
              Insights
            </Link>

            <Link href="#why-us" className="hover:text-blue-600 transition-colors">
              About Us
            </Link>

            <Link href="#demo" className="hover:text-blue-600 transition-colors">
              Contact Us
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center text-xs font-bold text-slate-700 hover:text-blue-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-[#0B63E5] text-white text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-600 transition-all duration-200 transform active:scale-95 cursor-pointer"
            >
              <span>REGISTER FOR DEMO</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. HERO SECTION: "Turn screen time into meaningful learning"
      ========================================================================= */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-24 overflow-hidden bg-gradient-to-b from-[#FFF5F7]/40 via-[#F8FAFC] to-white">
        {/* Soft Liquid Ambient Glows in Background */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-pink-200/20 via-sky-200/25 to-blue-200/20 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-amber-100/30 via-emerald-100/20 to-sky-100/20 rounded-full blur-[130px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 relative">
              {/* Vertical page navigation bar (exact match to screenshot) */}
              <div className="hidden xl:flex flex-col items-center gap-2 absolute -left-10 top-10 text-slate-300">
                <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Overline with red accent dash */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
                <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                  SCHOOL ERP • SCHOOL MANAGEMENT SOFTWARE
                </span>
              </div>

              {/* Massive High-Impact Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-[#0B2545] leading-[1.12] tracking-tight mb-6">
                Turn screen time into{" "}
                <span className="text-[#00A86B] font-extrabold inline-block">
                  meaningful learning
                </span>
              </h1>

              {/* Subtitle Description */}
              <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-8 max-w-xl">
                Interactive, CBSE-aligned practice that helps children learn, score, and grow — with daily quizzes and real progress.
              </p>

              {/* 3 Green Highlight Bullet Points */}
              <div className="space-y-3 mb-9">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Daily practice that feels like play
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Curriculum-aligned questions
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    Rewards that keep students coming back
                  </span>
                </div>
              </div>

              {/* CTAs: EXPLORE LEARNING & START A FREE TRIAL */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="#offerings"
                  className="px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 transform active:scale-95"
                >
                  <span>EXPLORE LEARNING</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  START A FREE TRIAL
                </button>
              </div>
            </div>

            {/* Right Showcase Column (Pills + Apple & Books Hero Visual + Liquid Card) */}
            <div className="lg:col-span-6 relative flex flex-col items-center">
              {/* Top Floating Badge Pills: LEARN • SCORE • GROW */}
              <div className="flex items-center gap-2 mb-4 self-start sm:self-center">
                <span className="px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider shadow-xs">
                  LEARN
                </span>
                <span className="px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-wider shadow-xs">
                  SCORE
                </span>
                <span className="px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider shadow-xs">
                  GROW
                </span>
              </div>

              {/* Rounded 3XL Image Container */}
              <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/60 bg-gradient-to-b from-sky-50 to-slate-100 group">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80"
                    alt="Bright Study - Interactive School ERP & Learning"
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Dark Liquid Glass Card in Bottom-Left */}
                <div className="absolute bottom-6 left-6 z-10 bg-[#0B2545]/90 backdrop-blur-xl border border-white/20 text-white rounded-2xl p-4 shadow-xl max-w-[220px]">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-[#E91E63] text-white text-[11px] font-black uppercase tracking-wider mb-2 shadow-xs">
                    7 PM
                  </div>
                  <div className="text-sm font-bold leading-snug">
                    Daily quiz. Real rewards.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. THE 4-PILLAR HIGH-CONTRAST UNDER-HERO BAR (Deep Navy)
        ========================================================================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-14">
          <div className="w-full bg-[#0B2545] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-700/60">
            {/* ERP */}
            <div className="pt-4 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <div className="text-2xl font-black tracking-tight text-amber-400 mb-1">
                ERP
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Admissions, fees, and academics in one system
              </p>
            </div>

            {/* LMS */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-black tracking-tight text-sky-400 mb-1">
                LMS
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Homework, content, and live classes together
              </p>
            </div>

            {/* Apps */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-black tracking-tight text-amber-400 mb-1">
                Apps
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Parents, teachers, and leadership on mobile
              </p>
            </div>

            {/* K-12 */}
            <div className="pt-4 sm:pt-0 sm:px-4">
              <div className="text-2xl font-black tracking-tight text-amber-400 mb-1">
                K–12
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Designed for growing Indian school campuses
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. COMPREHENSIVE OFFERINGS SECTION
      ========================================================================= */}
      <section id="offerings" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          {/* Header */}
          <div className="text-left mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                COMPREHENSIVE OFFERINGS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-3">
              School ERP software that covers the whole campus
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
              Mix of school ERP depth and connected products — academics, apps, learning, websites, and smart campus tools in one school management suite.
            </p>
          </div>

          {/* Interactive Offerings Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-100 pb-4">
            {[
              { id: "erp", label: "School ERP", icon: <Building2 className="h-4 w-4" /> },
              { id: "mobile", label: "Mobile App", icon: <Smartphone className="h-4 w-4" /> },
              { id: "elearning", label: "E-Learning", icon: <BookOpen className="h-4 w-4" /> },
              { id: "website", label: "Website", icon: <Globe className="h-4 w-4" /> },
              { id: "smart", label: "Smart Technology", icon: <Zap className="h-4 w-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveOfferingTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeOfferingTab === tab.id
                    ? "bg-[#0B2545] text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500 mb-6">
            Safety, payments, and communication tools that sit on top of the ERP.
          </p>

          {/* 4 Feature Cards (WhatsApp, RFID & Face Attendance, GPS Transport, Payments & QR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 01 WhatsApp */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Send className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-slate-400">01</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">WhatsApp</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Send the same trusted school updates parents already expect on SMS.
                </p>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Read more</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 02 RFID & Face Attendance */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-slate-400">02</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  RFID &amp; Face Attendance
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Safer campus entry and staff attendance that flows into records automatically.
                </p>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Read more</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 03 GPS Transport */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-slate-400">03</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">GPS Transport</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Give families visibility on routes while transport teams stay in control.
                </p>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Read more</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 04 Payments & QR */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-slate-400">04</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Payments &amp; QR</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Online fee collection and visitor QR check-in without extra busywork.
                </p>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
              >
                <span>Read more</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. WHY SCHOOLS MOVE FASTER (Deep Navy High-Contrast Section)
      ========================================================================= */}
      <section id="why-faster" className="py-20 bg-[#0B2545] text-white relative overflow-hidden">
        {/* Iridescent ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="text-left mb-12">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-amber-400 rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                WHY SCHOOLS MOVE FASTER
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Intelligence, automation, and growth in one stack
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 01 INTELLIGENCE */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider mb-4">
                  01 INTELLIGENCE
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Smarter systems for smarter schools
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  Keep departments aligned with one source of truth across the campus.
                </p>

                <div className="space-y-3 mb-8 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Cross-department coordination</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>One digital infrastructure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>Consistent parent and staff experience</span>
                  </div>
                </div>
              </div>

              <Link
                href="#offerings"
                className="text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5"
              >
                <span>Explore Platforms</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 02 AUTOMATION */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-4">
                  02 AUTOMATION
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Delegate to technology and stay free to lead
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  Build the process once. Let Bright Study run it every day with a clear audit trail.
                </p>

                <div className="space-y-3 mb-8 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Automate repetitive school work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Focus on growth, not follow-ups</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Accountability in every module</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 cursor-pointer text-left"
              >
                <span>Explore Automation</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 03 GROWTH */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider mb-4">
                  03 GROWTH
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Plan before challenges become crises
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6">
                  Spot risk early and act while there is still time to change the outcome.
                </p>

                <div className="space-y-3 mb-8 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Catch attendance and fee risk early</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Forecast academic outcomes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Intervene with the right students</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer text-left"
              >
                <span>Explore AI</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. COMPLETE SCHOOL MANAGEMENT SUITE (Clean Light Grid)
      ========================================================================= */}
      <section id="suite" className="py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-left mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                COMPLETE SCHOOL MANAGEMENT SUITE
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-3">
              School management software for admissions, academics, finance, and campus ops
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-3xl">
              A unified platform for ERP, LMS, website, AI, and leadership analytics — so teams are not stitching five tools together.
            </p>
          </div>

          {/* Category Filter Pills: ERP • LMS • Website • AI • Analytics */}
          <div className="flex flex-wrap items-center gap-2 mb-10">
            {[
              { id: "all", label: "All Modules" },
              { id: "erp", label: "ERP" },
              { id: "lms", label: "LMS" },
              { id: "website", label: "Website" },
              { id: "ai", label: "AI" },
              { id: "analytics", label: "Analytics" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveSuiteTab(pill.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeSuiteTab === pill.id
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* 6 Modular Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {/* 01 Student Information */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-blue-600 mb-2">01</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Student Information
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                One secure record for profiles, documents, and academic history.
              </p>
            </div>

            {/* 02 Fee & Billing */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-emerald-600 mb-2">02</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Fee &amp; Billing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Structures, collections, receipts, and transparent tracking.
              </p>
            </div>

            {/* 03 Exam & Assessment */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-amber-600 mb-2">03</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Exam &amp; Assessment
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Plan evaluations and publish reliable performance insights.
              </p>
            </div>

            {/* 04 Admission Enquiry */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-purple-600 mb-2">04</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Admission Enquiry
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Follow every lead with a structured path from enquiry to joining.
              </p>
            </div>

            {/* 05 Attendance */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-sky-600 mb-2">05</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Attendance</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Capture presence quickly and see patterns in real time.
              </p>
            </div>

            {/* 06 Library */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-black text-rose-600 mb-2">06</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Library</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Catalogue, circulation, and records without paper registers.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>View platforms</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. SCHOOL MOBILE APP SECTION ("Everything essential, from anywhere, with a tap")
      ========================================================================= */}
      <section id="mobile-app" className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-5 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
                <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                  SCHOOL MOBILE APP
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-4">
                Everything essential, from anywhere, with a tap
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                Manage academics, attendance, communication, approvals, transport, fees, and student welfare from one school app.
              </p>

              {/* Interactive Role Buttons (Parents, Teachers, Leadership) */}
              <div className="space-y-4 mb-8">
                {/* Parents */}
                <div
                  onClick={() => setActiveAppRole("parents")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    activeAppRole === "parents"
                      ? "bg-blue-50/70 border-blue-300 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
                    <span>Parents</span>
                    {activeAppRole === "parents" && (
                      <span className="text-[10px] font-bold text-blue-600 uppercase bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        Active View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Fees, homework, circulars, and transport updates from one login.
                  </p>
                </div>

                {/* Teachers */}
                <div
                  onClick={() => setActiveAppRole("teachers")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    activeAppRole === "teachers"
                      ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
                    <span>Teachers</span>
                    {activeAppRole === "teachers" && (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        Active View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Attendance, assignments, and class communication without extra apps.
                  </p>
                </div>

                {/* Leadership */}
                <div
                  onClick={() => setActiveAppRole("leadership")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    activeAppRole === "leadership"
                      ? "bg-amber-50/70 border-amber-300 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-slate-900 text-sm mb-1 flex items-center justify-between">
                    <span>Leadership</span>
                    {activeAppRole === "leadership" && (
                      <span className="text-[10px] font-bold text-amber-600 uppercase bg-white px-2 py-0.5 rounded-full border border-amber-200">
                        Active View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    Approvals, snapshots, and campus health whenever you need them.
                  </p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore the app</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Phone Mockups Column */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <div className="relative w-full max-w-lg aspect-[16/11] flex items-center justify-center">
                {/* Phone 1 (Back left) */}
                <div className="absolute left-4 w-44 sm:w-52 aspect-[9/19] rounded-[2.5rem] bg-slate-900 p-2 shadow-xl border-4 border-slate-700 transform -rotate-6 scale-90 opacity-90 transition-transform hover:scale-95">
                  <div className="w-full h-full bg-slate-950 rounded-[2rem] p-3 text-white overflow-hidden flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-amber-400 flex items-center justify-between">
                      <span>9:41</span>
                      <span className="text-[8px] bg-amber-400/20 px-1 rounded">5G</span>
                    </div>
                    <div className="space-y-2 my-auto">
                      <div className="text-[11px] font-bold">Today&apos;s Collection</div>
                      <div className="text-lg font-black text-emerald-400">₹1,42,800</div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-emerald-400 rounded-full" />
                      </div>
                      <div className="text-[9px] text-slate-400">96.4% Student Attendance</div>
                    </div>
                    <div className="text-[8px] text-center text-slate-500">School Study Admin</div>
                  </div>
                </div>

                {/* Phone 2 (Center Hero Phone) */}
                <div className="relative z-10 w-52 sm:w-60 aspect-[9/19] rounded-[2.8rem] bg-slate-900 p-2.5 shadow-2xl border-4 border-slate-600 transform scale-100 transition-transform hover:scale-105">
                  <div className="w-full h-full bg-white rounded-[2.2rem] p-3.5 text-slate-900 overflow-hidden flex flex-col justify-between shadow-inner">
                    <div>
                      {/* App header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          <span className="text-[11px] font-black text-[#0B2545]">BrightStudy</span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>

                      {/* Student Profile Card */}
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-3">
                        <div className="text-[9px] text-blue-200 uppercase font-semibold">Student Card</div>
                        <div className="text-xs font-black">Aarav Singh</div>
                        <div className="text-[9px] text-blue-100">Class 5-B • Reg #1042</div>
                      </div>

                      {/* Quick modules */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                          <span className="font-semibold text-slate-700">Fees Paid Receipt</span>
                          <span className="font-bold text-emerald-600">₹400.00</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                          <span className="font-semibold text-slate-700">Homework Upload</span>
                          <span className="font-bold text-blue-600">2 Pending</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                          <span className="font-semibold text-slate-700">Attendance</span>
                          <span className="font-bold text-emerald-600">96.8%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="w-full py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold text-center uppercase tracking-wider"
                    >
                      Open Parent Portal
                    </button>
                  </div>
                </div>

                {/* Phone 3 (Back right) */}
                <div className="absolute right-4 w-44 sm:w-52 aspect-[9/19] rounded-[2.5rem] bg-slate-900 p-2 shadow-xl border-4 border-slate-700 transform rotate-6 scale-90 opacity-90 transition-transform hover:scale-95">
                  <div className="w-full h-full bg-slate-900 rounded-[2rem] p-3 text-white overflow-hidden flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-sky-400 flex items-center justify-between">
                      <span>Teacher Mode</span>
                      <span className="text-[8px] bg-sky-400/20 px-1 rounded">Live</span>
                    </div>
                    <div className="space-y-2 my-auto">
                      <div className="text-[11px] font-bold">Class 8-A Roll Call</div>
                      <div className="text-xs text-slate-300 font-medium">38 / 40 Present</div>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="w-11/12 h-full bg-sky-400 rounded-full" />
                      </div>
                      <div className="text-[9px] text-slate-400">Next: Science Period 3</div>
                    </div>
                    <div className="text-[8px] text-center text-slate-500">Teacher Digital Suite</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. STORIES OF PROGRESS (Interactive Accordions + 70% Stat Visual)
      ========================================================================= */}
      <section id="stories" className="py-20 bg-slate-50/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-left mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                STORIES OF PROGRESS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight">
              When a school stops managing chaos and starts leading
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Accordion List */}
            <div className="lg:col-span-7 space-y-3">
              {[
                {
                  title: "What happens when a school stops managing chaos and starts leading?",
                  content:
                    "A single campus replaced scattered registers with one platform, cut administrative follow-ups, and gave teachers time back for the classroom.",
                  link: "Read the success story",
                },
                {
                  title: "One platform. Many schools. Zero compromise.",
                  content:
                    "Multi-branch institutes unified admissions, curriculum calendars, and financial ledger consolidation into a single high-security tenant infrastructure.",
                  link: "Explore multi-branch rollout",
                },
                {
                  title: "One vision. Several campuses. One connected ecosystem.",
                  content:
                    "Real-time attendance syncing, biometric facial scanners, and automated Razorpay fee clearance transformed parent trust and school cashflow.",
                  link: "See campus ecosystem",
                },
                {
                  title: "Discipline. Data. Digital trust.",
                  content:
                    "Automated academic report cards, instant WhatsApp circulars, and dispute-free fee receipts elevated CBSE and state board accreditation marks.",
                  link: "Read case study",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setOpenAccordion(openAccordion === idx ? -1 : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{item.title}</span>
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 font-black text-sm">
                      {openAccordion === idx ? "−" : "+"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {openAccordion === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          <p className="mb-3">{item.content}</p>
                          <button
                            onClick={() => setIsDemoModalOpen(true)}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{item.link}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Right Photo with 70% Stat Overlay */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/60 aspect-[4/3] bg-slate-200">
                <Image
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1000&q=80"
                  alt="Educators Leading"
                  fill
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              </div>

              {/* Floating Stat Badge */}
              <div className="absolute -bottom-6 -left-4 sm:left-6 z-10 bg-white/95 backdrop-blur-xl border border-slate-200 p-5 rounded-2xl shadow-xl max-w-xs">
                <div className="text-3xl font-black text-blue-600 mb-0.5">70%</div>
                <div className="text-xs font-bold text-slate-800 leading-snug">
                  Less admin work after a school moves to one platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. WHY SCHOOLS CHOOSE THIS OPERATING SYSTEM
      ========================================================================= */}
      <section id="why-us" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-left mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                WHY BRIGHT STUDY
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-2">
              Why schools choose this operating system
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Built so campuses can go paperless, keep every report a click away, and run the day without waiting on an engineer.
            </p>
          </div>

          {/* Pill Selector */}
          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-100 pb-4">
            {[
              "User-friendly interface",
              "Security and backup",
              "Support that stays",
              "Anywhere access",
              "Clean data migration",
              "Faster communication",
              "Paperless reporting",
            ].map((label, idx) => (
              <button
                key={idx}
                onClick={() => setActiveWhyTab(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeWhyTab === idx
                    ? "bg-[#0B2545] text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Deep-dive Detail Card for selected pill */}
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {[
                  "User-friendly interface",
                  "Security and backup",
                  "Support that stays",
                  "Anywhere access",
                  "Clean data migration",
                  "Faster communication",
                  "Paperless reporting",
                ][activeWhyTab]}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {[
                  "Office teams can start with the work they already know. The screens follow daily school tasks, not specialist IT training.",
                  "Daily automatic cloud snapshots, encrypted databases, and instantaneous rollback mechanisms protect student records forever.",
                  "Dedicated relationship managers, live WhatsApp agent desk, and video walkthrough support ensure zero campus disruption.",
                  "Responsive cloud architecture allows principals, teachers, and accountants to authorize actions safely from any phone, laptop, or tablet.",
                  "Zero data loss import tools for legacy Excel registers, student lists, historical fee balances, and exam catalogs.",
                  "Instant WhatsApp and SMS delivery for attendance alerts, fee receipts, bus delay notices, and emergency school closures.",
                  "Generate 100% digital CBSE compliant report cards, transfer certificates, fee receipts, and journal cashbooks without printer dependencies.",
                ][activeWhyTab]}
              </p>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Connect with us</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="w-full md:w-auto shrink-0">
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Schedule Walkthrough
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          11. ENTERPRISE-GRADE SECURITY SECTION
      ========================================================================= */}
      <section id="security" className="py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-left mb-12">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-0.5 bg-[#FF4757] rounded-full" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF4757]">
                ENTERPRISE-GRADE SECURITY
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-2">
              School data protected to a serious standard
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Encryption, backups, roles, and multi-factor access — so leadership can move fast without losing control of records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 01 Encrypted data store */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-4">
                01
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Encrypted data store</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sensitive student and fee information stays protected in transit and at rest.
              </p>
            </div>

            {/* 02 Backup and restore */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-4">
                02
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Backup and restore</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated backups with a path to restore when something goes wrong.
              </p>
            </div>

            {/* 03 Role-based permissions */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs mb-4">
                03
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Role-based permissions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Staff see only what their role should see, with an audit trail behind it.
              </p>
            </div>

            {/* 04 Multi-factor access */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs mb-4">
                04
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Multi-factor access</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                An extra sign-in step for the people who hold the keys to school data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. TESTIMONIALS SECTION
      ========================================================================= */}
      <section className="py-20 bg-white relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-black uppercase tracking-wider mb-4">
            TESTIMONIALS
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight mb-8">
            We go the extra miles together
          </h2>

          <div className="p-8 sm:p-12 rounded-3xl bg-slate-50 border border-slate-200 relative shadow-sm">
            <p className="text-base sm:text-xl font-medium text-slate-700 italic leading-relaxed mb-6">
              “Once the major modules were live, our office stopped running after paper files. Attendance, fees, and admissions finally sat in one place.”
            </p>
            <div className="text-sm font-black text-[#0B2545]">School Principal</div>
            <div className="text-xs text-slate-500 font-semibold">
              CBSE Senior Secondary School
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          13. SEE BRIGHT STUDY IN ACTION / DEMO FORM (Split Card)
      ========================================================================= */}
      <section id="demo" className="py-20 bg-gradient-to-b from-sky-50/50 to-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Card: Dark Blue Gradient */}
            <div className="lg:col-span-6 rounded-3xl bg-[#0B2545] text-white p-8 sm:p-12 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-0.5 bg-amber-400 rounded-full" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    SEE BRIGHT STUDY IN ACTION
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
                  Ready to build a future-ready school?
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-8">
                  Connected systems, AI insights, and automation that give hours back to teaching and leadership.
                </p>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {[
                    "Schools",
                    "Students",
                    "Parents",
                    "Teachers",
                    "Admin",
                    "Attendance",
                    "Registration",
                    "LMS",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold border border-white/10"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Register for Demo
                </button>
                <a
                  href="tel:+918860080313"
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors"
                >
                  Contact sales
                </a>
              </div>
            </div>

            {/* Right Card: Clean White Request Form */}
            <div className="lg:col-span-6 rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#0B2545] mb-1">
                  Get Bright Study for your school
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  Share a few details and we’ll set up a walkthrough for your campus.
                </p>

                {isSubmitted ? (
                  <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Walkthrough Scheduled!
                    </div>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Thank you, {formState.name}. Our senior education deployment advisor will contact you on {formState.phone} within 2 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        placeholder="e.g. Dr. Rajesh Sharma"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Official Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          placeholder="principal@school.edu"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mobile / WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formState.phone}
                          onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          School / Institution Name
                        </label>
                        <input
                          type="text"
                          value={formState.schoolName}
                          onChange={(e) => setFormState({ ...formState, schoolName: e.target.value })}
                          placeholder="Delhi Public Academy"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Your Role / Designation
                        </label>
                        <select
                          value={formState.role}
                          onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 bg-white"
                        >
                          <option value="Principal">School Principal</option>
                          <option value="Director">Director / Trustee</option>
                          <option value="Admin">Administrator / Manager</option>
                          <option value="IT">IT Head / Incharge</option>
                          <option value="Teacher">Senior Faculty</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer mt-2"
                    >
                      Submit &amp; Schedule Walkthrough
                    </button>
                  </form>
                )}
              </div>

              <div className="text-[11px] text-slate-400 mt-4 text-center">
                Connected school systems that help teams teach, operate, and grow with clarity.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          14. FOOTER (Multi-column with Karol Bagh Address & Real Contact Info)
      ========================================================================= */}
      <footer className="w-full bg-[#0B2545] text-white pt-16 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-700/60">
            {/* Column 1: Brand & Contact Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">
                  Bright<span className="text-blue-400">study</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                Next-generation cloud school ERP and LMS platform. Connecting teachers, students, parents, and administrative leaders across India.
              </p>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2">
                <div className="font-semibold text-white">Bright Study</div>
                <div>Karol Bagh, New Delhi, India</div>
                <div>
                  Phone:{" "}
                  <a href="tel:+918860080313" className="text-blue-400 hover:underline">
                    +91 8860080313
                  </a>
                </div>
                <div>
                  Email:{" "}
                  <a href="mailto:hello@brightstudy.in" className="text-blue-400 hover:underline">
                    hello@brightstudy.in
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Register for Demo
                </button>
              </div>
            </div>

            {/* Column 2: Platforms */}
            <div>
              <div className="text-sm font-black text-white uppercase tracking-wider mb-4">
                Platforms
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li>
                  <Link href="#offerings" className="hover:text-white transition-colors">
                    ERP
                  </Link>
                </li>
                <li>
                  <Link href="#suite" className="hover:text-white transition-colors">
                    LMS
                  </Link>
                </li>
                <li>
                  <Link href="#offerings" className="hover:text-white transition-colors">
                    Website
                  </Link>
                </li>
                <li>
                  <Link href="#why-faster" className="hover:text-white transition-colors">
                    AI
                  </Link>
                </li>
                <li>
                  <Link href="#why-faster" className="hover:text-white transition-colors">
                    AI Analytics Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="#mobile-app" className="hover:text-white transition-colors">
                    Mobile Application
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: School Optimisation */}
            <div>
              <div className="text-sm font-black text-white uppercase tracking-wider mb-4">
                School Optimisation
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li>
                  <Link href="#suite" className="hover:text-white transition-colors">
                    Administration
                  </Link>
                </li>
                <li>
                  <Link href="#offerings" className="hover:text-white transition-colors">
                    Finance
                  </Link>
                </li>
                <li>
                  <Link href="#offerings" className="hover:text-white transition-colors">
                    Learning
                  </Link>
                </li>
                <li>
                  <Link href="#suite" className="hover:text-white transition-colors">
                    Academics
                  </Link>
                </li>
                <li>
                  <Link href="#why-faster" className="hover:text-white transition-colors">
                    Intelligence
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Insights */}
            <div>
              <div className="text-sm font-black text-white uppercase tracking-wider mb-4">
                Insights
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li>
                  <Link href="#stories" className="hover:text-white transition-colors">
                    Coverage
                  </Link>
                </li>
                <li>
                  <Link href="#stories" className="hover:text-white transition-colors">
                    Video
                  </Link>
                </li>
                <li>
                  <Link href="#stories" className="hover:text-white transition-colors">
                    Ed Talks
                  </Link>
                </li>
                <li>
                  <Link href="#stories" className="hover:text-white transition-colors">
                    Blogs
                  </Link>
                </li>
                <li>
                  <Link href="#security" className="hover:text-white transition-colors">
                    Newsletter
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>© Copyright 2026 Brightstudy. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-slate-200">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-slate-200">
                Terms of Service
              </Link>
              <Link href="/security" className="hover:text-slate-200">
                Security &amp; Compliance
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          15. INTERACTIVE REGISTER FOR DEMO MODAL
      ========================================================================= */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDemoModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100"
            >
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                  LIVE CAMPUS WALKTHROUGH
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#0B2545] mb-1">
                Schedule a Guided Demo
              </h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">
                Experience the school ERP, mobile app, and automated fee collections customized for your institution.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsDemoModalOpen(false);
                  try {
                    confetti({ particleCount: 70, spread: 60 });
                  } catch {}
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="principal@school.edu"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 8860080313"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bright Study Global School"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-600 outline-none text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider shadow-md transition-colors cursor-pointer mt-2"
                >
                  Confirm Walkthrough
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
