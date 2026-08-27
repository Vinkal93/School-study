"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Download,
  FileText,
  ChevronRight,
  ChevronsRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";

export default function StudentStudyPage() {
  const subjects = [
    {
      id: "math",
      name: "Mathematics",
      teacher: "Mr. Sharma",
      progress: 75,
      color: "emerald",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      textDark: "text-emerald-600 dark:text-emerald-400",
      barBg: "bg-emerald-500",
      chevron: ChevronsRight,
    },
    {
      id: "science",
      name: "Science",
      teacher: "Mrs. Verma",
      progress: 60,
      color: "purple",
      bgLight: "bg-purple-50 dark:bg-purple-950/40",
      textDark: "text-purple-600 dark:text-purple-400",
      barBg: "bg-purple-500",
      chevron: ChevronRight,
    },
    {
      id: "english",
      name: "English",
      teacher: "Mr. Singh",
      progress: 80,
      color: "amber",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      textDark: "text-amber-600 dark:text-amber-400",
      barBg: "bg-amber-500",
      chevron: ChevronRight,
    },
    {
      id: "social",
      name: "Social Science",
      teacher: "Mr. Patel",
      progress: 65,
      color: "blue",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      textDark: "text-blue-600 dark:text-blue-400",
      barBg: "bg-blue-500",
      chevron: ChevronRight,
    },
    {
      id: "hindi",
      name: "Hindi",
      teacher: "Mrs. Desai",
      progress: 50,
      color: "pink",
      bgLight: "bg-pink-50 dark:bg-pink-950/40",
      textDark: "text-pink-600 dark:text-pink-400",
      barBg: "bg-pink-500",
      chevron: ChevronRight,
    },
  ];

  const materials = [
    {
      id: "mat-1",
      title: "Linear Equations - Notes",
      subject: "Mathematics",
      type: "PDF",
      size: "2.4 MB",
      iconColor: "text-rose-500 bg-rose-50 dark:bg-rose-950/40",
    },
    {
      id: "mat-2",
      title: "Photosynthesis - Summary",
      subject: "Science",
      type: "PDF",
      size: "1.8 MB",
      iconColor: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
    },
    {
      id: "mat-3",
      title: "Tenses Revision",
      subject: "English",
      type: "PDF",
      size: "1.2 MB",
      iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  const assignments = [
    {
      id: "ass-1",
      title: "Maths - Exercise 5.2",
      dueDate: "Due: 28 Aug 2024",
      status: "Pending",
      statusBadge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
    {
      id: "ass-2",
      title: "Science - Lab Report",
      dueDate: "Due: 30 Aug 2024",
      status: "Submitted",
      statusBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
  ];

  return (
    <StudentDashboardLayout
      student={{ id: "student_demo", firstName: "Rahul", fullName: "Rahul Kumar" }}
      notifications={{ unreadCount: 3 }}
    >
      <div className="w-full space-y-6 pb-12">
        {/* Page Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
              <BookOpen className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Study
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Learn, Practice & Grow
              </p>
            </div>
          </div>

          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: My Subjects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              My Subjects
            </h2>
            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {subjects.map((sub) => {
              const ChevronComp = sub.chevron;
              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${sub.bgLight} ${sub.textDark} flex items-center justify-center shrink-0`}>
                      <BookOpen className="h-5 w-5 stroke-[2]" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {sub.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {sub.teacher}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {sub.progress}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${sub.barBg} rounded-full`}
                          style={{ width: `${sub.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button className={`w-8 h-8 rounded-full ${sub.bgLight} ${sub.textDark} flex items-center justify-center shrink-0`}>
                    <ChevronComp className="h-4 w-4 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Recent Materials */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Materials
            </h2>
            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${mat.iconColor} flex items-center justify-center shrink-0`}>
                    <FileText className="h-4.5 w-4.5 stroke-[2]" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {mat.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {mat.subject} • {mat.type} • {mat.size}
                    </p>
                  </div>
                </div>

                <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-all">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Recent Assignments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Assignments
            </h2>
            <button className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {assignments.map((ass) => (
              <div
                key={ass.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="h-4.5 w-4.5 stroke-[2]" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {ass.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {ass.dueDate}
                    </p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${ass.statusBadge}`}>
                  {ass.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
}
