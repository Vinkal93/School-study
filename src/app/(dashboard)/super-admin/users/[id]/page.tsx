"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Power,
  Edit,
  Activity,
  History,
  Save,
  X,
  Loader2,
  Copy,
  Check,
  GraduationCap,
  BookOpen,
  Layers,
  Phone,
  Lock,
  Globe,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { AccountRestrictionModal } from "@/components/super-admin/AccountRestrictionModal";
import { StatusChangeConfirmModal } from "@/components/super-admin/StatusChangeConfirmModal";
import type {
  AppUser,
  School,
  TeacherProfile,
  StudentProfile,
  UserRole,
  UserStatus,
  LoginLogEntry,
  AuditLogEntry,
} from "@/types";
import { toast } from "sonner";

export default function UserProfileInspectorPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { profile: currentUser } = useAuth();

  const [user, setUser] = useState<AppUser | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [academicProfile, setAcademicProfile] = useState<any>(null);
  const [schoolStats, setSchoolStats] = useState<any>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [lastLogin, setLastLogin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tab State: 'overview' | 'account' | 'activity' | 'access'
  const [activeTab, setActiveTab] = useState<"overview" | "account" | "activity" | "access">("overview");
  const [copiedUid, setCopiedUid] = useState(false);

  // Restriction & Status Modals State
  const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);
  const [statusConfirmState, setStatusConfirmState] = useState<{
    isOpen: boolean;
    targetStatus: UserStatus;
  }>({
    isOpen: false,
    targetStatus: "active",
  });

  // Edit Profile Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    className: "",
    sectionName: "",
    assignedClassName: "",
    status: "active" as UserStatus,
  });

  const loadUserData = async () => {
    if (!userId || !currentUser) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/users/${userId}?performerUid=${currentUser.uid}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load user profile");

      setUser(data.user);
      setSchool(data.school);
      setAcademicProfile(data.academicProfile);
      setSchoolStats(data.schoolStats);
      setLoginLogs(data.loginLogs || []);
      setAuditLogs(data.auditLogs || []);
      setActivityLogs(data.activityLogs || []);
      setLastLogin(data.lastLogin);

      setEditForm({
        name: data.user.name || "",
        phone: data.academicProfile?.phone || "",
        address: data.academicProfile?.address || "",
        className: data.academicProfile?.className || "",
        sectionName: data.academicProfile?.sectionName || "",
        assignedClassName: data.academicProfile?.assignedClassName || "",
        status: data.user.status || "active",
      });
    } catch (err: any) {
      toast.error(err.message || "Could not load user profile");
      router.push("/super-admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userId, currentUser?.uid]);

  const handleCopyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    toast.success("User UID copied to clipboard!");
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUser) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/super-admin/users/${user.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          ...editForm,
          reason: `Profile information updated by Super Admin (${currentUser.name || currentUser.email})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setUser((prev) => (prev ? { ...prev, name: editForm.name, status: editForm.status } : null));
      if (academicProfile) {
        setAcademicProfile((prev: any) => ({ ...prev, ...editForm }));
      }
      setIsEditOpen(false);
      toast.success("User profile updated successfully with audit log recorded.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Loading User Profile Inspector...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];

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

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        );
      case "restricted":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <ShieldAlert className="h-3 w-3" />
            Restricted
          </span>
        );
      case "suspended":
      case "disabled":
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users Explorer
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadUserData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Profile
          </button>

          {/* Phase 4 Restriction & Suspension Controls */}
          {user.role !== "super_admin" && (
            <>
              {user.status === "restricted" ? (
                <button
                  onClick={() =>
                    setStatusConfirmState({ isOpen: true, targetStatus: "active" })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Remove Restriction
                </button>
              ) : (
                <button
                  onClick={() => setIsRestrictModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Restrict Account
                </button>
              )}

              {user.status === "active" ? (
                <button
                  onClick={() =>
                    setStatusConfirmState({ isOpen: true, targetStatus: "suspended" })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                >
                  <Power className="h-3.5 w-3.5" />
                  Suspend Account
                </button>
              ) : user.status !== "restricted" ? (
                <button
                  onClick={() =>
                    setStatusConfirmState({ isOpen: true, targetStatus: "active" })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors"
                >
                  <Power className="h-3.5 w-3.5" />
                  Re-activate Account
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Active Restriction Alert Banner */}
      {user.status === "restricted" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-xs">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="font-bold">This account is currently under Platform Restriction.</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5">
              Normal write operations are blocked. Super Admin can remove the restriction anytime using the button above.
            </p>
          </div>
        </div>
      )}

      {/* 3.1 Profile Header Hero Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {academicProfile?.photoUrl ? (
              <img
                src={academicProfile.photoUrl}
                alt={user.name}
                className="h-16 w-16 rounded-2xl object-cover border border-gray-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.name}
                </h1>
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {user.email}
                </span>
                {school ? (
                  <Link
                    href={`/super-admin/schools/${school.id}`}
                    className="flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {school.name} ({school.code})
                  </Link>
                ) : (
                  <span className="text-purple-600 font-semibold dark:text-purple-400">
                    Platform Owner Scope
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : "Active"}
                </span>
                <span className="flex items-center gap-1 font-mono text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  Last Login: {lastLogin?.toDate ? lastLogin.toDate().toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3.3 Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "overview"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Overview & Academic Details
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "account"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Account & Security
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "activity"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Login & Audit History ({loginLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("access")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            activeTab === "access"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Access & Permissions ({userPermissions.length})
        </button>
      </div>

      {/* Tab 1: 3.2 Role-Specific Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* School Admin Specific Overview */}
          {user.role === "school_admin" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <span className="text-xs text-gray-500 font-semibold uppercase">Supervised Faculty</span>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {schoolStats?.totalTeachers ?? 0} Teachers
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <span className="text-xs text-gray-500 font-semibold uppercase">Enrolled Students</span>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {schoolStats?.totalStudents ?? 0} Students
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <span className="text-xs text-gray-500 font-semibold uppercase">Classes Configured</span>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {schoolStats?.totalClasses ?? 0} Classes
                </p>
              </div>
            </div>
          )}

          {/* Teacher Specific Overview */}
          {user.role === "teacher" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Teacher Assignment & Faculty Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Teacher ID Code:</span>
                  <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 mt-1 block">
                    {academicProfile?.teacherCode || "—"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Assigned Class / Section:</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white mt-1 block">
                    {academicProfile?.assignedClassName || "No class assigned"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Phone Contact:</span>
                  <span className="font-semibold text-gray-900 dark:text-white mt-1 block">
                    {academicProfile?.phone || "Not provided"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Joining Date:</span>
                  <span className="font-semibold text-gray-900 dark:text-white mt-1 block">
                    {academicProfile?.joiningDate || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Student Specific Overview */}
          {user.role === "student" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Student Enrollment & Academic Record
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Admission Number:</span>
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-1 block">
                    {academicProfile?.admissionNumber || "—"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Class & Section:</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white mt-1 block">
                    {academicProfile?.className || "—"}
                    {academicProfile?.sectionName ? ` (${academicProfile.sectionName})` : ""}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-gray-400 block font-medium">Gender:</span>
                  <span className="font-semibold capitalize text-gray-900 dark:text-white mt-1 block">
                    {academicProfile?.gender || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Super Admin Specific Overview */}
          {user.role === "super_admin" && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-6 dark:border-purple-900/30 dark:bg-purple-950/20 text-xs">
              <h3 className="text-base font-bold text-purple-900 dark:text-purple-300 mb-2">
                Platform Owner Profile
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This account possesses unrestricted administrative visibility and control over all schools, users, and audit logs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Account & Security */}
      {activeTab === "account" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4 text-xs">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            Identity & Authentication Metadata
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 font-medium">Firebase Authentication UID</span>
              <div className="flex items-center gap-2 font-mono font-semibold text-gray-900 dark:text-white">
                <span>{user.uid}</span>
                <button
                  onClick={handleCopyUid}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400"
                  title="Copy UID"
                >
                  {copiedUid ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 font-medium">Email Address</span>
              <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500 font-medium">Tenant Isolation Scope</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {user.schoolId ? `School Scope (${user.schoolId})` : "Platform Global"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500 font-medium">Account Status</span>
              <span className="font-bold uppercase text-gray-900 dark:text-white">
                {user.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Chronological Activity & Security Timeline */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Chronological Activity & Session Timeline
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Track user logins, operational submissions, and platform administrative modifications.
            </p>

            {loginLogs.length === 0 && activityLogs.length === 0 && auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-xs text-gray-500">No recorded telemetry or activity logs for this user yet.</p>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6">
                {/* Combined & Sorted Timeline Stream */}
                {[
                  ...loginLogs.map((l) => ({
                    id: l.id,
                    type: "login" as const,
                    title: l.status === "success" ? "Successful Login" : "Failed Login Attempt",
                    timestamp: l.timestamp,
                    status: l.status,
                    details: `IP: ${l.ipAddress || "direct"} · ${l.browser || "Browser"} (${l.platform || "Device"})`,
                    color: l.status === "success" ? "bg-green-500" : "bg-red-500",
                  })),
                  ...activityLogs.map((a) => ({
                    id: a.id,
                    type: "activity" as const,
                    title: a.action?.replace(/_/g, " "),
                    timestamp: a.timestamp,
                    status: a.status,
                    details: a.entityName ? `Target: ${a.entityName}` : `Entity: ${a.entityType}`,
                    color: "bg-blue-500",
                  })),
                  ...auditLogs.map((au) => ({
                    id: au.id,
                    type: "audit" as const,
                    title: `Admin: ${au.action?.replace(/_/g, " ")}`,
                    timestamp: au.timestamp,
                    status: "success",
                    details: `By ${au.performedBy?.name || "Super Admin"} · Reason: ${au.reason || "Administrative update"}`,
                    color: "bg-purple-500",
                  })),
                ]
                  .sort((a, b) => {
                    const tA = a.timestamp?.seconds || 0;
                    const tB = b.timestamp?.seconds || 0;
                    return tB - tA;
                  })
                  .map((item, idx) => {
                    const dateObj = item.timestamp?.toDate ? item.timestamp.toDate() : null;
                    const timeString = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently";
                    const dateString = dateObj ? dateObj.toLocaleDateString() : "";

                    return (
                      <div key={item.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ${item.color} ring-4 ring-white dark:ring-gray-950`}
                        />
                        <div className="bg-gray-50/70 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-xs hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 dark:text-white capitalize text-sm">
                              {item.title}
                            </span>
                            <span className="font-mono text-[11px] text-gray-500 font-medium">
                              {dateString} {timeString}
                            </span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {item.details}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Access & Permissions */}
      {activeTab === "access" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            Computed Permissions Matrix
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Granular permissions granted to this account based on its active role (<strong className="font-mono uppercase">{user.role}</strong>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {userPermissions.map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-mono font-medium text-gray-700 dark:text-gray-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-950 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Permitted Profile Information
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-4 text-sm">
              <div>
                <label htmlFor="user-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  id="user-name"
                  name="name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="user-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  id="user-phone"
                  name="phone"
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {user.role === "teacher" && (
                <div>
                  <label htmlFor="user-assigned-class" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Class / Section
                  </label>
                  <input
                    id="user-assigned-class"
                    name="assignedClassName"
                    type="text"
                    value={editForm.assignedClassName}
                    onChange={(e) => setEditForm({ ...editForm, assignedClassName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}

              {user.role === "student" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="user-class" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Class
                    </label>
                    <input
                      id="user-class"
                      name="className"
                      type="text"
                      value={editForm.className}
                      onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="user-section" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Section
                    </label>
                    <input
                      id="user-section"
                      name="sectionName"
                      type="text"
                      value={editForm.sectionName}
                      onChange={(e) => setEditForm({ ...editForm, sectionName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="user-status" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Status
                </label>
                <select
                  id="user-status"
                  name="status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="restricted">Restricted</option>
                  <option value="suspended">Suspended</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Restriction Modal */}
      {currentUser && (
        <AccountRestrictionModal
          user={user}
          isOpen={isRestrictModalOpen}
          onClose={() => setIsRestrictModalOpen(false)}
          onRestricted={(updated) => setUser(updated)}
          performerUid={currentUser.uid}
        />
      )}

      {/* Status Change Confirmation Modal */}
      {currentUser && (
        <StatusChangeConfirmModal
          user={user}
          targetStatus={statusConfirmState.targetStatus}
          isOpen={statusConfirmState.isOpen}
          onClose={() =>
            setStatusConfirmState((prev) => ({ ...prev, isOpen: false }))
          }
          onSuccess={(updated) => setUser(updated)}
          performerUid={currentUser.uid}
        />
      )}
    </div>
  );
}
