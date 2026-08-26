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
  Eye,
  ExternalLink,
  Edit,
  Activity,
  BarChart3,
  Clock,
  Save,
  X,
} from "lucide-react";
import { getSchoolById } from "@/lib/services/school.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { UserProfileInspector } from "@/components/super-admin/UserProfileInspector";
import { useAuth } from "@/hooks/use-auth";
import type {
  School,
  TeacherProfile,
  StudentProfile,
  SchoolClass,
  Section,
  AppUser,
  UserRole,
  UserStatus,
} from "@/types";
import { toast } from "sonner";

interface EnrichedSchoolUser extends AppUser {
  teacherCode?: string;
  studentId?: string;
  lastLogin?: any;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<(SchoolClass & { sections?: Section[] })[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<EnrichedSchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Tab State: 'overview' | 'users' | 'teachers' | 'students' | 'classes'
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "teachers" | "students" | "classes">("overview");

  // User Filter & Search State
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | UserRole>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [userSearch, setUserSearch] = useState("");

  // Action Loading states
  const [togglingSchoolStatus, setTogglingSchoolStatus] = useState(false);
  const [togglingUserUid, setTogglingUserUid] = useState<string | null>(null);

  // Inspector Drawer State
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Edit School Modal State
  const [isEditSchoolOpen, setIsEditSchoolOpen] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
  });

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

      setEditForm({
        name: schoolData.name || "",
        code: schoolData.code || "",
        phone: schoolData.phone || "",
        email: schoolData.email || "",
        address: schoolData.address || "",
        city: schoolData.city || "",
        state: schoolData.state || "",
      });

      // Load school users
      if (currentUser) {
        loadSchoolUsers(schoolId, currentUser.uid);
      }
    } catch (err: any) {
      toast.error("Failed to load school details: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolUsers = async (sId: string, performerUid: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(
        `/api/super-admin/schools/${sId}/users?performerUid=${performerUid}`
      );
      const data = await res.json();
      if (data.users) {
        setSchoolUsers(data.users);
      }
    } catch (err) {
      console.warn("Could not load enriched school users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadSchoolData();
  }, [schoolId, currentUser?.uid]);

  const handleToggleSchoolStatus = async () => {
    if (!school || !currentUser) return;
    const nextStatus = school.status === "active" ? "inactive" : "active";
    setTogglingSchoolStatus(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update school status");

      setSchool((prev) => (prev ? { ...prev, status: nextStatus } : null));
      toast.success(
        `School "${school.name}" is now ${nextStatus === "active" ? "Activated" : "Deactivated"}.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update school status.");
    } finally {
      setTogglingSchoolStatus(false);
    }
  };

  const handleSaveSchoolEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !currentUser) return;
    setSavingSchool(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          ...editForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update school info");

      setSchool((prev) => (prev ? { ...prev, ...editForm } : null));
      setIsEditSchoolOpen(false);
      toast.success("School information updated successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update school details.");
    } finally {
      setSavingSchool(false);
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
          reason: `Status changed from School Explorer (${school?.name}) by ${currentUser.name || currentUser.email}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user status");

      // Update local states
      setSchoolUsers((prev) =>
        prev.map((u) => (u.uid === userUid ? { ...u, status: nextStatus } : u))
      );
      setTeachers((prev) =>
        prev.map((t) =>
          t.userId === userUid
            ? { ...t, status: nextStatus === "active" ? "active" : "inactive" }
            : t
        )
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.userId === userUid
            ? { ...s, status: nextStatus === "active" ? "active" : "inactive" }
            : s
        )
      );

      toast.success(`User "${userName}" has been ${nextStatus === "active" ? "Activated" : "Disabled"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setTogglingUserUid(null);
    }
  };

  const handleInspect = (user: AppUser) => {
    setSelectedUser(user);
    setInspectorOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Loading School Control Center...</p>
        </div>
      </div>
    );
  }

  if (!school) return null;

  // Filtered Users List
  const filteredSchoolUsers = schoolUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.teacherCode && u.teacherCode.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.studentId && u.studentId.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole = userRoleFilter === "all" ? true : u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === "all" ? true : u.status === userStatusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        );
      case "school_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <Shield className="h-3 w-3" />
            School Admin
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <BookOpen className="h-3 w-3" />
            Teacher
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
            <GraduationCap className="h-3 w-3" />
            Student
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/super-admin/schools"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schools
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadSchoolData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            href={`/super-admin/schools/${school.id}/analytics`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View Analytics
          </Link>
          <button
            onClick={() => setIsEditSchoolOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit School
          </button>
          <button
            onClick={handleToggleSchoolStatus}
            disabled={togglingSchoolStatus}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              school.status === "active"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {togglingSchoolStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {school.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* School Overview Hero Banner */}
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
                <span className="flex items-center gap-1 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {school.createdAt?.toDate ? school.createdAt.toDate().toLocaleDateString() : "Active"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
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
              Classes & Sections
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl bg-orange-50/50 p-4 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-xs font-semibold">
              <Shield className="h-4 w-4" />
              Primary Admin
            </div>
            <p className="mt-2 text-xs font-medium text-gray-900 dark:text-white truncate" title={school.adminEmail}>
              {school.adminEmail || "Configured"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "overview"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Overview & Attendance
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "users"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          School Users Explorer ({schoolUsers.length})
        </button>
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
          Classes ({classes.length})
        </button>
      </div>

      {/* Tab 1: Overview & Attendance */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Overview Card */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Attendance & Operational Health
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 block">Total Active Classes</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block">
                  {classes.length}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 block">Active Student Body</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block">
                  {students.filter((s) => s.status === "active").length}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 block">Faculty Headcount</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block">
                  {teachers.filter((t) => t.status === "active").length}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-blue-100 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/20">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                Tenant Portal Direct Access
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Access tenant authentication portals with school code: <strong className="font-mono text-blue-600 dark:text-blue-400">{school.code}</strong>
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  href="/admin/login"
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Admin Portal <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href="/teacher/login"
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  Teacher Portal <ExternalLink className="h-3 w-3" />
                </Link>
                <Link
                  href="/student/login"
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-700"
                >
                  Student Portal <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* School Admin Profile Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              School Admin Credentials
            </h3>
            <div className="space-y-3 text-xs">
              <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block font-medium">Administrator UID:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {school.adminId || "Provisioned Admin"}
                </span>
              </div>
              <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block font-medium">Email Address:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {school.adminEmail}
                </span>
              </div>
              <div className="py-2">
                <span className="text-gray-400 block font-medium">Tenant Status:</span>
                <span className="font-semibold text-green-600 capitalize">
                  {school.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: School Users Explorer (Complete User Ecosystem) */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <label htmlFor="school-user-search" className="sr-only">Search users</label>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="school-user-search"
                name="search"
                aria-label="Search users"
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, email, UID, ID code..."
                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <label htmlFor="school-user-role-filter" className="text-xs font-medium text-gray-500">
                  Role:
                </label>
                <select
                  id="school-user-role-filter"
                  name="roleFilter"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="all">All Roles</option>
                  <option value="school_admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="school-user-status-filter" className="text-xs font-medium text-gray-500">
                  Status:
                </label>
                <select
                  id="school-user-status-filter"
                  name="statusFilter"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled / Restricted</option>
                </select>
              </div>
            </div>
          </div>

          {/* School Users Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
            {loadingUsers ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredSchoolUsers.length === 0 ? (
              <div className="text-center py-16">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
                  No users found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search query or filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="py-3.5 px-4 font-medium">User</th>
                      <th className="py-3.5 px-4 font-medium">Role</th>
                      <th className="py-3.5 px-4 font-medium">ID / Code</th>
                      <th className="py-3.5 px-4 font-medium">Status</th>
                      <th className="py-3.5 px-4 font-medium">Last Login</th>
                      <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredSchoolUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {u.teacherCode ? (
                            <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded">
                              {u.teacherCode}
                            </span>
                          ) : u.studentId ? (
                            <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                              {u.studentId}
                            </span>
                          ) : (
                            <span className="text-gray-400">{u.uid.slice(0, 8)}...</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.status === "active"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {u.status === "active" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500 font-mono">
                          {u.lastLogin?.toDate ? (
                            u.lastLogin.toDate().toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/super-admin/users/${u.uid}`}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {u.role !== "super_admin" && (
                              <button
                                onClick={() => handleToggleUserStatus(u.uid, u.status, u.name)}
                                disabled={togglingUserUid === u.uid}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                  u.status === "active"
                                    ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40"
                                    : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40"
                                } disabled:opacity-50`}
                              >
                                {togglingUserUid === u.uid ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Power className="h-3.5 w-3.5" />
                                )}
                                {u.status === "active" ? "Disable" : "Activate"}
                              </button>
                            )}
                          </div>
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

      {/* Tab 3: Teachers */}
      {activeTab === "teachers" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
          {teachers.length === 0 ? (
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
                  {teachers.map((t) => (
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
      )}

      {/* Tab 4: Students */}
      {activeTab === "students" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No students enrolled in this school.</p>
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
                  {students.map((s) => (
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
                        {s.sectionName && <span className="text-gray-400"> ({s.sectionName})</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 capitalize">{s.gender || "—"}</td>
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
      )}

      {/* Tab 5: Classes */}
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

      {/* Edit School Modal */}
      {isEditSchoolOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit School Information
              </h3>
              <button
                onClick={() => setIsEditSchoolOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label htmlFor="school-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Name
                </label>
                <input
                  id="school-name"
                  name="name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="school-code" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    School Code
                  </label>
                  <input
                    id="school-code"
                    name="code"
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="school-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="school-phone"
                    name="phone"
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="school-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Email
                </label>
                <input
                  id="school-email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="school-city" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    id="school-city"
                    name="city"
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="school-state" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    id="school-state"
                    name="state"
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditSchoolOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchool}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingSchool ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Inspector Drawer */}
      <UserProfileInspector
        user={selectedUser}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onUserUpdated={(updated) => {
          setSchoolUsers((prev) =>
            prev.map((u) => (u.uid === updated.uid ? { ...u, ...updated } : u))
          );
          setSelectedUser(updated);
        }}
      />
    </div>
  );
}
