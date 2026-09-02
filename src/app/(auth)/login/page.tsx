"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  School,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

function PortalSelectionContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const portals = [
    {
      id: "admin",
      title: "School Admin",
      subtitle: "Manage school operations, teachers & student admissions",
      href: `/admin/login${queryString}`,
      icon: <School className="h-7 w-7 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      borderHover: "hover:border-blue-300 dark:hover:border-blue-700",
      badge: "Administration",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      buttonText: "Sign in as Admin",
      buttonColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
    },
    {
      id: "teacher",
      title: "Teacher",
      subtitle: "Access your assigned classes, rosters & mark roll call",
      href: `/teacher/login${queryString}`,
      icon: <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />,
      iconBg: "bg-purple-50 dark:bg-purple-950/50",
      borderHover: "hover:border-purple-300 dark:hover:border-purple-700",
      badge: "Faculty & Staff",
      badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
      buttonText: "Sign in as Teacher",
      buttonColor: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20",
    },
    {
      id: "student",
      title: "Student & Parent",
      subtitle: "View your real-time attendance rate, timetables & notices",
      href: `/student/login${queryString}`,
      icon: <GraduationCap className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      borderHover: "hover:border-emerald-300 dark:hover:border-emerald-700",
      badge: "Student Portal",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      buttonText: "Sign in as Student",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/40 via-white to-gray-50 dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950 px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>

        <ThemeToggle />
      </header>

      {/* Main Portal Selection Container */}
      <main className="max-w-5xl w-full mx-auto my-auto py-10 text-center space-y-10">
        {/* Welcome Headline */}
        <div className="space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Multi-Portal Authentication</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Welcome Back
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Choose your dedicated portal to sign in to your dashboard.
          </p>
        </div>

        {/* 3 Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
          {portals.map((portal) => (
            <Link
              key={portal.id}
              href={portal.href}
              className={`group relative rounded-3xl border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 sm:p-8 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between ${portal.borderHover}`}
            >
              <div className="space-y-5">
                {/* Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`h-14 w-14 rounded-2xl ${portal.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    {portal.icon}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${portal.badgeColor}`}
                  >
                    {portal.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {portal.subtitle}
                  </p>
                </div>
              </div>

              {/* Action Button Link */}
              <div className="pt-8">
                <div
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all group-hover:shadow-lg ${portal.buttonColor}`}
                >
                  <span>{portal.buttonText}</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Register Option */}
        <div className="pt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Don&apos;t have a school registered yet?{" "}
            <Link
              href={`/register${queryString}`}
              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline underline-offset-4"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register New School</span>
            </Link>
          </p>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center text-xs text-gray-400 dark:text-gray-600 py-4">
        <p>© 2026 School Study. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function PortalSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PortalSelectionContent />
    </Suspense>
  );
}
