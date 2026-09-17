"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  UserCheck,
  BookOpen,
  IndianRupee,
  CalendarCheck,
  CreditCard,
  UserPlus,
  ClipboardCheck,
  FileText,
  Megaphone,
  UploadCloud,
  BarChart3,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Trophy,
  ArrowUpRight,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  Sun,
  Smile,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlement } from "@/context/EntitlementContext";
import { useAdminDashboardAnalytics } from "@/hooks/useAdminDashboardAnalytics";
import { PageSkeleton } from "@/components/common/skeletons";
import type { School } from "@/types";

interface ModernSchoolAdminDashboardProps {
  school: School | null;
  counts: {
    teachers: number;
    students: number;
    classes: number;
    academicYears: number;
  };
}

export function ModernSchoolAdminDashboard({
  school,
  counts,
}: ModernSchoolAdminDashboardProps) {
  const { profile } = useAuth();
  const { entitlement } = useEntitlement();
  const schoolId = school?.id || profile?.schoolId || "";
  const analytics = useAdminDashboardAnalytics(schoolId);

  const adminName = profile?.name || profile?.email?.split("@")[0] || "Administrator";
  const schoolName = school?.name || "School Portal";

  // Dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }, []);

  // Today formatted
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }, []);

  // Dynamic, genuinely actionable administrative tasks based on real database state
  const derivedTasks = useMemo(() => {
    const list: Array<{ id: string; text: string; count?: number; done: boolean; href?: string }> = [];

    const isSetupIncomplete = !school?.setupCompleted && !school?.onboardingCompleted;
    if (isSetupIncomplete) {
      list.push({ id: "setup", text: "Complete School Initial Setup Wizard", done: false, href: "/admin/setup" });
    }
    if (analytics.attendancePercentage === null && counts.students > 0) {
      list.push({ id: "attendance", text: "Take today's student attendance", count: counts.classes || undefined, done: false, href: "/admin/attendance" });
    }
    if (analytics.defaultersCount > 0) {
      list.push({ id: "defaulters", text: "Follow up with fee defaulters", count: analytics.defaultersCount, done: false, href: "/admin/fees/defaulters" });
    }
    if (counts.classes === 0) {
      list.push({ id: "classes", text: "Create academic classes & sections", done: false, href: "/admin/classes" });
    }
    if (counts.teachers === 0) {
      list.push({ id: "teachers", text: "Add faculty and assign subjects", done: false, href: "/admin/teachers" });
    }
    if (analytics.latestNotices.length === 0) {
      list.push({ id: "notices", text: "Publish latest circular or announcement", done: false, href: "/admin/notices" });
    }

    return list;
  }, [school, counts, analytics.attendancePercentage, analytics.defaultersCount, analytics.latestNotices.length]);

  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTask = (id: string) => {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (analytics.isLoading && !school) {
    return <PageSkeleton hasStats={true} hasTable={true} className="py-4" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-900 dark:text-slate-100">

      {/* ==========================================
          2. HERO WELCOME BANNER (With Campus Illustration)
      ========================================== */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-100/90 via-sky-100/70 to-indigo-50/60 dark:from-blue-950/40 dark:via-slate-900/60 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/50 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        {/* Left Welcome Copy */}
        <div className="space-y-4 z-10 max-w-xl text-left">
          <div>
            <span className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-300">
              {greeting}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {adminName} <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Here&rsquo;s what&rsquo;s happening at <strong className="text-slate-800 dark:text-slate-200">{schoolName}</strong> today.
            </p>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>{entitlement?.plan?.name || (school?.planId ? school.planId.replace("plan_", "").toUpperCase() + " PLAN" : "STARTER PLAN")}</span>
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{todayFormatted}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{school?.code ? `Code: ${school.code}` : `Session: ${(school as any)?.activeAcademicYear || "2026-27"}`}</span>
            </div>
          </div>
        </div>

        {/* Right Campus Illustration Art */}
        <div className="relative z-10 flex flex-col items-center md:items-end">
          {/* SVG School Art */}
          <div className="w-72 sm:w-96 h-36 relative">
            <svg
              viewBox="0 0 400 160"
              className="w-full h-full drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ground & Lawn */}
              <ellipse cx="200" cy="155" rx="190" ry="12" fill="#86EFAC" fillOpacity="0.7" />
              <rect x="20" y="148" width="360" height="8" rx="4" fill="#22C55E" fillOpacity="0.4" />
              
              {/* Trees Left */}
              <circle cx="50" cy="120" r="24" fill="#16A34A" />
              <circle cx="75" cy="115" r="28" fill="#22C55E" />
              <rect x="60" y="135" width="8" height="18" fill="#78350F" rx="2" />
              
              {/* Trees Right */}
              <circle cx="345" cy="120" r="24" fill="#16A34A" />
              <circle cx="320" cy="115" r="28" fill="#22C55E" />
              <rect x="330" y="135" width="8" height="18" fill="#78350F" rx="2" />

              {/* Main School Building Base */}
              <rect x="110" y="65" width="180" height="85" fill="#FED7AA" stroke="#F97316" strokeWidth="1.5" rx="4" />
              
              {/* Left Wing */}
              <rect x="115" y="75" width="70" height="75" fill="#FDBA74" />
              <line x1="115" y1="75" x2="185" y2="75" stroke="#EA580C" strokeWidth="2" />
              {/* Windows Left Wing */}
              <rect x="125" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="145" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="165" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="125" y="110" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="145" y="110" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="165" y="110" width="12" height="16" rx="1" fill="#60A5FA" />

              {/* Right Wing */}
              <rect x="215" y="75" width="70" height="75" fill="#FDBA74" />
              <line x1="215" y1="75" x2="285" y2="75" stroke="#EA580C" strokeWidth="2" />
              {/* Windows Right Wing */}
              <rect x="225" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="245" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="265" y="85" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="225" y="110" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="245" y="110" width="12" height="16" rx="1" fill="#60A5FA" />
              <rect x="265" y="110" width="12" height="16" rx="1" fill="#60A5FA" />

              {/* Center Tower / Entrance */}
              <rect x="180" y="45" width="40" height="105" fill="#EA580C" rx="2" />
              {/* Triangle Roof */}
              <polygon points="175,45 200,20 225,45" fill="#C2410C" />
              {/* Clock */}
              <circle cx="200" cy="38" r="7" fill="#FFFFFF" stroke="#9A3412" strokeWidth="1.5" />
              <line x1="200" y1="38" x2="200" y2="34" stroke="#000" strokeWidth="1" />
              <line x1="200" y1="38" x2="203" y2="38" stroke="#000" strokeWidth="1" />
              {/* Flagpole */}
              <line x1="200" y1="20" x2="200" y2="8" stroke="#71717A" strokeWidth="1.5" />
              <polygon points="200,8 212,12 200,16" fill="#EF4444" />
              {/* Main Entrance Door */}
              <path d="M192,150 A8,8 0 0,1 208,150 L208,150 L192,150 Z" fill="#78350F" />
              <rect x="193" y="130" width="14" height="20" fill="#78350F" rx="1" />
            </svg>
          </div>

          {/* Script Quote */}
          <p className="text-xs sm:text-sm font-serif italic font-bold text-blue-700 dark:text-blue-300 mt-1 tracking-wide">
            &ldquo;Better Education Brighter Futures&rdquo;
          </p>
        </div>
      </div>

      {/* ==========================================
          3. SIX MAIN STAT CARDS
      ========================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Students */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Students
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {counts.students.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {analytics.growthRatePercent !== null ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                {analytics.growthRatePercent >= 0 ? `↑ ${analytics.growthRatePercent}%` : `↓ ${Math.abs(analytics.growthRatePercent)}%`}
                <span className="text-slate-400 font-normal text-[10px] ml-1">vs last month</span>
              </span>
            ) : (
              <span className="text-slate-400 font-normal text-[10px]">Total enrolled learners</span>
            )}
          </div>
        </div>

        {/* Card 2: Teachers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Teachers
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {counts.teachers.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-slate-400 font-normal text-[10px]">Active faculty members</span>
          </div>
        </div>

        {/* Card 3: Classes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Classes
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {counts.classes.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-slate-400 font-normal text-[10px]">Grades & sections</span>
          </div>
        </div>

        {/* Card 4: Fee Collection */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fee Collection
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {analytics.thisMonthCollectionPaise > 0
              ? `₹${(analytics.thisMonthCollectionPaise / 100).toLocaleString("en-IN")}`
              : "₹0"}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-slate-400 font-normal text-[10px]">
              {analytics.totalCollectedPaise > 0
                ? `₹${(analytics.totalCollectedPaise / 100).toLocaleString("en-IN")} all-time`
                : "No collections yet"}
            </span>
          </div>
        </div>

        {/* Card 5: Attendance */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Attendance
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {analytics.attendancePercentage !== null ? `${analytics.attendancePercentage}%` : "--"}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-slate-400 font-normal text-[10px]">
              {analytics.attendancePercentage !== null
                ? `${analytics.attendancePresentCount}/${analytics.attendanceTotalCount} present today`
                : "No attendance marked today"}
            </span>
          </div>
        </div>

        {/* Card 6: Pending Fees */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Fees
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {analytics.totalPendingPaise > 0
              ? `₹${(analytics.totalPendingPaise / 100).toLocaleString("en-IN")}`
              : "₹0"}
          </p>
          <div className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <span>
              {analytics.defaultersCount > 0 ? `${analytics.defaultersCount} students with dues` : "No pending dues"}
            </span>
          </div>
        </div>
      </div>

      {/* ==========================================
          4. MIDDLE SECTION (Charts, Quick Actions, Schedule, Tasks)
      ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Columns: Growth Chart, Fee Chart, Quick Actions */}
        <div className="lg:col-span-8 space-y-6">
          {/* Charts Row: Student Growth & Fee Collection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Growth Chart */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Student Growth
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                    {analytics.growthRatePercent !== null
                      ? `${analytics.growthRatePercent >= 0 ? "↗ +" : "↘ "}${analytics.growthRatePercent}% vs last month`
                      : "Live Record"}
                  </span>
                </div>
              </div>

              {/* Bar Chart Visualization / Honest Empty State */}
              {analytics.studentGrowth.length > 0 && analytics.studentGrowth.some((b) => b.count > 0) ? (
                <div className="h-44 pt-4 flex items-end justify-between gap-3 px-2">
                  {analytics.studentGrowth.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bar.count}
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 flex items-end overflow-hidden">
                        <div
                          style={{ height: bar.heightPercent }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            idx === analytics.studentGrowth.length - 1
                              ? "bg-gradient-to-t from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20"
                              : "bg-gradient-to-t from-blue-400/80 to-blue-500/70"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No enrollment history yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    As students are enrolled, monthly enrollment trends will render here.
                  </p>
                </div>
              )}
            </div>

            {/* Fee Collection Trend Chart */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Fee Collection
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    {analytics.totalCollectedPaise > 0 ? "Live Financial Ledger" : "No Collections Yet"}
                  </span>
                </div>
              </div>

              {/* Area Line Chart Visualization / Honest Empty State */}
              {analytics.feeMonthlyTrend.length > 0 && analytics.feeMonthlyTrend.some((f) => f.amountRupees > 0) ? (
                <div className="h-44 pt-4 flex flex-col justify-end relative">
                  {/* Highlight Pill */}
                  <div className="absolute top-1 right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-black shadow-xs">
                    {`₹${(analytics.thisMonthCollectionPaise / 100).toLocaleString("en-IN")}`}
                  </div>

                  <div className="h-32 flex items-end justify-between gap-3 px-2">
                    {analytics.feeMonthlyTrend.map((item, idx) => {
                      const maxVal = Math.max(...analytics.feeMonthlyTrend.map((m) => m.amountRupees), 1);
                      const barH = `${Math.max(10, Math.round((item.amountRupees / maxVal) * 85))}%`;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                          <span className="text-[10px] font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            ₹{item.amountRupees.toLocaleString("en-IN")}
                          </span>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-24 flex items-end overflow-hidden">
                            <div
                              style={{ height: barH }}
                              className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-500 transition-all duration-500"
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                  <CreditCard className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No fee collections recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Collect fees via Fee Management to view monthly revenue trends.
                  </p>
                  <Link
                    href="/admin/fees/collect"
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Go to Fee Collection
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Grid (9 Actions matching screenshot) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Quick Actions
              </h3>
              <button
                type="button"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Action 1: Add Student */}
              <Link
                href="/admin/students"
                className="p-3 sm:p-4 rounded-2xl bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/80 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                  Add Student
                </span>
              </Link>

              {/* Action 2: Add Teacher */}
              <Link
                href="/admin/teachers"
                className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                  Add Teacher
                </span>
              </Link>

              {/* Action 3: Create Class */}
              <Link
                href="/admin/classes"
                className="p-3 sm:p-4 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200/60 dark:border-purple-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/80 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-purple-950 dark:text-purple-100">
                  Create Class
                </span>
              </Link>

              {/* Action 4: Take Attendance */}
              <Link
                href="/admin/attendance"
                className="p-3 sm:p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/80 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  Take Attendance
                </span>
              </Link>

              {/* Action 5: Collect Fees */}
              <Link
                href="/admin/fees/collect"
                className="p-3 sm:p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-rose-950 dark:text-rose-100">
                  Collect Fees
                </span>
              </Link>

              {/* Action 6: Create Exam */}
              <Link
                href="/admin/timetable"
                className="p-3 sm:p-4 rounded-2xl bg-cyan-50/70 hover:bg-cyan-100/80 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 border border-cyan-200/60 dark:border-cyan-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/80 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-cyan-950 dark:text-cyan-100">
                  Create Exam
                </span>
              </Link>

              {/* Action 7: Send Notice */}
              <Link
                href="/admin/notices"
                className="p-3 sm:p-4 rounded-2xl bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200/60 dark:border-red-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/80 text-red-600 dark:text-red-300 flex items-center justify-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-red-950 dark:text-red-100">
                  Send Notice
                </span>
              </Link>

              {/* Action 8: Upload Material */}
              <Link
                href="/teacher/study"
                className="p-3 sm:p-4 rounded-2xl bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200/60 dark:border-sky-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/80 text-sky-600 dark:text-sky-300 flex items-center justify-center">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-sky-950 dark:text-sky-100">
                  Upload Material
                </span>
              </Link>

              {/* Action 9: Generate Report */}
              <Link
                href="/admin/reports"
                className="p-3 sm:p-4 rounded-2xl bg-teal-50/70 hover:bg-teal-100/80 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 border border-teal-200/60 dark:border-teal-900/60 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/80 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-teal-950 dark:text-teal-100">
                  Generate Report
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Today's Schedule, Pending Tasks, Latest Notices, Motivational Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Today's Schedule */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Today&rsquo;s Schedule
              </h3>
              <Link
                href="/admin/timetable"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </Link>
            </div>

            {analytics.todayBells.length > 0 ? (
              <div className="space-y-3">
                {analytics.todayBells.map((sch, i) => (
                  <div key={sch.id || i} className="flex items-center gap-3 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-mono font-bold text-slate-500 w-12 shrink-0">
                      {sch.startTime || "Period"}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sch.subject || sch.bellName || `Period ${sch.bellNumber || i + 1}`}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {sch.className ? `Class ${sch.className}` : ""}{sch.room ? ` • Room ${sch.room}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <Clock className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No periods scheduled today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Configure timetable bells for this weekday.</p>
                <Link
                  href="/admin/timetable"
                  className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Manage Timetable
                </Link>
              </div>
            )}
          </div>

          {/* Pending Tasks */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Pending Tasks
              </h3>
              <span className="text-[11px] text-slate-400">
                {derivedTasks.filter((t) => !completedTaskIds[t.id]).length} pending
              </span>
            </div>

            {derivedTasks.length > 0 ? (
              <div className="space-y-2.5">
                {derivedTasks.map((task) => {
                  const isDone = Boolean(completedTaskIds[task.id]);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className="flex items-center justify-between gap-3 text-xs cursor-pointer select-none group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isDone ? (
                          <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                        )}
                        <span
                          className={`font-semibold truncate ${
                            isDone ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.count && !isDone && (
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {task.count}
                          </span>
                        )}
                        {task.href && !isDone && (
                          <Link
                            href={task.href}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Open →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No administrative tasks pending right now.</p>
              </div>
            )}
          </div>

          {/* Latest Notices */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Latest Notices
              </h3>
              <Link
                href="/admin/notices"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </Link>
            </div>

            {analytics.latestNotices.length > 0 ? (
              <div className="space-y-3">
                {analytics.latestNotices.map((notice, idx) => (
                  <div key={notice.id || idx} className="flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {notice.title}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {notice.date ? `Published ${notice.date}` : "Active circular"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <Megaphone className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No notices published yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Keep parents, students and faculty informed.</p>
                <Link
                  href="/admin/notices"
                  className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create Notice
                </Link>
              </div>
            )}
          </div>

          {/* Motivational Trophy Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Great Schools Build Great Futures!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Keep up the amazing work.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          5. LOWER THREE TABLES (Recent Students, Recent Teachers, Fee Defaulters)
      ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table 1: Recent Students */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Recent Students
            </h3>
            <Link
              href="/admin/students"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>

          {analytics.recentStudents.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentStudents.map((stu) => (
                <div key={stu.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {stu.initial}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {stu.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{stu.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">{stu.date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Users className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No students enrolled yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Admit students through Student Admissions.</p>
              <Link
                href="/admin/students"
                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Enroll Student
              </Link>
            </div>
          )}
        </div>

        {/* Table 2: Recent Teachers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Recent Teachers
            </h3>
            <Link
              href="/admin/teachers"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>

          {analytics.recentTeachers.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentTeachers.map((tch) => (
                <div key={tch.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {tch.initial}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {tch.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{tch.subject}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{tch.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <UserCheck className="h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No faculty added yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Register teachers to assign classes.</p>
              <Link
                href="/admin/teachers"
                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add Teacher
              </Link>
            </div>
          )}
        </div>

        {/* Table 3: Fee Defaulters */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Fee Defaulters
            </h3>
            <Link
              href="/admin/fees/defaulters"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </Link>
          </div>

          {analytics.feeDefaulters.length > 0 ? (
            <div className="space-y-3">
              {analytics.feeDefaulters.map((def) => (
                <div key={def.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {def.initial}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {def.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{def.class}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-rose-600 dark:text-rose-400">
                      ₹{def.pendingRupees.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[9px] text-slate-400">Pending Dues</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No fee defaulters</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All student fee assignments are fully paid.</p>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          6. BOTTOM SUMMARY METRICS BAR
      ========================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-around gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span>
            <strong className="text-slate-900 dark:text-white">
              {counts.students.toLocaleString()}
            </strong>{" "}
            Total Students
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-emerald-500" />
          <span>
            <strong className="text-slate-900 dark:text-white">
              {counts.teachers.toLocaleString()}
            </strong>{" "}
            Total Teachers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-500" />
          <span>
            <strong className="text-slate-900 dark:text-white">
              {counts.classes.toLocaleString()}
            </strong>{" "}
            Classes & Sections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-500" />
          <span>
            Session: <strong className="text-slate-900 dark:text-white">{(school as any)?.activeAcademicYear || "2026-27"}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>
            Plan: <strong className="text-slate-900 dark:text-white">{entitlement?.plan?.name || "Starter Plan"}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
