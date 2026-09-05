"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Loader2,
  RefreshCw,
  Power,
  SlidersHorizontal,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  Edit,
  UserCheck,
  KeyRound,
  LogOut,
  Eye,
  MoreVertical,
  ExternalLink,
  Users,
  GraduationCap,
  Sparkles,
  Calendar,
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
} from "lucide-react";
import {
  getAllSchools,
  subscribeToAllSchools,
  updateSchoolStatus,
  updateSchool,
  updateSchoolOperationalStatus,
} from "@/lib/services/school.service";
import { VerifyBadge } from "@/components/common/VerifyBadge";
import { SuperAdminSchoolEntitlementControlModal } from "@/components/super-admin/SuperAdminSchoolEntitlementControlModal";
import type { School, SchoolStatus } from "@/types";
import { toast } from "sonner";

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "trial" | "suspended" | "expired" | "archived"
  >("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "name_asc" | "name_desc" | "created_desc" | "created_asc" | "students_desc" | "teachers_desc"
  >("created_desc");

  // Copied School ID feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageAdminModalOpen, setIsManageAdminModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Quick Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    verificationBadge: "none",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Manage Admin form state
  const [adminForm, setAdminForm] = useState({
    adminName: "",
    adminEmail: "",
    newPassword: "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Emergency Modal state
  const [emergencyForm, setEmergencyForm] = useState({
    status: "ACTIVE" as "ACTIVE" | "PAUSED" | "READ_ONLY",
    disablePayments: false,
    disableFees: false,
    disableReports: false,
    forceLogoutAll: false,
    reason: "",
  });
  const [savingEmergency, setSavingEmergency] = useState(false);

  // Action busy indicators
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Real-time authoritative subscription listener
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllSchools((data) => {
      setSchools(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const data = await getAllSchools();
      setSchools(data);
      toast.success("Schools data refreshed from authoritative records.");
    } catch {
      toast.error("Failed to refresh schools list.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Copied ID: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status toggle handler
  const handleToggleStatus = async (school: School) => {
    const nextStatus: SchoolStatus =
      school.status === "active" ? "suspended" : "active";
    setActionLoadingId(school.id);
    try {
      await updateSchoolOperationalStatus(
        school.id,
        nextStatus,
        `Super Admin toggled status to ${nextStatus}`
      );
      toast.success(
        `School "${school.name}" status changed to ${nextStatus.toUpperCase()}.`
      );
    } catch {
      toast.error("Failed to update school status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Quick Edit
  const handleOpenEdit = (school: School) => {
    setSelectedSchool(school);
    setEditForm({
      name: school.name || "",
      code: school.code || "",
      phone: school.phone || "",
      email: school.email || "",
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
      verificationBadge: school.verificationBadge || "none",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setSavingEdit(true);
    try {
      await updateSchool(selectedSchool.id, {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        verificationBadge:
          editForm.verificationBadge === "none"
            ? null
            : (editForm.verificationBadge as any),
      });
      toast.success(`School "${editForm.name}" updated successfully.`);
      setIsEditModalOpen(false);
    } catch {
      toast.error("Failed to update school details.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Manage Admin
  const handleOpenManageAdmin = (school: School) => {
    setSelectedSchool(school);
    setAdminForm({
      adminName: school.adminName || "",
      adminEmail: school.adminEmail || "",
      newPassword: "",
    });
    setIsManageAdminModalOpen(true);
  };

  const handleSaveManageAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setSavingAdmin(true);
    try {
      const res = await fetch(
        `/api/super-admin/schools/${selectedSchool.id}/manage-admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName: adminForm.adminName.trim(),
            adminEmail: adminForm.adminEmail.trim(),
            newPassword: adminForm.newPassword.trim() || undefined,
            actorUid: "super_admin",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update admin.");
      toast.success(json.message || "Admin credentials updated successfully.");
      setIsManageAdminModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update admin account.");
    } finally {
      setSavingAdmin(false);
    }
  };

  // Open Emergency Controls Modal
  const handleOpenEmergency = async (school: School) => {
    setSelectedSchool(school);
    setEmergencyForm({
      status: school.isEmergencyPaused
        ? "PAUSED"
        : school.isReadOnly
        ? "READ_ONLY"
        : "ACTIVE",
      disablePayments: false,
      disableFees: false,
      disableReports: false,
      forceLogoutAll: false,
      reason: "",
    });
    setIsEmergencyModalOpen(true);

    // Fetch existing live controls
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}/emergency`);
      if (res.ok) {
        const json = await res.json();
        if (json.emergencyControl) {
          setEmergencyForm((prev) => ({
            ...prev,
            status: json.emergencyControl.status || prev.status,
            disablePayments: !!json.emergencyControl.disablePayments,
            disableFees: !!json.emergencyControl.disableFees,
            disableReports: !!json.emergencyControl.disableReports,
          }));
        }
      }
    } catch {
      // Non-critical fallback
    }
  };

  const handleSaveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    if (!emergencyForm.reason.trim()) {
      toast.error("A justification reason is required for emergency actions.");
      return;
    }
    setSavingEmergency(true);
    try {
      const res = await fetch(
        `/api/super-admin/schools/${selectedSchool.id}/emergency`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emergencyForm),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to execute emergency action.");
      toast.success("Emergency & access controls updated successfully.");
      setIsEmergencyModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply emergency action.");
    } finally {
      setSavingEmergency(false);
    }
  };

  // Compute distinct locations for dropdown filter
  const distinctLocations = useMemo(() => {
    const locs = new Set<string>();
    schools.forEach((s) => {
      if (s.city) locs.add(s.city.trim());
      if (s.state) locs.add(s.state.trim());
    });
    return Array.from(locs).sort();
  }, [schools]);

  // Summary counts
  const stats = useMemo(() => {
    let total = schools.length;
    let active = 0;
    let trial = 0;
    let suspended = 0;
    let expired = 0;
    let archived = 0;

    schools.forEach((s) => {
      const st = (s.status || "").toLowerCase();
      if (st === "active") active++;
      else if (st === "trial") trial++;
      else if (st === "suspended") suspended++;
      else if (st === "expired") expired++;
      else if (st === "archived") archived++;
    });

    return { total, active, trial, suspended, expired, archived };
  }, [schools]);

  // Filtered and sorted schools
  const filteredSchools = useMemo(() => {
    return schools
      .filter((school) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            school.name?.toLowerCase().includes(q) ||
            school.code?.toLowerCase().includes(q) ||
            school.id?.toLowerCase().includes(q) ||
            school.adminEmail?.toLowerCase().includes(q) ||
            school.adminName?.toLowerCase().includes(q) ||
            school.city?.toLowerCase().includes(q) ||
            school.state?.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          const st = (school.status || "").toLowerCase();
          if (st !== statusFilter) return false;
        }

        // Plan filter
        if (planFilter !== "all") {
          const pid = (school.planId || "").toLowerCase();
          const pname = (school.planName || "").toLowerCase();
          if (!pid.includes(planFilter) && !pname.includes(planFilter)) {
            return false;
          }
        }

        // Location filter
        if (locationFilter !== "all") {
          const c = (school.city || "").toLowerCase();
          const st = (school.state || "").toLowerCase();
          const target = locationFilter.toLowerCase();
          if (c !== target && st !== target) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortBy === "name_desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        if (sortBy === "created_asc") {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return aTime - bTime;
        }
        if (sortBy === "students_desc") {
          return (b.studentCount || 0) - (a.studentCount || 0);
        }
        if (sortBy === "teachers_desc") {
          return (b.teacherCount || 0) - (a.teacherCount || 0);
        }
        // Default: created_desc
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }, [schools, searchQuery, statusFilter, planFilter, locationFilter, sortBy]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-blue-600" />
            Schools Command Center
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Authoritative multi-tenant governance, lifecycle state, subscription tiers, and emergency access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/super-admin/schools/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Add New School
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Total Schools
            </span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Platform tenants</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Active
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {stats.active}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Normal operations</p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 shadow-sm dark:border-blue-900/30 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Free Trial
            </span>
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">
            {stats.trial}
          </p>
          <p className="text-[11px] text-blue-600/80 mt-0.5">Trial evaluating</p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Expired
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {stats.expired}
          </p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Awaiting renewal</p>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              Suspended
            </span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-200">
            {stats.suspended}
          </p>
          <p className="text-[11px] text-red-600/80 mt-0.5">Access halted</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Archived
            </span>
            <Layers className="h-4 w-4 text-gray-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-gray-300">
            {stats.archived}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Retired tenants</p>
        </div>
      </div>

      {/* Search, Filter Pills & Sort Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-3.5">
        {/* Row 1: Search & Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search school name, code, ID, admin name/email, city..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Plan:
            </span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="all">All Plans</option>
              <option value="free">Free Trial</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
              <option value="custom">Custom Plan</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Location:
            </span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="all">All Locations</option>
              {distinctLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="created_desc">Created: Newest First</option>
              <option value="created_asc">Created: Oldest First</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="students_desc">Students: High to Low</option>
              <option value="teachers_desc">Teachers: High to Low</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Status:
          </span>
          {[
            { id: "all", label: "All", count: stats.total },
            { id: "active", label: "Active", count: stats.active },
            { id: "trial", label: "Trial", count: stats.trial },
            { id: "suspended", label: "Suspended", count: stats.suspended },
            { id: "expired", label: "Expired", count: stats.expired },
            { id: "archived", label: "Archived", count: stats.archived },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === pill.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
              No schools match current search / filters
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your query or click Add New School to register a tenant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">School & Code</th>
                  <th className="py-3.5 px-4">School ID</th>
                  <th className="py-3.5 px-4">Admin Account</th>
                  <th className="py-3.5 px-4 text-center">Students</th>
                  <th className="py-3.5 px-4 text-center">Teachers</th>
                  <th className="py-3.5 px-4">Plan Tier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredSchools.map((s) => {
                  const isReadOnly = s.isReadOnly;
                  const isPaused = s.isEmergencyPaused;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      {/* School & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {s.logoUrl ? (
                            <img
                              src={s.logoUrl}
                              alt={s.name}
                              className="h-9 w-9 rounded-lg object-contain border border-gray-200 bg-white p-0.5"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-sm">
                              {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 dark:text-white hover:text-blue-600 transition-colors">
                                <Link href={`/super-admin/schools/${s.id}`}>
                                  {s.name}
                                </Link>
                              </p>
                              {s.verificationBadge &&
                                s.verificationBadge !== "none" && (
                                  <VerifyBadge
                                    type={s.verificationBadge as any}
                                    size="xs"
                                  />
                                )}
                              {isReadOnly && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                  Read Only
                                </span>
                              )}
                              {isPaused && (
                                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                  Emergency Paused
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {s.code || "NO_CODE"}
                              </span>
                              {s.city && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {s.city}
                                  {s.state ? `, ${s.state}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Monospace Copyable School ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-[120px] select-all"
                            title={s.id}
                          >
                            {s.id}
                          </span>
                          <button
                            onClick={() => handleCopyId(s.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Copy School ID"
                          >
                            {copiedId === s.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Admin Account */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {s.adminName || "School Admin"}
                          </p>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mt-0.5">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="truncate max-w-[140px]">
                              {s.adminEmail || "—"}
                            </span>
                          </div>
                          {(s.adminUid || s.adminId) && (
                            <p
                              className="font-mono text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]"
                              title={s.adminUid || s.adminId}
                            >
                              UID: {s.adminUid || s.adminId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Students Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full dark:bg-blue-900/20 dark:text-blue-300">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {s.studentCount !== undefined ? s.studentCount : "0"}
                        </span>
                      </td>

                      {/* Teachers Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full dark:bg-purple-900/20 dark:text-purple-300">
                          <Users className="h-3.5 w-3.5" />
                          {s.teacherCount !== undefined ? s.teacherCount : "0"}
                        </span>
                      </td>

                      {/* Plan Tier Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            s.planId?.includes("enterprise")
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : s.planId?.includes("growth")
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              : s.planId?.includes("custom")
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {s.planName || "Trial"}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            s.status === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                              : s.status === "trial"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              : s.status === "suspended"
                              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                              : s.status === "expired"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {s.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : s.status === "suspended" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {s.status || "active"}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {s.createdAt?.toDate
                          ? s.createdAt.toDate().toLocaleDateString()
                          : s.createdAt?.seconds
                          ? new Date(s.createdAt.seconds * 1000).toLocaleDateString()
                          : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Explore link */}
                          <Link
                            href={`/super-admin/schools/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400 transition-colors"
                            title="Open Command Center detail view"
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            Explore
                          </Link>

                          {/* Quick Edit */}
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Edit School Profile"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Manage Admin */}
                          <button
                            onClick={() => handleOpenManageAdmin(s)}
                            className="p-1 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Manage Admin Account & Password"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>

                          {/* Assign Plan */}
                          <button
                            onClick={() => {
                              setSelectedSchool(s);
                              setIsPlanModalOpen(true);
                            }}
                            className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Assign Plan / Manage Entitlements"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>

                          {/* Emergency Controls */}
                          <button
                            onClick={() => handleOpenEmergency(s)}
                            className="p-1 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Emergency & Access Controls (Read Only / Force Logout)"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleStatus(s)}
                            disabled={actionLoadingId === s.id}
                            className={`p-1 rounded transition-colors ${
                              s.status === "active"
                                ? "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            }`}
                            title={s.status === "active" ? "Suspend School" : "Activate School"}
                          >
                            {actionLoadingId === s.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                          </button>
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

      {/* MODAL 1: QUICK EDIT SCHOOL */}
      {isEditModalOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit School Profile
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Modifying institutional record for ID: <span className="font-mono">{selectedSchool.id}</span>
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) =>
                      setEditForm({ ...editForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm({ ...editForm, city: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) =>
                      setEditForm({ ...editForm, state: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Verification Badge
                </label>
                <select
                  value={editForm.verificationBadge}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      verificationBadge: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="none">No Badge</option>
                  <option value="basic">🛡️ Basic Verified (Blue)</option>
                  <option value="gold">👑 Gold Verified</option>
                  <option value="premium">💎 Premium Verified</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE ADMIN ACCOUNT */}
      {isManageAdminModalOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Manage School Admin
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Assign or update administrator credentials for {selectedSchool.name}.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 my-4 text-xs space-y-1">
              <p className="text-gray-500">
                Current Admin UID:{" "}
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                  {selectedSchool.adminUid || selectedSchool.adminId || "None Assigned"}
                </span>
              </p>
              <p className="text-gray-500">
                Registered Email:{" "}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {selectedSchool.adminEmail || "—"}
                </span>
              </p>
            </div>

            <form onSubmit={handleSaveManageAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminForm.adminName}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, adminName: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Admin Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={adminForm.adminEmail}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, adminEmail: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Reset Password (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = Math.random().toString(36).slice(-8) + "!Aa1";
                      setAdminForm({ ...adminForm, newPassword: gen });
                      toast.info(`Generated password: ${gen}`);
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Generate Secure
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Leave blank to keep existing password"
                  value={adminForm.newPassword}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, newPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Minimum 6 characters. If set, will immediately update Firebase Auth.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsManageAdminModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingAdmin && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN PLAN & ENTITLEMENTS (Using unified SuperAdminSchoolEntitlementControlModal) */}
      {isPlanModalOpen && selectedSchool && (
        <SuperAdminSchoolEntitlementControlModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          schoolId={selectedSchool.id}
          schoolName={selectedSchool.name}
          onUpdated={() => {
            handleManualRefresh();
          }}
        />
      )}

      {/* MODAL 4: EMERGENCY CONTROLS & READ-ONLY */}
      {isEmergencyModalOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              Emergency & Tenant Access Control
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Immediate operational overrides for {selectedSchool.name} (ID: {selectedSchool.id}).
            </p>

            <form onSubmit={handleSaveEmergency} className="space-y-4 mt-4">
              {/* Operational State */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Operational State
                </label>
                <select
                  value={emergencyForm.status}
                  onChange={(e) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="ACTIVE">🟢 Normal Active</option>
                  <option value="READ_ONLY">🟡 Read Only (Disables Mutations)</option>
                  <option value="PAUSED">🔴 Emergency Paused (Full Tenant Lockout)</option>
                </select>
              </div>

              {/* Module Kill Switches */}
              <div className="space-y-2 border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-900/30">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Granular Module Kill-Switches
                </p>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={emergencyForm.disablePayments}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        disablePayments: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Block All Payment Collection / Gateways</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={emergencyForm.disableFees}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        disableFees: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Disable Fee Collection & Receipt Generation</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={emergencyForm.disableReports}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        disableReports: e.target.checked,
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Disable Heavy Reports / PDF Exports</span>
                </label>
              </div>

              {/* Force Logout Option */}
              <div className="border border-red-200 dark:border-red-900/40 rounded-lg p-3 bg-red-50/40 dark:bg-red-950/20">
                <label className="flex items-start gap-2 text-xs text-red-900 dark:text-red-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyForm.forceLogoutAll}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        forceLogoutAll: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded text-red-600"
                  />
                  <div>
                    <span>Force Logout All School Users</span>
                    <p className="font-normal text-[11px] text-red-700/80 dark:text-red-400 mt-0.5">
                      Revokes all active Firebase sessions for Admin, Teachers, and Students immediately.
                    </p>
                  </div>
                </label>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mandatory Audit Justification *
                </label>
                <textarea
                  required
                  rows={2}
                  value={emergencyForm.reason}
                  onChange={(e) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Describe reason for read-only / emergency lockdown..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEmergency}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingEmergency && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Apply Emergency Controls
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
