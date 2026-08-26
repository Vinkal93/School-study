"use client";

import { useEffect, useState } from "react";
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
  ChevronRight,
  Filter,
  BarChart3,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchPlatformAnalytics } from "@/lib/services/super-admin.service";
import type {
  PlatformAnalyticsOverview,
  GrowthTimeframe,
  SchoolHealthStatus,
} from "@/types";
import { toast } from "sonner";

export default function PlatformAnalyticsPage() {
  const { profile: currentUser } = useAuth();
  const [data, setData] = useState<PlatformAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<GrowthTimeframe>("30d");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  const loadAnalytics = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const analyticsData = await fetchPlatformAnalytics();
      setData(analyticsData);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentUser?.uid]);

  const getHealthBadge = (health: SchoolHealthStatus) => {
    switch (health) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Healthy
          </span>
        );
      case "low_activity":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Low Activity
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Inactive
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Computing Platform Operational Analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentGrowth = data.growth[selectedTimeframe] || {
    schoolsGrown: 0,
    studentsGrown: 0,
    teachersGrown: 0,
    totalUsersGrown: 0,
  };

  const filteredSchools = data.schoolHealthList.filter((s) => {
    if (healthFilter === "all") return true;
    return s.health === healthFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Platform Operational Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live database aggregations, growth trajectory, and tenant operational health indexing.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Analytics
        </button>
      </div>

      {/* 6.1 Platform Dashboard Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Institutions</span>
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.totalSchools}</p>
          <p className="mt-1 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">{data.activeSchools} Active</span> · {data.inactiveSchools} Inactive
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Platform Users</span>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</p>
          <p className="mt-1 text-xs text-gray-500">
            <span className="text-green-600 font-semibold">{data.activeUsers} Verified Active</span>
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Students</span>
            <GraduationCap className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.totalStudents}</p>
          <p className="mt-1 text-xs text-gray-500">Enrolled across all schools</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Faculty Headcount</span>
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.totalTeachers}</p>
          <p className="mt-1 text-xs text-gray-500">
            <span className="text-blue-600 font-semibold">{data.totalAdmins} School Admins</span>
          </p>
        </div>
      </div>

      {/* 6.2 Growth Analytics Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Platform Growth Telemetry
            </h2>
            <p className="text-xs text-gray-500">
              Net new registrations and tenant onboardings over the selected timeframe.
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            {(["7d", "30d", "90d", "12m"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                  selectedTimeframe === tf
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                {tf === "7d"
                  ? "7 Days"
                  : tf === "30d"
                  ? "30 Days"
                  : tf === "90d"
                  ? "90 Days"
                  : "12 Months"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 dark:border-blue-900/20 dark:bg-blue-950/20">
            <span className="text-xs text-gray-500 font-medium">New Schools Onboarded</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                +{currentGrowth.schoolsGrown}
              </span>
              <span className="text-xs text-gray-400 font-mono">in last {selectedTimeframe}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/20 dark:bg-emerald-950/20">
            <span className="text-xs text-gray-500 font-medium">New Students Enrolled</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +{currentGrowth.studentsGrown}
              </span>
              <span className="text-xs text-gray-400 font-mono">in last {selectedTimeframe}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 dark:border-amber-900/20 dark:bg-amber-950/20">
            <span className="text-xs text-gray-500 font-medium">New Teachers Appointed</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                +{currentGrowth.teachersGrown}
              </span>
              <span className="text-xs text-gray-400 font-mono">in last {selectedTimeframe}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 dark:border-purple-900/20 dark:bg-purple-950/20">
            <span className="text-xs text-gray-500 font-medium">Total User Growth</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                +{currentGrowth.totalUsersGrown}
              </span>
              <span className="text-xs text-gray-400 font-mono">in last {selectedTimeframe}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6.3 School Health Index League Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              School Operational Health Index
            </h2>
            <p className="text-xs text-gray-500">
              Evaluated by login frequency, student/teacher enrollment, and active attendance records.
            </p>
          </div>

          {/* Health filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Health States</option>
              <option value="healthy">Healthy Only</option>
              <option value="low_activity">Low Activity Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="py-3.5 px-4 font-medium">School</th>
                <th className="py-3.5 px-4 font-medium">Health Status</th>
                <th className="py-3.5 px-4 font-medium">Students</th>
                <th className="py-3.5 px-4 font-medium">Teachers</th>
                <th className="py-3.5 px-4 font-medium">Active Users</th>
                <th className="py-3.5 px-4 font-medium">Last Login</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredSchools.map((s) => (
                <tr key={s.schoolId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="py-3.5 px-4">
                    <Link
                      href={`/super-admin/schools/${s.schoolId}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    >
                      {s.schoolName}
                    </Link>
                    <p className="text-xs text-gray-500 font-mono">Code: {s.schoolCode}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    {getHealthBadge(s.health)}
                    <p className="text-[11px] text-gray-400 mt-0.5">{s.healthReason}</p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                    {s.totalStudents}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">
                    {s.totalTeachers}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-green-600">
                    {s.activeUsers}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                    {s.lastLogin?.toDate ? (
                      s.lastLogin.toDate().toLocaleDateString()
                    ) : (
                      <span className="text-gray-400">No login log</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/super-admin/schools/${s.schoolId}/analytics`}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
                    >
                      Analytics <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
