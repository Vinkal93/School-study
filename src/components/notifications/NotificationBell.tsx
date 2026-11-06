"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Megaphone,
  BookOpen,
  ShieldCheck,
  Clock,
  Award,
  Calendar,
  Sparkles,
  ExternalLink,
  X,
  AlertTriangle,
  Info,
  Search,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Flame,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification.service";
import type { UserNotificationView, NotificationEventType } from "@/types/notification";
import { toast } from "sonner";

interface NotificationBellProps {
  className?: string;
  variant?: "default" | "minimal" | "student";
}

type NotificationCategoryFilter = "all" | "unread" | "notices" | "academic" | "urgent";

/**
 * NOTIFICATION CENTER 3.0 — IN-PLACE UPGRADE
 *
 * Premium, zero-duplicate realtime notification center dropdown for School Study.
 * - Single notification bell trigger across desktop & mobile.
 * - Responsive bottom-sheet on mobile, glassmorphic popover on desktop.
 * - Zero extra database reads/writes: reuses single Firestore realtime channel.
 * - Category filtering (All, Unread, Notices, Academic, Urgent).
 * - Realtime LIVE event ripple badge.
 * - One-click mark single as read & mark all as read.
 */
export function NotificationBell({ className = "", variant = "default" }: NotificationBellProps) {
  const { profile, firebaseUser } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<UserNotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Authoritative school & user identity
  const schoolId = profile?.schoolId || (profile?.role === "super_admin" ? "global" : "");
  const user = useMemo(
    () => ({
      uid: profile?.uid || firebaseUser?.uid || "",
      role: profile?.role || "student",
      classId: (profile as any)?.classId,
      sectionId: (profile as any)?.sectionId,
    }),
    [profile, firebaseUser]
  );

  // 1. Single Realtime Firestore subscription
  useEffect(() => {
    if (!schoolId || !user.uid) return;

    const unsub = subscribeToUserNotifications(
      schoolId,
      user,
      (liveItems, liveUnreadCount) => {
        setNotifications(liveItems);
        setUnreadCount(liveUnreadCount);
      }
    );

    return () => unsub();
  }, [schoolId, user]);

  // 2. Click outside & Escape key handler to ensure exactly ONE panel open
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 3. Filtered & Searched items
  const displayedItems = useMemo(() => {
    let items = notifications;

    // Category filter
    if (filter === "unread") {
      items = items.filter((n) => !n.isRead);
    } else if (filter === "notices") {
      items = items.filter((n) => n.type === "notice" || n.type === "general");
    } else if (filter === "academic") {
      items = items.filter((n) => n.type === "homework" || n.type === "timetable" || n.type === "event");
    } else if (filter === "urgent") {
      items = items.filter(
        (n) => n.priority === "urgent" || n.priority === "high" || n.type === "rule" || n.type === "complaint"
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.senderName && n.senderName.toLowerCase().includes(q))
      );
    }

    return items;
  }, [notifications, filter, searchQuery]);

  // 4. Live activity pulse indicator
  const hasLiveIndicator = useMemo(() => {
    return notifications.some((n) => n.isLive && !n.isRead);
  }, [notifications]);

  // Handle single item click & navigation
  const handleItemClick = useCallback(
    async (item: UserNotificationView) => {
      if (!item.isRead && schoolId && user.uid) {
        // Optimistic local update
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        await markNotificationAsRead(schoolId, item.id, user.uid).catch(() => {});
      }
      setIsOpen(false);
      if (item.link) {
        router.push(item.link);
      }
    },
    [schoolId, user.uid, router]
  );

  // Handle mark all as read
  const handleMarkAllRead = useCallback(async () => {
    if (!schoolId || !user.uid || isMarkingAll) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setIsMarkingAll(true);
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead(schoolId, user.uid, unreadIds);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.warn("Failed to mark all notifications read:", err);
    } finally {
      setIsMarkingAll(false);
    }
  }, [schoolId, user.uid, notifications, isMarkingAll]);

  // Time formatter
  const formatTime = (ts: any) => {
    if (!ts) return "Just now";
    const dateMs =
      typeof ts.toMillis === "function"
        ? ts.toMillis()
        : new Date(ts).getTime();

    if (isNaN(dateMs)) return "Recent";

    const diff = Date.now() - dateMs;
    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  // Premium Category Icon & Color Configuration
  const getEventMeta = (type: NotificationEventType, priority?: string) => {
    switch (type) {
      case "notice":
        return {
          icon: <Megaphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
          bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/40",
          tag: "Notice",
          tagColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        };
      case "homework":
        return {
          icon: <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
          bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/40",
          tag: "Homework",
          tagColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
        };
      case "rule":
        return {
          icon: <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40",
          tag: "Policy",
          tagColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        };
      case "timetable":
        return {
          icon: <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
          bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-900/40",
          tag: "Timetable",
          tagColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
        };
      case "fine_reward":
        return {
          icon: <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40",
          tag: "Fee / Reward",
          tagColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        };
      case "event":
        return {
          icon: <Calendar className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
          bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40",
          tag: "Event",
          tagColor: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        };
      case "complaint":
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
          bg: "bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-900/40",
          tag: "Alert",
          tagColor: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        };
      default:
        return {
          icon: <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
          bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/40",
          tag: "Update",
          tagColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
        };
    }
  };

  const fullCenterHref = useMemo(() => {
    const roleStr = profile?.role as string | undefined;
    if (roleStr === "super_admin") return "/super-admin/notifications";
    if (roleStr === "admin" || roleStr === "school_admin") return "/admin/notifications";
    if (roleStr === "teacher") return "/teacher/notifications";
    return "/student/notifications";
  }, [profile?.role]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* =========================================================================
          EXACT TRIGGER BELL — HIGHLY TACTILE, RESPONSIVE & ACCESSIBLE
      ========================================================================== */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notification Center (${unreadCount} unread)`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 cursor-pointer ${
          variant === "student"
            ? "w-11 h-11 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70"
            : variant === "minimal"
            ? "p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            : "p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs hover:shadow-xs"
        }`}
      >
        <Bell className="h-4.5 w-4.5" />

        {/* Unread Pill Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-in zoom-in-75 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Real-time LIVE Event Pulsing Dot */}
        {hasLiveIndicator && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-1 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      {/* Mobile Backdrop Overlay (only visible on mobile screens) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* =========================================================================
          NOTIFICATION CENTER 3.0 FLYOUT / BOTTOM-SHEET PANEL
      ========================================================================== */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notification Center 3.0"
          className="fixed inset-x-2 bottom-3 sm:bottom-auto sm:inset-x-auto sm:absolute sm:right-0 sm:top-full sm:mt-2.5 sm:w-[420px] max-h-[85vh] sm:max-h-[560px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/15 dark:shadow-black/50 z-50 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150 ring-1 ring-slate-900/5 dark:ring-white/10"
        >
          {/* Header 3.0 */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-b from-slate-50/80 to-transparent dark:from-slate-800/30 dark:to-transparent shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                      Notification Center
                    </h2>
                    <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      3.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {unreadCount > 0
                      ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                      : "All updates caught up"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={isMarkingAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Mark all</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Notification Center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Category Pills */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300"
                }`}
              >
                All ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  filter === "unread"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300"
                }`}
              >
                Unread ({unreadCount})
              </button>

              <button
                type="button"
                onClick={() => setFilter("notices")}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  filter === "notices"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300"
                }`}
              >
                Notices
              </button>

              <button
                type="button"
                onClick={() => setFilter("academic")}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  filter === "academic"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300"
                }`}
              >
                Academic
              </button>

              <button
                type="button"
                onClick={() => setFilter("urgent")}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  filter === "urgent"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-300"
                }`}
              >
                Urgent
              </button>
            </div>

            {/* Quick Search */}
            {notifications.length > 5 && (
              <div className="relative mt-2.5">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search updates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* =========================================================================
              SCROLLABLE NOTIFICATIONS ROSTER
          ========================================================================== */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 overscroll-contain focus:outline-none">
            {displayedItems.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                  <Inbox className="h-6 w-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {filter === "unread" ? "You're all caught up!" : "No notifications found"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                    {filter === "unread"
                      ? "Zero unread alerts pending in your inbox right now."
                      : "Official circulars, timetable updates, and academic notifications will appear here."}
                  </p>
                </div>
              </div>
            ) : (
              displayedItems.map((item) => {
                const meta = getEventMeta(item.type, item.priority);
                const isUrgent = item.priority === "urgent" || item.priority === "high";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 sm:p-4 transition-all cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/60 flex items-start gap-3 relative group ${
                      !item.isRead
                        ? "bg-blue-50/40 dark:bg-blue-950/25"
                        : "bg-transparent opacity-85 hover:opacity-100"
                    }`}
                  >
                    {/* Glowing Left Indicator for Unread */}
                    {!item.isRead && (
                      <span className="absolute left-1 top-3.5 bottom-3.5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-xs" />
                    )}

                    {/* Category Icon */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs ${meta.bg}`}
                    >
                      {meta.icon}
                    </div>

                    {/* Notification Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${meta.tagColor}`}
                          >
                            {meta.tag}
                          </span>
                          {isUrgent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shrink-0 animate-pulse">
                              <Flame className="h-2.5 w-2.5" />
                              Urgent
                            </span>
                          )}
                          <p
                            className={`text-xs truncate ${
                              !item.isRead
                                ? "font-extrabold text-slate-900 dark:text-white"
                                : "font-semibold text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {item.title}
                          </p>
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Footer Row with Sender & Action Link */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 truncate">
                          {item.senderName ? `From: ${item.senderName}` : "School Administration"}
                        </span>

                        {item.actionLabel && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                            <span>{item.actionLabel}</span>
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* =========================================================================
              FOOTER 3.0
          ========================================================================== */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime active</span>
            </div>

            <Link
              href={fullCenterHref}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <span>View All Updates</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
