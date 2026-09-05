"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Building2,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Power,
  Globe,
  Loader2,
  Laptop,
  Smartphone,
  Tablet,
  Copy,
  Check,
  Eye,
  LogOut,
  AlertTriangle,
  X,
  UserCheck,
  KeyRound,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAllSchools, subscribeToAllSchools } from "@/lib/services/school.service";
import {
  subscribeToActivityLogs,
  subscribeToLoginLogs,
  subscribeToAuditLogs,
  subscribeToActiveSessions,
} from "@/lib/services/audit.service";
import { subscribeToAllUsers } from "@/lib/services/school.service";
import type {
  ActivityLogEntry,
  LoginLogEntry,
  AuditLogEntry,
  ActiveSessionEntry,
  School,
  AppUser,
  UserRole,
} from "@/types";
import { toast } from "sonner";

export default function PlatformActivityPage() {
  const { profile: currentUser } = useAuth();

  // 4 Primary Views
  const [activeTab, setActiveTab] = useState<"activity" | "logins" | "sessions" | "security">("activity");

  // Real-time Data Stores
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionEntry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Drawer / Inspection State
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Session Action Modal States
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState<"REVOKE_SESSION" | "FORCE_LOGOUT" | null>(null);
  const [targetSession, setTargetSession] = useState<ActiveSessionEntry | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Realtime Subscriptions
  useEffect(() => {
    setLoading(true);

    const unsubActivity = subscribeToActivityLogs((data) => {
      setActivityLogs(data);
      setLoading(false);
    }, 100);

    const unsubLogins = subscribeToLoginLogs((data) => {
      setLoginLogs(data);
    }, 100);

    const unsubAudits = subscribeToAuditLogs((data) => {
      setAuditLogs(data);
    }, 100);

    const unsubSessions = subscribeToActiveSessions((data) => {
      setActiveSessions(data);
    }, 100);

    const unsubUsers = subscribeToAllUsers((data) => {
      setUsers(data);
    });

    const unsubSchools = subscribeToAllSchools((data) => {
      setSchools(data);
    });

    return () => {
      unsubActivity();
      unsubLogins();
      unsubAudits();
      unsubSessions();
      unsubUsers();
      unsubSchools();
    };
  }, []);

  const schoolMap = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach((s) => map.set(s.id, s));
    return map;
  }, [schools]);

  const getTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === "number") return val;
    if (val.toMillis) return val.toMillis();
    if (val.toDate) return val.toDate().getTime();
    if (typeof val === "string") {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getRelativeTime = (val: any) => {
    const ms = getTimestampMs(val);
    if (!ms) return "—";
    const diffMins = Math.floor((Date.now() - ms) / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString();
  };

  // 7 Top KPIs computation
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const fifteenMinsAgo = now - 15 * 60 * 1000;

    let activeUsers = 0;
    let onlineNow = 0;
    let suspendedUsers = 0;
    let loginsToday = 0;
    let failedLogins = 0;
    let activeSessionsCount = 0;
    let securityEvents = 0;

    users.forEach((u) => {
      if (u.status === "active") activeUsers++;
      if (u.status === "suspended" || u.status === "blocked" || u.status === "disabled") suspendedUsers++;
      const ms = getTimestampMs((u as any).lastActiveAt || (u as any).lastLoginAt || u.updatedAt);
      if (ms >= fifteenMinsAgo) onlineNow++;
    });

    activeSessions.forEach((s) => {
      if (s.status === "active") activeSessionsCount++;
    });

    loginLogs.forEach((l) => {
      const ms = getTimestampMs(l.timestamp);
      if (ms >= oneDayAgo) {
        if (l.status === "success") loginsToday++;
        if (l.status === "failed") failedLogins++;
      }
    });

    auditLogs.forEach((a) => {
      const ms = getTimestampMs(a.timestamp);
      if (ms >= oneDayAgo) securityEvents++;
    });

    return {
      activeUsers,
      onlineNow,
      loginsToday,
      failedLogins,
      activeSessions: activeSessionsCount,
      suspendedUsers,
      securityEvents,
    };
  }, [users, activeSessions, loginLogs, auditLogs]);

  // Unified items list based on current activeTab
  const currentTabItems = useMemo(() => {
    if (activeTab === "activity") return activityLogs;
    if (activeTab === "logins") return loginLogs;
    if (activeTab === "sessions") return activeSessions;
    if (activeTab === "security") return auditLogs;
    return [];
  }, [activeTab, activityLogs, loginLogs, activeSessions, auditLogs]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const now = Date.now();
    return currentTabItems.filter((item: any) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          (item.userName || item.targetName || item.actorName || "").toLowerCase().includes(q) ||
          (item.userEmail || item.email || item.targetEmail || item.actorEmail || "").toLowerCase().includes(q) ||
          (item.userId || item.uid || item.targetId || item.actorId || "").toLowerCase().includes(q) ||
          (item.schoolId || "").toLowerCase().includes(q) ||
          (item.schoolName || "").toLowerCase().includes(q) ||
          (item.ipAddress || "").toLowerCase().includes(q) ||
          (item.action || "").toLowerCase().includes(q) ||
          (item.sessionId || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      // School filter
      if (selectedSchool !== "all") {
        if (selectedSchool === "none") {
          if (item.schoolId) return false;
        } else if (item.schoolId !== selectedSchool) {
          return false;
        }
      }

      // Role filter
      if (selectedRole !== "all") {
        const itemRole = item.role || item.actorRole || item.performedBy?.role;
        if (itemRole !== selectedRole) return false;
      }

      // Action filter
      if (selectedAction !== "all") {
        if (item.action !== selectedAction) return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        if (item.status !== selectedStatus) return false;
      }

      // Time Range filter
      if (selectedTimeRange !== "all") {
        const ms = getTimestampMs(item.timestamp || item.startedAt);
        if (!ms) return true;
        if (selectedTimeRange === "today" && now - ms > 24 * 60 * 60 * 1000) return false;
        if (selectedTimeRange === "week" && now - ms > 7 * 24 * 60 * 60 * 1000) return false;
        if (selectedTimeRange === "month" && now - ms > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [currentTabItems, search, selectedSchool, selectedRole, selectedAction, selectedStatus, selectedTimeRange]);

  // Pagination slice
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    return filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Identifier copied to clipboard");
  };

  const openInspectDrawer = (item: any) => {
    setSelectedEvent(item);
    setDrawerOpen(true);
  };

  const handleSessionAction = async () => {
    if (!currentUser || !targetSession || !modalActionType) return;
    setActionSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/activity/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modalActionType,
          performerUid: currentUser.uid,
          sessionId: targetSession.sessionId,
          targetUserId: targetSession.userId,
          reason: actionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute session action");

      toast.success(data.message || "Session action executed successfully");
      setActionModalOpen(false);
      setTargetSession(null);
      setActionReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to execute session action");
    } finally {
      setActionSubmitting(false);
    }
  };

  // Device icon helper
  const getDeviceIcon = (deviceType?: string) => {
    if (deviceType === "mobile") return <Smartphone className="h-4 w-4 text-gray-400" />;
    if (deviceType === "tablet") return <Tablet className="h-4 w-4 text-gray-400" />;
    return <Laptop className="h-4 w-4 text-gray-400" />;
  };

  // Role badge helper
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200/50">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        );
      case "school_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200/50">
            <Shield className="h-3 w-3" />
            School Admin
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200/50">
            <BookOpen className="h-3 w-3" />
            Teacher
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/50">
            <GraduationCap className="h-3 w-3" />
            Student
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            System
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Activity & Session Monitoring Center
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live multi-tenant timeline, authentication attempts, session revocation, and security audit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 400);
              toast.success("Realtime feeds refreshed");
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 7 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Active Users */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Users</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Valid Accounts</p>
        </div>

        {/* Online Now */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Online Now</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.onlineNow}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">&lt; 15 min active</p>
        </div>

        {/* Logins Today */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Logins Today</span>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.loginsToday}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Past 24 hours</p>
        </div>

        {/* Failed Logins */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Failed Logins</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{stats.failedLogins}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Security warnings</p>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Sessions</span>
            <Laptop className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.activeSessions}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Live Client Tokens</p>
        </div>

        {/* Suspended Users */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Suspended</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.suspendedUsers}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Restricted access</p>
        </div>

        {/* Security Events */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Security Events</span>
            <Shield className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.securityEvents}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Audit triggers</p>
        </div>
      </div>

      {/* 4 Views Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar">
        {[
          { id: "activity", label: "Activity Log", count: activityLogs.length },
          { id: "logins", label: "Login Attempts", count: loginLogs.length },
          { id: "sessions", label: "Active Sessions", count: activeSessions.length },
          { id: "security", label: "Security Events", count: auditLogs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setCurrentPage(1);
            }}
            className={`whitespace-nowrap flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Email, UID, School, IP, Action..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-xs md:text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* School Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Schools</option>
              <option value="none">Platform Global</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id.slice(0, 6)})
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="school_admin">School Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success / Active</option>
              <option value="failed">Failed / Revoked</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Time</option>
              <option value="today">Today (&lt; 24h)</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Feed Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-16">
            <Activity className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No activity records found
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria or resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-3 font-semibold">Role</th>
                  <th className="py-3 px-3 font-semibold">School Scope</th>
                  {activeTab === "sessions" ? (
                    <>
                      <th className="py-3 px-3 font-semibold">Client Device / IP</th>
                      <th className="py-3 px-3 font-semibold">Started</th>
                      <th className="py-3 px-3 font-semibold">Last Active</th>
                      <th className="py-3 px-3 font-semibold">Session Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-3 font-semibold">Action / Event</th>
                      <th className="py-3 px-3 font-semibold">Device & Browser</th>
                      <th className="py-3 px-3 font-semibold">IP Address</th>
                      <th className="py-3 px-3 font-semibold">Time</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                {paginatedItems.map((item: any) => {
                  const itemSchool = item.schoolId ? schoolMap.get(item.schoolId) : null;
                  const itemUserRole = item.role || item.actorRole || item.performedBy?.role;
                  const itemUserName = item.userName || item.targetName || item.actorName || item.email || "User";
                  const itemUserEmail = item.userEmail || item.email || item.targetEmail || item.actorEmail || "";
                  const itemUserId = item.userId || item.uid || item.targetId || item.actorId || "";
                  const relativeTime = getRelativeTime(item.timestamp || item.startedAt);

                  return (
                    <tr
                      key={item.id || item.sessionId || Math.random().toString()}
                      className="hover:bg-gray-50/75 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group"
                      onClick={() => openInspectDrawer(item)}
                    >
                      {/* User Column */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs dark:bg-blue-950 dark:text-blue-300">
                            {(itemUserName || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            {itemUserId ? (
                              <Link
                                href={`/super-admin/users/${itemUserId}`}
                                className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
                              >
                                {itemUserName}
                              </Link>
                            ) : (
                              <span className="font-semibold text-gray-900 dark:text-white">{itemUserName}</span>
                            )}
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                              <span>{itemUserEmail}</span>
                              {itemUserId && (
                                <button
                                  onClick={() => handleCopyId(itemUserId)}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Copy UID"
                                >
                                  {copiedId === itemUserId ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">{getRoleBadge(itemUserRole)}</td>

                      {/* School Scope */}
                      <td className="py-3 px-3">
                        {item.schoolId ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {itemSchool ? itemSchool.name : item.schoolName || item.schoolId.slice(0, 8)}
                            </span>
                            {itemSchool?.code && (
                              <span className="text-[10px] text-blue-600 font-mono">
                                {itemSchool.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-purple-600 font-semibold text-[11px]">Platform Global</span>
                        )}
                      </td>

                      {/* TAB 3 SPECIFIC: SESSIONS */}
                      {activeTab === "sessions" ? (
                        <>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(item.deviceType || item.device)}
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.browser || "Chrome"} on {item.platform || "Desktop"}
                              </span>
                              <span className="text-gray-400 font-mono text-[11px]">
                                ({item.ipAddress || "—"})
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {getRelativeTime(item.startedAt)}
                          </td>

                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {getRelativeTime(item.lastActiveAt || item.startedAt)}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-gray-100 text-gray-600 border border-gray-200/60 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                                }`}
                              />
                              {item.status === "active" ? "Active" : "Revoked"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {item.status === "active" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setTargetSession(item);
                                    setModalActionType("REVOKE_SESSION");
                                    setActionReason("");
                                    setActionModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20"
                                  title="Revoke only this session"
                                >
                                  <Power className="h-3 w-3" />
                                  Revoke
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetSession(item);
                                    setModalActionType("FORCE_LOGOUT");
                                    setActionReason("");
                                    setActionModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20"
                                  title="Force logout all user sessions"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Force Logout
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      ) : (
                        /* TABS 1, 2, 4: ACTIVITY, LOGINS, SECURITY */
                        <>
                          {/* Action / Event */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {item.action || "EVENT"}
                            </span>
                          </td>

                          {/* Device & Browser */}
                          <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              {getDeviceIcon(item.deviceType || item.device)}
                              <span>{item.browser || "Browser"}</span>
                              {item.platform && <span className="text-gray-400">({item.platform})</span>}
                            </div>
                          </td>

                          {/* IP Address */}
                          <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                            {item.ipAddress || "—"}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-3 text-gray-500 font-mono">
                            {relativeTime}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.status === "success" || !item.failureReason
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50"
                              }`}
                            >
                              {item.status === "success" || !item.failureReason ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {item.status === "success" || !item.failureReason ? "Success" : "Failed"}
                            </span>
                          </td>

                          {/* Inspect Action */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openInspectDrawer(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              <Eye className="h-3 w-3 text-blue-600" />
                              Inspect
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/30 text-xs text-gray-500">
          <div>
            Showing <span className="font-semibold">{paginatedItems.length}</span> of{" "}
            <span className="font-semibold">{filteredItems.length}</span> events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="font-mono font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* EVENT INSPECTOR DRAWER */}
      {drawerOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl h-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 border border-purple-200/50">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Event Details Inspector
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {selectedEvent.id || selectedEvent.sessionId || "event-record"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Event Summary Box */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Action Type</span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                    {selectedEvent.action || "SESSION"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Execution Status</span>
                  <span
                    className={`font-semibold ${
                      selectedEvent.status === "success" || !selectedEvent.failureReason
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {(selectedEvent.status || "success").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 uppercase font-semibold text-[10px]">Event Timestamp</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {selectedEvent.timestamp?.toDate
                      ? selectedEvent.timestamp.toDate().toLocaleString()
                      : new Date(getTimestampMs(selectedEvent.timestamp || selectedEvent.startedAt)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* User / Performer Section */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Actor & Target Identification
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
                  <div>
                    <span className="text-gray-400 text-[10px]">User Name</span>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                      {selectedEvent.userName || selectedEvent.targetName || selectedEvent.actorName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px]">Email Address</span>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                      {selectedEvent.userEmail || selectedEvent.email || selectedEvent.targetEmail || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px]">User ID (UID)</span>
                    <p className="font-mono text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                      {selectedEvent.userId || selectedEvent.uid || selectedEvent.targetId || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px]">Role</span>
                    <p className="mt-0.5">{getRoleBadge(selectedEvent.role || selectedEvent.actorRole)}</p>
                  </div>
                </div>
              </div>

              {/* Client & Connection Metadata */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Client Connection & Environment
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900">
                  <div>
                    <span className="text-gray-400 text-[10px]">IP Address</span>
                    <p className="font-mono text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedEvent.ipAddress || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px]">Device & OS</span>
                    <p className="text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedEvent.deviceType || selectedEvent.device || "Desktop"} / {selectedEvent.platform || "OS"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 text-[10px]">User Agent</span>
                    <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 break-all">
                      {selectedEvent.userAgent || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Failure / Reason Details */}
              {(selectedEvent.failureReason || selectedEvent.reason) && (
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Reason & Audit Notes
                  </h3>
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
                    {selectedEvent.failureReason || selectedEvent.reason}
                  </div>
                </div>
              )}

              {/* State Diff (if audit log) */}
              {selectedEvent.previousState && selectedEvent.newState && (
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                    State Change Diff
                  </h3>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-3 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                      <span className="text-red-500 font-bold">PREVIOUS STATE:</span>
                      <pre className="text-gray-500 overflow-x-auto mt-1">
                        {JSON.stringify(selectedEvent.previousState, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-emerald-500 font-bold">NEW STATE:</span>
                      <pre className="text-gray-700 dark:text-gray-300 overflow-x-auto mt-1">
                        {JSON.stringify(selectedEvent.newState, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SESSION ACTION CONFIRMATION MODAL */}
      {actionModalOpen && targetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {modalActionType === "REVOKE_SESSION" ? "Revoke Active Session" : "Force Logout User Across All Sessions"}
                </h2>
              </div>
              <button
                onClick={() => setActionModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSessionAction();
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Target: {targetSession.userEmail} ({targetSession.role})
                </p>
                <p className="text-gray-500 font-mono">UID: {targetSession.userId}</p>
                <p className="text-gray-500">
                  Client: {targetSession.browser} on {targetSession.platform} ({targetSession.ipAddress})
                </p>
                <p className="text-rose-600 font-semibold mt-2">
                  {modalActionType === "REVOKE_SESSION"
                    ? "This will invalidate this specific session's refresh token and disconnect the user."
                    : "This will revoke all active refresh tokens for this user and force instant sign-out across all devices."}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300">
                  Mandatory Compliance Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide audit justification for session termination..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Revocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
