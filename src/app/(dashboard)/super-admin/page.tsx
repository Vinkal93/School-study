"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  School as SchoolIcon,
  Users,
  GraduationCap,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getSuperAdminStats,
  getAllSchools,
  type SuperAdminStats,
} from "@/lib/services/school.service";
import { initializeDefaultBillingCatalog } from "@/lib/services/billing.service";
import type { School } from "@/types";

export default function SuperAdminPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, schoolsData] = await Promise.all([
        getSuperAdminStats(),
        getAllSchools(),
        initializeDefaultBillingCatalog(),
      ]);
      setStats(statsData);
      setRecentSchools(schoolsData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load Super Admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {profile?.name}! Overview of all multi-tenant schools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/schools/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create School
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Schools"
          value={loading ? "..." : (stats?.totalSchools ?? 0).toString()}
          icon={<Building2 className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Active Schools"
          value={loading ? "..." : (stats?.activeSchools ?? 0).toString()}
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Inactive Schools"
          value={loading ? "..." : (stats?.inactiveSchools ?? 0).toString()}
          icon={<XCircle className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Total Teachers"
          value={loading ? "..." : (stats?.totalTeachers ?? 0).toString()}
          icon={<Users className="h-6 w-6" />}
          color="purple"
        />
        <StatCard
          title="Total Students"
          value={loading ? "..." : (stats?.totalStudents ?? 0).toString()}
          icon={<GraduationCap className="h-6 w-6" />}
          color="orange"
        />
      </div>

      {/* Quick Action & Recent Schools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Schools */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Schools
            </h2>
            <Link
              href="/super-admin/schools"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              View All ({stats?.totalSchools ?? 0})
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : recentSchools.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No schools created yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first school tenant.
              </p>
              <div className="mt-6">
                <Link
                  href="/super-admin/schools/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create School
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium">School</th>
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentSchools.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 font-medium text-gray-900 dark:text-white">
                        {s.name}
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          {s.code}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">
                        {s.city ? `${s.city}, ${s.state || ""}` : "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            s.status === "active"
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Admin Actions Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              SaaS Administration
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Create and manage school tenants, toggle school activations, and oversee system users.
            </p>

            <div className="space-y-3">
              <Link
                href="/super-admin/schools/new"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <PlusCircle className="h-4 w-4" />
                  </div>
                  <span>Add New School</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href="/super-admin/schools"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded bg-green-100 p-2 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span>Manage Schools</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href="/super-admin/users"
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded bg-purple-100 p-2 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <span>Manage Platform Users</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 <strong>Tip:</strong> When you create a school, its School Admin account is automatically provisioned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "purple" | "orange";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-3.5">
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
