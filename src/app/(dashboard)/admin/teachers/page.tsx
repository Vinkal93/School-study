"use client";

import { useEffect, useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery, appQueryClient } from "@/lib/cache";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeleton } from "@/components/common/skeletons";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Upload,
  Loader2,
  RefreshCw,
  Power,
  Edit2,
  X,
  ImageIcon,
  UserCheck,
  Filter,
  Trash2,
  Camera,
  RotateCcw,
} from "lucide-react";
import {
  getTeachers,
  createTeacherWithAuth,
  toggleTeacherStatus,
  deleteTeacher,
  restoreTeacher,
  assignTeacherToClass,
  updateTeacher,
} from "@/lib/services/teacher.service";
import { uploadTeacherPhoto } from "@/lib/services/storage.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { checkPlanLimit } from "@/lib/billing";
import type { TeacherProfile, SchoolClass, Section, PlanLimitCheckResult } from "@/types";
import { toast } from "sonner";

import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function AdminTeachersPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const isAllowed = profile?.role === "super_admin" || canAccess("teacher_management");

  // 1. SWR Queries with Stale-While-Revalidate caching
  const {
    data: cachedTeachers,
    isLoading: isTeachersLoading,
    refetch: refetchTeachers,
    setData: setTeachersCache,
  } = useAppQuery<TeacherProfile[]>(
    schoolId && isAllowed ? `teachers:${schoolId}` : null,
    () => getTeachers(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 30_000 }
  );

  const { data: cachedClasses, isLoading: isClassesLoading } = useAppQuery<SchoolClass[]>(
    schoolId && isAllowed ? `classes:${schoolId}` : null,
    () => getClassesWithSections(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 60_000 }
  );

  const { data: cachedLimit, refetch: refetchLimit } = useAppQuery<PlanLimitCheckResult>(
    schoolId ? `planLimit:${schoolId}:teachers` : null,
    () => checkPlanLimit(schoolId, "teachers"),
    { enabled: !!schoolId, staleTime: 30_000 }
  );

  const teachers = useMemo(() => cachedTeachers || [], [cachedTeachers]);
  const classes = useMemo(() => cachedClasses || [], [cachedClasses]);
  const limitStatus = cachedLimit || null;
  const loading = (isTeachersLoading || isClassesLoading) && teachers.length === 0;

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "deleted">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add Teacher Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [teacherCode, setTeacherCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [subjectsInput, setSubjectsInput] = useState("");

  // Photo upload for Add Modal
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Edit Modal for Existing Teachers
  const [photoEditingTeacher, setPhotoEditingTeacher] = useState<TeacherProfile | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  // Edit Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherProfile | null>(null);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSectionId, setAssignSectionId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    await Promise.all([refetchTeachers(true), refetchLimit(true)]);
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Photo size must be less than 2MB.");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleEditPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Photo size must be less than 2MB.");
        return;
      }
      setEditPhotoFile(file);
      setEditPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateTeacherPhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoEditingTeacher || !editPhotoFile) {
      toast.error("Please select a photo to upload.");
      return;
    }

    setIsUpdatingPhoto(true);
    try {
      const newPhotoUrl = await uploadTeacherPhoto(editPhotoFile, schoolId, photoEditingTeacher.teacherCode);
      await updateTeacher(schoolId, photoEditingTeacher.id, { photoUrl: newPhotoUrl });
      setTeachersCache((prev) =>
        (prev || []).map((t) => (t.id === photoEditingTeacher.id ? { ...t, photoUrl: newPhotoUrl } : t))
      );
      toast.success(`Photo updated successfully for "${photoEditingTeacher.name}"!`);
      setPhotoEditingTeacher(null);
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update teacher photo.");
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleAddTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!teacherCode.trim() || !name.trim() || !email.trim() || !password) {
      toast.error("Please fill in required fields (Code, Name, Email, Password).");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl = "";
      if (photoFile) {
        try {
          photoUrl = await uploadTeacherPhoto(photoFile, schoolId, teacherCode);
        } catch (uploadErr) {
          console.warn("Photo upload failed, continuing:", uploadErr);
        }
      }

      // Resolve class and section names
      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const selectedSection = selectedClass?.sections?.find((s) => s.id === selectedSectionId);

      const subjects = subjectsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await createTeacherWithAuth(schoolId, {
        teacherCode: teacherCode.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        photoUrl,
        joiningDate,
        assignedClassId: selectedClassId || "",
        assignedClassName: selectedClass?.name || "",
        assignedSectionId: selectedSectionId || "",
        assignedSectionName: selectedSection?.name || "",
        subjects,
      });

      toast.success(`Teacher "${name}" and login account created successfully!`);
      setIsAddModalOpen(false);
      resetForm();
      appQueryClient.invalidateCache(`teachers:${schoolId}`);
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      refetchTeachers(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create teacher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTeacherCode("");
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setSelectedClassId("");
    setSelectedSectionId("");
    setSubjectsInput("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleToggleStatus = async (teacher: TeacherProfile) => {
    const nextStatus = teacher.status === "active" ? "inactive" : "active";
    setTogglingId(teacher.id);
    try {
      await toggleTeacherStatus(schoolId, teacher.id, teacher.userId, nextStatus);
      setTeachersCache((prev) =>
        (prev || []).map((t) => (t.id === teacher.id ? { ...t, status: nextStatus } : t))
      );
      toast.success(
        `Teacher "${teacher.name}" is now ${nextStatus === "active" ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      toast.error("Failed to update teacher status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher) return;

    setIsSavingAssign(true);
    try {
      const selectedClass = classes.find((c) => c.id === assignClassId);
      const selectedSection = selectedClass?.sections?.find((s) => s.id === assignSectionId);

      await assignTeacherToClass(schoolId, assigningTeacher.id, {
        classId: assignClassId,
        className: selectedClass?.name || "",
        sectionId: assignSectionId,
        sectionName: selectedSection?.name || "",
      });

      setTeachersCache((prev) =>
        (prev || []).map((t) =>
          t.id === assigningTeacher.id
            ? {
                ...t,
                assignedClassId: assignClassId,
                assignedClassName: selectedClass?.name || "",
                assignedSectionId: assignSectionId,
                assignedSectionName: selectedSection?.name || "",
              }
            : t
        )
      );

      toast.success(`Class assignment updated for "${assigningTeacher.name}".`);
      setIsAssignModalOpen(false);
      setAssigningTeacher(null);
    } catch (err) {
      toast.error("Failed to update assignment.");
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleDeleteTeacher = async (teacher: TeacherProfile) => {
    if (
      confirm(
        `Are you sure you want to delete teacher "${teacher.name}" (${teacher.teacherCode})? Attendance and academic records will be preserved in archive.`
      )
    ) {
      try {
        await deleteTeacher(schoolId, teacher.id, teacher.userId);
        setTeachersCache((prev) =>
          (prev || []).map((t) =>
            t.id === teacher.id
              ? { ...t, status: "deleted", deletedAt: new Date().toISOString() }
              : t
          )
        );
        appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
        appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
        toast.success(`Teacher "${teacher.name}" deleted (archived).`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete teacher.");
      }
    }
  };

  const handleRestoreTeacher = async (teacher: TeacherProfile) => {
    if (limitStatus && !limitStatus.allowed) {
      toast.error(
        `Teacher limit reached (${limitStatus.current}/${limitStatus.limit}). Upgrade plan to restore more teachers.`
      );
      return;
    }
    try {
      await restoreTeacher(schoolId, teacher.id, teacher.userId);
      setTeachersCache((prev) =>
        (prev || []).map((t) =>
          t.id === teacher.id ? { ...t, status: "active", deletedAt: undefined } : t
        )
      );
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      toast.success(`Teacher "${teacher.name}" restored successfully!`);
      refetchTeachers(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore teacher.");
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.teacherCode.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        (t.assignedClassName && t.assignedClassName.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all"
          ? t.status !== "deleted"
          : statusFilter === "deleted"
          ? t.status === "deleted"
          : t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teachers, debouncedSearch, statusFilter]);

  // Sections for currently selected class in Add Modal
  const availableSectionsForAdd =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

  const availableSectionsForAssign =
    classes.find((c) => c.id === assignClassId)?.sections || [];

  const assignedCount = teachers.filter((t) => t.assignedClassId).length;

  return (
    <EntitlementGate
      feature="teacher_management"
      limitKey="teachers"
      currentCount={teachers.length}
      title="Faculty & Teacher Management"
      description="Onboard teachers, provision login credentials, and assign class teachers."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Faculty & Teacher Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Onboard teachers, provision login credentials, and assign class teachers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                if (profile?.role !== "super_admin" && !canAccess("teacher_management")) {
                  toast.error("Teacher Management is not included in your current plan. Please upgrade to unlock.");
                  return;
                }
                if (limitStatus && !limitStatus.allowed) {
                  toast.error(
                    `Faculty limit reached (${limitStatus.current}/${limitStatus.limit}). Upgrade plan to add more teachers.`
                  );
                  return;
                }
                resetForm();
                setIsAddModalOpen(true);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
                limitStatus && !limitStatus.allowed
                  ? "bg-slate-500 hover:bg-slate-600 opacity-90 cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Add New Teacher</span>
            </button>
          </div>
        </div>

        {/* Plan Capacity Limit Warning Banner */}
        {limitStatus && !limitStatus.allowed && (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-4 flex items-center justify-between gap-4 text-red-800 dark:text-red-300">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Faculty Capacity Limit Reached ({limitStatus.current}/${limitStatus.limit}). </span>
                <span>Your school has reached the maximum teacher account limit for your current plan.</span>
              </div>
            </div>
            <Link
              href="/admin/billing"
              className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shrink-0 transition-all shadow-xs"
            >
              Upgrade Plan
            </Link>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{teachers.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
            <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Teachers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {teachers.filter((t) => t.status === "active").length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
            <div className="rounded-lg bg-purple-50 p-3 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Class Teachers Assigned</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{assignedCount}</p>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <label htmlFor="teachers-search" className="sr-only">Search name, code, email, class</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="teachers-search"
              name="search"
              aria-label="Search name, code, email, class"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, code, email, class..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline-block">
              Status:
            </span>
            {(["all", "active", "inactive", "deleted"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {st === "all" ? "All" : st === "deleted" ? "Archived" : st} (
                {st === "all"
                  ? teachers.filter((t) => t.status !== "deleted").length
                  : teachers.filter((t) => t.status === st).length}
                )
              </button>
            ))}
          </div>
        </div>

      {/* Teachers Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
          {filteredTeachers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No teachers found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add your faculty members to grant them access to classes and attendance.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add First Teacher
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< sm) */}
            <div className="block sm:hidden divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTeachers.map((t) => (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          setPhotoEditingTeacher(t);
                          setEditPhotoPreview(t.photoUrl || null);
                          setEditPhotoFile(null);
                        }}
                        className="relative cursor-pointer group shrink-0"
                        title="Click to upload/change teacher photo"
                      >
                        {t.photoUrl ? (
                          <img
                            src={t.photoUrl}
                            alt={t.name}
                            className="h-11 w-11 rounded-full object-cover border-2 border-blue-100 group-hover:opacity-80 transition-all shadow-sm"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200">
                            {t.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full shadow-sm">
                          <Camera className="h-2.5 w-2.5" />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{t.teacherCode}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        t.status === "active"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {t.assignedClassName ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <BookOpen className="h-3 w-3" />
                        {t.assignedClassName} {t.assignedSectionName ? `(${t.assignedSectionName})` : ""}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                    )}

                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {t.email}
                    </span>
                  </div>

                  {t.status === "deleted" ? (
                    <div className="pt-2 flex items-center justify-end border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => handleRestoreTeacher(t)}
                        className="text-xs font-semibold px-3 py-1 rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore Teacher
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={() => {
                          setAssigningTeacher(t);
                          setAssignClassId(t.assignedClassId || "");
                          setAssignSectionId(t.assignedSectionId || "");
                          setIsAssignModalOpen(true);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Assign Class
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(t)}
                          disabled={togglingId === t.id}
                          className={`text-xs font-semibold px-3 py-1 rounded-md border ${
                            t.status === "active"
                              ? "border-red-200 text-red-600 bg-red-50/50"
                              : "border-green-200 text-green-600 bg-green-50/50"
                          }`}
                        >
                          {t.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-3.5 px-4 font-medium">Teacher</th>
                    <th className="py-3.5 px-4 font-medium">Employee Code</th>
                    <th className="py-3.5 px-4 font-medium">Contact</th>
                    <th className="py-3.5 px-4 font-medium">Class Assignment</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              setPhotoEditingTeacher(t);
                              setEditPhotoPreview(t.photoUrl || null);
                              setEditPhotoFile(null);
                            }}
                            className="relative cursor-pointer group shrink-0"
                            title="Click to upload/change teacher photo"
                          >
                            {t.photoUrl ? (
                              <img
                                src={t.photoUrl}
                                alt={t.name}
                                className="h-10 w-10 rounded-full object-cover border border-gray-200 group-hover:opacity-80 transition-all shadow-sm"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                {t.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-blue-600 text-white rounded-full shadow-sm opacity-90 group-hover:scale-110 transition-transform">
                              <Camera className="h-2.5 w-2.5" />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                            {t.subjects && t.subjects.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t.subjects.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="rounded bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                          {t.teacherCode}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{t.email}</span>
                          </div>
                          {t.phone && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{t.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {t.assignedClassName ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                            <BookOpen className="h-3 w-3" />
                            <span>
                              {t.assignedClassName}
                              {t.assignedSectionName ? ` (${t.assignedSectionName})` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.status === "active"
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : t.status === "deleted"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {t.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : t.status === "deleted" ? (
                            <RotateCcw className="h-3 w-3 text-gray-500" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === "deleted" ? (
                            <button
                              onClick={() => handleRestoreTeacher(t)}
                              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              title="Restore teacher"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setPhotoEditingTeacher(t);
                                  setEditPhotoPreview(t.photoUrl || null);
                                  setEditPhotoFile(null);
                                }}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                title="Upload/Update Teacher Photo"
                              >
                                <Camera className="h-3 w-3" />
                                Photo
                              </button>
                              <button
                                onClick={() => {
                                  setAssigningTeacher(t);
                                  setAssignClassId(t.assignedClassId || "");
                                  setAssignSectionId(t.assignedSectionId || "");
                                  setIsAssignModalOpen(true);
                                }}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800"
                                title="Assign Class & Section"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(t)}
                                disabled={togglingId === t.id}
                                className={`rounded p-1.5 ${
                                  t.status === "active"
                                    ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                    : "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                                }`}
                                title={t.status === "active" ? "Deactivate" : "Activate"}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t)}
                                className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                title="Delete / Archive teacher"
                              >
                                <Trash2 className="h-4 w-4" />
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
          </>
        )}
      </div>
      )}

      {/* ==========================================
          MODAL: ADD NEW TEACHER
      ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <EntitlementGate feature="teacher_management" title="Teacher Management Locked" requiredPlan="Starter Plan">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add Faculty / Teacher
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Provisions a Teacher login account and assigns class responsibilities.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="teacher-code" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Teacher ID / Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teacher-code"
                    name="teacherCode"
                    type="text"
                    required
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TCH-001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teacher-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Email Address <span className="text-red-500">*</span> (Login ID)
                  </label>
                  <input
                    id="teacher-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@school.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Initial Password <span className="text-red-500">*</span> (Min 6 chars)
                  </label>
                  <input
                    id="teacher-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Phone Number
                  </label>
                  <input
                    id="teacher-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="teacher-joining-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Joining Date
                  </label>
                  <input
                    id="teacher-joining-date"
                    name="joiningDate"
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Class Assignment */}
                <div>
                  <label htmlFor="teacher-class" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Assigned Class (Optional)
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">-- No Class Assigned --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    disabled={!selectedClassId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">-- No Section Assigned --</option>
                    {availableSectionsForAdd.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teaching Subjects (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={subjectsInput}
                    onChange={(e) => setSubjectsInput(e.target.value)}
                    placeholder="e.g. Mathematics, Science, Physics"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-12 w-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      <Upload className="h-3.5 w-3.5" />
                      {photoFile ? "Change Photo" : "Upload Photo"}
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating Teacher Account...
                    </>
                  ) : (
                    "Save & Provision Teacher"
                  )}
                </button>
              </div>
            </form>
          </div>
        </EntitlementGate>
      </div>
    )}

      {/* ==========================================
          MODAL: EDIT CLASS ASSIGNMENT
      ========================================== */}
      {isAssignModalOpen && assigningTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Assign Class Teacher
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Set the primary class & section for {assigningTeacher.name}.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Class
                </label>
                <select
                  value={assignClassId}
                  onChange={(e) => {
                    setAssignClassId(e.target.value);
                    setAssignSectionId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Remove Assignment --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Section
                </label>
                <select
                  value={assignSectionId}
                  onChange={(e) => setAssignSectionId(e.target.value)}
                  disabled={!assignClassId}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">-- No Section --</option>
                  {availableSectionsForAssign.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssign}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingAssign ? "Saving..." : "Update Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Update Modal for Existing Teachers */}
      {photoEditingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Update Teacher Photo
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {photoEditingTeacher.name} • {photoEditingTeacher.teacherCode}
                </p>
              </div>
              <button
                onClick={() => {
                  setPhotoEditingTeacher(null);
                  setEditPhotoFile(null);
                  setEditPhotoPreview(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacherPhoto} className="mt-5 space-y-5">
              <div className="flex flex-col items-center justify-center gap-4">
                {editPhotoPreview ? (
                  <div className="relative">
                    <img
                      src={editPhotoPreview}
                      alt="Preview"
                      className="h-28 w-28 rounded-full object-cover border-4 border-blue-500/20 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 p-1.5 bg-green-500 text-white rounded-full">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </div>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}

                <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors shadow-sm">
                  <Upload className="h-4 w-4" />
                  <span>{editPhotoFile ? "Choose Different Photo" : "Select Teacher Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPhotoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-gray-400">JPG, PNG, or WEBP (Auto-compressed for instant loading)</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoEditingTeacher(null);
                    setEditPhotoFile(null);
                    setEditPhotoPreview(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPhoto || !editPhotoFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdatingPhoto ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving Photo...
                    </>
                  ) : (
                    "Save Teacher Photo"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </EntitlementGate>
  );
}
