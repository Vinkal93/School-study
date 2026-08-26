"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Power,
  Search,
  Layers,
  Shield,
  Calendar,
} from "lucide-react";
import { getSchoolById, updateSchoolStatus } from "@/lib/services/school.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { useAuth } from "@/hooks/use-auth";
import type { School, TeacherProfile, StudentProfile, SchoolClass, Section, AppUser, UserStatus } from "@/types";
import { toast } from "sonner";

export default function SchoolExplorerPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<(SchoolClass & { sections?: Section[] })[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"teachers" | "students" | "classes" | "admin">("teachers");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [togglingSchoolStatus, setTogglingSchoolStatus] = useState(false);
  const [togglingUserUid, setTogglingUserUid] = useState<string | null>(null);

  const loadSchoolData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [schoolData, teachersData, studentsData, classesData] = await Promise.all([
        getSchoolById(schoolId),
        getTeachers(schoolId),
        getStudents(schoolId),
        getClassesWithSections(schoolId),
      ]);

      if (!schoolData) {
        toast.error("School not found.");
        router.push("/super-admin/schools");
        return;
      }

      setSchool(schoolData);
      setTeachers(teachersData);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err: any) {
      toast.error("Failed to load school details: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, [schoolId]);

  const handleToggleSchoolStatus = async () => {
    if (!school) return;
    const nextStatus = school.status === "active" ? "inactive" : "active";
    setTogglingSchoolStatus(true);
    try {
      await updateSchoolStatus(school.id, nextStatus);
      setSchool((prev) => (prev ? { ...prev, status: nextStatus } : null));
      toast.success(
        `School "${school.name}" is now ${nextStatus === "active" ? "Activated" : "Deactivated"}.`
      );
    } catch (err) {
      toast.error("Failed to update school status.");
    } finally {
      setTogglingSchoolStatus(false);
    }
  };

  const handleToggleUserStatus = async (userUid: string, currentStatus: UserStatus, userName: string) => {
    if (!currentUser) return;
    const nextStatus: UserStatus = currentStatus === "active" ? "disabled" : "active";
    setTogglingUserUid(userUid);

    try {
      const res = await fetch("/api/super-admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          targetUid: userUid,
          status: nextStatus,
          reason: `Status changed from School Explorer (${school?.name})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user status");

      // Update local state
      const mappedAcademicStatus = nextStatus === "active" ? "active" : "inactive";
      setTeachers((prev) =>
        prev.map((t) => (t.userId === userUid ? { ...t, status: mappedAcademicStatus } : t))
      );
      setStudents((prev) =>
        prev.map((s) => (s.userId === userUid ? { ...s, status: mappedAcademicStatus } : s))
      );

      toast.success(`User "${userName}" has been ${nextStatus === "active" ? "Activated" : "Disabled"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setTogglingUserUid(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Loading School Explorer...</p>
        </div>
      </div>
    );
  }

  if (!school) return null;

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.email.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase()));

    const matchesClass =
      selectedClassFilter === "all" ? true : s.classId === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/super-admin/schools"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schools
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={loadSchoolData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleToggleSchoolStatus}
            disabled={togglingSchoolStatus}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              school.status === "active"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {togglingSchoolStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {school.status === "active" ? "Deactivate School" : "Activate School"}
          </button>
        </div>
      </div>

      {/* School Overview Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="h-16 w-16 rounded-xl object-contain border border-gray-200 bg-white p-1"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-2xl">
                {school.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {school.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    school.status === "active"
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {school.status === "active" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {school.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-mono font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  CODE: {school.code}
                </span>
                {school.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    {school.city}{school.state ? `, ${school.state}` : ""}
                  </span>
                )}
                {school.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {school.phone}
                  </span>
                )}
                {school.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {school.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="rounded-xl bg-purple-50/50 p-4 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-xs font-semibold">
              <BookOpen className="h-4 w-4" />
              Total Teachers
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {teachers.length}
            </p>
          </div>

          <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold">
              <GraduationCap className="h-4 w-4" />
              Enrolled Students
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/50 p-4 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Layers className="h-4 w-4" />
              Classes Configured
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl bg-orange-50/50 p-4 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-xs font-semibold">
              <Shield className="h-4 w-4" />
              Admin Contact
            </div>
            <p className="mt-2 text-xs font-medium text-gray-900 dark:text-white truncate" title={school.adminEmail}>
              {school.adminEmail || "Configured"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab("teachers")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "teachers"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "students"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "classes"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Classes & Sections ({classes.length})
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "admin"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          School Administrator
        </button>
      </div>

      {/* Tab: Teachers */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <label htmlFor="school-teachers-search" className="sr-only">Search teachers</label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="school-teachers-search"
                name="search"
                aria-label="Search teachers"
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher by name, code, email..."
                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No teachers found in this school.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4 font-medium">Teacher</th>
                      <th className="py-3.5 px-4 font-medium">Teacher ID</th>
                      <th className="py-3.5 px-4 font-medium">Assigned Class</th>
                      <th className="py-3.5 px-4 font-medium">Joining Date</th>
                      <th className="py-3.5 px-4 font-medium">Status</th>
                      <th className="py-3.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {t.photoUrl ? (
                              <img
                                src={t.photoUrl}
                                alt={t.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold text-xs">
                                {t.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                              <p className="text-xs text-gray-500">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {t.teacherCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                          {t.assignedClassName || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {t.joiningDate || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              t.status === "active"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {t.status === "active" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {t.status || "active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(t.userId, t.status === "inactive" ? "disabled" : "active", t.name)}
                            disabled={togglingUserUid === t.userId}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              t.status === "active"
                                ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40"
                                : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40"
                            }`}
                          >
                            {togglingUserUid === t.userId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Power className="h-3 w-3" />
                            )}
                            {t.status === "active" ? "Disable" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Students */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <label htmlFor="school-students-search" className="sr-only">Search students</label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="school-students-search"
                name="search"
                aria-label="Search students"
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name, adm no, email..."
                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="school-student-class-filter" className="text-xs font-medium text-gray-500">
                Class:
              </label>
              <select
                id="school-student-class-filter"
                name="classFilter"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="all">All Classes ({students.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No students found for this filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4 font-medium">Student</th>
                      <th className="py-3.5 px-4 font-medium">Adm No</th>
                      <th className="py-3.5 px-4 font-medium">Class / Section</th>
                      <th className="py-3.5 px-4 font-medium">Gender</th>
                      <th className="py-3.5 px-4 font-medium">Status</th>
                      <th className="py-3.5 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {s.photoUrl ? (
                              <img
                                src={s.photoUrl}
                                alt={s.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-xs">
                                {s.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                          <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {s.admissionNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{s.className || "—"}</span>
                          {s.sectionName && (
                            <span className="text-gray-400"> ({s.sectionName})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500 capitalize">
                          {s.gender || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.status === "active"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {s.status === "active" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {s.status || "active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(s.userId, s.status === "inactive" ? "disabled" : "active", s.name)}
                            disabled={togglingUserUid === s.userId}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              s.status === "active"
                                ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40"
                                : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40"
                            }`}
                          >
                            {togglingUserUid === s.userId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Power className="h-3 w-3" />
                            )}
                            {s.status === "active" ? "Disable" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Classes & Sections */}
      {activeTab === "classes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length === 0 ? (
            <div className="col-span-full text-center py-12 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
              <Layers className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No classes configured for this school yet.</p>
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 dark:text-white">{cls.name}</h3>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Grade {cls.order ?? 1}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Sections:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.sections && cls.sections.length > 0 ? (
                      cls.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                        >
                          Sec {sec.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No sections added</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: School Admin Info */}
      {activeTab === "admin" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 max-w-2xl">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            School Administrator Account Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">School Admin UID:</span>
              <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                {school.adminId || "Primary Provisioned"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Login Email:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {school.adminEmail}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">School Code:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {school.code}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Tenant Status:</span>
              <span className="font-semibold capitalize text-green-600">
                {school.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
