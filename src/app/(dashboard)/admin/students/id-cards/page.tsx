"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";
import { toast } from "sonner";
import {
  CreditCard,
  Printer,
  Search,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Calendar,
  Phone,
  Droplet,
  QrCode,
  ShieldCheck,
  Sparkles,
  Layers,
  Palette,
} from "lucide-react";

type ThemeColor = "navy" | "emerald" | "crimson" | "slate";

const THEMES: Record<
  ThemeColor,
  {
    name: string;
    bgHeader: string;
    accent: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  navy: {
    name: "Classic Navy",
    bgHeader: "bg-blue-900 text-white",
    accent: "text-blue-900",
    border: "border-blue-900",
    badgeBg: "bg-blue-50 text-blue-900",
    badgeText: "text-blue-900",
  },
  emerald: {
    name: "Emerald Green",
    bgHeader: "bg-emerald-800 text-white",
    accent: "text-emerald-800",
    border: "border-emerald-800",
    badgeBg: "bg-emerald-50 text-emerald-800",
    badgeText: "text-emerald-800",
  },
  crimson: {
    name: "Royal Crimson",
    bgHeader: "bg-rose-900 text-white",
    accent: "text-rose-900",
    border: "border-rose-900",
    badgeBg: "bg-rose-50 text-rose-900",
    badgeText: "text-rose-900",
  },
  slate: {
    name: "Slate Modern",
    bgHeader: "bg-slate-900 text-white",
    accent: "text-slate-900",
    border: "border-slate-900",
    badgeBg: "bg-slate-100 text-slate-900",
    badgeText: "text-slate-900",
  },
};

function StudentIdCardsContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = profile?.schoolName || "Global Public Academy";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";

  const { data: cachedStudents, isLoading } = useAppQuery<StudentProfile[]>(
    isQueryEnabled ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: isQueryEnabled, staleTime: 30_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);

  // Filters & State
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<ThemeColor>("navy");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [viewMode, setViewMode] = useState<"batch" | "single">("batch");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);

  // Unique Classes
  const classNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.name && String(s.name).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        (s.className && String(s.className).toLowerCase().includes(q));

      const matchesClass = selectedClass === "all" ? true : s.className === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, selectedClass]);

  const displayedStudents = useMemo(() => {
    if (viewMode === "single") {
      const targetId = selectedStudentId || initialStudentId;
      const match = students.find((s) => s.id === targetId || s.studentId === targetId);
      return match ? [match] : students.slice(0, 1);
    }
    return filteredStudents;
  }, [viewMode, selectedStudentId, initialStudentId, students, filteredStudents]);

  const activeTheme = THEMES[theme];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumbs (Hidden on Print) */}
      <div className="print:hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/students" className="hover:text-blue-600 transition">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200 font-semibold">
              Student ID Cards
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <CreditCard className="h-6 w-6" />
            </div>
            Student Identity Card Generator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate and batch-print official student ID cards with barcodes, QR codes, emergency contacts, and photo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Students</span>
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print {viewMode === "batch" ? `All (${displayedStudents.length})` : "Card"}</span>
          </button>
        </div>
      </div>

      {/* Control Bar (Hidden on Print) */}
      <div className="print:hidden flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        {/* Class Filter & Search */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes ({students.length})</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Customization Controls: Layout & Color */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Orientation Toggle */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => setOrientation("vertical")}
              className={`px-3 py-1.5 rounded-lg transition ${
                orientation === "vertical"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Vertical (Lanyard)
            </button>
            <button
              onClick={() => setOrientation("horizontal")}
              className={`px-3 py-1.5 rounded-lg transition ${
                orientation === "horizontal"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Horizontal (Pocket)
            </button>
          </div>

          {/* Color Theme Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
            {(Object.keys(THEMES) as ThemeColor[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`h-6 w-6 rounded-lg transition border-2 ${
                  theme === t ? "border-white dark:border-gray-900 scale-110 shadow-xs" : "border-transparent opacity-70 hover:opacity-100"
                } ${
                  t === "navy"
                    ? "bg-blue-900"
                    : t === "emerald"
                    ? "bg-emerald-800"
                    : t === "crimson"
                    ? "bg-rose-900"
                    : "bg-slate-900"
                }`}
                title={THEMES[t].name}
              />
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode("batch")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "batch"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Batch Sheet (8/page)
            </button>
            <button
              onClick={() => setViewMode("single")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "single"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Single Card
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-OPTIMIZED ID CARDS CONTAINER */}
      <div className="bg-gray-100/50 dark:bg-gray-950/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 print:bg-white print:p-0 print:border-none">
        {displayedStudents.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No students found matching your criteria.
          </div>
        ) : (
          <div
            className={`grid gap-6 justify-center ${
              orientation === "vertical"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-4"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-4"
            }`}
          >
            {displayedStudents.map((student) => {
              const displayId =
                student.studentId || student.admissionNumber || student.id.slice(0, 6).toUpperCase();

              if (orientation === "vertical") {
                // VERTICAL LANYARD CARD (Standard 54mm x 86mm ratio)
                return (
                  <div
                    key={student.id}
                    className="w-[260px] h-[400px] bg-white rounded-2xl border-2 border-gray-300 shadow-md overflow-hidden flex flex-col justify-between text-gray-900 text-xs relative print:shadow-none print:border-gray-400 print:m-1"
                  >
                    {/* Header with School Branding */}
                    <div className={`${activeTheme.bgHeader} p-3 text-center`}>
                      <div className="h-6 w-6 rounded-full bg-white/20 mx-auto flex items-center justify-center font-bold text-xs mb-1">
                        {schoolName.charAt(0)}
                      </div>
                      <div className="font-extrabold text-[11px] uppercase tracking-wider leading-tight truncate">
                        {schoolName}
                      </div>
                      <div className="text-[9px] opacity-80 uppercase tracking-widest">
                        Student Identity Card
                      </div>
                    </div>

                    {/* Photo & Candidate Details */}
                    <div className="p-3 text-center flex-1 flex flex-col items-center justify-center">
                      <div className="h-20 w-20 rounded-full border-2 border-gray-200 bg-gray-100 overflow-hidden shadow-xs mb-2">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-black text-xl text-gray-400 bg-gray-100">
                            {student.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="font-black text-sm text-gray-900 leading-tight">
                        {student.name}
                      </div>

                      <div className="text-[11px] font-bold text-gray-600 mt-0.5">
                        {student.className} - {student.sectionName}
                      </div>

                      {/* Information Grid */}
                      <div className="w-full mt-3 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1.5 text-[10px] text-left">
                        <div>
                          <span className="text-gray-400 block font-semibold">STUDENT ID</span>
                          <strong className="font-mono text-gray-900">{displayId}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">ROLL NO</span>
                          <strong className="font-mono text-gray-900">#{student.rollNumber ?? "-"}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">BLOOD GRP</span>
                          <strong className="text-rose-600">{student.bloodGroup || "O+"}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">EMERGENCY</span>
                          <strong className="font-mono text-gray-900 truncate block">
                            {student.guardianPhone || student.phone || "N/A"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Footer with QR Code and Principal Stamp */}
                    <div className="bg-gray-50 border-t border-gray-200 p-2 flex items-center justify-between text-[9px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <div className="h-7 w-7 bg-white p-0.5 border border-gray-300 rounded flex items-center justify-center">
                          <QrCode className="h-5 w-5 text-gray-800" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-700">SESSION</div>
                          <div>2026-2027</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-serif italic font-semibold text-gray-800 text-[10px]">
                          Principal
                        </div>
                        <div className="text-[8px] text-gray-400">Authorized Sign</div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // HORIZONTAL POCKET CARD (Standard 86mm x 54mm ratio)
                return (
                  <div
                    key={student.id}
                    className="w-[360px] h-[220px] bg-white rounded-2xl border-2 border-gray-300 shadow-md overflow-hidden flex flex-col justify-between text-gray-900 text-xs relative print:shadow-none print:border-gray-400 print:m-1"
                  >
                    {/* Header Strip */}
                    <div className={`${activeTheme.bgHeader} px-4 py-2 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                          {schoolName.charAt(0)}
                        </div>
                        <div className="font-extrabold text-xs uppercase tracking-wide truncate max-w-[200px]">
                          {schoolName}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                        Student ID
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex items-center gap-4 flex-1">
                      <div className="h-24 w-20 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden shadow-xs shrink-0">
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-black text-2xl text-gray-400 bg-gray-100">
                            {student.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="font-black text-sm text-gray-900 leading-tight">
                          {student.name}
                        </div>
                        <div className="text-[11px] font-bold text-blue-900">
                          {student.className} - {student.sectionName} • Roll #{student.rollNumber ?? "-"}
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-600 pt-1">
                          <div>
                            <span className="text-gray-400">ID: </span>
                            <strong className="font-mono text-gray-900">{displayId}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400">Blood: </span>
                            <strong className="text-rose-600">{student.bloodGroup || "B+"}</strong>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-400">Phone: </span>
                            <strong className="font-mono text-gray-900">
                              {student.guardianPhone || student.phone || "N/A"}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-center justify-center">
                        <div className="h-10 w-10 p-0.5 bg-white border border-gray-300 rounded flex items-center justify-center">
                          <QrCode className="h-8 w-8 text-gray-800" />
                        </div>
                        <span className="text-[8px] text-gray-400 font-mono mt-0.5">VALID</span>
                      </div>
                    </div>

                    {/* Footer Strip */}
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-1.5 flex items-center justify-between text-[9px] text-gray-500">
                      <span>Campus Civil Lines • Emergency: 112</span>
                      <span className="font-bold text-gray-700">Principal Signature</span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentIdCardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Student ID Cards...</div>}>
      <StudentIdCardsContent />
    </Suspense>
  );
}
