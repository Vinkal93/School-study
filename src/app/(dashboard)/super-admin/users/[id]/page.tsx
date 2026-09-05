"use client";

import { useEffect, useState, useMemo } from "react";
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
  KeyRound,
  LogOut,
  MapPin,
  ExternalLink,
  Laptop,
  CheckCircle,
  Trash2,
  UserCheck,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchFullUserProfileDetails } from "@/lib/services/super-admin.service";
import { getAllSchools } from "@/lib/services/school.service";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import type {
  AppUser,
  School,
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
  const { profile: currentUser, impersonateUser } = useAuth();

  const [user, setUser] = useState<AppUser | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [academicProfile, setAcademicProfile] = useState<any>(null);
  const [schoolStats, setSchoolStats] = useState<any>(null);
  const [loginLogs, setLoginLogs] = useState<LoginLogEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [securityControl, setSecurityControl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 9 Canonical Tabs
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "personal"
    | "school_role"
    | "activity"
    | "sessions"
    | "permissions"
    | "subscription"
    | "security"
    | "audit"
  >("overview");

  const [copiedUid, setCopiedUid] = useState(false);

  // Modals & Action States
  const [modalType, setModalType] = useState<
    "EDIT_PROFILE" | "CHANGE_ROLE" | "CHANGE_SCHOOL" | "CONFIRM_ACTION" | "RESET_PASSWORD" | null
  >(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string>("");
  const [actionTargetStatus, setActionTargetStatus] = useState<string>("active");
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>("student");
  const [newSelectedSchoolId, setNewSelectedSchoolId] = useState<string>("");
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    dob: "",
    className: "",
    sectionName: "",
  });

  const loadUserData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [data, schoolsData] = await Promise.all([
        fetchFullUserProfileDetails(userId),
        getAllSchools(),
      ]);

      setUser(data.user);
      setSchool(data.school);
      setAllSchools(schoolsData);
      setAcademicProfile(data.academicProfile);
      setSchoolStats(data.schoolStats);
      setLoginLogs(data.loginLogs || []);
      setAuditLogs(data.auditLogs || []);
      setActivityLogs(data.activityLogs || []);

      setEditForm({
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.academicProfile?.phone || (data.user as any).phone || "",
        address: data.academicProfile?.address || (data.user as any).address || "",
        gender: (data.user as any).gender || "",
        dob: (data.user as any).dob || "",
        className: data.academicProfile?.className || (data.user as any).className || "",
        sectionName: data.academicProfile?.sectionName || (data.user as any).sectionName || "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Could not load user profile");
      router.push("/super-admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [userId]);

  // Real-time listener for userSecurityControl
  useEffect(() => {
    if (!userId) return;
    try {
      const db = getFirebaseDb();
      const unsub = onSnapshot(doc(db, "userSecurityControl", userId), (snap) => {
        if (snap.exists()) {
          setSecurityControl(snap.data());
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not subscribe to userSecurityControl:", e);
    }
  }, [userId]);

  const handleCopyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    toast.success("User ID copied to clipboard");
  };

  // Centralized action execution via backend API
  const executeUserAction = async (payload: any) => {
    if (!currentUser || !user) return;
    setModalSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/users/${user.uid}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerUid: currentUser.uid,
          reason: actionReason.trim() || undefined,
          ...payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed to execute.");

      toast.success(data.message || "Action executed successfully.");
      setModalType(null);
      setActionReason("");
      setPendingAction("");

      if (payload.action === "DELETE_USER") {
        router.push("/super-admin/users");
        return;
      }

      await loadUserData();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute user action.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openConfirmActionModal = (
    action: "UPDATE_STATUS" | "FORCE_LOGOUT" | "REVOKE_SESSIONS" | "REQUIRE_RE_LOGIN" | "DELETE_USER",
    targetStatus: string = "active"
  ) => {
    setPendingAction(action);
    setActionTargetStatus(targetStatus);
    setActionReason("");
    setModalType("CONFIRM_ACTION");
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">Loading User Profile Command Center...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const permissionsList = ROLE_PERMISSIONS[user.role] || [];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200/50">
            <Shield className="h-3 w-3" />
            Super Admin
          </span>
        );
      case "school_admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200/50">
            <Shield className="h-3 w-3" />
            School Admin
          </span>
        );
      case "teacher":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200/50">
            <BookOpen className="h-3 w-3" />
            Teacher
          </span>
        );
      case "student":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200/50">
            <GraduationCap className="h-3 w-3" />
            Student
          </span>
        );
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Active Account
        </span>
      );
    }
    if (status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Suspended
        </span>
      );
    }
    if (status === "blocked") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5" />
          Blocked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300">
        <Power className="h-3.5 w-3.5" />
        Disabled
      </span>
    );
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal Information" },
    { id: "school_role", label: "School & Role" },
    { id: "activity", label: "Activity" },
    { id: "sessions", label: "Sessions" },
    { id: "permissions", label: "Permissions" },
    { id: "subscription", label: "Subscription/Entitlement" },
    { id: "security", label: "Security" },
    { id: "audit", label: "Audit History" },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/super-admin/users"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Global Users Directory
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold text-xl dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60">
              {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.name || "Unnamed User"}
                </h1>
                {getRoleBadge(user.role)}
                {getStatusBadge(user.status)}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  {user.email}
                </span>

                <span className="flex items-center gap-1 font-mono">
                  <span className="text-gray-400">UID:</span>
                  <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {user.uid}
                  </span>
                  <button
                    onClick={handleCopyUid}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    title="Copy UID"
                  >
                    {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </span>

                {school ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    {school.name} ({school.code || school.id.slice(0, 6)})
                  </span>
                ) : (
                  <span className="text-purple-600 font-medium">Platform Global Account</span>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {user.role !== "super_admin" && (
              <button
                onClick={() => impersonateUser(user)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400"
              >
                <UserCheck className="h-4 w-4" />
                Impersonate
              </button>
            )}

            <button
              onClick={() => {
                setActionReason("");
                setModalType("EDIT_PROFILE");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Edit className="h-4 w-4 text-blue-600" />
              Edit Profile
            </button>

            <button
              onClick={() => {
                setNewSelectedRole(user.role);
                setActionReason("");
                setModalType("CHANGE_ROLE");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Shield className="h-4 w-4 text-purple-600" />
              Change Role
            </button>

            <button
              onClick={() => {
                setNewSelectedSchoolId(user.schoolId || "");
                setActionReason("");
                setModalType("CHANGE_SCHOOL");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Building2 className="h-4 w-4 text-indigo-600" />
              Move School
            </button>

            <button
              onClick={() => openConfirmActionModal("FORCE_LOGOUT")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              Force Logout
            </button>

            {user.role !== "super_admin" && (
              <button
                onClick={() => openConfirmActionModal("DELETE_USER")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* 9 Canonical Tabs Navigation Bar */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 mt-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Role</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                  {user.role.replace("_", " ")}
                </span>
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-1 text-xs text-gray-400">{permissionsList.length} RBAC Permissions</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Affiliated School</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {school ? school.name : "Platform Global"}
                </span>
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {school ? `Code: ${school.code || "None"}` : "Multi-Tenant Unrestricted"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Security Control</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {securityControl?.status || user.status.toUpperCase()}
                </span>
                <Lock className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Version: {securityControl?.securityVersion || 1}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Recent Sessions</span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {loginLogs.length} Logins
                </span>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {loginLogs[0] ? new Date(loginLogs[0].timestamp as any).toLocaleDateString() : "No record"}
              </p>
            </div>
          </div>

          {/* Profile Overview Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
              Profile Summary & System Metadata
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-400">Full Legal Name</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">{user.name || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Official Email</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">{user.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Phone Number</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {(user as any).phone || academicProfile?.phone || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Assigned Class / Grade</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {(user as any).className || academicProfile?.className || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Section</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {(user as any).sectionName || academicProfile?.sectionName || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Account Created</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1 font-mono text-xs">
                  {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Personal & Demographic Information
              </h2>
              <p className="text-xs text-gray-500">
                Verified identity records and communication contact details.
              </p>
            </div>
            <button
              onClick={() => {
                setActionReason("");
                setModalType("EDIT_PROFILE");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              Edit Information
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-400">Full Name</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{user.name || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Primary Email</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{user.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Contact Phone</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {(user as any).phone || academicProfile?.phone || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Residential Address</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {(user as any).address || academicProfile?.address || "—"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-400">Gender</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5 capitalize">
                  {(user as any).gender || academicProfile?.gender || "Not specified"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Date of Birth</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {(user as any).dob || academicProfile?.dob || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Emergency Contact</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {(user as any).emergencyContact || academicProfile?.emergencyContact || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">User Identification Code</span>
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-0.5">{user.uid}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCHOOL & ROLE */}
      {activeTab === "school_role" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                School Affiliation & Role Scope
              </h2>
              <p className="text-xs text-gray-500">
                Tenant containment, operational authority, and classroom associations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewSelectedRole(user.role);
                  setActionReason("");
                  setModalType("CHANGE_ROLE");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
              >
                <Shield className="h-3.5 w-3.5" />
                Change Role
              </button>
              <button
                onClick={() => {
                  setNewSelectedSchoolId(user.schoolId || "");
                  setActionReason("");
                  setModalType("CHANGE_SCHOOL");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Building2 className="h-3.5 w-3.5" />
                Transfer School
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Tenant School Information
              </h3>
              {school ? (
                <>
                  <div>
                    <span className="text-xs text-gray-400">School Legal Name</span>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{school.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">School Code</span>
                    <p className="font-mono text-xs font-bold text-blue-600 mt-0.5">{school.code || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Official School Contact</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5">{school.phone || "—"} | {school.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Campus Address</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-0.5">{school.address || "—"}, {school.city || ""}</p>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-gray-500">
                  This user is a Platform Global account and is not restricted to any individual school tenant.
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-600" />
                Academic Assignment
              </h3>
              <div>
                <span className="text-xs text-gray-400">Current Role</span>
                <div className="mt-1">{getRoleBadge(user.role)}</div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Class / Section</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {(user as any).className || academicProfile?.className || "—"}{" "}
                  {(user as any).sectionName || academicProfile?.sectionName ? `- ${(user as any).sectionName || academicProfile?.sectionName}` : ""}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Student Adm No / Teacher Staff ID</span>
                <p className="font-mono text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                  {(user as any).admissionNumber || academicProfile?.admissionNumber || academicProfile?.employeeId || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY */}
      {activeTab === "activity" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                User Operational Activity Stream
              </h2>
              <p className="text-xs text-gray-500">
                Actions recorded by this user across administrative and academic modules.
              </p>
            </div>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-xs text-gray-500">No operational activities recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {activityLogs.map((act) => (
                <div key={act.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {act.action || act.description || "Activity"}
                    </span>
                    <p className="text-gray-500 mt-0.5">{act.details || JSON.stringify(act.payload || "")}</p>
                  </div>
                  <span className="text-gray-400 font-mono">
                    {act.timestamp ? new Date(act.timestamp as any).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SESSIONS */}
      {activeTab === "sessions" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Active & Historic Login Sessions
              </h2>
              <p className="text-xs text-gray-500">
                Recent authentication events, client devices, and IP addresses.
              </p>
            </div>
            <button
              onClick={() => openConfirmActionModal("FORCE_LOGOUT")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Revoke All Active Sessions
            </button>
          </div>

          {loginLogs.length === 0 ? (
            <div className="text-center py-12">
              <Laptop className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-xs text-gray-500">No login records tracked for this user account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">IP Address</th>
                    <th className="py-2.5 px-3 font-semibold">Browser / Client</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Login Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-3 font-mono text-gray-700 dark:text-gray-300">
                        {log.ipAddress || "—"}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {log.userAgent || "Web Portal"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                          <CheckCircle className="h-3 w-3" />
                          Authenticated
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500">
                        {log.timestamp ? new Date(log.timestamp as any).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PERMISSIONS */}
      {activeTab === "permissions" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Role-Based Access Control (RBAC) Permissions
            </h2>
            <p className="text-xs text-gray-500">
              Active permission capabilities granted based on role: <span className="font-semibold text-blue-600">{user.role}</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {permissionsList.map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/50"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 font-mono">
                  {perm}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SUBSCRIPTION / ENTITLEMENT */}
      {activeTab === "subscription" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Tenant Subscription & Platform Entitlement
            </h2>
            <p className="text-xs text-gray-500">
              License tier and module entitlements applied to this user account.
            </p>
          </div>

          {school ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-400">Assigned Plan</span>
                <p className="text-lg font-bold text-blue-600 mt-1 uppercase">
                  {(school as any).plan || "Pro Tier"}
                </p>
                <p className="text-xs text-gray-400 mt-1">Multi-campus enterprise package</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-400">Subscription Status</span>
                <p className="text-lg font-bold text-emerald-600 mt-1 capitalize">
                  {school.status}
                </p>
                <p className="text-xs text-gray-400 mt-1">Active billing cycle</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-xs text-gray-400">Student / Faculty Enrolled</span>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {schoolStats?.studentsCount || 0} Students / {schoolStats?.teachersCount || 0} Teachers
                </p>
                <p className="text-xs text-gray-400 mt-1">Within tenant quota</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-6 text-center text-xs dark:border-purple-900/40 dark:bg-purple-950/20">
              <Sparkles className="mx-auto h-8 w-8 text-purple-600 mb-2" />
              <p className="font-bold text-sm text-purple-900 dark:text-purple-200">
                Global Super Admin Privileges
              </p>
              <p className="text-purple-700 dark:text-purple-400 mt-1">
                Unlimited platform access with unrestricted cross-tenant governance authority.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: SECURITY */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Real-Time Security & Session Controls
              </h2>
              <p className="text-xs text-gray-500">
                Session revocation tokens, emergency lockout, and password management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                Live Token Versioning & Status
              </h3>
              <div>
                <span className="text-xs text-gray-400">Security Version</span>
                <p className="font-mono text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {securityControl?.securityVersion || 1}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Require Re-Login Flag</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {securityControl?.requireReLogin ? (
                    <span className="text-amber-600 font-bold">YES (Active Invalidation)</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">NO (Normal State)</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Suspension / Lockout Reason</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {securityControl?.reason || "No active restriction"}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Administrative Security Triggers
              </h3>

              <button
                onClick={() => {
                  setActionReason("");
                  setModalType("RESET_PASSWORD");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  Trigger Password Reset
                </span>
                <span className="text-gray-400">Execute &rarr;</span>
              </button>

              <button
                onClick={() => openConfirmActionModal("REQUIRE_RE_LOGIN")}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-xs font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Power className="h-4 w-4 text-orange-600" />
                  Require Immediate Re-Authentication
                </span>
                <span className="text-gray-400">Execute &rarr;</span>
              </button>

              <button
                onClick={() => openConfirmActionModal("FORCE_LOGOUT")}
                className="flex w-full items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-xs font-semibold text-rose-700 hover:bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/20"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-rose-600" />
                  Revoke Refresh Tokens & Force Logout
                </span>
                <span className="text-rose-500">Execute &rarr;</span>
              </button>

              {user.status === "active" ? (
                <button
                  onClick={() => openConfirmActionModal("UPDATE_STATUS", "suspended")}
                  className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs font-semibold text-amber-700 hover:bg-amber-100/60"
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Suspend User Account
                  </span>
                  <span className="text-amber-500">Execute &rarr;</span>
                </button>
              ) : (
                <button
                  onClick={() => openConfirmActionModal("UPDATE_STATUS", "active")}
                  className="flex w-full items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/60"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Activate User Account
                  </span>
                  <span className="text-emerald-500">Execute &rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: AUDIT HISTORY */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
          <div className="border-b pb-4 border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Compliance & Administrative Audit Trail
            </h2>
            <p className="text-xs text-gray-500">
              Immutable log of every privileged change targeting this account.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-xs text-gray-500">No administrative audit records found for this user.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-xs dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                        {log.action}
                      </span>
                      <span className="text-gray-500">
                        By: <span className="font-semibold text-gray-700 dark:text-gray-300">{log.performedBy?.name || log.performedBy?.email || "Super Admin"}</span>
                      </span>
                    </div>
                    <span className="text-gray-400 font-mono">
                      {log.timestamp ? new Date(log.timestamp as any).toLocaleString() : "—"}
                    </span>
                  </div>

                  <div className="mt-2 text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-500">Reason:</span> {log.reason || "Administrative update"}
                  </div>

                  {log.previousState && log.newState && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono bg-white dark:bg-gray-950 p-2 rounded border border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="text-red-500 font-semibold">PREVIOUS:</span>
                        <pre className="text-gray-500 overflow-x-auto mt-0.5">{JSON.stringify(log.previousState, null, 2)}</pre>
                      </div>
                      <div>
                        <span className="text-emerald-500 font-semibold">NEW:</span>
                        <pre className="text-gray-700 dark:text-gray-300 overflow-x-auto mt-0.5">{JSON.stringify(log.newState, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL ACTION MODALS */}
      {/* MODAL 1: EDIT PROFILE */}
      {modalType === "EDIT_PROFILE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Authorized Profile</h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeUserAction({
                  action: "UPDATE_PROFILE",
                  profileUpdates: editForm,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={editForm.email}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Class / Grade
                  </label>
                  <input
                    type="text"
                    value={editForm.className}
                    onChange={(e) => setEditForm((p) => ({ ...p, className: e.target.value }))}
                    placeholder="e.g. Class 10"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editForm.sectionName}
                    onChange={(e) => setEditForm((p) => ({ ...p, sectionName: e.target.value }))}
                    placeholder="e.g. A"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street, City, State"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Profile details updated per verified request"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Profile Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ROLE */}
      {modalType === "CHANGE_ROLE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Change User Role</h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeUserAction({
                  action: "CHANGE_ROLE",
                  newRole: newSelectedRole,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select New Role *
                </label>
                <select
                  value={newSelectedRole}
                  onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="student">Student (Learner Portal)</option>
                  <option value="teacher">Teacher (Faculty Portal)</option>
                  <option value="school_admin">School Admin (Tenant Manager)</option>
                  <option value="super_admin">Super Admin (Global System Controller)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Justification / Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="State the regulatory or operational reason for role change..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Role Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE SCHOOL */}
      {modalType === "CHANGE_SCHOOL" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transfer / Move School</h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeUserAction({
                  action: "CHANGE_SCHOOL",
                  newSchoolId: newSelectedSchoolId,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select Target School *
                </label>
                <select
                  required
                  value={newSelectedSchoolId}
                  onChange={(e) => setNewSelectedSchoolId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">-- Choose Tenant School --</option>
                  {allSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || s.id.slice(0, 6)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Justification / Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="State the school transfer justification..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm School Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET PASSWORD */}
      {modalType === "RESET_PASSWORD" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reset Account Password</h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeUserAction({
                  action: "RESET_PASSWORD",
                  newPassword: newPasswordInput,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  New Password (Min. 6 Characters) *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter strong temporary password"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Password reset requested by user / school principal"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {modalSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Set New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM HIGH RISK ACTION */}
      {modalType === "CONFIRM_ACTION" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${
                    pendingAction === "DELETE_USER" || actionTargetStatus === "suspended"
                      ? "text-red-600"
                      : "text-amber-600"
                  }`}
                />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {pendingAction === "DELETE_USER"
                    ? "Confirm Account Deletion"
                    : pendingAction === "FORCE_LOGOUT"
                    ? "Confirm Force Logout"
                    : pendingAction === "REQUIRE_RE_LOGIN"
                    ? "Require Re-Authentication"
                    : actionTargetStatus === "suspended"
                    ? "Suspend User Account"
                    : "Activate User Account"}
                </h2>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pendingAction === "UPDATE_STATUS") {
                  executeUserAction({
                    action: "UPDATE_STATUS",
                    newStatus: actionTargetStatus,
                  });
                } else if (pendingAction === "FORCE_LOGOUT") {
                  executeUserAction({
                    action: "FORCE_LOGOUT",
                  });
                } else if (pendingAction === "REQUIRE_RE_LOGIN") {
                  executeUserAction({
                    action: "REQUIRE_RE_LOGIN",
                  });
                } else if (pendingAction === "DELETE_USER") {
                  executeUserAction({
                    action: "DELETE_USER",
                  });
                }
              }}
              className="mt-4 space-y-4"
            >
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Target: {user.name} ({user.email})
                </p>
                <p className="text-gray-500 font-mono">UID: {user.uid}</p>
                {pendingAction === "DELETE_USER" && (
                  <p className="text-red-600 font-semibold mt-1">
                    WARNING: This permanently deletes this user record from both Firebase Authentication and Firestore!
                  </p>
                )}
                {pendingAction === "FORCE_LOGOUT" && (
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    This will immediately revoke Firebase refresh tokens and force sign-out across all active sessions.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Provide detailed compliance or administrative reason..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                    pendingAction === "DELETE_USER"
                      ? "bg-red-600 hover:bg-red-700"
                      : pendingAction === "FORCE_LOGOUT"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : actionTargetStatus === "suspended"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {modalSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm & Execute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
