"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

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

  // Dynamic overflow detection: checks if content width exceeds container width
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const contentWidth = contentRef.current.scrollWidth;
        setIsOverflowing(contentWidth > availableWidth);
      }
    };

    const rafId = requestAnimationFrame(checkOverflow);
    window.addEventListener("resize", checkOverflow);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => checkOverflow());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", checkOverflow);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeAnnouncement?.title, activeAnnouncement?.message, activeAnnouncement?.linkUrl, activeAnnouncement?.id]);

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
  // Run marquee if explicitly configured ON or if the text exceeds available container width
  const shouldMarquee = activeAnnouncement.marquee !== false || isOverflowing;

  const bannerContent = (
    <div className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold px-3 select-none">
      <span className="font-black uppercase tracking-wider text-[11px] opacity-90">
        {activeAnnouncement.title}:
      </span>
      <span className="opacity-95 font-medium">
        {activeAnnouncement.message}
      </span>
      {activeAnnouncement.linkUrl && (
        <Link
          href={activeAnnouncement.linkUrl}
          className="inline-flex items-center gap-1 font-bold underline hover:opacity-80 transition-opacity ml-1.5 text-white shrink-0"
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
      className={`relative z-40 w-full h-8 sm:h-9 min-h-[32px] max-h-[36px] overflow-hidden whitespace-nowrap border-b shadow-2xs transition-all flex items-center justify-between ${typeConfig.bg}`}
      style={{ minHeight: "32px", maxHeight: "36px", height: "36px" }}
    >
      <style>{`
        @keyframes bannerMarqueeAnimation {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .banner-marquee-track {
          display: inline-flex;
          width: max-content;
          animation: bannerMarqueeAnimation 32s linear infinite;
        }
        .banner-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. Fixed Icon Anchor (Left - never moves with marquee) */}
      <div className="h-full flex items-center pl-3 pr-2 z-20 shrink-0 bg-inherit shadow-xs select-none">
        <div className={`p-1 rounded-md ${typeConfig.pill} flex items-center justify-center`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* 2. Middle Single-Line Content Area (With dynamic overflow & smooth marquee ticker) */}
      <div
        ref={containerRef}
        className="flex-1 h-full min-w-0 overflow-hidden relative flex items-center justify-center"
      >
        {/* Subtle Edge Fade Gradients so ticker smoothly emerges/disappears */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-r from-black/15 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-l from-black/15 to-transparent" />

        {/* Hidden measurement node for dynamic overflow calculation */}
        <div
          ref={contentRef}
          aria-hidden="true"
          className="absolute left-[-9999px] top-[-9999px] inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold px-3 opacity-0 pointer-events-none"
        >
          <span className="font-black uppercase tracking-wider text-[11px]">
            {activeAnnouncement.title}:
          </span>
          <span className="font-medium">
            {activeAnnouncement.message}
          </span>
          {activeAnnouncement.linkUrl && (
            <span className="font-bold underline ml-1.5">
              {activeAnnouncement.linkText || "Learn more"}
            </span>
          )}
        </div>

        {shouldMarquee ? (
          <div className="banner-marquee-track items-center cursor-default select-none">
            {bannerContent}
            <span className="opacity-40 select-none px-4 text-xs">✦</span>
            {bannerContent}
            <span className="opacity-40 select-none px-4 text-xs">✦</span>
            {bannerContent}
            <span className="opacity-40 select-none px-4 text-xs">✦</span>
            {bannerContent}
            <span className="opacity-40 select-none px-4 text-xs">✦</span>
          </div>
        ) : (
          <div className="w-full truncate text-center px-2 cursor-default select-none">
            {bannerContent}
          </div>
        )}
      </div>

      {/* 3. Fixed Close Button Anchor (Right - never moves with marquee) */}
      <div className="h-full flex items-center pr-3 pl-2 z-20 shrink-0 bg-inherit shadow-xs select-none">
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-white/20 active:bg-white/30 transition-colors cursor-pointer text-white/90 hover:text-white"
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
