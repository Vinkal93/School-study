"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Bell,
  Settings,
  CreditCard,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import type { School } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useEntitlement } from "@/context/EntitlementContext";

interface LiquidGlassSchoolAdminDashboardProps {
  school: School | null;
  counts: {
    teachers: number;
    students: number;
    classes: number;
    academicYears: number;
  };
}

export function LiquidGlassSchoolAdminDashboard({
  school,
  counts,
}: LiquidGlassSchoolAdminDashboardProps) {
  const { profile } = useAuth();
  const { entitlement } = useEntitlement();
  const router = useRouter();
  const schoolName = school?.name || "School Administration";
  const adminName = profile?.name || "School Administrator";

  const stats = [
    {
      icon: <Layers className="w-6 h-6" />,
      label: "Active Classes",
      value: counts.classes > 0 ? String(counts.classes) : "0",
      sub: "Grades & Sections",
      tone: "purple",
      href: "/admin/classes",
    },
    {
      icon: <Users className="w-6 h-6" />,
      label: "Total Teachers",
      value: counts.teachers > 0 ? String(counts.teachers) : "0",
      sub: "Faculty Members",
      tone: "blue",
      href: "/admin/teachers",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      label: "Enrolled Students",
      value: counts.students > 0 ? String(counts.students) : "0",
      sub: "Total Students",
      tone: "green",
      href: "/admin/students",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      label: "Academic Sessions",
      value: counts.academicYears > 0 ? String(counts.academicYears) : "1",
      sub: "Active Calendar",
      tone: "orange",
      href: "/admin/settings",
    },
  ];

  const cards = [
    {
      icon: <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: "Classes & Sections",
      description: "Manage grades, class divisions, subjects, and timetables.",
      href: "/admin/classes",
    },
    {
      icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: "Faculty / Teachers",
      description: "Add teachers, assign subjects, and manage staff accounts.",
      href: "/admin/teachers",
    },
    {
      icon: <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: "Student Admissions",
      description: "Enroll students, assign roll numbers, and organize class rosters.",
      href: "/admin/students",
    },
    {
      icon: <ClipboardCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
      title: "Attendance Management",
      description: "Monitor daily student and teacher attendance records.",
      href: "/admin/attendance",
    },
    {
      icon: <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: "Notices & Announcements",
      description: "Publish school circulars, exam schedules, and holiday notices.",
      href: "/admin/notices",
    },
    {
      icon: <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Fee Management",
      description: "Track fee collections, generate receipts, and manage student dues.",
      href: "/admin/fees",
    },
    {
      icon: <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      title: "Timetable / Bells",
      description: "Configure daily bell schedules, periods, and teacher timetables.",
      href: "/admin/timetable",
    },
    {
      icon: <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />,
      title: "Reports & Exports",
      description: "Generate administrative reports, student lists, and attendance records.",
      href: "/admin/reports",
    },
    {
      icon: <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
      title: "School Settings",
      description: "Review academic sessions, school information, and system preferences.",
      href: "/admin/settings",
    },
  ];

  return (
    <div className="lg-page font-sans">
      <style>{`
        .lg-page {
          min-height: 100vh;
          padding: 10px 10px 40px;
          color: #10203a;
          overflow-x: hidden;
        }
        .dark .lg-page {
          color: #f1f5f9;
        }
        .lg-wrap {
          max-width: 1480px;
          margin: auto;
        }
        .lg-glass {
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,.54), rgba(255,255,255,.20));
          border: 1px solid rgba(255,255,255,.72);
          box-shadow: 0 20px 55px rgba(35,61,105,.12), inset 0 1px 0 rgba(255,255,255,.92), inset 0 -1px 0 rgba(255,255,255,.2);
          backdrop-filter: blur(26px) saturate(155%);
          -webkit-backdrop-filter: blur(26px) saturate(155%);
          transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dark .lg-glass {
          background: linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
          border: 1px solid rgba(255,255,255,.14);
          box-shadow: 0 20px 55px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(0,0,0,.3);
        }
        .lg-glass:before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(125deg, rgba(255,255,255,.48), transparent 34%, transparent 70%, rgba(255,255,255,.16));
        }
        .dark .lg-glass:before {
          background: linear-gradient(125deg, rgba(255,255,255,.16), transparent 34%, transparent 70%, rgba(255,255,255,.04));
        }
        .lg-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .lg-eyebrow {
          color: #2868e8;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dark .lg-eyebrow {
          color: #38bdf8;
        }
        .lg-title {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1.2px;
          line-height: 1.2;
        }
        .lg-sub {
          margin: 6px 0 0;
          color: #61708a;
          font-size: 14px;
        }
        .dark .lg-sub {
          color: #94a3b8;
        }
        .lg-setup {
          border-radius: 18px;
          padding: 12px 20px;
          border: 1px solid rgba(255,255,255,.72);
          background: rgba(255,255,255,.42);
          backdrop-filter: blur(20px);
          font-weight: 700;
          font-size: 13px;
          color: #243653;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dark .lg-setup {
          border-color: rgba(255,255,255,.15);
          background: rgba(255,255,255,.08);
          color: #e2e8f0;
        }
        .lg-setup:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,.65);
          box-shadow: 0 10px 25px rgba(35,61,105,.12);
        }
        .dark .lg-setup:hover {
          background: rgba(255,255,255,.14);
        }
        .lg-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 26px;
        }
        .lg-stat {
          min-height: 124px;
          border-radius: 22px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          color: inherit;
        }
        .lg-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 65px rgba(35,61,105,.16);
        }
        .dark .lg-stat:hover {
          box-shadow: 0 28px 65px rgba(0,0,0,.5);
        }
        .lg-icon {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.58);
          border: 1px solid rgba(255,255,255,.78);
          font-size: 24px;
          flex-shrink: 0;
        }
        .dark .lg-icon {
          background: rgba(255,255,255,.1);
          border-color: rgba(255,255,255,.15);
        }
        .lg-stat small {
          display: block;
          color: #6a7890;
          font-size: 12px;
          font-weight: 600;
        }
        .dark .lg-stat small {
          color: #94a3b8;
        }
        .lg-stat strong {
          display: block;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .lg-stat p {
          margin: 4px 0 0;
          color: #7c899d;
          font-size: 12px;
        }
        .dark .lg-stat p {
          color: #64748b;
        }
        .purple { color: #7c3aed; }
        .dark .purple { color: #a78bfa; }
        .blue { color: #2967f1; }
        .dark .blue { color: #60a5fa; }
        .green { color: #0a9b57; }
        .dark .green { color: #34d399; }
        .orange { color: #ed5b18; }
        .dark .orange { color: #fb923c; }

        .lg-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .lg-card {
          min-height: 188px;
          border-radius: 22px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
        }
        .lg-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 28px 65px rgba(35,61,105,.18);
        }
        .dark .lg-card:hover {
          box-shadow: 0 28px 65px rgba(0,0,0,.55);
        }
        .lg-card-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: rgba(20,43,78,.08);
          border: 1px solid rgba(255,255,255,.55);
          margin-bottom: 14px;
          flex-shrink: 0;
        }
        .dark .lg-card-icon {
          background: rgba(255,255,255,.1);
          border-color: rgba(255,255,255,.15);
        }
        .lg-card h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .lg-card p {
          margin: 8px 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }
        .dark .lg-card p {
          color: #94a3b8;
        }
        .lg-manage {
          margin-top: auto;
          color: #2467ed;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding-top: 10px;
        }
        .dark .lg-manage {
          color: #38bdf8;
        }
        @media(max-width: 1050px) {
          .lg-stats { grid-template-columns: repeat(2, 1fr); }
          .lg-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media(max-width: 700px) {
          .lg-page { padding: 10px 4px 30px; }
          .lg-setup { display: none; }
          .lg-title { font-size: 26px; }
          .lg-stats, .lg-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="lg-wrap">
        {/* Header Bar */}
        <header className="lg-top">
          <div>
            <div className="lg-eyebrow flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>School Portal — Liquid Glass Active</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {entitlement?.plan?.name || (school?.planId ? school.planId.replace("plan_", "").toUpperCase() + " PLAN" : "STARTER PLAN")}
              </span>
            </div>
            <h1 className="lg-title">{schoolName}</h1>
            <p className="lg-sub">
              Welcome back, {adminName}! Manage your faculty, students, classes, and notices.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.push("/admin/billing")}
              className="lg-setup bg-blue-600! text-white! border-blue-500!"
            >
              <span>💳</span>
              <span>Plan &amp; Billing</span>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="lg-setup"
            >
              <span>⚙️</span>
              <span>School Setup Wizard</span>
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <section className="lg-stats">
          {stats.map((s) => (
            <Link href={s.href} key={s.label} className="lg-glass lg-stat">
              <div className={`lg-icon ${s.tone}`}>{s.icon}</div>
              <div>
                <small>{s.label}</small>
                <strong>{s.value}</strong>
                <p>{s.sub}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* Management Grid */}
        <section className="lg-grid">
          {cards.map((c) => (
            <Link href={c.href} key={c.title} className="lg-glass lg-card">
              <div className="lg-card-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <div className="lg-manage">
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
