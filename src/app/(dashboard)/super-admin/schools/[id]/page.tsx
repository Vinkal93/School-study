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
  Filter,
  Percent,
  TrendingUp,
} from "lucide-react";
import { getSchoolById } from "@/lib/services/school.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getActivityLogs } from "@/lib/services/audit.service";
import { fetchSchoolUsersExplorer } from "@/lib/services/super-admin.service";
import { UserProfileInspector } from "@/components/super-admin/UserProfileInspector";
import { VerifyBadge, type VerifyBadgeType } from "@/components/common/VerifyBadge";
import { Spinner } from "@/components/common/Spinner";
import { useAuth } from "@/hooks/use-auth";
import type {
  School,
  TeacherProfile,
  StudentProfile,
  SchoolClass,
  AppUser,
  UserRole,
  UserStatus,
  LoginLogEntry,
  ActivityLogEntry,
} from "@/types";
import { toast } from "sonner";

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [schoolLogins, setSchoolLogins] = useState<LoginLogEntry[]>([]);
  const [schoolActivities, setSchoolActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Active Tab State (6 Tabs: overview, users, students, teachers, analytics, activity)
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "students" | "teachers" | "analytics" | "activity"
  >("overview");

  // User Explorer Filters
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");

  // Status Action Loading
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

      // Load school users and telemetry
      if (currentUser) {
        loadSchoolUsersAndTelemetry(schoolId);
      }
    } catch (err: any) {
      toast.error("Failed to load school details: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolUsersAndTelemetry = async (sId: string) => {
    setLoadingUsers(true);
    try {
      const [usersList, activityLogs] = await Promise.all([
        fetchSchoolUsersExplorer(sId),
        getActivityLogs(50, { schoolId: sId }),
      ]);

      setSchoolUsers(usersList);
      setSchoolActivities(activityLogs);
    } catch (err: any) {
      console.warn("Failed to load school users/telemetry:", err);
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
          reason: `School status changed to ${nextStatus} by ${currentUser.name || currentUser.email}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update school status");

      setSchool((prev) => (prev ? { ...prev, status: nextStatus } : null));
      toast.success(
        `School ${school.name} has been ${nextStatus === "active" ? "Activated" : "Deactivated"} successfully.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setTogglingSchoolStatus(false);
    }
  };

  const handleUpdateBadge = async (badgeType: "none" | "basic" | "gold" | "premium") => {
    if (!school || !currentUser) return;
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          verificationBadge: badgeType === "none" ? null : badgeType,
          reason: `Verification badge set to ${badgeType} by Super Admin (${currentUser.name || currentUser.email})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update verification badge");

      setSchool((prev) => (prev ? { ...prev, verificationBadge: badgeType === "none" ? null : badgeType } : null));
      toast.success(`Verification badge updated to "${badgeType === "none" ? "Unverified" : badgeType.toUpperCase()}"!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification badge");
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
          reason: `School metadata updated by Super Admin (${currentUser.name || currentUser.email})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update school details");

      setSchool((prev) => (prev ? { ...prev, ...editForm } : null));
      setIsEditSchoolOpen(false);
      toast.success("School details updated successfully with audit log.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save edits.");
    } finally {
      setSavingSchool(false);
    }
  };

  const handleToggleUserStatus = async (targetUid: string, currentStatus: string, name?: string) => {
    if (!currentUser) return;
    const nextStatus: UserStatus = currentStatus === "active" ? "disabled" : "active";
    setTogglingUserUid(targetUid);
    try {
      const res = await fetch("/api/super-admin/users/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          targetUid,
          status: nextStatus,
          reason: `Status changed in School Explorer for ${name || "User"} by ${currentUser.name || currentUser.email}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user status");

      setSchoolUsers((prev) =>
        prev.map((u) => (u.uid === targetUid ? { ...u, status: nextStatus } : u))
      );
      toast.success(`User account has been ${nextStatus === "active" ? "Activated" : "Disabled"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle user status.");
    } finally {
      setTogglingUserUid(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Loading School Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (!school) return null;

  // Compute active user count
  const activeUsersCount = schoolUsers.filter((u) => u.status === "active").length;

  // Filtered school users
  const filteredSchoolUsers = schoolUsers.filter((u) => {
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== "all" && u.status !== userStatusFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.uid?.toLowerCase().includes(q) ||
        u.teacherCode?.toLowerCase().includes(q) ||
        u.admissionNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
          <button
            onClick={() => setIsEditSchoolOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit School
          </button>
          <button
            onClick={handleToggleSchoolStatus}
            disabled={togglingSchoolStatus}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
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
            {school.status === "active" ? "Disable" : "Activate"}
          </button>
        </div>
      </div>

      {/* School Header Hero Banner (Phase 9 UX) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {school.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="h-16 w-16 rounded-2xl object-contain border border-gray-200 bg-white p-1"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-2xl">
                {school.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {school.name}
                </h1>
                {school.verificationBadge && school.verificationBadge !== "none" && (
                  <VerifyBadge type={school.verificationBadge as any} size="sm" />
                )}
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                  School ID: {school.code}
                </span>
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
                  {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
                </span>

                {/* Super Admin Badge Quick Selector */}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                  <span className="text-[11px] font-bold text-gray-500">Badge:</span>
                  <select
                    value={school.verificationBadge || "none"}
                    onChange={(e) => handleUpdateBadge(e.target.value as any)}
                    className="text-xs font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Badge</option>
                    <option value="basic">🛡️ Basic Verified (Blue)</option>
                    <option value="gold">👑 Gold Verified</option>
                    <option value="premium">💎 Premium Verified</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
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

        {/* 4 Cards: Students, Teachers, Classes, Active Users */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="rounded-xl bg-blue-50/50 p-4 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-xs font-semibold">
              <GraduationCap className="h-4 w-4" />
              Students
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl bg-purple-50/50 p-4 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-xs font-semibold">
              <BookOpen className="h-4 w-4" />
              Teachers
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {teachers.length}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/50 p-4 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Layers className="h-4 w-4" />
              Classes
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {classes.length}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Users className="h-4 w-4" />
              Active Users
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {activeUsersCount}
            </p>
          </div>
        </div>
      </div>

      {/* 6 Tabs: Overview, Users, Students, Teachers, Analytics, Activity */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "overview"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "users"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Users ({schoolUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "students"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "teachers"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "analytics"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
            activeTab === "activity"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Activity ({schoolActivities.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Profile Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                School Institutional Metadata
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">School Unique Code:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{school.code}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Primary Admin Email:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{school.adminEmail || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Physical Address:</span>
                  <span className="text-gray-900 dark:text-white">{school.address || "Not provided"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Operational Setup:</span>
                  <span className="font-semibold text-green-600">Complete & Active</span>
                </div>
              </div>
            </div>

            {/* Attendance & Operational Health Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Operational & Attendance Health
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Faculty Capacity:</span>
                  <span className="font-bold text-purple-600">{teachers.length} Active Staff</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Student Body:</span>
                  <span className="font-bold text-blue-600">{students.length} Enrolled</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Student-to-Teacher Ratio:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {teachers.length > 0 ? `${Math.round(students.length / teachers.length)} : 1` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Dedicated Analytics:</span>
                  <Link
                    href={`/super-admin/schools/${school.id}/analytics`}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open Full Analytics <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS (School User Explorer) */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* User Search & Filter Bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search school users by Name, Email, UID, Teacher ID, or Student ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Roles</option>
              <option value="school_admin">School Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>

            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled / Restricted</option>
            </select>
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
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
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
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold capitalize text-gray-700 dark:text-gray-300">
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                          {u.teacherCode || u.admissionNumber || u.uid.slice(0, 8) + "..."}
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
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
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
                                    ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400"
                                    : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400"
                                } disabled:opacity-50`}
                              >
                                {togglingUserUid === u.uid ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Power className="h-3 w-3" />
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

      {/* TAB 3: STUDENTS */}
      {activeTab === "students" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Enrolled Student Roster ({students.length})
          </h2>
          {students.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No students registered in this school.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Admission No</th>
                    <th className="py-2.5 px-3">Class / Section</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">{s.admissionNumber || "—"}</td>
                      <td className="py-2.5 px-3">{s.className || "—"} {s.sectionName ? `(${s.sectionName})` : ""}</td>
                      <td className="py-2.5 px-3 font-mono">{(s as any).rollNumber || "—"}</td>
                      <td className="py-2.5 px-3 capitalize">{s.gender || "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/super-admin/users/${s.userId || s.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                        >
                          Profile <ArrowLeft className="h-3 w-3 rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEACHERS */}
      {activeTab === "teachers" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            Faculty Members ({teachers.length})
          </h2>
          {teachers.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No teachers registered in this school.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Teacher Name</th>
                    <th className="py-2.5 px-3">Teacher Code</th>
                    <th className="py-2.5 px-3">Assigned Class</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Joining Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {teachers.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">{t.name}</td>
                      <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400">{t.teacherCode || "—"}</td>
                      <td className="py-2.5 px-3">{t.assignedClassName || "Unassigned"}</td>
                      <td className="py-2.5 px-3 font-mono">{t.phone || "—"}</td>
                      <td className="py-2.5 px-3">{t.joiningDate || "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/super-admin/users/${t.userId || t.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-purple-600 hover:underline"
                        >
                          Profile <ArrowLeft className="h-3 w-3 rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANALYTICS (Embedded Tab) */}
      {activeTab === "analytics" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              School Performance Analytics
            </h2>
            <Link
              href={`/super-admin/schools/${school.id}/analytics`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              Open Dedicated Analytics Screen <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs text-gray-500">
            Attendance rates, operational telemetry, and student-to-teacher capacity index.
          </p>
        </div>
      )}

      {/* TAB 6: ACTIVITY */}
      {activeTab === "activity" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            School Operational Activity Stream
          </h2>
          {schoolActivities.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No recorded activity for this school yet.</p>
          ) : (
            <div className="space-y-2">
              {schoolActivities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white capitalize">
                      {act.action?.replace(/_/g, " ")}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      By {act.userName || act.userEmail || "User"} · IP: {act.ipAddress || "direct"}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-gray-500">
                    {act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString() : "Recent"}
                  </span>
                </div>
              ))}
            </div>
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
                Edit School Details
              </h3>
              <button
                onClick={() => setIsEditSchoolOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    School Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
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
    </div>
  );
}
