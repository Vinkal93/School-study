"use client";

import React, { useMemo } from "react";
import { QuickActionCard } from "./QuickActionCard";
import { QuickActionsSkeleton } from "./QuickActionsSkeleton";
import { QuickActionsProps, QuickActionItem } from "./types";
import { AlertCircle } from "lucide-react";

export const defaultQuickActions: QuickActionItem[] = [
  { id: "attendance", label: "Attendance", icon: "attendance", route: "/student/attendance", moduleKey: "attendance" },
  { id: "fees", label: "Fees", icon: "fees", route: "/student/fees", moduleKey: "fees" },
  { id: "homework", label: "Homework", icon: "homework", route: "/student/homework", moduleKey: "homework" },
  { id: "exams", label: "Exams", icon: "exams", route: "/student/exams", moduleKey: "exams" },
  { id: "notices", label: "Notices", icon: "notices", route: "/student/notices", moduleKey: "notices" },
  { id: "timetable", label: "Time Table", icon: "timetable", route: "/student/timetable", moduleKey: "timetable" },
  { id: "library", label: "Library", icon: "library", route: "/student/library", moduleKey: "library" },
  { id: "more", label: "More", icon: "more", route: "/student/more" },
];

export function QuickActions({
  actions = defaultQuickActions,
  tenantEnabledModules,
  loading = false,
  error = null,
  onActionClick,
}: QuickActionsProps) {
  // 1. Loading Skeleton State (Section 25)
  if (loading) {
    return <QuickActionsSkeleton />;
  }

  // Filter actions based on tenant module configuration (Section 20)
  const availableActions = useMemo(() => {
    if (!tenantEnabledModules || tenantEnabledModules.length === 0) {
      return actions; // Default all enabled
    }
    return actions.filter((act) => {
      if (!act.moduleKey || act.id === "more") return true;
      return tenantEnabledModules.includes(act.moduleKey);
    });
  }, [actions, tenantEnabledModules]);

  if (error) {
    return (
      <div className="w-full space-y-2.5">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          Quick Actions
        </h2>
        <div className="w-full p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Showing default quick actions.</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
          {defaultQuickActions.map((action) => (
            <QuickActionCard key={action.id} action={action} onClick={onActionClick} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="w-full space-y-3" aria-label="Quick Actions">
      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
        Quick Actions
      </h2>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
        {availableActions.map((action) => (
          <QuickActionCard key={action.id} action={action} onClick={onActionClick} />
        ))}
      </div>
    </section>
  );
}
