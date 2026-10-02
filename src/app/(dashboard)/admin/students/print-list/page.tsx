"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents, exportStudentsToCsv } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";
import { toast } from "sonner";
import {
  Printer,
  FileSpreadsheet,
  Search,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Calendar,
  Users,
  CheckSquare,
  Square,
  School,
  Sparkles,
} from "lucide-react";

interface ColumnOptions {
  rollNo: boolean;
  studentId: boolean;
  name: boolean;
  fatherName: boolean;
  motherName: boolean;
  genderDob: boolean;
  phone: boolean;
  bloodGroup: boolean;
  address: boolean;
  signatureCol: boolean;
}

export default function PrintBasicListPage() {
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
  const [selectedSection, setSelectedSection] = useState("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
  const [sortBy, setSortBy] = useState<"roll" | "name" | "id">("roll");
  const [searchQuery, setSearchQuery] = useState("");

  // Column Customization
  const [columns, setColumns] = useState<ColumnOptions>({
    rollNo: true,
    studentId: true,
    name: true,
    fatherName: true,
    motherName: false,
    genderDob: true,
    phone: true,
    bloodGroup: false,
    address: false,
    signatureCol: true,
  });

  // Unique Classes and Sections
  const classNames = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    if (selectedClass === "all") return [];
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.className === selectedClass && s.sectionName) {
        set.add(s.sectionName);
      }
    });
    return Array.from(set).sort();
  }, [students, selectedClass]);

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.name && String(s.name).toLowerCase().includes(q)) ||
        (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
        (s.fatherName && String(s.fatherName).toLowerCase().includes(q));

      const matchesClass = selectedClass === "all" ? true : s.className === selectedClass;
      const matchesSection = selectedSection === "all" ? true : s.sectionName === selectedSection;
      const matchesGender =
        genderFilter === "all" ? true : (s.gender || "male").toLowerCase() === genderFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : (s.status ? String(s.status).toLowerCase() : "active") === "active";

      return matchesSearch && matchesClass && matchesSection && matchesGender && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "roll") {
        return (Number(a.rollNumber) || 9999) - (Number(b.rollNumber) || 9999);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return (a.studentId || "").localeCompare(b.studentId || "");
      }
    });

    return result;
  }, [
    students,
    selectedClass,
    selectedSection,
    genderFilter,
    statusFilter,
    sortBy,
    searchQuery,
  ]);

  // Summary Counts
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const boys = filteredStudents.filter((s) => (s.gender || "male").toLowerCase() === "male").length;
    const girls = filteredStudents.filter((s) => (s.gender || "female").toLowerCase() === "female").length;
    return { total, boys, girls };
  }, [filteredStudents]);

  const toggleColumn = (col: keyof ColumnOptions) => {
    setColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    try {
      exportStudentsToCsv(filteredStudents);
      toast.success("Nominal list exported to CSV!");
    } catch (e: any) {
      toast.error("Failed to export list.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header (Hidden on Print) */}
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
              Print Basic List
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Printer className="h-6 w-6" />
            </div>
            Print Basic List & Nominal Roll
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate printable class rosters, examination nominal rolls, and attendance register sheets.
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
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Register Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter and Column Configuration Bar (Hidden on Print) */}
      <div className="print:hidden space-y-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Class Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection("all");
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Classes</option>
              {classNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Select Section
            </label>
            <select
              value={selectedSection}
              disabled={selectedClass === "all"}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="all">All Sections</option>
              {availableSections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Gender Filter
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Genders</option>
              <option value="male">Boys Only</option>
              <option value="female">Girls Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="roll">Roll Number (1, 2, 3...)</option>
              <option value="name">Alphabetical (A - Z)</option>
              <option value="id">Student ID</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="active">Active Students Only</option>
              <option value="all">Include Inactive/Left</option>
            </select>
          </div>
        </div>

        {/* Column Toggles */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Customize Print Columns:
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {[
              { key: "rollNo", label: "Roll No" },
              { key: "studentId", label: "Student ID" },
              { key: "name", label: "Student Name" },
              { key: "fatherName", label: "Father Name" },
              { key: "motherName", label: "Mother Name" },
              { key: "genderDob", label: "Gender & DOB" },
              { key: "phone", label: "Contact Phone" },
              { key: "bloodGroup", label: "Blood Group" },
              { key: "address", label: "Address" },
              { key: "signatureCol", label: "Signature / Roll Call Tick Box" },
            ].map(({ key, label }) => {
              const active = columns[key as keyof ColumnOptions];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleColumn(key as keyof ColumnOptions)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition ${
                    active
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {active ? (
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRINTABLE NOMINAL ROLL REGISTER SHEET */}
      <div
        id="printable-nominal-sheet"
        className="bg-white text-gray-900 p-8 sm:p-10 rounded-2xl border border-gray-200 shadow-md print:shadow-none print:border-none print:m-0 print:p-4 print:w-full"
      >
        {/* Institutional Register Header */}
        <div className="text-center pb-4 border-b-2 border-gray-900">
          <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900">
            {schoolName}
          </h1>
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mt-0.5">
            Class Nominal Roll & Attendance Register Sheet
          </p>
          <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 font-mono mt-4 pt-2 border-t border-gray-200">
            <div>
              <strong>Class / Section:</strong>{" "}
              {selectedClass === "all" ? "All Classes" : selectedClass}{" "}
              {selectedSection !== "all" ? `(${selectedSection})` : ""}
            </div>
            <div>
              <strong>Total Enrolled:</strong> {stats.total} (Boys: {stats.boys}, Girls: {stats.girls})
            </div>
            <div>
              <strong>Date of Generation:</strong> {new Date().toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>

        {/* Table of Students */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-gray-900">
            <thead>
              <tr className="bg-gray-100 text-gray-900 font-bold uppercase tracking-wider border-b border-gray-900">
                <th className="p-2 border border-gray-900 text-center w-8">#</th>
                {columns.rollNo && (
                  <th className="p-2 border border-gray-900 text-center w-14">Roll</th>
                )}
                {columns.studentId && (
                  <th className="p-2 border border-gray-900 w-24">Student ID</th>
                )}
                {columns.name && <th className="p-2 border border-gray-900">Student Name</th>}
                {columns.fatherName && (
                  <th className="p-2 border border-gray-900">Father&apos;s Name</th>
                )}
                {columns.motherName && (
                  <th className="p-2 border border-gray-900">Mother&apos;s Name</th>
                )}
                {columns.genderDob && (
                  <th className="p-2 border border-gray-900 w-24">Gender / DOB</th>
                )}
                {columns.phone && (
                  <th className="p-2 border border-gray-900 w-28">Contact Phone</th>
                )}
                {columns.bloodGroup && (
                  <th className="p-2 border border-gray-900 w-16 text-center">Blood</th>
                )}
                {columns.address && (
                  <th className="p-2 border border-gray-900">Address</th>
                )}
                {columns.signatureCol && (
                  <th className="p-2 border border-gray-900 text-center w-28">
                    Signature / Roll Call
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    No students match the selected class or filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-50 border-b border-gray-300">
                    <td className="p-2 border border-gray-400 text-center font-mono">
                      {idx + 1}
                    </td>

                    {columns.rollNo && (
                      <td className="p-2 border border-gray-400 text-center font-bold font-mono">
                        {student.rollNumber ?? "-"}
                      </td>
                    )}

                    {columns.studentId && (
                      <td className="p-2 border border-gray-400 font-mono">
                        {student.studentId || student.admissionNumber || student.id.slice(0, 6)}
                      </td>
                    )}

                    {columns.name && (
                      <td className="p-2 border border-gray-400 font-semibold">
                        {student.name}
                      </td>
                    )}

                    {columns.fatherName && (
                      <td className="p-2 border border-gray-400">
                        {student.fatherName || student.guardianName || "-"}
                      </td>
                    )}

                    {columns.motherName && (
                      <td className="p-2 border border-gray-400">
                        {student.motherName || "-"}
                      </td>
                    )}

                    {columns.genderDob && (
                      <td className="p-2 border border-gray-400 text-[11px]">
                        <span className="capitalize">{student.gender || "M"}</span>
                        {student.dob && ` • ${student.dob}`}
                      </td>
                    )}

                    {columns.phone && (
                      <td className="p-2 border border-gray-400 font-mono text-[11px]">
                        {student.guardianPhone || student.phone || "-"}
                      </td>
                    )}

                    {columns.bloodGroup && (
                      <td className="p-2 border border-gray-400 text-center font-bold text-rose-700">
                        {student.bloodGroup || "-"}
                      </td>
                    )}

                    {columns.address && (
                      <td className="p-2 border border-gray-400 text-[11px] truncate max-w-xs">
                        {student.address || "-"}
                      </td>
                    )}

                    {columns.signatureCol && (
                      <td className="p-2 border border-gray-400 text-center">
                        <div className="h-5 w-20 border border-dashed border-gray-300 mx-auto rounded" />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Verification Footer Signatures */}
        <div className="mt-16 pt-8 flex items-end justify-between border-t border-gray-900 text-xs text-gray-700">
          <div className="text-center">
            <div className="w-44 border-b border-gray-800 pb-1 mb-1 font-serif italic text-gray-600">
              Class Teacher Signature
            </div>
            <span>Class Teacher Incharge</span>
          </div>

          <div className="text-center">
            <div className="w-44 border-b border-gray-800 pb-1 mb-1 font-serif italic text-gray-600">
              Verified By
            </div>
            <span>Admissions / Academic Coordinator</span>
          </div>

          <div className="text-center">
            <div className="w-44 border-b border-gray-800 pb-1 mb-1 font-serif italic text-gray-600">
              Principal Signature
            </div>
            <span>Head of Institution</span>
          </div>
        </div>
      </div>
    </div>
  );
}
