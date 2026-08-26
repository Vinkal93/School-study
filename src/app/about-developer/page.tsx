"use client";

import Link from "next/link";
import { GraduationCap, ArrowLeft, Shield, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import {
  DeveloperHero,
  DeveloperIntro,
  WhySchoolStudy,
  DeveloperPrinciples,
  DeveloperSkills,
  DeveloperProjects,
  DeveloperTeaching,
  DeveloperVision,
  DeveloperProfileCard,
  DeveloperContact,
} from "@/components/developer";
import { Footer } from "@/components/footer";

export default function AboutDeveloperPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      {/* ==========================================
          PAGE HEADER / NAVIGATION
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

          {/* Center Title Badge */}
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200/60 bg-blue-50/70 text-xs font-bold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>About the Developer</span>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ==========================================
          PAGE MAIN CONTENT
      ========================================== */}
      <main className="space-y-4">
        {/* 1. Developer Hero */}
        <DeveloperHero />

        {/* 2. Developer Introduction */}
        <DeveloperIntro />

        {/* 3. Why School Study Was Created */}
        <WhySchoolStudy />

        {/* 4. Product Principles */}
        <DeveloperPrinciples />

        {/* 5. What I Work With */}
        <DeveloperSkills />

        {/* 6. Things I've Built */}
        <DeveloperProjects />

        {/* 7. From Teaching to Technology */}
        <DeveloperTeaching />

        {/* 8. The Bigger Vision */}
        <DeveloperVision />

        {/* 9. Developer Profile Card */}
        <DeveloperProfileCard />

        {/* 10. Need Help / Support */}
        <DeveloperContact />
      </main>

      {/* ==========================================
          MODERN FOOTER
      ========================================== */}
      <Footer />
    </div>
  );
}
