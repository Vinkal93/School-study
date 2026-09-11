"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Users,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";

// =========================================================================
// 1. @reui/c-chart-1: Gradient Area Growth Chart (Student Admissions & Enrollments)
// =========================================================================
export interface AreaPoint {
  label: string;
  value: number;
}

const DEFAULT_AREA_DATA: AreaPoint[] = [
  { label: "Apr", value: 45 },
  { label: "May", value: 68 },
  { label: "Jun", value: 110 },
  { label: "Jul", value: 185 },
  { label: "Aug", value: 240 },
  { label: "Sep", value: 320 },
  { label: "Oct", value: 380 },
];

export function Chart1AreaGradient({
  data = DEFAULT_AREA_DATA,
  title = "Admissions & Enrollment Growth",
  subtitle = "Monthly student onboarding trend",
  currentCount = 380,
  growthPercent = 24.8,
}: {
  data?: AreaPoint[];
  title?: string;
  subtitle?: string;
  currentCount?: number;
  growthPercent?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.value), 100);
  const width = 500;
  const height = 180;
  const paddingX = 24;
  const paddingY = 24;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.value / maxValue) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  // SVG curved path generator
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+{growthPercent}%</span>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {currentCount.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-gray-500">total active learners</span>
      </div>

      <div className="relative mt-4 w-full h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chart1Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          {[0.25, 0.5, 0.75].map((pct, idx) => {
            const y = height - paddingY - pct * (height - paddingY * 2);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-800/80 stroke-dashed"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#chart1Gradient)" />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Interactive data points */}
          {points.map((pt, idx) => (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6 : 4}
                className={
                  hoveredIndex === idx
                    ? "fill-blue-600 stroke-4 stroke-white dark:stroke-gray-900 transition-all"
                    : "fill-white dark:fill-gray-900 stroke-2 stroke-blue-500"
                }
              />
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute -top-2 bg-gray-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 flex items-center gap-1.5"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
            }}
          >
            <span>{points[hoveredIndex].label}:</span>
            <span className="text-blue-300 font-bold">
              {points[hoveredIndex].value} students
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[11px] font-medium text-gray-400 mt-2 px-1">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 2. @reui/c-chart-11: Comparative Multi-Bar Chart (Collections vs Due)
// =========================================================================
export interface DualBarItem {
  label: string;
  collected: number;
  pending: number;
}

const DEFAULT_BAR_DATA: DualBarItem[] = [
  { label: "Class 1-3", collected: 85, pending: 15 },
  { label: "Class 4-6", collected: 92, pending: 8 },
  { label: "Class 7-9", collected: 78, pending: 22 },
  { label: "Class 10", collected: 96, pending: 4 },
  { label: "Class 11-12", collected: 88, pending: 12 },
];

export function Chart11DualBar({
  data = DEFAULT_BAR_DATA,
  title = "Fee Collection Efficiency by Wing",
  subtitle = "Collected vs Outstanding Dues (%)",
}: {
  data?: DualBarItem[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-gray-600 dark:text-gray-300">Collected</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-gray-600 dark:text-gray-300">Pending</span>
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-gray-700 dark:text-gray-300 font-semibold">
                {item.label}
              </span>
              <span className="text-gray-500 text-[11px]">
                {item.collected}% collected • {item.pending}% pending
              </span>
            </div>
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex gap-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.collected}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-l-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.pending}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                className="h-full bg-amber-400/80 rounded-r-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 3. @reui/c-chart-13: Radial Donut Capacity Gauge (Plan Utilization)
// =========================================================================
export function Chart13RadialDonut({
  percentage = 76,
  label = "Plan Capacity",
  usedText = "380 / 500 Students Enrolled",
  planName = "Professional Plan",
}: {
  percentage?: number;
  label?: string;
  usedText?: string;
  planName?: string;
}) {
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {planName}
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {label}
          </h4>
        </div>
        <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
          <PieIcon className="w-4 h-4" />
        </span>
      </div>

      <div className="my-5 flex flex-col items-center justify-center relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-gray-100 dark:stroke-gray-800"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-purple-600 dark:stroke-purple-500"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 dark:text-white">
            {percentage}%
          </span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Utilized
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
        {usedText}
      </div>
    </div>
  );
}

// =========================================================================
// 4. @reui/c-chart-17: Horizontal Class Distribution
// =========================================================================
export function Chart17HorizontalBar({
  title = "Faculty & Student Ratio Distribution",
}: {
  title?: string;
}) {
  const sections = [
    { name: "Primary (Grades 1-5)", count: 180, teachers: 8, max: 200 },
    { name: "Middle (Grades 6-8)", count: 120, teachers: 6, max: 200 },
    { name: "Secondary (Grades 9-10)", count: 80, teachers: 5, max: 200 },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-gray-900 dark:text-white">
          {title}
        </h4>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
          Live Ratio
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {sections.map((sec, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span>{sec.name}</span>
              <span className="text-gray-500">
                {sec.count} Students • {sec.teachers} Teachers
              </span>
            </div>
            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                style={{ width: `${(sec.count / sec.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 5. @reui/c-chart-22: Interactive Financial Collections Timeline
// =========================================================================
export function Chart22RevenueArea({
  title = "Fee Collections & Cashflow",
  amountText = "₹3,42,500",
}: {
  title?: string;
  amountText?: string;
}) {
  const [timeframe, setTimeframe] = useState<"7D" | "1M" | "1Y">("1M");

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Realtime Finance Stream
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(["7D", "1M", "1Y"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                timeframe === tf
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
          {amountText}
        </span>
        <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
          +18.2% vs last cycle
        </span>
      </div>

      {/* Interactive Bar Sparkline */}
      <div className="mt-5 grid grid-cols-12 gap-1.5 items-end h-24 pt-4 border-b border-gray-100 dark:border-gray-800 pb-2">
        {[40, 55, 30, 80, 65, 90, 75, 85, 95, 60, 70, 88].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 group">
            <div className="w-full bg-emerald-100 dark:bg-emerald-950/40 rounded-t-md h-full flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.6, delay: i * 0.04 }}
                className="w-full bg-emerald-500 group-hover:bg-emerald-600 rounded-t-md transition"
              />
            </div>
            <span className="text-[9px] font-medium text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
              {i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 6. @reui/c-chart-25: Attendance Pulse & Real-Time Sync Indicator
// =========================================================================
export function Chart25AttendancePulse({
  title = "Daily Attendance Pulse",
  studentPresentPercent = 94.2,
  teacherPresentPercent = 98.0,
}: {
  title?: string;
  studentPresentPercent?: number;
  teacherPresentPercent?: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Today's Turnout
          </span>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Realtime</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            Student Attendance
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-900 dark:text-blue-100">
              {studentPresentPercent}%
            </span>
            <span className="text-[10px] font-bold text-emerald-600">On Target</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${studentPresentPercent}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            Faculty Attendance
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-indigo-900 dark:text-indigo-100">
              {teacherPresentPercent}%
            </span>
            <span className="text-[10px] font-bold text-emerald-600">Optimal</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${teacherPresentPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
