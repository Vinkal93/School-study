"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  BarChart3,
  Loader2,
  IndianRupee,
  CreditCard,
  Layers,
  Sparkles,
  Zap,
  Calendar,
  Search,
  Eye,
  X,
  FileText,
  AlertCircle,
  PieChart,
  Laptop,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { AUDIT_COLLECTIONS } from "@/lib/services/audit.service";
import type {
  PlatformIntelligenceData,
  AnalyticsFilterState,
  AnalyticsDatePreset,
} from "@/types";
import { toast } from "sonner";

export default function PlatformAnalyticsPage() {
  const { profile: currentUser } = useAuth();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "schools" | "usage" | "plans" | "finance" | "features"
  >("overview");

  // Filter States
  const [preset, setPreset] = useState<AnalyticsDatePreset>("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");

  // Data & Loading States
  const [data, setData] = useState<PlatformIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Real-time live counts
  const [liveOnlineCount, setLiveOnlineCount] = useState<number>(0);
  const [liveActiveSessionCount, setLiveActiveSessionCount] = useState<number>(0);
  const [liveSchoolsCount, setLiveSchoolsCount] = useState<number>(0);
  const [liveUsersCount, setLiveUsersCount] = useState<number>(0);

  // School Inspection Drawer
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);

  // Fetch Full Analytics Payload
  const loadAnalytics = useCallback(async (isSilent: boolean = false) => {
    if (!currentUser?.uid) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("performerUid", currentUser.uid);
      params.set("preset", preset);
      if (preset === "custom" && startDate) params.set("startDate", startDate);
      if (preset === "custom" && endDate) params.set("endDate", endDate);
      if (schoolFilter !== "all") params.set("schoolId", schoolFilter);
      if (planFilter !== "all") params.set("planId", planFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (featureFilter !== "all") params.set("feature", featureFilter);

      const res = await fetch(`/api/super-admin/analytics?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load platform intelligence");
      }

      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastRefreshedAt(new Date());
      }
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      toast.error(err.message || "Failed to load platform analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.uid, preset, startDate, endDate, schoolFilter, planFilter, roleFilter, featureFilter]);

  // Initial & Filter-Change Fetch
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Real-time Firestore onSnapshot Subscriptions for Live Operational Telemetry
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;

    // 1. Live Users & Online Now
    const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), (snap) => {
      setLiveUsersCount(snap.size);
      const now = Date.now();
      const ms15m = 15 * 60 * 1000;
      let online = 0;
      snap.docs.forEach((d) => {
        const u = d.data();
        const lastActive = u.lastActive?.toMillis ? u.lastActive.toMillis() : u.lastActive || 0;
        if (now - lastActive <= ms15m) online++;
      });
      setLiveOnlineCount(online);
    });

    // 2. Live Schools
    const unsubSchools = onSnapshot(collection(db, COLLECTIONS.SCHOOLS), (snap) => {
      setLiveSchoolsCount(snap.size);
    });

    // 3. Live Active Sessions
    const unsubSessions = onSnapshot(collection(db, AUDIT_COLLECTIONS.ACTIVE_SESSIONS), (snap) => {
      let activeSess = 0;
      snap.docs.forEach((d) => {
        if (d.data().status === "active") activeSess++;
      });
      setLiveActiveSessionCount(activeSess);
    });

    return () => {
      unsubUsers();
      unsubSchools();
      unsubSessions();
    };
  }, []);

  // Format INR Currency
  const formatINR = (paise: number) => {
    const rupees = Math.round(paise / 100);
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;
    return `₹${rupees.toLocaleString("en-IN")}`;
  };

  // Distinct Schools for Filter Dropdown
  const schoolOptions = useMemo(() => {
    if (!data) return [];
    return data.schools.newRegistrations.map((s) => ({ id: s.id, name: s.name }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Computing Platform Operational & Financial Intelligence...
          </p>
          <p className="text-xs text-gray-500">Aggregating schools, telemetry, and subscriptions</p>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {
    totalSchools: liveSchoolsCount,
    activeSchools: 0,
    newSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeUsers: liveUsersCount,
    onlineUsers: liveOnlineCount,
    dau: 0,
    mau: 0,
    totalRevenuePaise: 0,
    subscriptionCount: 0,
    trialSchools: 0,
    expiredSubscriptions: 0,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* 1. CLASSIC SUPER ADMIN HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" />
            <span>Super Admin Command</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span>Platform Intelligence</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Analytics & Platform Intelligence Center
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time multi-tenant observability, telemetry, financial health & school performance intelligence.
          </p>
        </div>

        {/* Live Indicator & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Online: {liveOnlineCount || overview.onlineUsers}</span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>Sessions: {liveActiveSessionCount || data?.usage.activeSessions || 0}</span>
          </div>

          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. GLOBAL CONTROLS & FILTER BAR */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
        {/* Date Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Range:
            </span>
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "this_month", label: "This Month" },
                { key: "this_year", label: "This Year" },
                { key: "custom", label: "Custom" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  preset === p.key
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Updated: {lastRefreshedAt.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* School Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              School Tenant
            </label>
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All School Tenants</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Subscription Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              User Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="school_admin">School Admins</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </div>

          {/* Feature Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
              Platform Feature
            </label>
            <select
              value={featureFilter}
              onChange={(e) => setFeatureFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            >
              <option value="all">All Features</option>
              <option value="students">Student Management</option>
              <option value="attendance">Attendance Tracking</option>
              <option value="fees">Fees & Invoicing</option>
              <option value="homework">Homework & Tasks</option>
              <option value="reports">Reports & Analytics</option>
              <option value="exams">Exams & Grading</option>
              <option value="notices">Notices & Broadcasts</option>
              <option value="timetable">Bell & Timetable</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs if custom preset */}
        {preset === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              />
            </div>
            <button
              onClick={() => loadAnalytics()}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
            >
              Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {[
          { id: "overview", label: "Executive Overview", icon: BarChart3 },
          { id: "schools", label: "School Intelligence", icon: Building2 },
          { id: "usage", label: "User & Usage Telemetry", icon: Activity },
          { id: "plans", label: "Plan & Subscriptions", icon: Layers },
          { id: "finance", label: "Financial Intelligence", icon: IndianRupee },
          { id: "features", label: "Feature Adoption", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 12 TOP KPI METRIC CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {/* 1. Total Schools */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Schools</span>
                <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.totalSchools}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Registered campus tenants</p>
            </div>

            {/* 2. Active Schools */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Schools</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {overview.activeSchools}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Operational status</p>
            </div>

            {/* 3. New Schools */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">New Schools</span>
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {overview.newSchools}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">In selected period</p>
            </div>

            {/* 4. Total Students */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
                <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.totalStudents}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Enrolled learners</p>
            </div>

            {/* 5. Total Teachers */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Teachers</span>
                <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.totalTeachers}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Enrolled faculty</p>
            </div>

            {/* 6. Active Users */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Users</span>
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.activeUsers}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Permitted accounts</p>
            </div>

            {/* 7. Online Users */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Online Now</span>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {overview.onlineUsers}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Telemetry &lt; 15 min</p>
            </div>

            {/* 8. DAU (Daily Active) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">DAU</span>
                <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.dau}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Active in last 24h</p>
            </div>

            {/* 9. MAU (Monthly Active) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">MAU</span>
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.mau}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Active in last 30d</p>
            </div>

            {/* 10. Platform Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
                <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatINR(overview.totalRevenuePaise)}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Authoritative collected</p>
            </div>

            {/* 11. Subscriptions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Subscriptions</span>
                <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {overview.subscriptionCount}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Active paid & trial</p>
            </div>

            {/* 12. Trial & Expired */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Trial / Expired</span>
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {overview.trialSchools} / {overview.expiredSubscriptions}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">Trial / Expired counts</p>
            </div>
          </div>

          {/* EXECUTIVE HIGHLIGHTS & PLATFORM HEALTH */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Executive Growth Card */}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Platform Operational Velocity & Health
                  </h3>
                  <p className="text-xs text-gray-500">Authoritative multi-tenant telemetry and usage</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {preset.toUpperCase()} Window
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-500">School Active Rate</div>
                  <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {overview.totalSchools > 0
                      ? Math.round((overview.activeSchools / overview.totalSchools) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">High operational uptime</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-500">DAU / MAU Stickiness</div>
                  <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {data?.usage.dauMauRatio || 0}%
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Platform user retention</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-500">Est. MRR</div>
                  <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(data?.finance.estimatedMrrPaise || 0)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Recurring subscription run-rate</div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <div className="text-xs text-gray-500">Payment Success Rate</div>
                  <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {data?.finance.successfulPaymentsCount && data.finance.successfulPaymentsCount + data.finance.failedPaymentsCount > 0
                      ? Math.round(
                          (data.finance.successfulPaymentsCount /
                            (data.finance.successfulPaymentsCount + data.finance.failedPaymentsCount)) *
                            100
                        )
                      : 100}
                    %
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Payment gateway reliability</div>
                </div>
              </div>

              {/* Quick Navigation Shortcuts */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                <Link
                  href="/super-admin/schools"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <span>School Command Center</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <Link
                  href="/super-admin/users"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <span>Global Users Directory</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <Link
                  href="/super-admin/activity"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <span>Activity & Session Monitoring</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <Link
                  href="/super-admin/billing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <span>Platform Billing Hub</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* School Health Distribution */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  School Tenant Status
                </h3>
                <p className="text-xs text-gray-500">Tenant status & lifecycle breakdown</p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700 dark:text-emerald-400">Active Campuses</span>
                    <span>{data?.schools.activeVsInactive.active || 0}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${
                          overview.totalSchools > 0
                            ? ((data?.schools.activeVsInactive.active || 0) / overview.totalSchools) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600 dark:text-amber-400">Trial Campuses</span>
                    <span>{data?.schools.activeVsInactive.trial || 0}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${
                          overview.totalSchools > 0
                            ? ((data?.schools.activeVsInactive.trial || 0) / overview.totalSchools) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-red-600 dark:text-red-400">Inactive / Suspended</span>
                    <span>
                      {(data?.schools.activeVsInactive.inactive || 0) +
                        (data?.schools.activeVsInactive.suspended || 0)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{
                        width: `${
                          overview.totalSchools > 0
                            ? (((data?.schools.activeVsInactive.inactive || 0) +
                                (data?.schools.activeVsInactive.suspended || 0)) /
                                overview.totalSchools) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHOOL INTELLIGENCE */}
      {activeTab === "schools" && (
        <div className="space-y-6">
          {/* Growth & Distribution Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* School Growth Timeline Chart */}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    School Registration Growth
                  </h3>
                  <p className="text-xs text-gray-500">Cumulative campus additions over time</p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Total: {overview.totalSchools} Schools
                </span>
              </div>

              {/* Lightweight SVG Bar Chart */}
              <div className="pt-4">
                <div className="flex items-end justify-between gap-2 h-44 px-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                  {data?.schools.growth.map((pt, i) => {
                    const maxVal = Math.max(...(data?.schools.growth.map((g) => g.count) || [1]), 1);
                    const heightPct = Math.max(10, Math.round((pt.count / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {pt.count}
                        </span>
                        <div
                          className="w-full max-w-[36px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all group-hover:from-blue-500 group-hover:to-indigo-400"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {pt.date}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Plan Distribution Breakdown */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-600" />
                  Schools by Plan
                </h3>
                <p className="text-xs text-gray-500">Tier distribution across platform</p>
              </div>

              <div className="space-y-3 pt-2">
                {data?.schools.schoolsByPlan.map((p) => (
                  <div key={p.planId} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize">{p.planName}</span>
                      <span className="text-gray-500">
                        {p.count} ({p.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MOST ACTIVE SCHOOLS TABLE */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Most Active School Tenants
                </h3>
                <p className="text-xs text-gray-500">Ranked by combined operational activity & login volume</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                  <tr>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Active Users</th>
                    <th className="py-3 px-4">Activities</th>
                    <th className="py-3 px-4">Logins</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data?.schools.mostActiveSchools.map((s, idx) => (
                    <tr key={s.schoolId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            #{idx + 1}
                          </span>
                          <span>{s.schoolName}</span>
                        </div>
                        <div className="font-mono text-xs text-gray-500">{s.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase">
                          {s.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {s.activeUserCount}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {s.activityCount}
                      </td>
                      <td className="py-3 px-4 font-mono">{s.loginCount}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{s.lastActivity}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSchool(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data?.schools.mostActiveSchools || data.schools.mostActiveSchools.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No school operational records found for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* INACTIVE SCHOOLS WATCHLIST */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Inactive Schools Watchlist
              </h3>
              <p className="text-xs text-gray-500">Schools with zero recent logins or operational activity</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                  <tr>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Days Inactive</th>
                    <th className="py-3 px-4">Last Telemetry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data?.schools.inactiveSchools.map((s) => (
                    <tr key={s.schoolId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{s.schoolName}</div>
                        <div className="font-mono text-xs text-gray-500">{s.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400 capitalize">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold uppercase">{s.plan}</td>
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">
                        {s.daysInactive >= 999 ? "Never Active" : `${s.daysInactive} days`}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{s.lastActivity}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/super-admin/schools/${s.schoolId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(!data?.schools.inactiveSchools || data.schools.inactiveSchools.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        All school campuses are actively participating with regular telemetry!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER & USAGE TELEMETRY */}
      {activeTab === "usage" && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">DAU / MAU Stickiness</span>
              <div className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                {data?.usage.dauMauRatio || 0}%
              </div>
              <p className="mt-1 text-xs text-gray-500">Daily active user ratio to monthly active</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Logins</span>
              <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {data?.usage.totalLogins || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Successful authentications</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Failed Logins</span>
              <div className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {data?.usage.failedLogins || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Disallowed authentication attempts</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Client Sessions</span>
              <div className="mt-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                {liveActiveSessionCount || data?.usage.activeSessions || 0}
              </div>
              <p className="mt-1 text-xs text-gray-500">Simultaneous active devices</p>
            </div>
          </div>

          {/* Module Activity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Module Activity Counters */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Module Operational Activity
                </h3>
                <p className="text-xs text-gray-500">Activity logs recorded across platform functional modules</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: "Attendance Tracking", count: data?.usage.moduleUsage.attendance || 0, icon: CheckCircle },
                  { label: "Homework & Tasks", count: data?.usage.moduleUsage.homework || 0, icon: FileText },
                  { label: "Fees & Billing", count: data?.usage.moduleUsage.fees || 0, icon: IndianRupee },
                  { label: "Notices & Alerts", count: data?.usage.moduleUsage.notices || 0, icon: AlertCircle },
                  { label: "Reports & Exports", count: data?.usage.moduleUsage.reports || 0, icon: BarChart3 },
                  { label: "Exams & Grading", count: data?.usage.moduleUsage.exams || 0, icon: GraduationCap },
                  { label: "Bell & Timetable", count: data?.usage.moduleUsage.timetable || 0, icon: Clock },
                  { label: "Settings & Config", count: data?.usage.moduleUsage.settings || 0, icon: Shield },
                ].map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <div key={mod.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="text-xs font-semibold">{mod.label}</span>
                        <Icon className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {mod.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Trends Chart */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  7-Day Telemetry Trend
                </h3>
                <p className="text-xs text-gray-500">Daily login volume and user operational activities</p>
              </div>

              <div className="space-y-4 pt-4">
                {data?.usage.dailyTrends.map((t, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">{t.date}</span>
                      <span className="text-gray-500">
                        {t.logins} logins • {t.activities} activities
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex gap-0.5">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, t.logins * 10)}%` }}
                      />
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(100, t.activities * 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLAN & SUBSCRIPTIONS */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          {/* Plan Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.plans.schoolsPerPlan.map((p) => (
              <div
                key={p.planId}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase">
                    {p.planName}
                  </span>
                  <span className="text-xs font-bold text-gray-500">{p.percentage}% of schools</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {p.count} <span className="text-sm font-normal text-gray-500">Schools</span>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between text-xs">
                  <span className="text-gray-500">Estimated Plan MRR:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(p.mrrPaise)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Expiring Subscriptions Warning Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Expiring Subscriptions (Next 30 Days)
                </h3>
                <p className="text-xs text-gray-500">Campuses due for renewal or billing intervention</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {data?.plans.expiringSubscriptions30d.length || 0} Expiring Soon
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                  <tr>
                    <th className="py-3 px-4">School</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Days Remaining</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data?.plans.expiringSubscriptions30d.map((sub) => (
                    <tr key={sub.schoolId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {sub.schoolName}
                      </td>
                      <td className="py-3 px-4 uppercase text-xs font-bold text-blue-600">
                        {sub.planId}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">{sub.expiresAt}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            sub.daysRemaining <= 7
                              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {sub.daysRemaining} days remaining
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/super-admin/schools/${sub.schoolId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>Extend / Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(!data?.plans.expiringSubscriptions30d || data.plans.expiringSubscriptions30d.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No active subscriptions are expiring within the next 30 days!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL INTELLIGENCE */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Revenue</span>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatINR(data?.finance.grossRevenuePaise || 0)}
              </div>
              <p className="mt-1 text-xs text-gray-500">Total collected before deductions</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Collected</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(data?.finance.netRevenuePaise || 0)}
              </div>
              <p className="mt-1 text-xs text-gray-500">Net after refunds & credits</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statutory GST (18%)</span>
              <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatINR(data?.finance.gstCollectedPaise || 0)}
              </div>
              <p className="mt-1 text-xs text-gray-500">Tax provision collected</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discounts Given</span>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatINR(data?.finance.discountsPaise || 0)}
              </div>
              <p className="mt-1 text-xs text-gray-500">Promotions & coupon reductions</p>
            </div>
          </div>

          {/* Payment Success Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Payment Gateway Telemetry
              </h3>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-700 dark:text-emerald-400">Captured Payments</span>
                  <span>{data?.finance.successfulPaymentsCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-red-600 dark:text-red-400">Failed Attempts</span>
                  <span>{data?.finance.failedPaymentsCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-amber-600 dark:text-amber-400">Refunds Processed</span>
                  <span>{data?.finance.refundsCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-indigo-600 dark:text-indigo-400">Coupon Redemptions</span>
                  <span>{data?.finance.couponUsageCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Platform Transactions */}
            <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-blue-600" />
                    Recent Platform Financial Transactions
                  </h3>
                  <p className="text-xs text-gray-500">Authoritative payments and recharge transactions ledger</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider dark:bg-gray-950 dark:text-gray-400">
                    <tr>
                      <th className="py-3 px-4">School</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {data?.finance.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                          {tx.schoolName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(tx.amountPaise)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              tx.status === "CAPTURED" || tx.status === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : tx.status === "FAILED"
                                ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-gray-500">{tx.date}</td>
                      </tr>
                    ))}
                    {(!data?.finance.recentTransactions || data.finance.recentTransactions.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No financial transactions recorded in the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FEATURE ADOPTION */}
      {activeTab === "features" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Feature Adoption & Utilization Matrix
              </h3>
              <p className="text-xs text-gray-500">Measure real utilization across modular platform features</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {data?.features.map((f) => (
                <div
                  key={f.featureKey}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{f.featureName}</h4>
                      <p className="text-[11px] text-gray-500">{f.description}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {f.adoptionPercentage}% Adoption
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${f.adoptionPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Active Schools: {f.activeSchoolsCount}</span>
                    <span>Total Events: {f.usageCount}</span>
                    <span className="font-semibold capitalize text-blue-600 dark:text-blue-400">
                      Trend: {f.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OVER SCHOOL DETAIL DRAWER */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSchool.schoolName}
                </h3>
                <p className="font-mono text-xs text-gray-500">{selectedSchool.code}</p>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-gray-800/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Subscription Plan:</span>
                  <span className="font-bold uppercase text-blue-600">{selectedSchool.plan}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Operational Score:</span>
                  <span className="font-bold text-emerald-600">{selectedSchool.score || 100}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Active Users:</span>
                  <span className="font-bold">{selectedSchool.activeUserCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Recorded Activities:</span>
                  <span className="font-bold">{selectedSchool.activityCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Recorded Logins:</span>
                  <span className="font-bold">{selectedSchool.loginCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last Telemetry:</span>
                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                    {selectedSchool.lastActivity}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/super-admin/schools/${selectedSchool.schoolId}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  <span>Open in School Command Center</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
