"use client";

import { useEffect, useState, Suspense } from "react";
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
} from "lucide-react";
import { getAllUsers, getAllSchools, updateUserStatus, deleteUserFromSystem } from "@/lib/services/school.service";
import { UserProfileInspector } from "@/components/super-admin/UserProfileInspector";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>(roleParam || "all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Inspector Drawer State
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    if (roleParam) {
      setRoleFilter(roleParam);
    } else {
      setRoleFilter("all");
    }
  }, [roleParam]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, schoolsData] = await Promise.all([
        getAllUsers(),
        getAllSchools(),
      ]);
      setUsers(usersData);
      setSchools(schoolsData);
    } catch (err) {
      toast.error("Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user: AppUser) => {
    if (!currentUser) return;
    if (user.role === "super_admin") {
      toast.warning("Cannot disable Super Admin account.");
      return;
    }

    const nextStatus: UserStatus = user.status === "active" ? "disabled" : "active";
    setTogglingUid(user.uid);
    try {
      await updateUserStatus(user.uid, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, status: nextStatus } : u))
      );
      toast.success(`User ${user.name} set to ${nextStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status.");
    } finally {
      setTogglingUid(null);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === "super_admin") {
      toast.error("Super Admin accounts cannot be deleted.");
      return;
    }

    if (
      confirm(
        `Are you sure you want to permanently delete user "${user.name}" (${user.email}) from Firebase Firestore? This will remove all associated user and profile records.`
      )
    ) {
      setDeletingUid(user.uid);
      try {
        await deleteUserFromSystem(user);
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        toast.success(`User "${user.name}" permanently deleted from Firebase!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user from Firebase.");
      } finally {
        setDeletingUid(null);
      }
    }
  };

  const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.schoolId && u.schoolId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSchool = schoolFilter === "all" || u.schoolId === schoolFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? u.status === "active" : u.status !== "active");

    return matchesSearch && matchesRole && matchesSchool && matchesStatus;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {roleFilter === "all"
              ? "Platform Users Explorer"
              : `${roleFilter.replace("_", " ").toUpperCase()} Management`}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Inspect all user profiles, live impression mode, security restrictions, and Firebase deletions.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <label htmlFor="global-users-search" className="sr-only">Search name, email, UID, school</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="global-users-search"
              name="search"
              aria-label="Search name, email, UID, school"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, UID, school..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-school" className="text-xs font-medium text-gray-500">School:</label>
              <select
                id="filter-school"
                name="schoolFilter"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="all">All Schools</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-status" className="text-xs font-medium text-gray-500">Status:</label>
              <select
                id="filter-status"
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled / Restricted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Role Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
            Role Filter:
          </span>
          {(["all", "super_admin", "school_admin", "teacher", "student"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRoleFilter(r);
                if (r === "all") router.push("/super-admin/users");
                else router.push(`/super-admin/users?role=${r}`);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                roleFilter === r
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {r.replace("_", " ")} ({r === "all" ? users.length : users.filter((u) => u.role === r).length})
            </button>
          ))}
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
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 px-4 font-medium">User</th>
                  <th className="py-3.5 px-4 font-medium">Role</th>
                  <th className="py-3.5 px-4 font-medium">School Scope</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium">Created</th>
                  <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getRoleBadge(u.role)}</td>
                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {u.schoolId ? (
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {schoolMap.get(u.schoolId) || u.schoolId.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-purple-600 font-semibold dark:text-purple-400">Platform Global</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
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
                    <td className="py-4 px-4 text-xs text-gray-500 font-mono">
                      {u.createdAt?.toDate ? (
                        u.createdAt.toDate().toLocaleDateString()
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {u.role !== "super_admin" && (
                          <button
                            onClick={() => impersonateUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400"
                            title="Open Live Impression Mode"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Impersonate
                          </button>
                        )}
                        <Link
                          href={`/super-admin/users/${u.uid}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                        {u.role !== "super_admin" && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={togglingUid === u.uid}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                u.status === "active"
                                  ? "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                  : "border border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400 dark:hover:bg-green-900/20"
                              } disabled:opacity-50`}
                            >
                              {togglingUid === u.uid ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Power className="h-3.5 w-3.5" />
                              )}
                              {u.status === "active" ? "Disable" : "Activate"}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={deletingUid === u.uid}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-400 disabled:opacity-50"
                              title="Delete permanently from Firebase"
                            >
                              {deletingUid === u.uid ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </button>
                          </>
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

      {/* User Profile Inspector Drawer */}
      <UserProfileInspector
        user={selectedUser}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onUserUpdated={(updated) => {
          setUsers((prev) =>
            prev.map((u) => (u.uid === updated.uid ? updated : u))
          );
          setSelectedUser(updated);
        }}
      />
    </div>
  );
}
