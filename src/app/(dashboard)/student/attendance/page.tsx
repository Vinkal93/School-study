"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";

export default function StudentAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState("August 2024");

  const monthlyDays = [
    { day: "Mon", date: "1", status: "present" },
    { day: "Tue", date: "2", status: "present" },
    { day: "Wed", date: "3", status: "present" },
    { day: "Thu", date: "4", status: "present" },
    { day: "Fri", date: "5", status: "present" },
    { day: "Sat", date: "6", status: "absent" },
    { day: "Sun", date: "7", status: "holiday" },
  ];

  const attendanceLogs = [
    { date: "26 Aug 2024", dayName: "Monday", status: "Present" },
    { date: "23 Aug 2024", dayName: "Friday", status: "Present" },
    { date: "22 Aug 2024", dayName: "Thursday", status: "Present" },
    { date: "21 Aug 2024", dayName: "Wednesday", status: "Absent" },
    { date: "20 Aug 2024", dayName: "Tuesday", status: "Present" },
  ];

  return (
    <StudentDashboardLayout
      student={{ id: "student_demo", firstName: "Rahul", fullName: "Rahul Kumar" }}
      notifications={{ unreadCount: 3 }}
    >
      <div className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
              <Users className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Attendance
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track your attendance
              </p>
            </div>
          </div>

          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: Overall Attendance Card (Matching Reference UI) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Attendance
          </span>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              92%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Present</span>
              <span className="font-extrabold text-slate-900 dark:text-white">23 Days</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Absent</span>
              <span className="font-extrabold text-slate-900 dark:text-white">2 Days</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px]">Total</span>
              <span className="font-extrabold text-slate-900 dark:text-white">25 Days</span>
            </div>
          </div>

          {/* Green Progress Bar Across Bottom */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
          </div>
        </div>

        {/* Section 2: Monthly Overview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Monthly Overview
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
              <span>{selectedMonth}</span>
              <div className="flex flex-col text-[8px] text-slate-400">
                <span>▲</span>
                <span>▼</span>
              </div>
            </div>
          </div>

          {/* Calendar Day Badges Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs pt-1">
            {monthlyDays.map((item) => {
              const bgClass =
                item.status === "present"
                  ? "bg-emerald-500 text-white font-bold"
                  : item.status === "absent"
                  ? "bg-rose-500 text-white font-bold"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold";

              return (
                <div key={item.date} className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 block">
                    {item.day}
                  </span>
                  <div className={`w-8 h-8 mx-auto rounded-full ${bgClass} flex items-center justify-center text-xs shadow-xs`}>
                    {item.date}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-3 text-[11px] font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              Holiday
            </span>
          </div>
        </div>

        {/* Section 3: Attendance Log List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Attendance List
          </h2>

          <div className="space-y-2.5">
            {attendanceLogs.map((log, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {log.date}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">{log.dayName}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    log.status === "Present"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
}
