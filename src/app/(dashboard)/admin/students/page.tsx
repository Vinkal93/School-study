"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
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
} from "lucide-react";
import {
  getStudents,
  createStudentWithAuth,
  toggleStudentStatus,
  deleteStudent,
  updateStudent,
} from "@/lib/services/student.service";
import { uploadStudentPhoto } from "@/lib/services/storage.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { StudentProfile, SchoolClass, Gender } from "@/types";
import { toast } from "sonner";

export default function AdminStudentsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Enroll Student Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [dob, setDob] = useState("2012-05-15");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  // Photo for Enroll Modal
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Edit Modal for Existing Students
  const [photoEditingStudent, setPhotoEditingStudent] = useState<StudentProfile | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [stuData, clsData] = await Promise.all([
        getStudents(schoolId),
        getClassesWithSections(schoolId),
      ]);
      setStudents(stuData);
      setClasses(clsData);
    } catch (err) {
      console.error("Failed to load students data:", err);
      toast.error("Failed to load students and classes.");
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

  const handleUpdateStudentPhoto = async (e: FormEvent) => {
    e.preventDefault();
    if (!photoEditingStudent || !editPhotoFile) {
      toast.error("Please select a photo to upload.");
      return;
    }

    setIsUpdatingPhoto(true);
    try {
      const newPhotoUrl = await uploadStudentPhoto(editPhotoFile, schoolId, photoEditingStudent.admissionNumber);
      await updateStudent(schoolId, photoEditingStudent.id, { photoUrl: newPhotoUrl });
      setStudents((prev) =>
        prev.map((s) => (s.id === photoEditingStudent.id ? { ...s, photoUrl: newPhotoUrl } : s))
      );
      toast.success(`Photo updated successfully for "${photoEditingStudent.name}"!`);
      setPhotoEditingStudent(null);
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update student photo.");
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!admissionNumber.trim() || !name.trim() || !email.trim() || !password || !selectedClassId || !selectedSectionId) {
      toast.error("Please fill in required fields (Admission No, Name, Class, Section, Email, Password).");
      return;
    }

    if (password.length < 6) {
      toast.error("Student password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrl = "";
      if (photoFile) {
        try {
          photoUrl = await uploadStudentPhoto(photoFile, schoolId, admissionNumber);
        } catch (uploadErr) {
          console.warn("Photo upload failed, continuing:", uploadErr);
        }
      }

      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const selectedSection = selectedClass?.sections?.find((s) => s.id === selectedSectionId);

      await createStudentWithAuth(schoolId, {
        admissionNumber: admissionNumber.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        gender,
        dob,
        phone: phone.trim(),
        address: address.trim(),
        photoUrl,
        classId: selectedClassId,
        className: selectedClass?.name || "",
        sectionId: selectedSectionId,
        sectionName: selectedSection?.name || "",
        admissionDate,
      });

      toast.success(`Student "${name}" enrolled successfully with login credentials!`);
      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAdmissionNumber("");
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setAddress("");
    setSelectedClassId("");
    setSelectedSectionId("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleToggleStatus = async (stu: StudentProfile) => {
    const nextStatus = stu.status === "active" ? "inactive" : "active";
    setTogglingId(stu.id);
    try {
      await toggleStudentStatus(schoolId, stu.id, stu.userId, nextStatus);
      setStudents((prev) =>
        prev.map((s) => (s.id === stu.id ? { ...s, status: nextStatus } : s))
      );
      toast.success(
        `Student "${stu.name}" is now ${nextStatus === "active" ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      toast.error("Failed to update student status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteStudent = async (stu: StudentProfile) => {
    if (
      confirm(
        `Are you sure you want to permanently delete student "${stu.name}" (Admission No. ${stu.admissionNumber}) from Firebase Firestore?`
      )
    ) {
      try {
        await deleteStudent(schoolId, stu.id, stu.userId);
        setStudents((prev) => prev.filter((s) => s.id !== stu.id));
        toast.success(`Student "${stu.name}" permanently deleted from Firebase!`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete student.");
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = selectedClassFilter === "all" ? true : s.classId === selectedClassFilter;
    const matchesSection = selectedSectionFilter === "all" ? true : s.sectionId === selectedSectionFilter;
    const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;

    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });

  const availableSectionsForAdd =
    classes.find((c) => c.id === selectedClassId)?.sections || [];

  const availableSectionsForFilter =
    classes.find((c) => c.id === selectedClassFilter)?.sections || [];

  const totalBoys = students.filter((s) => s.gender === "male").length;
  const totalGirls = students.filter((s) => s.gender === "female").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Student Admissions & Directory
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enroll students, issue admission numbers, and manage class assignments.
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
            Enroll Student
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{students.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {students.filter((s) => s.status === "active").length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Boys</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totalBoys}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-pink-50 p-3 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Girls</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{totalGirls}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <label htmlFor="students-search" className="sr-only">Search student, adm no, email</label>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            id="students-search"
            name="search"
            aria-label="Search student, adm no, email"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, adm no, email..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => {
              setSelectedClassFilter(e.target.value);
              setSelectedSectionFilter("all");
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            disabled={selectedClassFilter === "all"}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
          >
            <option value="all">All Sections</option>
            {availableSectionsForFilter.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              No students found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enroll students to start tracking attendance and classroom rosters.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Enroll First Student
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< sm) */}
            <div className="block sm:hidden divide-y divide-gray-200 dark:divide-gray-800">
              {filteredStudents.map((s) => (
                <div key={s.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          setPhotoEditingStudent(s);
                          setEditPhotoPreview(s.photoUrl || null);
                          setEditPhotoFile(null);
                        }}
                        className="relative cursor-pointer group shrink-0"
                        title="Click to upload/change photo"
                      >
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="h-11 w-11 rounded-full object-cover border-2 border-blue-100 group-hover:opacity-80 transition-all shadow-sm"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200">
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full shadow-sm">
                          <Camera className="h-2.5 w-2.5" />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{s.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{s.admissionNumber}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.status === "active"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      <BookOpen className="h-3 w-3" />
                      {s.className} ({s.sectionName})
                    </span>
                    {s.phone && (
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </span>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => handleToggleStatus(s)}
                      disabled={togglingId === s.id}
                      className={`text-xs font-semibold px-3 py-1 rounded-md border ${
                        s.status === "active"
                          ? "border-red-200 text-red-600 bg-red-50/50"
                          : "border-green-200 text-green-600 bg-green-50/50"
                      }`}
                    >
                      {s.status === "active" ? "Deactivate" : "Activate"}
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
                    <th className="py-3.5 px-4 font-medium">Student</th>
                    <th className="py-3.5 px-4 font-medium">Admission No</th>
                    <th className="py-3.5 px-4 font-medium">Class & Section</th>
                    <th className="py-3.5 px-4 font-medium">Gender / DOB</th>
                    <th className="py-3.5 px-4 font-medium">Contact</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              setPhotoEditingStudent(s);
                              setEditPhotoPreview(s.photoUrl || null);
                              setEditPhotoFile(null);
                            }}
                            className="relative cursor-pointer group shrink-0"
                            title="Click to upload/change photo"
                          >
                            {s.photoUrl ? (
                              <img
                                src={s.photoUrl}
                                alt={s.name}
                                className="h-10 w-10 rounded-full object-cover border border-gray-200 group-hover:opacity-80 transition-all shadow-sm"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                {s.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-blue-600 text-white rounded-full shadow-sm opacity-90 group-hover:scale-110 transition-transform">
                              <Camera className="h-2.5 w-2.5" />
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="rounded bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                          {s.admissionNumber}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                          <BookOpen className="h-3 w-3" />
                          <span>{s.className} ({s.sectionName})</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300 capitalize">
                        <p className="font-medium">{s.gender}</p>
                        {s.dob && <p className="text-gray-400">{s.dob}</p>}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">
                        {s.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{s.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPhotoEditingStudent(s);
                              setEditPhotoPreview(s.photoUrl || null);
                              setEditPhotoFile(null);
                            }}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            title="Upload/Update Student Photo"
                          >
                            <Camera className="h-3 w-3" />
                            Photo
                          </button>
                          <button
                            onClick={() => handleToggleStatus(s)}
                            disabled={togglingId === s.id}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                              s.status === "active"
                                ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                : "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            {s.status === "active" ? "Disable" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete student permanently from Firebase"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
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
          MODAL: ENROLL NEW STUDENT
      ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Enroll Student
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Provisions a student portal account and assigns class & section.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="student-adm-no" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Admission Number <span className="text-red-500">*</span> (Unique)
                  </label>
                  <input
                    id="student-adm-no"
                    name="admissionNumber"
                    type="text"
                    required
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ADM-2026-001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="student-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="student-class" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Assign Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="student-class"
                    name="classId"
                    required
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="student-section" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Assign Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="student-section"
                    name="sectionId"
                    required
                    disabled={!selectedClassId}
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select Section</option>
                    {availableSectionsForAdd.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="student-gender" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Gender
                  </label>
                  <select
                    id="student-gender"
                    name="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="student-dob" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Date of Birth
                  </label>
                  <input
                    id="student-dob"
                    name="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="student-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Student Login Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aarav@school.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="student-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Initial Password <span className="text-red-500">*</span> (Min 6 chars)
                  </label>
                  <input
                    id="student-password"
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
                  <label htmlFor="student-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Guardian Phone Number
                  </label>
                  <input
                    id="student-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="student-adm-date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Admission Date
                  </label>
                  <input
                    id="student-adm-date"
                    name="admissionDate"
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="student-address" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                    Residential Address
                  </label>
                  <input
                    id="student-address"
                    name="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 45, Green Avenue, Delhi"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                {/* Photo Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Student Photo
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
                      Enrolling Student...
                    </>
                  ) : (
                    "Enroll & Provision Student"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Update Modal for Existing Students */}
      {photoEditingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Update Student Photo
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {photoEditingStudent.name} • {photoEditingStudent.admissionNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setPhotoEditingStudent(null);
                  setEditPhotoFile(null);
                  setEditPhotoPreview(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentPhoto} className="mt-5 space-y-5">
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
                  <span>{editPhotoFile ? "Choose Different Photo" : "Select Student Photo"}</span>
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
                    setPhotoEditingStudent(null);
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
                    "Save Student Photo"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
