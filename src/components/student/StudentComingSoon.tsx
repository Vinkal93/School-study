"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Bell, CheckCircle2, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useStudentHeader } from "@/context/student-header-context";

interface StudentComingSoonProps {
  title: string;
  category: "Academics" | "School Services" | "Account & Support";
  description: string;
  icon: LucideIcon;
  iconColor: string;
  features: string[];
}

export function StudentComingSoon({
  title,
  category,
  description,
  icon: IconComponent,
  iconColor,
  features,
}: StudentComingSoonProps) {
  const [notified, setNotified] = useState(false);

  useStudentHeader({
    title,
    subtitle: category,
    backHref: "/student/more",
    showBack: true,
  });

  const handleNotify = () => {
    setNotified(true);
    toast.success(`You will be notified as soon as ${title} is ready!`);
  };

  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">

        {/* Feature Hero Card */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-5">
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-3xl ${iconColor} flex items-center justify-center shadow-inner relative`}>
              <IconComponent className="h-10 w-10 stroke-[2]" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Coming Soon • Active Development</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Features Preview List */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 text-left space-y-2.5 max-w-md mx-auto">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Upcoming Highlights
            </p>
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
            <button
              onClick={handleNotify}
              disabled={notified}
              className={`w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all ${
                notified
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                  : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>{notified ? "Notification Enabled" : "Notify Me When Ready"}</span>
            </button>

            <Link
              href="/student/more"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
            >
              Back to More
            </Link>
          </div>
        </div>
      </div>
  );
}
