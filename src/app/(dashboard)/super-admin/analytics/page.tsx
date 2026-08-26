"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Loader2,
  RefreshCw,
  PieChart,
  ShieldCheck,
} from "lucide-react";
import { getSuperAdminStats, getAllSchools, type SuperAdminStats } from "@/lib/services/school.service";
import type { School } from "@/types";
import { toast } from "sonner";

export default function PlatformAnalyticsPage() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [statsData, schoolsData] = await Promise.all([
        getSuperAdminStats(),
        getAllSchools(),
      ]);
      setStats(statsData);
      setSchools(schoolsData);
    } catch (err) {
      toast.error("Failed to load platform analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalUsers = stats?.totalUsers ?? 0;
  const studentRatio =
    stats && stats.totalTeachers > 0
      ? (stats.totalStudents / stats.totalTeachers).toFixed(1)
      : "0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Platform Analytics & Growth
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time telemetry across multi-tenant schools, faculty capacity, and student enrollment.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span>Total School Tenants</span>
            <Building2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "..." : stats?.totalSchools ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {stats?.activeSchools ?? 0} Active · {stats?.inactiveSchools ?? 0} Inactive
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400">
            <span>Total Students</span>
            <GraduationCap className="h-4 w-4" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "..." : stats?.totalStudents ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Across all registered schools</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
            <span>Total Faculty</span>
            <BookOpen className="h-4 w-4" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "..." : stats?.totalTeachers ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Registered teaching accounts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Student-to-Teacher Ratio</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "..." : `${studentRatio} : 1`}
          </p>
          <p className="mt-1 text-xs text-gray-500">Platform-wide average</p>
        </div>
      </div>

      {/* School Breakdown List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-600" />
          Tenant Capacity & Status Breakdown
        </h3>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : schools.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No schools registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold uppercase text-gray-400">
                <tr>
                  <th className="py-3 px-3">School Name</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3.5 px-3 font-semibold text-gray-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {s.code}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-gray-500">
                      {s.city ? `${s.city}, ${s.state || ""}` : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <a
                        href={`/super-admin/schools/${s.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Explore →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
