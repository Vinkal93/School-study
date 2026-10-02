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
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Sparkles,
  BarChart3,
  FileText,
  ClipboardList,
  AlertTriangle,
  Briefcase,
  Coffee,
  Check,
  Eye,
  X,
  CreditCard,
} from "lucide-react";
import { getTeachers } from "@/lib/services/teacher.service";
import { getEmployeeMonthlyAttendance } from "@/lib/services/attendance.service";
import type { TeacherProfile, EmployeeAttendanceRecord } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function EmployeesAttendanceReportPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  // Current Month/Year (YYYY-MM)
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });

  const [employees, setEmployees] = useState<TeacherProfile[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlipEmployee, setSelectedSlipEmployee] = useState<any | null>(null);

  // Load Staff List
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

  // Load Monthly Attendance Records
  const loadData = useCallback(async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("basic_attendance")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const recs = await getEmployeeMonthlyAttendance(schoolId, selectedYearMonth);
      setMonthlyRecords(recs);
    } catch (err) {
      console.error("Failed to load monthly employee attendance:", err);
      toast.error("Failed to load staff attendance report.");
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedYearMonth, profile?.role, canAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Month Navigation
  const handleMonthStep = (offset: number) => {
    const [year, month] = selectedYearMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setSelectedYearMonth(`${d.getFullYear()}-${mm}`);
  };

  // Days in month
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedYearMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedYearMonth]);

  // Build matrix: employeeId -> date -> Record
  const matrix = useMemo(() => {
    const map = new Map<string, Map<number, EmployeeAttendanceRecord>>();
    monthlyRecords.forEach((r) => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, new Map());
      }
      const day = parseInt(r.date.slice(8, 10), 10);
      map.get(r.employeeId)!.set(day, r);
    });
    return map;
  }, [monthlyRecords]);

  // Total recorded working days for school
  const workingDaysCount = useMemo(() => {
    const set = new Set<string>();
    monthlyRecords.forEach((r) => set.add(r.date));
    return set.size || 26; // default standard if early in month
  }, [monthlyRecords]);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      set.add(e.department || "Academic Faculty");
    });
    return Array.from(set).sort();
  }, [employees]);

  // Aggregated Staff Statistics
  const staffStats = useMemo(() => {
    return employees.map((emp) => {
      const recordsForEmp = matrix.get(emp.id);
      let present = 0;
      let absent = 0;
      let onLeave = 0;
      let late = 0;
      let paidLeaves = 0;
      let unpaidLeaves = 0;

      if (recordsForEmp) {
        recordsForEmp.forEach((r) => {
          const st = (r.status || "").toUpperCase();
          if (st === "PRESENT") present++;
          else if (st === "ABSENT") absent++;
          else if (st === "ON_LEAVE") {
            onLeave++;
            if (r.leaveType === "UNPAID") unpaidLeaves++;
            else paidLeaves++;
          } else if (st === "LATE") late++;
        });
      }

      const totalMarked = present + absent + onLeave + late;
      const effectivePresent = present + late + paidLeaves;
      const pct = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 100;

      // Payroll Net Payable Days (assuming standard month days)
      const latePenaltyDays = Math.floor(late / 3) * 0.5; // Every 3 lates = 0.5 day
      const netPayableDays = Math.max(0, present + paidLeaves + late - latePenaltyDays);

      return {
        employee: emp,
        present,
        absent,
        onLeave,
        paidLeaves,
        unpaidLeaves,
        late,
        latePenaltyDays,
        netPayableDays,
        totalMarked,
        pct,
      };
    });
  }, [employees, matrix]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffStats.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.employee.name && String(item.employee.name).toLowerCase().includes(q)) ||
        (item.employee.email && String(item.employee.email).toLowerCase().includes(q)) ||
        (item.employee.phone && String(item.employee.phone).includes(q));

      const dept = item.employee.department || "Academic Faculty";
      const matchesDept = departmentFilter === "all" ? true : dept === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [staffStats, searchQuery, departmentFilter]);

  // Macro Summary
  const macroSummary = useMemo(() => {
    const totalStaff = staffStats.length;
    const avgRate =
      totalStaff > 0
        ? Math.round(staffStats.reduce((acc, curr) => acc + curr.pct, 0) / totalStaff)
        : 0;
    const totalLeaves = staffStats.reduce((acc, curr) => acc + curr.onLeave, 0);

    return { totalStaff, avgRate, totalLeaves };
  }, [staffStats]);

  // Export CSV
  const handleExportCSV = () => {
    if (staffStats.length === 0) {
      toast.error("No staff attendance records to export.");
      return;
    }
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Designation",
      "Present Days",
      "Approved Leaves",
      "Absent Days",
      "Late Marks",
      "Net Payable Days",
      "Attendance %",
      "Month",
    ];
    const rows = staffStats.map((item) => [
      item.employee.id,
      `"${item.employee.name || item.employee.fullName || ""}"`,
      `"${item.employee.department || "Academic Faculty"}"`,
      `"${item.employee.designation || "Teacher"}"`,
      item.present,
      item.paidLeaves,
      item.absent + item.unpaidLeaves,
      item.late,
      item.netPayableDays,
      `${item.pct}%`,
      selectedYearMonth,
    ]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", uri);
    link.setAttribute("download", `Employees_Attendance_Payroll_${selectedYearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded payroll attendance CSV.");
  };

  return (
    <EntitlementGate
      feature="basic_attendance"
      title="Attendance Management Required"
      description="Upgrade your subscription plan to generate monthly staff payroll attendance ledgers."
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-sm shrink-0"
          >
            <ClipboardList className="h-4 w-4" />
            <span>Employees Attendance Report</span>
          </Link>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <span>Payroll & HR Audit</span>
              <span>/</span>
              <span>Monthly Staff Ledger</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <ClipboardList className="h-6 w-6" />
              </div>
              Employees Attendance Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monthly staff attendance reconciliation, payable days calculation, and printable attendance slips for payroll.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Navigator */}
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => handleMonthStep(-1)}
                title="Previous Month"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <input
                  type="month"
                  value={selectedYearMonth}
                  onChange={(e) => setSelectedYearMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-hidden border-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => handleMonthStep(1)}
                title="Next Month"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Payroll CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
              <span>Total Staff</span>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {macroSummary.totalStaff}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Teaching & Admin Personnel</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span>Staff Turnout</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {macroSummary.avgRate}%
            </div>
            <div className="text-[11px] text-emerald-600/70 mt-1">Monthly average attendance</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              <span>Leaves Approved</span>
              <Coffee className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
              {macroSummary.totalLeaves} Days
            </div>
            <div className="text-[11px] text-indigo-500 mt-1">Casual, Sick & Duty Leaves</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-900/40 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
              <span>Working Days</span>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {workingDaysCount} Days
            </div>
            <div className="text-[11px] text-amber-600 mt-1">Roll calls recorded</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Department Filter
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
                Search Staff Member
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Name, email, phone or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Generating monthly payroll attendance ledger...
            </p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/60 shadow-xs">
            <Users className="h-8 w-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">No Employees Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              No staff members matched the chosen filters for {selectedYearMonth}.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/70 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Approved Leaves</th>
                    <th className="py-3 px-4 text-center">Absent (Unpaid)</th>
                    <th className="py-3 px-4 text-center">Late Marks</th>
                    <th className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/20 font-bold text-blue-700 dark:text-blue-300">
                      Net Payable Days
                    </th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStaff.map((item) => (
                    <tr
                      key={item.employee.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {(item.employee.name || item.employee.fullName || "T").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {item.employee.name || item.employee.fullName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {item.employee.email || item.employee.phone || "ID: " + item.employee.id.slice(0, 6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {item.employee.department || "Academic Faculty"}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {item.employee.designation || (item.employee as any).role || "Teacher"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {item.present}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {item.paidLeaves}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                        {item.absent + item.unpaidLeaves}
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium text-amber-600 dark:text-amber-400">
                        {item.late}
                        {item.latePenaltyDays > 0 && (
                          <span className="text-[10px] text-rose-500 block">(-{item.latePenaltyDays}d penalty)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 text-sm">
                        {item.netPayableDays} Days
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.pct >= 90
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : item.pct >= 75
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {item.pct}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSlipEmployee(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-[11px] font-medium transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Attendance Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Printable Monthly Attendance Slip Modal */}
        {selectedSlipEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5">
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Employee Monthly Attendance Slip
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Official verification for payroll calculation ({selectedYearMonth})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlipEmployee(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Employee Bio */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Employee Name</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedSlipEmployee.employee.name || selectedSlipEmployee.employee.fullName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Department / Designation</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedSlipEmployee.employee.department || "Faculty"} •{" "}
                    {selectedSlipEmployee.employee.designation || "Teacher"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Email / Phone</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedSlipEmployee.employee.email || selectedSlipEmployee.employee.phone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Billing Cycle / Period</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {new Date(`${selectedYearMonth}-01`).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block text-lg">
                    {selectedSlipEmployee.present}
                  </span>
                  <span className="text-[11px] text-emerald-600/80 font-medium">Days Present</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block text-lg">
                    {selectedSlipEmployee.paidLeaves}
                  </span>
                  <span className="text-[11px] text-indigo-600/80 font-medium">Paid Leaves</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block text-lg">
                    {selectedSlipEmployee.absent + selectedSlipEmployee.unpaidLeaves}
                  </span>
                  <span className="text-[11px] text-rose-600/80 font-medium">Unpaid Absences</span>
                </div>
              </div>

              {/* Net Result */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                    Certified Net Payable Days
                  </span>
                  <span className="text-[11px] text-blue-700/80 dark:text-blue-400">
                    Late deduction penalty: {selectedSlipEmployee.latePenaltyDays} days ({selectedSlipEmployee.late} late marks)
                  </span>
                </div>
                <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                  {selectedSlipEmployee.netPayableDays} Days
                </div>
              </div>

              {/* Signature Lines */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-8 text-center text-[11px] text-gray-500">
                <div>
                  <div className="border-b border-gray-300 dark:border-gray-600 mb-1 w-32 mx-auto" />
                  <span>HR / Principal Signature</span>
                </div>
                <div>
                  <div className="border-b border-gray-300 dark:border-gray-600 mb-1 w-32 mx-auto" />
                  <span>Employee Signature</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlipEmployee(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EntitlementGate>
  );
}
