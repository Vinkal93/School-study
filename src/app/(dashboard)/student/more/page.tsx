"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Clock,
  Library as LibraryIcon,
  BellRing,
  Users,
  Wallet,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  FileText,
  Folder,
  Award,
  Calendar,
  Bus,
  FileSpreadsheet,
} from "lucide-react";

export default function StudentMorePage() {
  const { profile } = useAuth();
  const fullName = profile?.name || "Rahul Kumar";
  const firstName = useMemo(() => fullName.trim().split(" ")[0] || "Rahul", [fullName]);

  const academicsGrid = [
    { id: "study", label: "Study", route: "/student/study", icon: BookOpen, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
    { id: "homework", label: "Homework", route: "/student/homework", icon: ClipboardList, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
    { id: "exams", label: "Exams", route: "/student/exams", icon: GraduationCap, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
    { id: "timetable", label: "Time Table", route: "/student/timetable", icon: Clock, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" },
    { id: "library", label: "Library", route: "/student/library", icon: LibraryIcon, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
    { id: "assignments", label: "Assignments", route: "/student/assignments", icon: FileText, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" },
    { id: "documents", label: "Documents", route: "/student/documents", icon: Folder, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" },
    { id: "certificates", label: "Certificates", route: "/student/certificates", icon: Award, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40" },
  ];

  const schoolGrid = [
    { id: "notices", label: "Notices", route: "/student/notices", icon: BellRing, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40" },
    { id: "events", label: "Events", route: "/student/events", icon: Calendar, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" },
    { id: "transport", label: "Transport", route: "/student/transport", icon: Bus, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
    { id: "leave", label: "Leave", route: "/student/leave", icon: FileSpreadsheet, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40" },
  ];

  const accountGrid = [
    { id: "profile", label: "Profile", route: "/student/profile", icon: User, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
    { id: "notifications", label: "Notifications", route: "/student/notifications", icon: BellRing, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40", badge: "3" },
    { id: "settings", label: "Settings", route: "/student/settings", icon: Settings, color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
    { id: "help", label: "Help & Support", route: "/student/help", icon: HelpCircle, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
  ];

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      {/* Student Mini Profile Card (Matching Reference Screen 5) */}
        <Link
          href="/student/profile"
          className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-base border-2 border-white dark:border-slate-800 shrink-0">
              {fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {fullName}
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Class 10 • Section A
              </p>
              <p className="text-[11px] text-slate-400 font-mono">
                Roll No. 24
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </Link>

        {/* Section 1: Academics (4 Cols Grid matching Screen 5) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Academics
          </h2>

          <div className="grid grid-cols-4 gap-2.5">
            {academicsGrid.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    <IconComponent className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 2: School (4 Cols Grid matching Screen 5) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            School
          </h2>

          <div className="grid grid-cols-4 gap-2.5">
            {schoolGrid.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    <IconComponent className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section 3: Account (4 Cols Grid matching Screen 5) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Account
          </h2>

          <div className="grid grid-cols-4 gap-2.5">
            {accountGrid.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  className="relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-2 group active:scale-95"
                >
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    <IconComponent className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
  );
}
