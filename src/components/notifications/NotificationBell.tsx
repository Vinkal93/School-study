"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification.service";
import type { UserNotificationView, NotificationEventType } from "@/types/notification";

interface NotificationBellProps {
  className?: string;
  variant?: "default" | "minimal" | "student";
}

export function NotificationBell({ className = "", variant = "default" }: NotificationBellProps) {
  const { profile, firebaseUser } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<UserNotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const schoolId = profile?.schoolId || "";
  const user = useMemo(
    () => ({
      uid: profile?.uid || firebaseUser?.uid || "",
      role: profile?.role || "student",
      classId: (profile as any)?.classId,
      sectionId: (profile as any)?.sectionId,
    }),
    [profile, firebaseUser]
  );

  // 1. Realtime Firestore subscription
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

  // 2. Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 3. Filtered items
  const displayedItems = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  // 4. Has LIVE items (recent unread event)
  const hasLiveIndicator = useMemo(() => {
    return notifications.some((n) => n.isLive && !n.isRead);
  }, [notifications]);

  // Handle click on item
  const handleItemClick = async (item: UserNotificationView) => {
    if (!item.isRead && schoolId && user.uid) {
      await markNotificationAsRead(schoolId, item.id, user.uid);
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    if (!schoolId || !user.uid) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(schoolId, user.uid, unreadIds);
    }
  };

  // Format relative timestamp
  const formatTime = (ts: any) => {
    if (!ts) return "Just now";
    const dateMs =
      typeof ts.toMillis === "function"
        ? ts.toMillis()
        : new Date(ts).getTime();

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

  // Icon mapping
  const getIcon = (type: NotificationEventType) => {
    switch (type) {
      case "notice":
        return <Megaphone className="h-4 w-4 text-blue-500" />;
      case "homework":
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case "rule":
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case "timetable":
        return <Clock className="h-4 w-4 text-cyan-500" />;
      case "fine_reward":
        return <Award className="h-4 w-4 text-emerald-500" />;
      case "event":
        return <Calendar className="h-4 w-4 text-rose-500" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* ==========================================
          NOTIFICATION BELL BUTTON
      ========================================== */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className={`relative p-2.5 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${
          variant === "student"
            ? "w-11 h-11 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
        }`}
      >
        <Bell className="h-4.5 w-4.5" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* 🔴 LIVE Pulsing Dot */}
        {hasLiveIndicator && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {/* ==========================================
          DROPDOWN FLYOUT PANEL
      ========================================== */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {hasLiveIndicator && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE
                </span>
              )}
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`pb-2 transition-colors border-b-2 ${
                filter === "all"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`pb-2 transition-colors border-b-2 ${
                filter === "unread"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List Container */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 focus:outline-none">
            {displayedItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {filter === "unread"
                    ? "You are all caught up on announcements."
                    : "School announcements and homework will appear here in real-time."}
                </p>
              </div>
            ) : (
              displayedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 flex items-start gap-3 relative ${
                    !item.isRead ? "bg-blue-50/30 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Unread Left Border / Indicator */}
                  {!item.isRead && (
                    <span className="absolute left-1 top-4 bottom-4 w-1 rounded-full bg-blue-600" />
                  )}

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60 dark:border-slate-700/60">
                    {getIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${!item.isRead ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Sender & Action row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-slate-400 truncate">
                        By {item.senderName || "Admin"}
                      </span>

                      {item.actionLabel && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
                          <span>{item.actionLabel}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
            <Link
              href="/student/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              View Full Notification Center →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
