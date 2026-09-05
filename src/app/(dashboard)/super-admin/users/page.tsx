"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Power,
  Shield,
  GraduationCap,
  BookOpen,
  Eye,
  Activity,
  Calendar,
  Clock,
  Filter,
  UserCheck,
  Trash2,
  Copy,
  Check,
  MoreVertical,
  KeyRound,
  LogOut,
  Building2,
  ShieldAlert,
  Edit,
  UserCog,
  AlertTriangle,
  X,
  Phone,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import {
  getAllUsers,
  getAllSchools,
  subscribeToAllUsers,
  subscribeToAllSchools,
} from "@/lib/services/school.service";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser, UserRole, UserStatus, School } from "@/types";
import { toast } from "sonner";

export default function UsersManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <UsersManagementContent />
    </Suspense>
  );
}

function UsersManagementContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role") as UserRole | null;

  const { profile: currentUser, impersonateUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>(roleParam || "all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastActiveFilter, setLastActiveFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");

  // Interactive UI states
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [modalType, setModalType] = useState<
    "EDIT_PROFILE" | "CHANGE_ROLE" | "CHANGE_SCHOOL" | "CONFIRM_ACTION" | "RESET_PASSWORD" | null
  >(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Modal Form States
  const [actionReason, setActionReason] = useState("");
  const [actionTargetStatus, setActionTargetStatus] = useState<string>("active");
  const [pendingAction, setPendingAction] = useState<string>("");
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>("student");
  const [newSelectedSchoolId, setNewSelectedSchoolId] = useState<string>("");
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    className: "",
    sectionName: "",
  });

  useEffect(() => {
    if (roleParam) {
      setRoleFilter(roleParam);
    }
  }, [roleParam]);

  // Real-time listener for users and schools
  useEffect(() => {
    setLoading(true);
    let unsubUsers: (() => void) | null = null;
    let unsubSchools: (() => void) | null = null;

    try {
      unsubUsers = subscribeToAllUsers((usersData) => {
        setUsers(usersData);
        setLoading(false);
      });
    } catch {
      getAllUsers().then((data) => {
        setUsers(data);
        setLoading(false);
      });
    }

    try {
      unsubSchools = subscribeToAllSchools((schoolsData) => {
        setSchools(schoolsData);
      });
    } catch {
      getAllSchools().then((data) => {
        setSchools(data);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubSchools) unsubSchools();
    };
  }, []);

  const schoolMap = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach((s) => map.set(s.id, s));
    return map;
  }, [schools]);

  // Helper to format timestamps and relative active time
  const getTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === "number") return val;
    if (val.toMillis) return val.toMillis();
    if (val.toDate) return val.toDate().getTime();
    if (typeof val === "string") {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getRelativeActiveTime = (user: AppUser) => {
    const lastActive = (user as any).lastActiveAt || (user as any).lastLoginAt || user.updatedAt;
    const ms = getTimestampMs(lastActive);
    if (!ms) return "Never";

    const diffMins = Math.floor((Date.now() - ms) / (1000 * 60));
    if (diffMins < 2) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ms).toLocaleDateString();
  };

  const isOnlineNow = (user: AppUser) => {
    const lastActive = (user as any).lastActiveAt || (user as any).lastLoginAt;
    const ms = getTimestampMs(lastActive);
    if (!ms) return false;
    return Date.now() - ms <= 15 * 60 * 1000;
  };

  // Top 7 Stats
  const stats = useMemo(() => {
    let totalUsers = users.length;
    let active = 0;
    let onlineNow = 0;
    let suspended = 0;
    let teachers = 0;
    let students = 0;
    let schoolAdmins = 0;

    users.forEach((u) => {
      const isSuspended = u.status === "suspended" || u.status === "blocked" || u.status === "disabled";
      if (u.status === "active") active++;
      if (isSuspended) suspended++;
      if (isOnlineNow(u)) onlineNow++;
      if (u.role === "teacher") teachers++;
      if (u.role === "student") students++;
      if (u.role === "school_admin") schoolAdmins++;
    });

    return {
      totalUsers,
      active,
      onlineNow,
      suspended,
      teachers,
      students,
      schoolAdmins,
    };
  }, [users]);

  // Search and Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Search (Name, Email, Phone, User ID, School ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (u.name || "").toLowerCase().includes(q);
        const matchesEmail = (u.email || "").toLowerCase().includes(q);
        const matchesPhone = ((u as any).phone || "").toLowerCase().includes(q);
        const matchesUid = (u.uid || "").toLowerCase().includes(q);
        const matchesSchoolId = (u.schoolId || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesUid && !matchesSchoolId) {
          return false;
        }
      }

      // 2. School Filter
      if (schoolFilter !== "all") {
        if (schoolFilter === "none") {
          if (u.schoolId) return false;
        } else if (u.schoolId !== schoolFilter) {
          return false;
        }
      }

      // 3. Role Filter
      if (roleFilter !== "all" && u.role !== roleFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && u.status !== "active") return false;
        if (statusFilter === "suspended" && u.status !== "suspended") return false;
        if (statusFilter === "blocked" && u.status !== "blocked") return false;
        if (statusFilter === "disabled" && u.status !== "disabled") return false;
      }

      // 5. Last Active Filter
      if (lastActiveFilter !== "all") {
        const getLastActive = (item: any) => item.lastActiveAt || item.lastLoginAt || item.updatedAt;
        const ms = getTimestampMs(getLastActive(u));
        const now = Date.now();
        if (lastActiveFilter === "online") {
          if (!ms || now - ms > 15 * 60 * 1000) return false;
        } else if (lastActiveFilter === "today") {
          if (!ms || now - ms > 24 * 60 * 60 * 1000) return false;
        } else if (lastActiveFilter === "week") {
          if (!ms || now - ms > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (lastActiveFilter === "inactive_30d") {
          if (ms && now - ms <= 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // 6. Account Type Filter
      if (accountTypeFilter !== "all") {
        if (accountTypeFilter === "school_bound" && !u.schoolId) return false;
        if (accountTypeFilter === "global" && u.schoolId) return false;
      }

      return true;
    });
  }, [users, searchQuery, schoolFilter, roleFilter, statusFilter, lastActiveFilter, accountTypeFilter]);

  // Copy UID helper
  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
    toast.success("User ID copied to clipboard");
  };

  // Generic Action Dispatcher to backend API
  const executeUserAction = async (payload: any) => {
    if (!currentUser || !selectedUser) return;
    setModalSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/users/${selectedUser.uid}/actions`, {
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

      toast.success(data.message || "User action completed successfully.");
      setModalType(null);
      setActionReason("");
      setPendingAction("");
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute user action.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Handlers
  const openEditProfileModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditProfileForm({
      name: user.name || "",
      email: user.email || "",
      phone: (user as any).phone || "",
      address: (user as any).address || "",
      className: (user as any).className || "",
      sectionName: (user as any).sectionName || "",
    });
    setActionReason("");
    setModalType("EDIT_PROFILE");
    setActionMenuOpenId(null);
  };

  const openChangeRoleModal = (user: AppUser) => {
    setSelectedUser(user);
    setNewSelectedRole(user.role);
    setActionReason("");
    setModalType("CHANGE_ROLE");
    setActionMenuOpenId(null);
  };

  const openChangeSchoolModal = (user: AppUser) => {
    setSelectedUser(user);
    setNewSelectedSchoolId(user.schoolId || "");
    setActionReason("");
    setModalType("CHANGE_SCHOOL");
    setActionMenuOpenId(null);
  };

  const openResetPasswordModal = (user: AppUser) => {
    setSelectedUser(user);
    setNewPasswordInput("");
    setActionReason("");
    setModalType("RESET_PASSWORD");
    setActionMenuOpenId(null);
  };

  const openConfirmActionModal = (
    user: AppUser,
    action: "UPDATE_STATUS" | "FORCE_LOGOUT" | "REVOKE_SESSIONS" | "REQUIRE_RE_LOGIN" | "DELETE_USER",
    targetStatus: string = "active"
  ) => {
    setSelectedUser(user);
    setPendingAction(action);
    setActionTargetStatus(targetStatus);
    setActionReason("");
    setModalType("CONFIRM_ACTION");
    setActionMenuOpenId(null);
  };

  // Role Badge Helper
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

  // Status Badge Helper
  const getStatusBadge = (user: AppUser) => {
    const isOnline = isOnlineNow(user);

    if (user.status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-emerald-600"}`} />
          Active
        </span>
      );
    }
    if (user.status === "suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          Suspended
        </span>
      );
    }
    if (user.status === "blocked") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200/60 dark:bg-red-950/40 dark:text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          Blocked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 border border-gray-200/60 dark:bg-gray-800 dark:text-gray-300">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
        Disabled
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Global Users Command Center
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Authoritative multi-tenant directory, session security control, and credential administration.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              getAllUsers().then((d) => {
                setUsers(d);
                setLoading(false);
                toast.success("Users directory reloaded");
              });
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 7 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Users */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Users</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Global Accounts</p>
        </div>

        {/* Active */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Permitted Access</p>
        </div>

        {/* Online Now */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Online Now</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.onlineNow}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Past 15 Minutes</p>
        </div>

        {/* Suspended */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Suspended</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.suspended}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Restricted / Blocked</p>
        </div>

        {/* Teachers */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Teachers</span>
            <BookOpen className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.teachers}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Faculty Staff</p>
        </div>

        {/* Students */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Students</span>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.students}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Enrolled Learners</p>
        </div>

        {/* School Admins */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">School Admins</span>
            <Shield className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.schoolAdmins}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Tenant Principals</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, Email, Phone, User ID, School ID..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-xs md:text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* School Filter */}
          <div className="md:col-span-2">
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Schools</option>
              <option value="none">Platform Global (No School)</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id.slice(0, 6)})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Last Active Filter */}
          <div className="md:col-span-2">
            <select
              value={lastActiveFilter}
              onChange={(e) => setLastActiveFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Last Active</option>
              <option value="online">Online Now (&lt; 15 min)</option>
              <option value="today">Active Today (&lt; 24h)</option>
              <option value="week">Active Past 7 Days</option>
              <option value="inactive_30d">Inactive (&gt; 30 Days)</option>
            </select>
          </div>

          {/* Account Type Filter */}
          <div className="md:col-span-2">
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="all">All Account Types</option>
              <option value="school_bound">School Bound</option>
              <option value="global">Platform Global</option>
            </select>
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Role Filter:
          </span>
          {(["all", "super_admin", "school_admin", "teacher", "student"] as const).map((r) => {
            const count = r === "all" ? users.length : users.filter((u) => u.role === r).length;
            const isSelected = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => {
                  setRoleFilter(r);
                  if (r === "all") router.push("/super-admin/users");
                  else router.push(`/super-admin/users?role=${r}`);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {r.replace("_", " ")}
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isSelected
                      ? "bg-blue-700 text-white"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No matching users found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria or resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-3 font-semibold">User ID</th>
                  <th className="py-3.5 px-3 font-semibold">Role</th>
                  <th className="py-3.5 px-3 font-semibold">School Scope</th>
                  <th className="py-3.5 px-3 font-semibold">Status</th>
                  <th className="py-3.5 px-3 font-semibold">Last Active</th>
                  <th className="py-3.5 px-3 font-semibold">Created</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((u) => {
                  const targetSchool = u.schoolId ? schoolMap.get(u.schoolId) : null;
                  const relativeActive = getRelativeActiveTime(u);
                  const isMenuOpen = actionMenuOpenId === u.uid;

                  return (
                    <tr
                      key={u.uid}
                      className="hover:bg-gray-50/75 dark:hover:bg-gray-900/50 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs dark:bg-blue-950 dark:text-blue-300">
                            {(u.name || u.email || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/super-admin/users/${u.uid}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
                            >
                              {u.name || "Unnamed User"}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span>{u.email}</span>
                              {(u as any).phone && (
                                <>
                                  <span>•</span>
                                  <span>{(u as any).phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* User ID (Monospace + Copy) */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                            title={u.uid}
                          >
                            {u.uid.slice(0, 8)}...
                          </span>
                          <button
                            onClick={() => handleCopyUid(u.uid)}
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                            title="Copy UID"
                          >
                            {copiedUid === u.uid ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">{getRoleBadge(u.role)}</td>

                      {/* School Scope */}
                      <td className="py-3.5 px-3 text-xs">
                        {u.schoolId ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-gray-200">
                              {targetSchool ? targetSchool.name : u.schoolId.slice(0, 8)}
                            </span>
                            {targetSchool?.code && (
                              <span className="text-[10px] text-blue-600 font-mono">
                                CODE: {targetSchool.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                            Platform Global
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">{getStatusBadge(u)}</td>

                      {/* Last Active */}
                      <td className="py-3.5 px-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{relativeActive}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-3 text-xs text-gray-500 font-mono">
                        {u.createdAt?.toDate ? (
                          u.createdAt.toDate().toLocaleDateString()
                        ) : u.createdAt ? (
                          new Date(u.createdAt as any).toLocaleDateString()
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Inspect View */}
                          <Link
                            href={`/super-admin/users/${u.uid}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>

                          {/* Impersonate */}
                          {u.role !== "super_admin" && (
                            <button
                              onClick={() => impersonateUser(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400 transition-colors"
                              title="Live Impersonation Mode"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Context Action Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuOpenId(isMenuOpen ? null : u.uid)}
                              className="inline-flex items-center rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {isMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActionMenuOpenId(null)}
                                />
                                <div className="absolute right-0 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-20 dark:border-gray-800 dark:bg-gray-900 text-left">
                                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                    Administrative Actions
                                  </div>

                                  <button
                                    onClick={() => openEditProfileModal(u)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                                    Edit Profile
                                  </button>

                                  <button
                                    onClick={() => openChangeRoleModal(u)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                                    Change Role
                                  </button>

                                  <button
                                    onClick={() => openChangeSchoolModal(u)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                                    Move / Change School
                                  </button>

                                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                                  <button
                                    onClick={() => openResetPasswordModal(u)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                                    Reset Password
                                  </button>

                                  <button
                                    onClick={() => openConfirmActionModal(u, "REQUIRE_RE_LOGIN")}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <Power className="h-3.5 w-3.5 text-orange-600" />
                                    Require Re-Login
                                  </button>

                                  <button
                                    onClick={() => openConfirmActionModal(u, "FORCE_LOGOUT")}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                  >
                                    <LogOut className="h-3.5 w-3.5 text-rose-600" />
                                    Force Logout (Revoke Session)
                                  </button>

                                  {u.status === "active" ? (
                                    <button
                                      onClick={() => openConfirmActionModal(u, "UPDATE_STATUS", "suspended")}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    >
                                      <ShieldAlert className="h-3.5 w-3.5" />
                                      Suspend Account
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openConfirmActionModal(u, "UPDATE_STATUS", "active")}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Activate Account
                                    </button>
                                  )}

                                  {u.role !== "super_admin" && (
                                    <>
                                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                      <button
                                        onClick={() => openConfirmActionModal(u, "DELETE_USER")}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete Account
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: EDIT PROFILE */}
      {modalType === "EDIT_PROFILE" && selectedUser && (
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
                  profileUpdates: editProfileForm,
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
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm((p) => ({ ...p, name: e.target.value }))}
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
                  value={editProfileForm.email}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm((p) => ({ ...p, phone: e.target.value }))}
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
                    value={editProfileForm.className}
                    onChange={(e) => setEditProfileForm((p) => ({ ...p, className: e.target.value }))}
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
                    value={editProfileForm.sectionName}
                    onChange={(e) => setEditProfileForm((p) => ({ ...p, sectionName: e.target.value }))}
                    placeholder="e.g. A"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Audit Reason *
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
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
      {modalType === "CHANGE_ROLE" && selectedUser && (
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
                <p className="text-xs text-gray-500">Target User:</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</p>
                <p className="text-xs text-gray-400">{selectedUser.email}</p>
              </div>

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
                  placeholder="State the regulatory or operational reason for this privilege change..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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

      {/* MODAL 3: CHANGE / ASSIGN SCHOOL */}
      {modalType === "CHANGE_SCHOOL" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign / Move School</h2>
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
                <p className="text-xs text-gray-500">Target User:</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</p>
                <p className="text-xs text-gray-400">{selectedUser.email}</p>
              </div>

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
                  {schools.map((s) => (
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
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
      {modalType === "RESET_PASSWORD" && selectedUser && (
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
                <p className="text-xs text-gray-500">Target User:</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedUser.name}</p>
                <p className="text-xs text-gray-400">{selectedUser.email}</p>
              </div>

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
                  placeholder="Enter strong new temporary password"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Password reset requested by authorized principal"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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

      {/* MODAL 5: CONFIRM HIGH-RISK ACTION (Suspend, Activate, Force Logout, Re-Login, Delete) */}
      {modalType === "CONFIRM_ACTION" && selectedUser && (
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
                  Target: {selectedUser.name} ({selectedUser.email})
                </p>
                <p className="text-gray-500 font-mono">UID: {selectedUser.uid}</p>
                {pendingAction === "DELETE_USER" && (
                  <p className="text-red-600 font-semibold mt-1">
                    WARNING: This permanently deletes this user record from both Firebase Authentication and Firestore!
                  </p>
                )}
                {pendingAction === "FORCE_LOGOUT" && (
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    This will immediately revoke Firebase refresh tokens and force sign-out in real-time across all active browser tabs and devices.
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
                  placeholder="Provide detailed justification for compliance audit..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
