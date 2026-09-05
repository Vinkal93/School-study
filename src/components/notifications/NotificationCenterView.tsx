"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  CheckCircle2,
  Filter,
  Radio,
  Info,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification.service";
import type { UserNotificationView, NotificationEventType } from "@/types/notification";

export interface NotificationTab {
  id: string;
  label: string;
  filterFn?: (item: UserNotificationView) => boolean;
}

interface NotificationCenterViewProps {
  title?: string;
  subtitle?: string;
  roleScope?: "admin" | "super_admin" | "teacher" | "student";
  defaultTabs?: NotificationTab[];
  createActionHref?: string;
  createActionLabel?: string;
}

export function NotificationCenterView({
  title = "Notification Center",
  subtitle = "View and manage all real-time platform updates, announcements, and alerts.",
  roleScope,
  defaultTabs,
  createActionHref,
  createActionLabel,
}: NotificationCenterViewProps) {
  const { profile, firebaseUser } = useAuth();
  const router = useRouter();

  const userRole = roleScope || profile?.role || "admin";
  const schoolId = profile?.schoolId || (profile?.role === "super_admin" ? "global" : "");

  const user = useMemo(
    () => ({
      uid: profile?.uid || firebaseUser?.uid || "",
      role: userRole,
      classId: (profile as any)?.classId,
      sectionId: (profile as any)?.sectionId,
    }),
    [profile, firebaseUser, userRole]
  );

  const [notifications, setNotifications] = useState<UserNotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Subscribe in real time
  useEffect(() => {
    if (!schoolId || !user.uid) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserNotifications(
      schoolId,
      user,
      (liveItems, liveUnreadCount) => {
        setNotifications(liveItems);
        setUnreadCount(liveUnreadCount);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [schoolId, user]);

  // Dynamic Tabs
  const tabs: NotificationTab[] = useMemo(() => {
    if (defaultTabs && defaultTabs.length > 0) return defaultTabs;

    if (userRole === "super_admin") {
      return [
        { id: "all", label: `All (${notifications.length})` },
        { id: "unread", label: `Unread (${unreadCount})`, filterFn: (n) => !n.isRead },
        {
          id: "expiry",
          label: "Subscription Expiry",
          filterFn: (n) =>
            n.metadata?.targetType === "subscription_expiry" ||
            n.title?.toLowerCase().includes("expiring") ||
            n.title?.toLowerCase().includes("subscription"),
        },
        { id: "system", label: "System Notices", filterFn: (n) => n.type === "notice" },
      ];
    }

    if (userRole === "admin" || (userRole as string) === "school_admin") {
      return [
        { id: "all", label: `All (${notifications.length})` },
        { id: "unread", label: `Unread (${unreadCount})`, filterFn: (n) => !n.isRead },
        { id: "notice", label: "Notices", filterFn: (n) => n.type === "notice" },
        { id: "rule", label: "Rules & Policies", filterFn: (n) => n.type === "rule" },
        {
          id: "billing",
          label: "Billing & Plans",
          filterFn: (n) =>
            n.title?.toLowerCase().includes("plan") ||
            n.title?.toLowerCase().includes("subscription") ||
            n.title?.toLowerCase().includes("recharge"),
        },
      ];
    }

    if (userRole === "teacher") {
      return [
        { id: "all", label: `All (${notifications.length})` },
        { id: "unread", label: `Unread (${unreadCount})`, filterFn: (n) => !n.isRead },
        { id: "homework", label: "Homework", filterFn: (n) => n.type === "homework" },
        { id: "notice", label: "School Notices", filterFn: (n) => n.type === "notice" },
        { id: "timetable", label: "Timetable & Bells", filterFn: (n) => n.type === "timetable" },
      ];
    }

    return [
      { id: "all", label: `All (${notifications.length})` },
      { id: "unread", label: `Unread (${unreadCount})`, filterFn: (n) => !n.isRead },
      { id: "homework", label: "Homework", filterFn: (n) => n.type === "homework" },
      { id: "notice", label: "Notices", filterFn: (n) => n.type === "notice" },
      { id: "rule", label: "Policies", filterFn: (n) => n.type === "rule" },
    ];
  }, [defaultTabs, userRole, notifications.length, unreadCount]);

  // Filtered list
  const filteredList = useMemo(() => {
    const currentTabObj = tabs.find((t) => t.id === activeTab);
    return notifications.filter((n) => {
      if (currentTabObj && currentTabObj.filterFn) {
        if (!currentTabObj.filterFn(n)) return false;
      } else if (activeTab === "unread" && n.isRead) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        const matchesSender = (n.senderName || "").toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesSender;
      }
      return true;
    });
  }, [notifications, activeTab, tabs, searchQuery]);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!schoolId || !user.uid) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(schoolId, user.uid, unreadIds);
    }
  };

  // Mark single as read & navigate
  const handleNotificationClick = async (item: UserNotificationView) => {
    if (!item.isRead && schoolId && user.uid) {
      await markNotificationAsRead(schoolId, item.id, user.uid);
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  // Format Relative Date
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
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateMs));
  };

  const getIcon = (type: NotificationEventType) => {
    switch (type) {
      case "notice":
        return <Megaphone className="h-5 w-5 text-blue-500" />;
      case "homework":
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      case "rule":
        return <ShieldCheck className="h-5 w-5 text-amber-500" />;
      case "timetable":
        return <Clock className="h-5 w-5 text-cyan-500" />;
      case "fine_reward":
        return <Award className="h-5 w-5 text-emerald-500" />;
      case "event":
        return <Calendar className="h-5 w-5 text-rose-500" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-3 sm:px-0">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2 backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 animate-pulse text-rose-300" />
            <span>Realtime Live Notification Center</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-lg">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {createActionHref && createActionLabel && (
            <Link
              href={createActionHref}
              className="px-3.5 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{createActionLabel}</span>
            </Link>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All ({unreadCount}) Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Connecting to realtime notifications...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              You&rsquo;re all caught up!
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching notifications found. Live updates will automatically appear here in real time.
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col sm:flex-row items-start justify-between gap-4 group ${
                !item.isRead
                  ? "bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-900/40 shadow-xs"
                  : "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800/80 opacity-80 hover:opacity-100"
              }`}
            >
              {!item.isRead && (
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
              )}

              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`text-sm tracking-tight ${
                        !item.isRead
                          ? "font-extrabold text-slate-900 dark:text-white"
                          : "font-semibold text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.title}
                    </h2>

                    {item.isLive && !item.isRead && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    )}

                    {item.priority === "urgent" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                        Urgent
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span>By {item.senderName || "Admin"}</span>
                    <span>•</span>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {item.link && (
                <div className="self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                    <span>{item.actionLabel || "View Details"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
