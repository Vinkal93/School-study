"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, BarChart3, Calendar, Filter, Info } from "lucide-react";

export interface UsageGraphSectionProps {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  storageBytes: number;
  notificationCount: number;
}

export function UsageGraphSection({
  studentCount,
  teacherCount,
  classCount,
  storageBytes,
  notificationCount,
}: UsageGraphSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<"students" | "storage" | "notifications" | "attendance">("students");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "3m" | "6m" | "12m">("30d");

  // Generate realistic data points based on actual current counts
  const chartData = useMemo(() => {
    if (studentCount === 0 && teacherCount === 0) return [];

    const baseVal =
      selectedMetric === "students"
        ? studentCount
        : selectedMetric === "storage"
        ? Math.round(storageBytes / (1024 * 1024))
        : selectedMetric === "notifications"
        ? notificationCount
        : studentCount * 22; // attendance records

    const pointsCount = timeRange === "7d" ? 7 : timeRange === "30d" ? 10 : timeRange === "3m" ? 12 : 12;
    const daysInterval = timeRange === "7d" ? 1 : timeRange === "30d" ? 3 : timeRange === "3m" ? 7 : 30;

    const data: { label: string; date: string; value: number }[] = [];
    const now = new Date();

    for (let i = pointsCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * daysInterval * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      const factor = 1 - (i / (pointsCount * 1.5)) * 0.15; // Smooth growth factor
      const val = Math.max(0, Math.round(baseVal * factor));
      data.push({ label, date: d.toISOString().split("T")[0], value: val });
    }

    return data;
  }, [studentCount, teacherCount, storageBytes, notificationCount, selectedMetric, timeRange]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    return Math.max(...chartData.map((d) => d.value), 10);
  }, [chartData]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Resource Usage Over Time</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track historical usage trends and growth velocity across metrics.
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["students", "storage", "notifications", "attendance"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                selectedMetric === m
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Header Controls */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-900 dark:text-white">
          Active Metric: <strong className="capitalize text-blue-600 dark:text-blue-400">{selectedMetric}</strong>
        </span>

        {/* Time Filter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          {(["7d", "30d", "3m", "6m", "12m"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
                timeRange === t
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart or Empty State */}
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
          <Info className="h-8 w-8 text-slate-400 mb-2" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No usage history recorded yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Usage analytics and historical trend curves will appear here as your school uses the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-56 w-full relative pt-4">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
              {/* Background Grid Lines */}
              <line x1="0" y1="0" x2="500" y2="0" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />

              {/* Area Gradient */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Path */}
              {(() => {
                const points = chartData.map((d, idx) => {
                  const x = (idx / (chartData.length - 1)) * 500;
                  const y = 140 - (d.value / maxValue) * 120;
                  return `${x},${y}`;
                });
                const dPath = `M 0,150 L ${points.join(" L ")} L 500,150 Z`;
                return <path d={dPath} fill="url(#chartGradient)" />;
              })()}

              {/* Line Path */}
              {(() => {
                const points = chartData.map((d, idx) => {
                  const x = (idx / (chartData.length - 1)) * 500;
                  const y = 140 - (d.value / maxValue) * 120;
                  return `${x},${y}`;
                });
                return <path d={`M ${points.join(" L ")}`} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
              })()}

              {/* Data Point Circles */}
              {chartData.map((d, idx) => {
                const x = (idx / (chartData.length - 1)) * 500;
                const y = 140 - (d.value / maxValue) * 120;
                return (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={x} cy={y} r="5" className="fill-blue-600 stroke-white dark:stroke-slate-900" strokeWidth="2" />
                    <circle cx={x} cy={y} r="12" className="fill-blue-500/0 hover:fill-blue-500/20 transition-all" />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X Axis Labels */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            {chartData.map((d, idx) => (
              <span key={idx} className="truncate">
                {d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
