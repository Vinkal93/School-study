"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";
import { GRANULAR_PERMISSIONS } from "@/lib/billing/permissions";

export interface PlanFeaturesIncludedProps {
  allowedFeatures: string[];
  permissions?: Record<string, boolean>;
  onViewAllFeatures: () => void;
}

export function PlanFeaturesIncluded({
  allowedFeatures = [],
  permissions = {},
  onViewAllFeatures,
}: PlanFeaturesIncludedProps) {
  // Map allowed features & granular permissions to display items
  const displayItems = React.useMemo(() => {
    const items: { id: string; title: string; category: string }[] = [];
    const addedKeys = new Set<string>();

    // 1. High level modules
    const knownModules: Record<string, string> = {
      student_management: "Student Management & Admissions",
      teacher_management: "Teacher Directory & Staff Controls",
      class_management: "Classes & Section Management",
      basic_attendance: "Daily Attendance Marking",
      attendance_automation: "Automated Attendance & Alerts",
      school_dashboard: "Real-Time School Analytics Dashboard",
      notices_announcements: "Notice Board & Broadcast Circulars",
      advanced_reports: "Advanced Academic & Fee Reports",
      reports_export: "CSV & Data Exports",
      student_portal: "Student Portal Access",
      teacher_portal: "Teacher Portal Access",
    };

    for (const key of allowedFeatures) {
      if (knownModules[key] && !addedKeys.has(key)) {
        items.push({ id: key, title: knownModules[key], category: "Core Feature" });
        addedKeys.add(key);
      }
    }

    // 2. Granular permissions if available
    for (const def of GRANULAR_PERMISSIONS) {
      if (permissions[def.id] && !addedKeys.has(def.id)) {
        items.push({ id: def.id, title: def.name, category: def.category.toUpperCase() });
        addedKeys.add(def.id);
      }
    }

    return items;
  }, [allowedFeatures, permissions]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span>What Your Plan Includes</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database-authoritative feature privileges for your active subscription tier.
          </p>
        </div>

        <button
          onClick={onViewAllFeatures}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-all cursor-pointer"
        >
          <span>View All Features</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
        {displayItems.slice(0, 9).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">{item.title}</span>
              <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
            </div>
          </div>
        ))}
      </div>

      {displayItems.length > 9 && (
        <div className="text-center pt-2">
          <button
            onClick={onViewAllFeatures}
            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
          >
            + {displayItems.length - 9} more included features (Click to view complete matrix)
          </button>
        </div>
      )}
    </div>
  );
}
