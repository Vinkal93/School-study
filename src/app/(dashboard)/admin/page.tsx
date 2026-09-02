"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { PageSkeleton } from "@/components/common/skeletons";
import {
  Users,
  GraduationCap,
  BookOpen,
  Bell,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  CheckCircle2,
  Building2,
  Settings,
} from "lucide-react";
import { getSchoolById } from "@/lib/services/school.service";
import { getSchoolSetupData } from "@/lib/services/setup.service";
import type { School } from "@/types";

import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function SchoolAdminPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const isAllowed = profile?.role === "super_admin" || canAccess("school_dashboard");

  // 1. Cached School Profile Query (30s staleTime, 5min cacheTime)
  const { data: school, isLoading: isSchoolLoading } = useAppQuery<School | null>(
    schoolId && isAllowed ? `schoolProfile:${schoolId}` : null,
    () => getSchoolById(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 60_000 }
  );

  // 2. Cached Setup & Metric Counts Query
  const { data: setupData, isLoading: isSetupLoading } = useAppQuery(
    schoolId && isAllowed ? `schoolSetupData:${schoolId}` : null,
    () => getSchoolSetupData(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 30_000 }
  );

  const counts = {
    teachers: setupData?.teachers?.length || 0,
    students: setupData?.students?.length || 0,
    classes: setupData?.classes?.length || 0,
    academicYears: setupData?.academicYears?.length || 0,
  };

  const isLoading = (isSchoolLoading || isSetupLoading) && !school && !setupData;

  if (isLoading) {
    return <PageSkeleton hasStats={true} hasTable={false} className="py-4" />;
  }

  const isSetupIncomplete = !school?.setupCompleted;

  return (
    <EntitlementGate
      feature="school_dashboard"
      title="School Admin Dashboard"
      description="Real-time school metrics, faculty counts, student enrollments, and operational status."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>{school?.name || "School Portal"} ({school?.code || "—"})</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            School Administration
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.name}! Manage your faculty, students, classes, and notices.
          </p>
        </div>

        <Link
          href="/admin/setup"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <Settings className="h-4 w-4" />
          School Setup Wizard
        </Link>
      </div>

      {/* Onboarding Banner if setup is not marked completed */}
      {isSetupIncomplete && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-900/40 dark:from-blue-950/40 dark:to-indigo-950/40 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5" />
                Action Recommended
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Complete Your School Initial Setup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
                Configure your active Academic Session, Grade Classes, Section divisions, and add teachers/students to unlock all features.
              </p>
            </div>
            <Link
              href="/admin/setup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 whitespace-nowrap"
            >
              Start Setup Wizard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Classes"
          value={counts.classes.toString()}
          icon={<BookOpen className="h-6 w-6" />}
          color="purple"
          subtext="Grades & Sections"
        />
        <StatCard
          title="Total Teachers"
          value={counts.teachers.toString()}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          subtext="Faculty Members"
        />
        <StatCard
          title="Enrolled Students"
          value={counts.students.toString()}
          icon={<GraduationCap className="h-6 w-6" />}
          color="green"
          subtext="Total Students"
        />
        <StatCard
          title="Academic Sessions"
          value={counts.academicYears.toString()}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="orange"
          subtext="Active Calendar"
        />
      </div>

      {/* Quick Access Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ModuleCard
          title="Classes & Sections"
          desc="Manage grades, class divisions, subjects, and timetables."
          icon={<BookOpen className="h-5 w-5 text-purple-600" />}
          href="/admin/classes"
        />
        <ModuleCard
          title="Faculty / Teachers"
          desc="Add teachers, assign subjects, and manage staff accounts."
          icon={<Users className="h-5 w-5 text-blue-600" />}
          href="/admin/teachers"
        />
        <ModuleCard
          title="Student Admissions"
          desc="Enroll students, assign roll numbers, and organize class rosters."
          icon={<GraduationCap className="h-5 w-5 text-green-600" />}
          href="/admin/students"
        />
        <ModuleCard
          title="Attendance Management"
          desc="Monitor daily student and teacher attendance records."
          icon={<ClipboardCheck className="h-5 w-5 text-orange-600" />}
          href="/admin/attendance"
        />
        <ModuleCard
          title="Notices & Announcements"
          desc="Publish school circulars, exam schedules, and holiday notices."
          icon={<Bell className="h-5 w-5 text-red-600" />}
          href="/admin/notices"
        />
        <ModuleCard
          title="School Settings"
          desc="Review academic sessions, school information, and system preferences."
          icon={<Settings className="h-5 w-5 text-gray-600" />}
          href="/admin/setup"
        />
      </div>
    </div>
  </EntitlementGate>
);
}

function StatCard({
  title,
  value,
  subtext,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  desc,
  icon,
  href,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-500 hover:shadow-md transition-all dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between"
    >
      <div className="space-y-2">
        <div className="inline-flex rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{desc}</p>
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mt-4">
        <span>Manage</span>
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
