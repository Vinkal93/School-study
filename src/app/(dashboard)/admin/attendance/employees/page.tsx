"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Loader2,
  RefreshCw,
  GraduationCap,
  Save,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Sparkles,
  BarChart3,
  FileText,
  ClipboardList,
  AlertCircle,
  Briefcase,
  Coffee,
  Check,
  Phone,
} from "lucide-react";
import { getTeachers } from "@/lib/services/teacher.service";
import {
  getEmployeeAttendanceForDate,
  saveBatchEmployeeAttendance,
} from "@/lib/services/attendance.service";
import type { TeacherProfile, EmployeeAttendanceRecord, AttendanceStatus } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function EmployeesAttendancePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  // State
  const [employees, setEmployees] = useState<TeacherProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [checkInMap, setCheckInMap] = useState<Record<string, string>>({});
  const [checkOutMap, setCheckOutMap] = useState<Record<string, string>>({});
  const [leaveTypeMap, setLeaveTypeMap] = useState<Record<string, string>>({});
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load Employees (Teachers & Staff)
  useEffect(() => {
    async function loadStaff() {
      if (!schoolId) return;
      try {
        const staffList = await getTeachers(schoolId);
        setEmployees(staffList);
      } catch (err) {
        console.error("Failed to load staff list:", err);
      }
    }
    loadStaff();
  }, [schoolId]);

  // Load Attendance Records for Date
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const records = await getEmployeeAttendanceForDate(schoolId, selectedDate);
      const attMap: Record<string, AttendanceStatus> = {};
      const inMap: Record<string, string> = {};
      const outMap: Record<string, string> = {};
      const lvMap: Record<string, string> = {};
      const remMap: Record<string, string> = {};

      records.forEach((r) => {
        attMap[r.employeeId] = r.status;
        if (r.checkInTime) inMap[r.employeeId] = r.checkInTime;
        if (r.checkOutTime) outMap[r.employeeId] = r.checkOutTime;
        if (r.leaveType) lvMap[r.employeeId] = r.leaveType;
        if (r.remarks) remMap[r.employeeId] = r.remarks;
      });

      // Default unmarked employees to PRESENT
      const initialAtt: Record<string, AttendanceStatus> = {};
      employees.forEach((emp) => {
        initialAtt[emp.id] = attMap[emp.id] || "PRESENT";
      });

      setAttendanceMap(initialAtt);
      setCheckInMap(inMap);
      setCheckOutMap(outMap);
      setLeaveTypeMap(lvMap);
      setRemarksMap(remMap);
    } catch (err) {
      console.error("Failed to load employee attendance:", err);
      toast.error("Failed to load employee attendance records.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedDate, employees, profile?.role, canAccess]);

  useEffect(() => {
    if (employees.length > 0) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData, employees.length]);

  // Date Navigation Helpers
  const handleDateStep = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Status Handlers
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    employees.forEach((emp) => {
      updated[emp.id] = status;
    });
    setAttendanceMap(updated);
    toast.success(`Marked all employees as ${status}.`);
  };

  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [empId]: status,
    }));
  };

  // Save Attendance
  const handleSaveAttendance = async () => {
    if (employees.length === 0) {
      toast.error("No employees registered to mark attendance.");
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave = employees.map((emp) => ({
        employeeId: emp.id,
        employeeName: emp.name || emp.fullName || "Staff",
        employeeEmail: emp.email || "",
        employeePhone: String(emp.phone || ""),
        department: emp.department || "Academic Faculty",
        designation: emp.designation || (emp as any).role || "Teacher",
        role: (emp as any).role || "teacher",
        status: attendanceMap[emp.id] || "PRESENT",
        checkInTime: checkInMap[emp.id] || "",
        checkOutTime: checkOutMap[emp.id] || "",
        remarks: remarksMap[emp.id] || "",
        leaveType: (leaveTypeMap[emp.id] as any) || undefined,
      }));

      await saveBatchEmployeeAttendance(schoolId, {
        date: selectedDate,
        markedBy: profile?.name || "School Admin",
        records: recordsToSave,
      });

      toast.success(`Successfully saved attendance for ${recordsToSave.length} staff members.`);
    } catch (err: any) {
      console.error("Save employee attendance error:", err);
      toast.error(err?.message || "Failed to save employee attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
      else set.add("Academic Faculty");
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered List
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (emp.name && String(emp.name).toLowerCase().includes(q)) ||
        (emp.email && String(emp.email).toLowerCase().includes(q)) ||
        (emp.phone && String(emp.phone).includes(q));

      const dept = emp.department || "Academic Faculty";
      const matchesDept = departmentFilter === "all" ? true : dept === departmentFilter;

      const st = attendanceMap[emp.id] || "PRESENT";
      const matchesStatus = statusFilter === "all" ? true : st === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter, attendanceMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let late = 0;

    employees.forEach((emp) => {
      const st = attendanceMap[emp.id] || "PRESENT";
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else if (st === "ON_LEAVE") onLeave++;
      else if (st === "LATE") late++;
    });

    const pct = total > 0 ? Math.round(((present + late + onLeave * 0.5) / total) * 100) : 0;
    return { total, present, absent, onLeave, late, pct };
  }, [employees, attendanceMap]);

  // Export CSV
  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast.error("No staff attendance to export.");
      return;
    }
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Designation",
      "Status",
      "Check In",
      "Check Out",
      "Leave Type",
      "Remarks",
      "Date",
    ];
    const rows = employees.map((emp) => [
      emp.id,
      `"${emp.name || emp.fullName || ""}"`,
      `"${emp.department || "Academic Faculty"}"`,
      `"${emp.designation || "Teacher"}"`,
      attendanceMap[emp.id] || "PRESENT",
      checkInMap[emp.id] || "",
      checkOutMap[emp.id] || "",
      leaveTypeMap[emp.id] || "",
      `"${remarksMap[emp.id] || ""}"`,
      selectedDate,
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", `Employees_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded employee attendance CSV.");
  };

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="Attendance Management Required"
      description="Upgrade your subscription plan to record and manage staff attendance."
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Quick Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/admin/attendance/students"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Students Attendance</span>
          </Link>
          <Link
            href="/admin/attendance/employees"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm shrink-0"
          >
            <Users className="h-4 w-4" />
            <span>Employees Attendance</span>
          </Link>
          <Link
            href="/admin/attendance/class-wise"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Class wise Report</span>
          </Link>
          <Link
            href="/admin/attendance/students-report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span>Students Attendance Report</span>
          </Link>
          <Link
            href="/admin/attendance/employees-report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Employees Attendance Report</span>
          </Link>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <span>Staff & HR Ops</span>
              <span>/</span>
              <span>Faculty Roll Call</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              Employees Attendance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Record daily punch-in times, leave applications, and attendance status for teaching and administrative staff.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Navigator */}
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => handleDateStep(-1)}
                title="Previous Day"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden border-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDateStep(1)}
                title="Next Day"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="ml-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
              >
                Today
              </button>
            </div>

            {/* Save Button */}
            {employees.length > 0 && (
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Staff Attendance</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
              <span>Total Staff</span>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</div>
            <div className="text-[11px] text-gray-400 mt-1">Teaching & Admin</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span>Present Today</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.present}</div>
            <div className="text-[11px] text-emerald-600/70 mt-1">
              {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}% on campus
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/40 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-medium">
              <span>Absent (Unpaid)</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{stats.absent}</div>
            <div className="text-[11px] text-rose-500 mt-1">Unexcused absence</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              <span>Approved Leave</span>
              <Coffee className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{stats.onLeave}</div>
            <div className="text-[11px] text-indigo-500 mt-1">Casual / Sick / Duty</div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-indigo-100 text-xs font-medium">
              <span>Staff Attendance %</span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>
            <div className="text-2xl font-black mt-2">{stats.pct}%</div>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.pct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Search Staff
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Staff name, email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="LATE">Late Arrival</option>
              </select>
            </div>
          </div>

          {/* Quick Mark Toolbar */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Quick Mark:</span>
              <button
                type="button"
                onClick={() => handleMarkAll("PRESENT")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("ABSENT")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>All Absent</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Register</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Loading staff roster and punch logs...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <Users className="h-8 w-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">No Employees Registered</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Add your teachers and staff members in the Teachers Directory to begin managing staff roll calls.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/teachers"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Go to Teachers Directory →
              </Link>
            </div>
          </div>
        ) : (
          /* Staff Attendance Table */
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Punch In / Out</th>
                    <th className="py-3 px-4">Leave Type / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredEmployees.map((emp) => {
                    const status = attendanceMap[emp.id] || "PRESENT";
                    const checkIn = checkInMap[emp.id] || "";
                    const checkOut = checkOutMap[emp.id] || "";
                    const leaveType = leaveTypeMap[emp.id] || "CASUAL";
                    const remarks = remarksMap[emp.id] || "";

                    return (
                      <tr
                        key={emp.id}
                        className={`transition hover:bg-gray-50/70 dark:hover:bg-gray-800/60 ${
                          status === "ABSENT"
                            ? "bg-rose-50/20 dark:bg-rose-950/10"
                            : status === "ON_LEAVE"
                            ? "bg-indigo-50/20 dark:bg-indigo-950/10"
                            : ""
                        }`}
                      >
                        {/* Employee Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {(emp.name || emp.fullName || "T").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {emp.name || emp.fullName}
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                                <span>{emp.email || "No email"}</span>
                                {emp.phone && <span>• {emp.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {emp.department || "Academic Faculty"}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {emp.designation || (emp as any).role || "Teacher"}
                          </div>
                        </td>

                        {/* Interactive Status Selector */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Present */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(emp.id, "PRESENT")}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Present</span>
                            </button>

                            {/* Absent */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(emp.id, "ABSENT")}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
                              }`}
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Absent</span>
                            </button>

                            {/* On Leave */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(emp.id, "ON_LEAVE")}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "ON_LEAVE"
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600"
                              }`}
                            >
                              <Coffee className="h-3 w-3" />
                              <span>Leave</span>
                            </button>

                            {/* Late */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(emp.id, "LATE")}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                status === "LATE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>Late</span>
                            </button>
                          </div>
                        </td>

                        {/* Punch In / Out */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={checkIn}
                              onChange={(e) =>
                                setCheckInMap((prev) => ({ ...prev, [emp.id]: e.target.value }))
                              }
                              className="w-20 text-[11px] px-1.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-center"
                              title="Check-in Time"
                            />
                            <span className="text-gray-400 text-xs">-</span>
                            <input
                              type="time"
                              value={checkOut}
                              onChange={(e) =>
                                setCheckOutMap((prev) => ({ ...prev, [emp.id]: e.target.value }))
                              }
                              className="w-20 text-[11px] px-1.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-center"
                              title="Check-out Time"
                            />
                          </div>
                        </td>

                        {/* Leave Type / Remarks */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {status === "ON_LEAVE" ? (
                              <select
                                value={leaveType}
                                onChange={(e) =>
                                  setLeaveTypeMap((prev) => ({ ...prev, [emp.id]: e.target.value }))
                                }
                                className="text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-1"
                              >
                                <option value="CASUAL">Casual Leave (CL)</option>
                                <option value="SICK">Sick Leave (SL)</option>
                                <option value="DUTY">Official Duty (OD)</option>
                                <option value="UNPAID">Loss of Pay (LOP)</option>
                                <option value="MATERNITY">Maternity Leave</option>
                              </select>
                            ) : null}
                            <input
                              type="text"
                              placeholder="Remarks or reason..."
                              value={remarks}
                              onChange={(e) =>
                                setRemarksMap((prev) => ({ ...prev, [emp.id]: e.target.value }))
                              }
                              className="w-full text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Bar */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredEmployees.length} of {employees.length} faculty and staff members
              </div>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Staff Attendance</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
