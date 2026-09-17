"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/hooks/use-auth";
import { computeAnnouncementStatus, CmsAnnouncement } from "@/lib/cms/siteSettings";
import { Sparkles, AlertCircle, Info, AlertTriangle, ArrowRight, X } from "lucide-react";

interface AnnouncementBannerProps {
  area?: "ALL" | "HOMEPAGE" | "PRICING" | "PORTALS";
  previewAnnouncement?: CmsAnnouncement;
}

export function AnnouncementBanner({ area = "ALL", previewAnnouncement }: AnnouncementBannerProps) {
  const { settings } = useSiteSettings();
  const { profile } = useAuth();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const announcements = settings?.announcements || [];
  const nowMs = Date.now();

  const activeAnnouncement: CmsAnnouncement | null = useMemo(() => {
    if (previewAnnouncement) {
      return previewAnnouncement;
    }

    const filtered = announcements
      .filter((a) => {
        if (!a.active) return false;
        const status = computeAnnouncementStatus(a, nowMs);
        if (status !== "ACTIVE") return false;

        // Area filtering
        if (a.targetPublicArea && a.targetPublicArea !== "ALL" && a.targetPublicArea !== area) {
          return false;
        }

        // School targeting
        if (a.targetScope === "SELECTED") {
          const userSchoolId = profile?.schoolId;
          if (!userSchoolId || !a.targetSchoolIds || !a.targetSchoolIds.includes(userSchoolId)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (b.priority || 1) - (a.priority || 1));

    return filtered[0] || null;
  }, [previewAnnouncement, announcements, nowMs, area, profile?.schoolId]);

  // Check sessionStorage dismissal
  useEffect(() => {
    if (activeAnnouncement?.id && typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem(`ann_dismissed_${activeAnnouncement.id}`) === "true";
      if (isDismissed) {
        setDismissedId(activeAnnouncement.id);
      }
    }
  }, [activeAnnouncement?.id]);

  if (!activeAnnouncement) return null;
  if (!previewAnnouncement && dismissedId === activeAnnouncement.id) return null;

  const handleDismiss = () => {
    if (activeAnnouncement?.id) {
      setDismissedId(activeAnnouncement.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`ann_dismissed_${activeAnnouncement.id}`, "true");
      }
    }
  };

  const typeConfig = {
    INFO: {
      bg: "bg-blue-600 dark:bg-blue-900 text-white border-blue-700 dark:border-blue-800",
      pill: "bg-blue-700/80 text-blue-100",
      icon: Info,
    },
    PROMO: {
      bg: "bg-emerald-600 dark:bg-emerald-900 text-white border-emerald-700 dark:border-emerald-800",
      pill: "bg-emerald-700/80 text-emerald-100",
      icon: Sparkles,
    },
    WARNING: {
      bg: "bg-amber-600 dark:bg-amber-900 text-white border-amber-700 dark:border-amber-800",
      pill: "bg-amber-700/80 text-amber-100",
      icon: AlertTriangle,
    },
    ALERT: {
      bg: "bg-rose-600 dark:bg-rose-900 text-white border-rose-700 dark:border-rose-800",
      pill: "bg-rose-700/80 text-rose-100",
      icon: AlertCircle,
    },
  }[activeAnnouncement.type || "INFO"];

  const Icon = typeConfig.icon;
  const isMarquee = activeAnnouncement.marquee ?? true;

  const bannerContent = (
    <div className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold px-4">
      <span className="font-bold uppercase tracking-wider text-[11px] opacity-90">
        {activeAnnouncement.title}:
      </span>
      <span className="opacity-95 font-normal">
        {activeAnnouncement.message}
      </span>
      {activeAnnouncement.linkUrl && (
        <Link
          href={activeAnnouncement.linkUrl}
          className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity ml-1.5 text-white"
        >
          <span>{activeAnnouncement.linkText || "Learn more"}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );

  return (
    <aside
      aria-label="Platform Announcement"
      className={`relative z-40 w-full h-8 sm:h-9 min-h-[32px] max-h-[36px] overflow-hidden border-b shadow-2xs transition-all flex items-center ${typeConfig.bg}`}
    >
      <style>{`
        @keyframes bannerMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-banner-marquee {
          display: inline-flex;
          width: max-content;
          animation: bannerMarquee 30s linear infinite;
        }
        .animate-banner-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. Fixed Icon Anchor (Left) */}
      <div className="h-full flex items-center px-3 z-10 shrink-0 bg-inherit shadow-sm">
        <div className={`p-1 rounded-md ${typeConfig.pill} flex items-center justify-center`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* 2. Middle Single-Line Content Area (With smooth Marquee Ticker) */}
      <div className="flex-1 h-full min-w-0 overflow-hidden relative flex items-center">
        {isMarquee ? (
          <div className="animate-banner-marquee items-center cursor-default select-none">
            {bannerContent}
            <span className="opacity-40 select-none px-4">✦</span>
            {bannerContent}
            <span className="opacity-40 select-none px-4">✦</span>
          </div>
        ) : (
          <div className="w-full truncate text-center px-2">
            {bannerContent}
          </div>
        )}
      </div>

      {/* 3. Fixed Close Button Anchor (Right) */}
      <div className="h-full flex items-center px-2.5 z-10 shrink-0 bg-inherit shadow-sm">
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer text-white/90 hover:text-white"
          title="Dismiss announcement"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

export default AnnouncementBanner;
