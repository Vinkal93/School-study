"use client";

import React from "react";
import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { computeAnnouncementStatus } from "@/lib/cms/siteSettings";
import { Sparkles, AlertCircle, Info, AlertTriangle, ArrowRight } from "lucide-react";

export function AnnouncementBanner({ area = "ALL" }: { area?: "ALL" | "HOMEPAGE" | "PRICING" | "PORTALS" }) {
  const { settings } = useSiteSettings();
  const announcements = settings?.announcements || [];

  const nowMs = Date.now();
  const activeAnnouncement = announcements
    .filter((a) => {
      if (!a.active) return false;
      const status = computeAnnouncementStatus(a, nowMs);
      if (status !== "ACTIVE") return false;
      if (a.targetPublicArea === "ALL") return true;
      return a.targetPublicArea === area;
    })
    .sort((a, b) => (b.priority || 1) - (a.priority || 1))[0];

  if (!activeAnnouncement) return null;

  const typeConfig = {
    INFO: {
      bg: "bg-blue-600 dark:bg-blue-900 text-white",
      icon: Info,
    },
    PROMO: {
      bg: "bg-emerald-600 dark:bg-emerald-900 text-white",
      icon: Sparkles,
    },
    WARNING: {
      bg: "bg-amber-600 dark:bg-amber-900 text-white",
      icon: AlertTriangle,
    },
    ALERT: {
      bg: "bg-rose-600 dark:bg-rose-900 text-white",
      icon: AlertCircle,
    },
  }[activeAnnouncement.type || "INFO"];

  const Icon = typeConfig.icon;

  return (
    <div className={`${typeConfig.bg} py-2 px-4 text-xs font-semibold shadow-xs transition-all relative z-40`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap text-center">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-bold">{activeAnnouncement.title}:</span>
        <span className="font-normal opacity-95">{activeAnnouncement.message}</span>
        {activeAnnouncement.linkUrl && (
          <Link
            href={activeAnnouncement.linkUrl}
            className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity ml-1"
          >
            <span>{activeAnnouncement.linkText || "Learn more"}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
