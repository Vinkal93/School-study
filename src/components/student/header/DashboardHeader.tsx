"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MenuButton } from "./MenuButton";
import { Greeting } from "./Greeting";
import { NotificationButton } from "./NotificationButton";
import { StudentAvatar } from "./StudentAvatar";
import { DashboardHeaderProps } from "./types";
import { useMobileNav } from "@/context/mobile-nav-context";
import { useStudentHeaderContext } from "@/context/student-header-context";

const ROUTE_META: Record<string, { title: string; subtitle?: string }> = {
  "/student/attendance": { title: "My Attendance", subtitle: "Real-time attendance ledger" },
  "/student/fees": { title: "Fees & Receipts", subtitle: "Official fee records & payments" },
  "/student/homework": { title: "Homework & Tasks", subtitle: "Daily academic assignments" },
  "/student/study": { title: "Study & Timetable", subtitle: "Daily period bells & materials" },
  "/student/profile": { title: "Student Profile", subtitle: "Enrollment & academic records" },
  "/student/more": { title: "More Services", subtitle: "All school portals & features" },
  "/student/notifications": { title: "Notifications", subtitle: "Recent school announcements" },
  "/student/settings": { title: "Settings", subtitle: "App preferences & account" },
  "/student/assignments": { title: "Assignments", subtitle: "Submissions & projects" },
  "/student/exams": { title: "Examinations", subtitle: "Exam routines & grade cards" },
  "/student/library": { title: "Library", subtitle: "Books catalog & borrowing" },
  "/student/events": { title: "School Events", subtitle: "Calendar & activities" },
  "/student/leave": { title: "Leave Application", subtitle: "Apply & track requests" },
  "/student/notices": { title: "Notice Board", subtitle: "Official circulars" },
  "/student/certificates": { title: "Certificates", subtitle: "Academic credentials" },
  "/student/documents": { title: "Documents", subtitle: "School forms & IDs" },
  "/student/transport": { title: "Transport", subtitle: "Bus routes & tracking" },
  "/student/help": { title: "Help & Support", subtitle: "School contact & FAQs" },
};

export function DashboardHeader({
  student,
  notifications,
  onMenuClick,
  onNotificationClick,
  onProfileClick,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileNav } = useMobileNav();

  // Try retrieving page-level context overrides safely
  let contextConfig: any = null;
  try {
    const ctx = useStudentHeaderContext();
    contextConfig = ctx.headerConfig;
  } catch {
    // Rendered outside StudentHeaderProvider fallback
    contextConfig = null;
  }

  const isHome = pathname === "/student";

  const defaultMeta = useMemo(() => {
    if (ROUTE_META[pathname]) return ROUTE_META[pathname];
    const segment = pathname.split("/").filter(Boolean).pop() || "student";
    return {
      title: segment.replace(/-/g, " "),
      subtitle: undefined,
    };
  }, [pathname]);

  const title = contextConfig?.title || defaultMeta.title;
  const subtitle = contextConfig?.subtitle || defaultMeta.subtitle;
  const showBack = contextConfig?.showBack !== undefined ? contextConfig.showBack : !isHome;
  const backHref = contextConfig?.backHref || "/student";

  const studentData = student || {
    id: "student",
    firstName: "Student",
    fullName: "Student",
  };

  const notificationData = notifications || {
    unreadCount: 0,
  };

  const handleMenu = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      toggleMobileNav();
    }
  };

  const handleNotification = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      router.push("/student/notifications");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
      {/* LEFT SECTION: Back Button on Subpages + Menu Button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {showBack && (
          <Link
            href={backHref}
            aria-label="Go back to dashboard"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
          </Link>
        )}
        <MenuButton onClick={handleMenu} />
      </div>

      {/* CENTER SECTION: Dynamic Greeting on Home, or Page Title on Subpages */}
      {isHome ? (
        <Greeting firstName={studentData.firstName} />
      ) : (
        <div className="flex-1 min-w-0 px-1">
          <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight capitalize">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* RIGHT SECTION: Optional Page Action + Notification Bell + Student Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {contextConfig?.rightAction}
        <NotificationButton
          unreadCount={notificationData.unreadCount}
          onClick={handleNotification}
        />
        <StudentAvatar
          fullName={studentData.fullName}
          photoUrl={studentData.photoUrl}
          onClick={onProfileClick}
        />
      </div>
    </header>
  );
}
