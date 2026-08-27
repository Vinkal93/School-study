"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";
import {
  getTeachers,
  createTeacherWithAuth,
  toggleTeacherStatus,
  deleteTeacher,
  assignTeacherToClass,
} from "@/lib/services/teacher.service";
import { uploadTeacherPhoto } from "@/lib/services/storage.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { TeacherProfile, SchoolClass, Section } from "@/types";
import { toast } from "sonner";

export default function AdminTeachersPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherProfile | null>(null);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSectionId, setAssignSectionId] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [tchData, clsData] = await Promise.all([
        getTeachers(schoolId),
        getClassesWithSections(schoolId),
      ]);
      setTeachers(tchData);
      setClasses(clsData);
    } catch (err) {
      console.error("Failed to load teachers:", err);
      toast.error("Failed to load teachers and classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

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
          photoUrl = await uploadTeacherPhoto(schoolId, teacherCode, photoFile);
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
      loadData();
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
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, status: nextStatus } : t))
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

      toast.success(`Class assignment updated for "${assigningTeacher.name}".`);
      setIsAssignModalOpen(false);
      setAssigningTeacher(null);
      loadData();
    } catch (err) {
      toast.error("Failed to update assignment.");
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleDeleteTeacher = async (teacher: TeacherProfile) => {
    if (
      confirm(
        `Are you sure you want to permanently delete teacher "${teacher.name}" (${teacher.teacherCode}) from Firebase Firestore?`
      )
    ) {
      try {
        await deleteTeacher(schoolId, teacher.id, teacher.userId);
        setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
        toast.success(`Teacher "${teacher.name}" permanently deleted from Firebase!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete teacher.");
      }
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teacherCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.phone && t.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignedClassName && t.assignedClassName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sections for currently selected class in Add Modal
  const availableSectionsForAdd =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

  // Sections for currently selected class in Assign Modal
  const availableSectionsForAssign =
    classes.find((c) => c.id === assignClassId)?.sections || [];

  const assignedCount = teachers.filter((t) => t.assignedClassId).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add New Teacher
          </button>
        </div>
      </div>

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
          {(["all", "active", "inactive"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {st} ({st === "all" ? teachers.length : teachers.filter((t) => t.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredTeachers.length === 0 ? (
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
                      {t.photoUrl ? (
                        <img
                          src={t.photoUrl}
                          alt={t.name}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {t.name.charAt(0)}
                        </div>
                      )}
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
                  </div>
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
                          {t.photoUrl ? (
                            <img
                              src={t.photoUrl}
                              alt={t.name}
                              className="h-10 w-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {t.name.charAt(0)}
                            </div>
                          )}
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
                              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {t.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            title="Delete teacher permanently from Firebase"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* ==========================================
          MODAL: ADD NEW TEACHER
      ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
    </div>
  );
}
