"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  Percent,
  Shield,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchSchoolAnalytics } from "@/lib/services/super-admin.service";
import type { SchoolDetailedAnalytics, SchoolHealthStatus } from "@/types";
import { toast } from "sonner";

export default function SchoolAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [data, setData] = useState<SchoolDetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!schoolId || !currentUser) return;
    setLoading(true);
    try {
      const analyticsData = await fetchSchoolAnalytics(schoolId);
      setData(analyticsData);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load analytics");
      router.push("/super-admin/schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [schoolId, currentUser?.uid]);

  const getHealthBadge = (health: SchoolHealthStatus) => {
    switch (health) {
      case "healthy":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Healthy Operational State
          </span>
        );
      case "low_activity":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Low Activity Warning
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Inactive / Dormant
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Computing School Operational Analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={`/super-admin/schools/${schoolId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to School Details
        </Link>

        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Hero Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-2xl">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.schoolName}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                  {data.schoolCode}
                </span>
                {getHealthBadge(data.health)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Health Evaluation: <strong>{data.healthReason}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/super-admin/schools/${schoolId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
            >
              School Explorer <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6.4 School Analytics Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Enrolled Students</span>
            <GraduationCap className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.studentCount}</p>
          <p className="mt-1 text-xs text-gray-500">Active student accounts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Appointed Teachers</span>
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.teacherCount}</p>
          <p className="mt-1 text-xs text-gray-500">Faculty members</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Classes Configured</span>
            <Layers className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.classCount}</p>
          <p className="mt-1 text-xs text-gray-500">{data.sectionCount} Total Sections</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Attendance Rate</span>
            <Percent className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{data.attendanceRate}%</p>
          <p className="mt-1 text-xs text-gray-500">
            Based on {data.totalAttendanceRecords} records
          </p>
        </div>
      </div>

      {/* Operational Engagement & Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            User Engagement & Account Breakdown
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Active Verified Accounts:</span>
              <span className="font-bold text-green-600">{data.activeUsers}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Disabled / Restricted Accounts:</span>
              <span className="font-bold text-red-500">{data.disabledUsers}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Student-to-Teacher Ratio:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {data.teacherCount > 0
                  ? `${Math.round(data.studentCount / data.teacherCount)} : 1`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Primary Administrator:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {data.adminEmail || "Configured"}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Timestamps */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Operational Telemetry Status
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Last User Login:</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                {data.lastLogin?.toDate
                  ? data.lastLogin.toDate().toLocaleString()
                  : "No recorded login"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Last Academic Activity:</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                {data.lastActivity?.toDate
                  ? data.lastActivity.toDate().toLocaleString()
                  : "No recorded activity"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Operational Health Index:</span>
              <span>{getHealthBadge(data.health)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent School Logins Stream */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Recent School Login Telemetry
        </h2>
        {data.recentLogins.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No recorded login logs for this school.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Client Info</th>
                  <th className="py-2.5 px-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.recentLogins.map((l, idx) => (
                  <tr key={l.id || idx}>
                    <td className="py-2.5 px-3 font-mono text-gray-500 whitespace-nowrap">
                      {l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString() : "Recent"}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                      {l.email}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-gray-600 dark:text-gray-400">
                      {l.role?.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-500">
                      {l.ipAddress || "direct"} · {l.browser || "Browser"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-semibold ${
                          l.status === "success" ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {l.status}
                      </span>
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
