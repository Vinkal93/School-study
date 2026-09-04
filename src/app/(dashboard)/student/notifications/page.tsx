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
  Trash2,
  Filter,
  ArrowRight,
  Info,
  Radio,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notification.service";
import type { UserNotificationView, NotificationEventType } from "@/types/notification";

export default function StudentNotificationsPage() {
  const { profile, firebaseUser } = useAuth();
  const router = useRouter();

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

  const [notifications, setNotifications] = useState<UserNotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "homework" | "notice" | "rule">("all");
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

  // 2. Filter notifications
  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "unread" && n.isRead) return false;
      if (activeTab === "homework" && n.type !== "homework") return false;
      if (activeTab === "notice" && n.type !== "notice") return false;
      if (activeTab === "rule" && n.type !== "rule") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        const matchesSender = n.senderName.toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesSender;
      }
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // 3. Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!schoolId || !user.uid) return;
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(schoolId, user.uid, unreadIds);
    }
  };

  // 4. Mark single as read & navigate
  const handleNotificationClick = async (item: UserNotificationView) => {
    if (!item.isRead && schoolId && user.uid) {
      await markNotificationAsRead(schoolId, item.id, user.uid);
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  // 5. Format Relative Date
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

  // Icon mapping
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
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-2 backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 animate-pulse text-rose-300" />
            <span>Realtime Live Event Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-lg">
            Stay on top of new homework assignments, school circulars, schedule adjustments, and policies.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xs"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All ({unreadCount}) Read</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "homework", label: "Homework" },
            { id: "notice", label: "Notices" },
            { id: "rule", label: "Policies" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
            placeholder="Filter notifications..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Connecting to realtime notification feed...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              You&rsquo;re all caught up!
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching notifications found. New homework and school circulars will automatically pop up here in real time.
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col sm:flex-row items-start justify-between gap-4 group ${
                !item.isRead
                  ? "bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/60 shadow-xs"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60 border-slate-200/80 dark:border-slate-800"
              }`}
            >
              {/* Left Accent Stripe if Unread */}
              {!item.isRead && (
                <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />
              )}

              <div className="flex items-start gap-4 flex-1 min-w-0 pl-1">
                {/* Icon Badge */}
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 shadow-2xs">
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm tracking-tight ${!item.isRead ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-700 dark:text-slate-300"}`}>
                      {item.title}
                    </h3>

                    {/* LIVE badge */}
                    {item.isLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-2xs animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    )}

                    {/* Type badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>Issued by: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{item.senderName}</strong> ({item.senderRole})</span>
                    <span>•</span>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {item.actionLabel && (
                <div className="self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-transform group-hover:translate-x-0.5">
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
