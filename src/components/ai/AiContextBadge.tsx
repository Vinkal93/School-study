"use client";

import React from "react";
import { ShieldCheck, Sparkles, Building2, GraduationCap, BookOpen, User } from "lucide-react";
import type { AiPortalType } from "@/types/ai";

interface AiContextBadgeProps {
  portal: AiPortalType;
  schoolName?: string;
}

export function AiContextBadge({ portal, schoolName }: AiContextBadgeProps) {
  const getBadgeConfig = () => {
    switch (portal) {
      case "super_admin":
        return {
          label: "Context: Super Admin Governance",
          icon: <ShieldCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />,
          color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
        };
      case "school_admin":
      case "accountant":
        return {
          label: schoolName ? `Context: Admin • ${schoolName}` : "Context: School Administration",
          icon: <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
          color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
        };
      case "teacher":
        return {
          label: "Context: Teacher & Faculty",
          icon: <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
          color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        };
      case "student":
        return {
          label: "Context: Student Study Buddy",
          icon: <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
          color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        };
      case "parent":
        return {
          label: "Context: Parent Liaison",
          icon: <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
          color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        };
      default:
        return {
          label: "Context: School Study AI",
          icon: <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />,
          color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-xs transition-colors ${config.color}`}
    >
      {config.icon}
      <span className="truncate max-w-[240px] sm:max-w-xs">{config.label}</span>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
    </div>
  );
}
