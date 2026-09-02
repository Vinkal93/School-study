"use client";

import React from "react";
import { Users, GraduationCap, BookOpen, HardDrive, AlertTriangle, Sparkles, UserCog, BellRing, HeartHandshake } from "lucide-react";

export interface UsageMetricItem {
  key: string;
  label: string;
  icon: any;
  current: number;
  limit: number; // -1 means unlimited
  unit?: string;
}

export interface PlanLimitsProgressProps {
  usage: {
    students: { current: number; limit: number };
    teachers: { current: number; limit: number };
    classes: { current: number; limit: number };
    staffAccounts: { current: number; limit: number };
    parents?: { current: number; limit: number };
    storage?: { currentBytes: number; limitBytes: number };
    monthlyNotifications?: { current: number; limit: number };
  };
  onUpgrade: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function PlanLimitsProgress({ usage, onUpgrade }: PlanLimitsProgressProps) {
  const metrics: UsageMetricItem[] = [
    {
      key: "students",
      label: "Students",
      icon: GraduationCap,
      current: usage.students.current,
      limit: usage.students.limit,
    },
    {
      key: "teachers",
      label: "Teachers",
      icon: Users,
      current: usage.teachers.current,
      limit: usage.teachers.limit,
    },
    {
      key: "classes",
      label: "Classes & Sections",
      icon: BookOpen,
      current: usage.classes.current,
      limit: usage.classes.limit,
    },
    {
      key: "staffAccounts",
      label: "Staff Accounts",
      icon: UserCog,
      current: usage.staffAccounts.current,
      limit: usage.staffAccounts.limit,
    },
    {
      key: "parents",
      label: "Parent Accounts",
      icon: HeartHandshake,
      current: usage.parents?.current || 0,
      limit: usage.parents?.limit || 2000,
    },
    {
      key: "storage",
      label: "Cloud Storage",
      icon: HardDrive,
      current: usage.storage ? Math.round(usage.storage.currentBytes / (1024 * 1024)) : 480, // MB
      limit: usage.storage ? Math.round(usage.storage.limitBytes / (1024 * 1024)) : 10240, // 10 GB in MB
      unit: "MB",
    },
    {
      key: "notifications",
      label: "Monthly Notifications",
      icon: BellRing,
      current: usage.monthlyNotifications?.current || 0,
      limit: usage.monthlyNotifications?.limit || 10000,
    },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Plan Capacity & Resource Limits</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time server calculated usage against your subscription limits.
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Increase Limits / Upgrade</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isUnlimited = m.limit === -1;
          const pct = isUnlimited ? 0 : Math.min(100, Math.round((m.current / m.limit) * 100));

          const isNearLimit = pct >= 80 && pct < 90;
          const isCritical = pct >= 90 && pct < 100;
          const isLimitReached = !isUnlimited && m.current >= m.limit;

          let barColor = "bg-emerald-500";
          if (isNearLimit) barColor = "bg-amber-500";
          if (isCritical || isLimitReached) barColor = "bg-red-600";

          return (
            <div
              key={m.key}
              className={`p-4 rounded-2xl border transition-all ${
                isLimitReached
                  ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                  : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{m.label}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {m.unit === "MB" ? formatBytes(m.current * 1024 * 1024) : m.current.toLocaleString("en-IN")}{" "}
                      / {isUnlimited ? "Unlimited" : m.unit === "MB" ? formatBytes(m.limit * 1024 * 1024) : m.limit.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {isUnlimited ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Unlimited</span>
                  ) : isLimitReached ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                      Limit Reached
                    </span>
                  ) : (
                    <span className={`text-xs font-bold ${pct >= 80 ? "text-amber-600" : "text-slate-700 dark:text-slate-300"}`}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {!isUnlimited && (
                <div className="space-y-1 mt-2">
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>

                  {isLimitReached && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Capacity reached. Cannot add more items.
                      </span>
                      <button
                        onClick={onUpgrade}
                        className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
