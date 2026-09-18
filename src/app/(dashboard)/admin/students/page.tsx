"use client";

import { useEffect, useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery, appQueryClient } from "@/lib/cache";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeleton } from "@/components/common/skeletons";
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
  RotateCcw,
  ArrowRightLeft,
  Crop,
  ShieldAlert,
  Eye,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  normalizeGender,
  isMatchingClass,
  isMatchingSection,
} from "@/lib/utils/academic-normalizer";
import { repairSchoolClassesAndStudentsClient } from "@/lib/services/student-class-repair.service";
import { ImageCropModal } from "@/components/common/ImageCropModal";
import { RegisterComplaintModal } from "@/components/complaints/RegisterComplaintModal";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { BulkDeleteStudentsModal } from "@/components/student/BulkDeleteStudentsModal";
import { ResponsiveActionMenu } from "@/components/common/ResponsiveActionMenu";
import { ShareFeeModal } from "@/components/fees/ShareFeeModal";
import {
  getStudents,
  createStudentWithAuth,
  toggleStudentStatus,
  deleteStudent,
  restoreStudent,
  transferStudentClass,
  updateStudent,
  bulkDeleteStudents,
  bulkSuspendStudents,
  exportStudentsToCsv,
  checkStudentFinancialHistory,
} from "@/lib/services/student.service";
import { uploadStudentPhoto } from "@/lib/services/storage.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { checkPlanLimit } from "@/lib/billing";
import type { StudentProfile, SchoolClass, Gender, PlanLimitCheckResult } from "@/types";
import { toast } from "sonner";

import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { Menu, Bell, SlidersHorizontal, Smartphone } from "lucide-react";
import { AdminMobileNavDrawer } from "@/components/admin/mobile/AdminMobileNavDrawer";
import { AdminMobileBottomNav } from "@/components/admin/mobile/AdminMobileBottomNav";
import { StudentMobileCard } from "@/components/admin/mobile/StudentMobileCard";
import { StudentFilterSheet, type StudentFiltersState } from "@/components/admin/mobile/StudentFilterSheet";
import { StudentActionsSheet } from "@/components/admin/mobile/StudentActionsSheet";
import { StudentProfileSheet } from "@/components/admin/mobile/StudentProfileSheet";
import { AddStudentWizardModal } from "@/components/admin/mobile/AddStudentWizardModal";
import { StudentFeeDetailsSheet } from "@/components/admin/mobile/StudentFeeDetailsSheet";
import { usePortalUI } from "@/context/portal-ui-context";

export default function AdminStudentsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const isAllowed = profile?.role === "super_admin" || canAccess("student_management");
  const { adminPortalUiMode } = usePortalUI();

  // Mobile Admin Portal UI States
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedStudentForActions, setSelectedStudentForActions] = useState<StudentProfile | null>(null);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentProfile | null>(null);
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [selectedStudentForFees, setSelectedStudentForFees] = useState<StudentProfile | null>(null);
  const [mobileFilterTab, setMobileFilterTab] = useState<"all" | "active" | "tc" | "inactive">("all");
  const [showClassicAppPreview, setShowClassicAppPreview] = useState(false);

  const [mobileFilters, setMobileFilters] = useState<StudentFiltersState>({
    classId: "all",
    sectionId: "all",
    status: "all",
    gender: "all",
    admissionYear: "all",
    feeStatus: "all",
    transport: "all",
    searchQuery: "",
  });

  const handleChangeMobileFilter = <K extends keyof StudentFiltersState>(key: K, value: StudentFiltersState[K]) => {
    setMobileFilters((prev) => ({ ...prev, [key]: value }));
    if (key === "classId") {
      setSelectedClassFilter(value);
      setSelectedSectionFilter("all");
    } else if (key === "sectionId") {
      setSelectedSectionFilter(value);
    } else if (key === "status") {
      setStatusFilter(value as any);
    } else if (key === "searchQuery") {
      setSearchQuery(value);
    }
  };

  const handleResetMobileFilters = () => {
    setMobileFilters({
      classId: "all",
      sectionId: "all",
      status: "all",
      gender: "all",
      admissionYear: "all",
      feeStatus: "all",
      transport: "all",
      searchQuery: "",
    });
    setSelectedClassFilter("all");
    setSelectedSectionFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  // 1. SWR Queries with Stale-While-Revalidate caching
  const {
    data: cachedStudents,
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
    setData: setStudentsCache,
  } = useAppQuery<StudentProfile[]>(
    schoolId && isAllowed ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 30_000 }
  );

  const { data: cachedClasses, isLoading: isClassesLoading } = useAppQuery<SchoolClass[]>(
    schoolId && isAllowed ? `classes:${schoolId}` : null,
    () => getClassesWithSections(schoolId),
    { enabled: !!schoolId && isAllowed, staleTime: 60_000 }
  );

  const { data: cachedLimit, refetch: refetchLimit } = useAppQuery<PlanLimitCheckResult>(
    schoolId ? `planLimit:${schoolId}:students` : null,
    () => checkPlanLimit(schoolId, "students"),
    { enabled: !!schoolId, staleTime: 30_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);
  const classes = useMemo(() => cachedClasses || [], [cachedClasses]);
  const [isRepairingData, setIsRepairingData] = useState(false);

  // Canonical deduplicated classes list
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const c of classes) {
      const key = getCanonicalClassKey(c.name);
      if (!map.has(key)) {
        map.set(key, c);
      } else {
        // Merge sections into primary class representation
        const existing = map.get(key)!;
        const existingSecKeys = new Set((existing.sections || []).map((s) => getCanonicalClassKey(s.name)));
        (c.sections || []).forEach((s) => {
          const sKey = getCanonicalClassKey(s.name);
          if (!existingSecKeys.has(sKey)) {
            existing.sections = [...(existing.sections || []), s];
            existingSecKeys.add(sKey);
          }
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const oA = a.order ?? getCanonicalClassOrder(a.name);
      const oB = b.order ?? getCanonicalClassOrder(b.name);
      if (oA !== oB) return oA - oB;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [classes]);

  const limitStatus = cachedLimit || null;
  const loading = (isStudentsLoading || isClassesLoading) && students.length === 0;

  // Filters with debounced search
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Transfer Class Modal State
  const [transferringStudent, setTransferringStudent] = useState<StudentProfile | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Student Complaint Modal State
  const [complaintStudent, setComplaintStudent] = useState<StudentProfile | null>(null);

  // Delete Confirmation Modal State
  const [deletingStudent, setDeletingStudent] = useState<StudentProfile | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);

  // Column width resize state with persistence
  // Bulk selection & Pagination State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Safely clear selection and reset page when filters change
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setIsAllFilteredSelected(false);
    setCurrentPage(1);
  }, [selectedClassFilter, selectedSectionFilter, statusFilter, debouncedSearch]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ss_student_table_col_widths");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      roll: 60,
      student: 220,
      studentId: 120,
      class: 150,
      genderDob: 120,
      contact: 140,
      status: 100,
      actions: 140,
    };
  });

  const handleResizeColumn = (colKey: string, deltaWidth: number) => {
    setColumnWidths((prev) => {
      const current = prev[colKey] || 120;
      const next = Math.max(50, Math.min(450, current + deltaWidth));
      const updated = { ...prev, [colKey]: next };
      try {
        localStorage.setItem("ss_student_table_col_widths", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

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
  const [usePhoneAsPassword, setUsePhoneAsPassword] = useState(false);

  // Photo for Enroll Modal
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Edit Modal for Existing Students
  const [photoEditingStudent, setPhotoEditingStudent] = useState<StudentProfile | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);

  const router = useRouter();
  const [shareFeeStudent, setShareFeeStudent] = useState<StudentProfile | null>(null);

  // Photo Cropping State
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"edit" | "enroll" | null>(null);
  const [cropFileName, setCropFileName] = useState("student_photo.jpg");

  const loadData = async () => {
    if (!schoolId) return;
    await Promise.all([refetchStudents(true), refetchLimit(true)]);
  };

  const handleRepairData = async () => {
    if (!schoolId) return;
    setIsRepairingData(true);
    try {
      const res = await repairSchoolClassesAndStudentsClient(schoolId);
      toast.success(
        `Classes & Students synchronized! ${res.canonicalClassesKept} classes kept, ${res.studentsUpdated} students re-aligned.`
      );
      await Promise.all([refetchStudents(true), refetchLimit(true)]);
      appQueryClient.invalidateCache(`classes:${schoolId}`);
      appQueryClient.invalidateCache(`students:${schoolId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to repair academic data.");
    } finally {
      setIsRepairingData(false);
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size must be less than 5MB.");
        return;
      }
      setCropFileName(file.name);
      setCropTarget("enroll");
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageForCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleEditPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size must be less than 5MB.");
        return;
      }
      setCropFileName(file.name);
      setCropTarget("edit");
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageForCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    if (cropTarget === "edit") {
      setEditPhotoFile(croppedFile);
      setEditPhotoPreview(previewUrl);
    } else if (cropTarget === "enroll") {
      setPhotoFile(croppedFile);
      setPhotoPreview(previewUrl);
    }
    setRawImageForCrop(null);
    setCropTarget(null);
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
      setStudentsCache((prev) =>
        (prev || []).map((s) => (s.id === photoEditingStudent.id ? { ...s, photoUrl: newPhotoUrl } : s))
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
    if (!name.trim() || !email.trim() || !password || !selectedClassId || !selectedSectionId) {
      toast.error("Please fill in required fields (Name, Class, Section, Email, Password).");
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
          photoUrl = await uploadStudentPhoto(photoFile, schoolId, admissionNumber || "TEMP");
        } catch (uploadErr) {
          console.warn("Photo upload failed, continuing:", uploadErr);
        }
      }

      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const selectedSection = selectedClass?.sections?.find((s) => s.id === selectedSectionId);

      const created = await createStudentWithAuth(schoolId, {
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

      toast.success(
        `Student "${name}" enrolled! ID: ${created.studentId}, Roll No: ${created.rollNumber}`
      );
      setIsAddModalOpen(false);
      resetForm();
      appQueryClient.invalidateCache(`students:${schoolId}`);
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      refetchStudents(true);
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
    setUsePhoneAsPassword(false);
  };

  const handleToggleStatus = async (stu: StudentProfile) => {
    const nextStatus = stu.status === "active" ? "inactive" : "active";
    setTogglingId(stu.id);
    try {
      await toggleStudentStatus(schoolId, stu.id, stu.userId, nextStatus);
      setStudentsCache((prev) =>
        (prev || []).map((s) => (s.id === stu.id ? { ...s, status: nextStatus } : s))
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

  const handleDeleteStudent = (stu: StudentProfile) => {
    setDeletingStudent(stu);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    setIsDeletingInProgress(true);
    try {
      await deleteStudent(schoolId, deletingStudent.id, deletingStudent.userId);
      setStudentsCache((prev) =>
        (prev || []).map((s) =>
          s.id === deletingStudent.id ? { ...s, status: "deleted", deletedAt: new Date().toISOString() } : s
        )
      );
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      toast.success(`Student "${deletingStudent.name}" deleted (archived).`);
      setDeletingStudent(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student.");
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const handleRestoreStudent = async (stu: StudentProfile) => {
    if (limitStatus && !limitStatus.allowed) {
      toast.error(
        `Student limit reached (${limitStatus.current}/${limitStatus.limit}). Upgrade plan to restore more students.`
      );
      return;
    }
    try {
      await restoreStudent(schoolId, stu.id, stu.userId);
      setStudentsCache((prev) =>
        (prev || []).map((s) =>
          s.id === stu.id ? { ...s, status: "active", deletedAt: undefined } : s
        )
      );
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      toast.success(`Student "${stu.name}" restored successfully!`);
      refetchStudents(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore student.");
    }
  };

  const handleExecuteTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferringStudent || !targetClassId || !targetSectionId) {
      toast.error("Please select target class and section.");
      return;
    }
    const targetClass = classes.find((c) => c.id === targetClassId);
    const targetSection = targetClass?.sections?.find((s) => s.id === targetSectionId);

    setIsTransferring(true);
    try {
      const { newRollNumber } = await transferStudentClass(
        schoolId,
        transferringStudent.id,
        targetClassId,
        targetClass?.name || "",
        targetSectionId,
        targetSection?.name || ""
      );
      setStudentsCache((prev) =>
        (prev || []).map((s) =>
          s.id === transferringStudent.id
            ? {
                ...s,
                classId: targetClassId,
                className: targetClass?.name || "",
                sectionId: targetSectionId,
                sectionName: targetSection?.name || "",
                rollNumber: newRollNumber,
              }
            : s
        )
      );
      toast.success(
        `Student transferred to ${targetClass?.name} (${targetSection?.name}) with Roll No. ${newRollNumber}!`
      );
      setTransferringStudent(null);
      refetchStudents(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer student.");
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedClass = useMemo(() => {
    return uniqueClasses.find((c) => c.id === selectedClassFilter);
  }, [uniqueClasses, selectedClassFilter]);

  const availableSectionsForFilter = useMemo(() => {
    if (selectedClassFilter === "all" || !selectedClass) return [];
    return selectedClass.sections || [];
  }, [selectedClassFilter, selectedClass]);

  const availableSectionsForAdd = useMemo(() => {
    return uniqueClasses.find((c) => c.id === selectedClassId)?.sections || [];
  }, [uniqueClasses, selectedClassId]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        s.admissionNumber?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        (s.rollNumber !== undefined && s.rollNumber.toString() === q) ||
        (s.phone && s.phone.toLowerCase().includes(q));

      const matchesClass =
        selectedClassFilter === "all"
          ? true
          : s.classId === selectedClassFilter ||
            (selectedClass && isMatchingClass(s.className, selectedClass.name));

      const matchesSection =
        selectedSectionFilter === "all"
          ? true
          : s.sectionId === selectedSectionFilter ||
            availableSectionsForFilter.some(
              (sec) => sec.id === selectedSectionFilter && isMatchingSection(s.sectionName, sec.name)
            );

      const sStatus = (s.status || "active").toLowerCase();
      const matchesStatus =
        statusFilter === "all"
          ? sStatus !== "deleted" && sStatus !== "archived"
          : statusFilter === "deleted" || statusFilter === "archived"
          ? sStatus === "deleted" || sStatus === "archived"
          : sStatus === statusFilter.toLowerCase();

      return matchesSearch && matchesClass && matchesSection && matchesStatus;
    });
  }, [students, debouncedSearch, selectedClassFilter, selectedClass, selectedSectionFilter, availableSectionsForFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Selection helpers
  const areAllOnPageSelected = useMemo(() => {
    if (paginatedStudents.length === 0) return false;
    return paginatedStudents.every((s) => selectedStudentIds.has(s.id));
  }, [paginatedStudents, selectedStudentIds]);

  const areSomeOnPageSelected = useMemo(() => {
    return paginatedStudents.some((s) => selectedStudentIds.has(s.id)) && !areAllOnPageSelected;
  }, [paginatedStudents, selectedStudentIds, areAllOnPageSelected]);

  const effectiveSelectedCount = isAllFilteredSelected ? filteredStudents.length : selectedStudentIds.size;

  const handleToggleSelectStudent = (id: string) => {
    setIsAllFilteredSelected(false);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectPage = () => {
    setIsAllFilteredSelected(false);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (areAllOnPageSelected) {
        paginatedStudents.forEach((s) => next.delete(s.id));
      } else {
        paginatedStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setIsAllFilteredSelected(true);
    const allIds = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds(allIds);
  };

  const handleClearSelection = () => {
    setIsAllFilteredSelected(false);
    setSelectedStudentIds(new Set());
  };

  const handleConfirmBulkDelete = async (permanent: boolean) => {
    if (effectiveSelectedCount === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await bulkDeleteStudents({
        studentIds: isAllFilteredSelected ? undefined : Array.from(selectedStudentIds),
        allFiltered: isAllFilteredSelected,
        filters: isAllFilteredSelected
          ? {
              classId: selectedClassFilter,
              sectionId: selectedSectionFilter,
              status: statusFilter,
              searchQuery: debouncedSearch,
            }
          : undefined,
        permanent,
        targetSchoolId: schoolId,
      });

      toast.success(res.message || `Successfully deleted ${res.deletedCount} students.`);
      handleClearSelection();
      setIsBulkDeleteModalOpen(false);

      appQueryClient.invalidateCache(`students:${schoolId}`);
      appQueryClient.invalidateCache(`planLimit:${schoolId}:*`);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      await Promise.all([refetchStudents(true), refetchLimit(true)]);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete students.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkSuspend = async () => {
    const count = effectiveSelectedCount;
    if (count === 0) return;
    if (!window.confirm(`Are you sure you want to suspend ${count} student(s)? Their status will be set to suspended.`)) {
      return;
    }
    try {
      const ids = isAllFilteredSelected ? filteredStudents.map((s) => s.id) : Array.from(selectedStudentIds);
      await bulkSuspendStudents(schoolId, ids, "Administrative bulk suspension");
      toast.success(`Successfully suspended ${ids.length} student(s).`);
      handleClearSelection();
      appQueryClient.invalidateCache(`students:${schoolId}`);
      await refetchStudents(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend students.");
    }
  };

  const handleBulkExport = () => {
    const listToExport = isAllFilteredSelected
      ? filteredStudents
      : filteredStudents.filter((s) => selectedStudentIds.has(s.id));
    if (listToExport.length === 0) {
      toast.error("No students selected for export.");
      return;
    }
    exportStudentsToCsv(listToExport, "students_roster");
    toast.success(`Exported ${listToExport.length} students to CSV.`);
  };

  const nonDeletedStudents = useMemo(
    () => students.filter((s) => s.status !== "deleted" && s.status !== "archived"),
    [students]
  );
  const activeStudentsCount = useMemo(
    () => nonDeletedStudents.filter((s) => !s.status || s.status.toLowerCase() === "active").length,
    [nonDeletedStudents]
  );
  const tcIssuedStudentsCount = useMemo(
    () =>
      nonDeletedStudents.filter(
        (s) => (s.status || "").toLowerCase() === "tc_issued" || (s.status || "").toLowerCase() === "transferred"
      ).length,
    [nonDeletedStudents]
  );
  const inactiveStudentsCount = useMemo(
    () =>
      nonDeletedStudents.filter(
        (s) => (s.status || "").toLowerCase() === "inactive" || (s.status || "").toLowerCase() === "suspended"
      ).length,
    [nonDeletedStudents]
  );
  const totalBoys = useMemo(
    () => nonDeletedStudents.filter((s) => normalizeGender(s.gender) === "male").length,
    [nonDeletedStudents]
  );
  const totalGirls = useMemo(
    () => nonDeletedStudents.filter((s) => normalizeGender(s.gender) === "female").length,
    [nonDeletedStudents]
  );

  const isFilterActive = useMemo(() => {
    return (
      selectedClassFilter !== "all" ||
      selectedSectionFilter !== "all" ||
      statusFilter !== "all" ||
      Boolean(debouncedSearch.trim())
    );
  }, [selectedClassFilter, selectedSectionFilter, statusFilter, debouncedSearch]);

  const filteredActiveCount = useMemo(
    () => filteredStudents.filter((s) => !s.status || s.status.toLowerCase() === "active").length,
    [filteredStudents]
  );
  const filteredBoysCount = useMemo(
    () => filteredStudents.filter((s) => normalizeGender(s.gender) === "male").length,
    [filteredStudents]
  );
  const filteredGirlsCount = useMemo(
    () => filteredStudents.filter((s) => normalizeGender(s.gender) === "female").length,
    [filteredStudents]
  );

  return (
    <EntitlementGate
      feature="student_management"
      title="Student Directory & Admissions"
      description="Enroll students, manage student profiles, assign roll numbers, and view guardian contacts."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-6">
        {/* =========================================================
            CLASSIC MOBILE UI / UX (Screens 1 to 10)
        ========================================================= */}
        <div className={`space-y-4 ${showClassicAppPreview ? "block max-w-md mx-auto my-6 border-4 border-slate-900 rounded-[40px] p-4 bg-slate-50 dark:bg-slate-950 shadow-2xl ring-8 ring-slate-200 dark:ring-slate-800 relative" : "md:hidden"}`}>
          {showClassicAppPreview && (
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Classic App Mode Preview
              </span>
              <button
                type="button"
                onClick={() => setShowClassicAppPreview(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
          )}

          {/* 1. Mobile Top Header (Screen 2 Top Bar) */}
          <div className="flex items-center justify-between py-2 px-1">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="h-6 w-6 stroke-2" />
            </button>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Students
            </h1>
            <Link
              href="/admin/notices"
              className="p-2 -mr-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 stroke-2" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
            </Link>
          </div>

          {/* 2. Mobile Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, roll no., admission no..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                isFilterActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-slate-800 hover:bg-blue-50/50"
              }`}
              aria-label="Filter Options"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* 3. Horizontal Filter Tabs (Screen 2 Pills) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
            <button
              type="button"
              onClick={() => {
                setMobileFilterTab("all");
                setStatusFilter("all");
              }}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                mobileFilterTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              All <span className="ml-1 opacity-90">{nonDeletedStudents.length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileFilterTab("active");
                setStatusFilter("active");
              }}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                mobileFilterTab === "active"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              Active <span className="ml-1 opacity-90">{activeStudentsCount}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileFilterTab("tc");
                setStatusFilter("tc_issued");
              }}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                mobileFilterTab === "tc"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-orange-600 dark:text-orange-400"
              }`}
            >
              TC Issued <span className="ml-1 opacity-90">{tcIssuedStudentsCount}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileFilterTab("inactive");
                setStatusFilter("inactive");
              }}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                mobileFilterTab === "inactive"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400"
              }`}
            >
              Inactive <span className="ml-1 opacity-90">{inactiveStudentsCount}</span>
            </button>
          </div>

          {/* 4. Four Metric Summary Cards (Screen 2) */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-2.5 text-center">
              <p className="text-base font-black text-blue-600 dark:text-blue-400">{nonDeletedStudents.length}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Total</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-2.5 text-center">
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{activeStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Active</p>
            </div>
            <div className="rounded-2xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 p-2.5 text-center">
              <p className="text-base font-black text-orange-600 dark:text-orange-400">{tcIssuedStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">TC Issued</p>
            </div>
            <div className="rounded-2xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-2.5 text-center">
              <p className="text-base font-black text-rose-600 dark:text-rose-400">{inactiveStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Inactive</p>
            </div>
          </div>

          {/* 5. Student List Cards (Screen 2 & Screen 10) */}
          <div className="space-y-2.5 pb-20">
            {loading ? (
              <div className="p-10 text-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs font-semibold">Loading student roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 space-y-2">
                <GraduationCap className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No students match your filter</p>
                <p className="text-xs text-slate-400">Try changing or clearing your search filters</p>
              </div>
            ) : (
              filteredStudents.map((st) => (
                <StudentMobileCard
                  key={st.id}
                  student={st}
                  onSelectProfile={(student) => setSelectedStudentForProfile(student)}
                  onOpenActions={(student) => setSelectedStudentForActions(student)}
                />
              ))
            )}
          </div>

          {/* 6. Floating Action Button (+) for Mobile */}
          <button
            type="button"
            onClick={() => {
              if (limitStatus && !limitStatus.allowed) {
                toast.error(limitStatus.message || "Student limit reached.");
                return;
              }
              setIsAddWizardOpen(true);
            }}
            aria-label="Add Student"
            className="fixed bottom-20 right-5 z-30 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-500/40 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
          </button>

          {/* 7. Bottom Navigation Bar (Screen 10) */}
          <AdminMobileBottomNav
            onOpenDrawer={() => setIsMobileDrawerOpen(true)}
            onOpenAddStudent={() => setIsAddWizardOpen(true)}
          />
        </div>

        {/* Desktop Container */}
        <div className={`${showClassicAppPreview ? "hidden" : "hidden md:block"} space-y-6`}>
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowClassicAppPreview(!showClassicAppPreview)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
              title="Toggle Classic Mobile App UI Preview"
            >
              <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Classic Mobile View</span>
            </button>
            <Link
              href="/admin/classes/transfer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              title="Class-wise student promotion & transfer"
            >
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Promote Students</span>
          </Link>
          <Link
            href="/admin/backup"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            title="Backup, export, or import data"
          >
            <Upload className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">Import / Export</span>
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleRepairData}
            disabled={isRepairingData || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
            title="Deduplicate classes and synchronize student assignments"
          >
            <Sparkles className={`h-4 w-4 text-amber-600 ${isRepairingData ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRepairingData ? "Syncing..." : "Sync Classes"}</span>
          </button>
          <button
            onClick={() => {
              if (profile?.role !== "super_admin" && !canAccess("student_management")) {
                toast.error("Student Management is not included in your current plan. Please upgrade to unlock.");
                return;
              }
              if (limitStatus && !limitStatus.allowed) {
                toast.error(
                  limitStatus.message ||
                    `Student limit reached. Your plan allows ${limitStatus.limit} students. You already have ${limitStatus.current}.`
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
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Plan Capacity Limit Warning Banner */}
      {limitStatus && !limitStatus.allowed && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-4 flex items-center justify-between gap-4 text-red-800 dark:text-red-300">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">
                {limitStatus.message ||
                  `Student limit reached. Your plan allows ${limitStatus.limit} students. You already have ${limitStatus.current}.`}
              </span>
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isFilterActive ? "Filtered Students" : "Total Students"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {filteredStudents.length}
            </p>
            {isFilterActive && (
              <p className="text-[11px] text-gray-400 mt-0.5">of {nonDeletedStudents.length} overall</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isFilterActive ? "Filtered Active" : "Active Students"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {filteredActiveCount}
            </p>
            {isFilterActive && (
              <p className="text-[11px] text-gray-400 mt-0.5">of {activeStudentsCount} overall</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isFilterActive ? "Filtered Boys" : "Boys"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {filteredBoysCount}
            </p>
            {isFilterActive && (
              <p className="text-[11px] text-gray-400 mt-0.5">of {totalBoys} overall</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 flex items-center gap-4">
          <div className="rounded-lg bg-pink-50 p-3 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {isFilterActive ? "Filtered Girls" : "Girls"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {filteredGirlsCount}
            </p>
            {isFilterActive && (
              <p className="text-[11px] text-gray-400 mt-0.5">of {totalGirls} overall</p>
            )}
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
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
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
            {uniqueClasses.map((c) => (
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
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">All Active Enrolled</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="left">Left (TC / Without TC)</option>
              <option value="dropped">Dropped Out</option>
              <option value="not_continuing">Not Continuing</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="deleted">Archived / Deleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {effectiveSelectedCount > 0 && (
        <div className="rounded-xl bg-slate-900 text-white p-3 sm:px-4 sm:py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 font-bold text-xs">
              {effectiveSelectedCount}
            </span>
            <div className="text-xs sm:text-sm">
              <span className="font-bold">
                {effectiveSelectedCount} student{effectiveSelectedCount === 1 ? "" : "s"} selected
              </span>
              {!isAllFilteredSelected && filteredStudents.length > paginatedStudents.length && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="ml-2 text-blue-400 underline hover:text-blue-300 font-medium cursor-pointer"
                >
                  Select all {filteredStudents.length} matching filter
                </button>
              )}
              {isAllFilteredSelected && (
                <span className="ml-2 text-blue-300 font-medium">
                  (All {filteredStudents.length} matching filter selected)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Suspend */}
            <button
              type="button"
              onClick={handleBulkSuspend}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-xs font-bold transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Suspend</span>
            </button>

            {/* Bulk Export */}
            <button
              type="button"
              onClick={handleBulkExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 rotate-180" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Delete / Archive */}
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete / Archive</span>
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 overflow-hidden">
          {filteredStudents.length === 0 ? (
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
            <div className="block sm:hidden p-3 space-y-3">
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5 hover:border-blue-300 dark:hover:border-blue-800 transition-all"
                >
                  {/* Top Row: Checkbox + Avatar + Name & IDs + Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(s.id)}
                        onChange={() => handleToggleSelectStudent(s.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 shrink-0 mt-3"
                      />
                      {/* Avatar with edit photo trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoEditingStudent(s);
                          setEditPhotoPreview(s.photoUrl || null);
                          setEditPhotoFile(null);
                        }}
                        className="relative cursor-pointer group shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Click to upload/change photo"
                      >
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="h-12 w-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-xs group-hover:opacity-85 transition-opacity"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-700 font-extrabold text-white text-base shadow-xs">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                          <Camera className="h-2.5 w-2.5" />
                        </div>
                      </button>

                      {/* Name + Roll No + Student ID */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {s.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                            Roll #{s.rollNumber ?? "-"}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                            {s.studentId || s.admissionNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Chip */}
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                        s.status === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : s.status === "deleted"
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === "active" ? "bg-emerald-500" : s.status === "deleted" ? "bg-slate-400" : "bg-rose-500"}`} />
                      {s.status}
                    </span>
                  </div>

                  {/* Middle Meta Info Chips: Class/Section + Phone Contact */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 font-semibold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <span>{s.className} ({s.sectionName})</span>
                    </span>

                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{s.phone}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-2 py-1 text-slate-400 text-[11px]">
                        No phone
                      </span>
                    )}

                    {s.gender && (
                      <span className="inline-flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/50 px-2 py-1 text-slate-500 dark:text-slate-400 text-[11px] capitalize font-medium">
                        {s.gender}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: Full-width symmetric grid */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {s.status === "deleted" ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreStudent(s)}
                        className="w-full text-xs font-bold py-2 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore Student
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferringStudent(s);
                              setTargetClassId("");
                              setTargetSectionId("");
                            }}
                            className="w-full text-xs font-bold py-2 rounded-xl border border-purple-200 text-purple-700 bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
                            <span>Transfer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            disabled={togglingId === s.id}
                            className={`w-full text-xs font-bold py-2 rounded-xl border flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer ${
                              s.status === "active"
                                ? "border-amber-200 text-amber-700 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5 shrink-0" />
                            <span>{s.status === "active" ? "Deactivate" : "Activate"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s)}
                            className="w-full text-xs font-bold py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setComplaintStudent(s)}
                          className="w-full text-xs font-bold py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                          <span>Report / Complaint</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-3.5 px-3 w-10 text-center select-none">
                      <input
                        type="checkbox"
                        checked={areAllOnPageSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = areSomeOnPageSelected;
                        }}
                        onChange={handleToggleSelectPage}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        title={areAllOnPageSelected ? "Deselect Page" : "Select Page"}
                      />
                    </th>
                    <th style={{ width: columnWidths.roll }} className="relative py-3.5 px-4 font-medium select-none">
                      Roll
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("roll", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.student }} className="relative py-3.5 px-4 font-medium select-none">
                      Student
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("student", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.studentId }} className="relative py-3.5 px-4 font-medium select-none">
                      Student ID
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("studentId", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.class }} className="relative py-3.5 px-4 font-medium select-none">
                      Class & Section
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("class", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.genderDob }} className="relative py-3.5 px-4 font-medium select-none">
                      Gender / DOB
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("genderDob", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.contact }} className="relative py-3.5 px-4 font-medium select-none">
                      Contact
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("contact", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.status }} className="relative py-3.5 px-4 font-medium select-none">
                      Status
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const onMove = (me: MouseEvent) => handleResizeColumn("status", me.clientX - startX);
                          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                      />
                    </th>
                    <th style={{ width: columnWidths.actions }} className="py-3.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedStudents.map((s) => (
                    <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${selectedStudentIds.has(s.id) ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}>
                      <td className="py-4 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => handleToggleSelectStudent(s.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {s.rollNumber ?? "-"}
                        </span>
                      </td>
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
                            <Link href={`/admin/students/${s.id}`} className="hover:underline">
                              <p className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors cursor-pointer">{s.name}</p>
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="rounded bg-gray-100 px-2.5 py-1 dark:bg-gray-800">
                          {s.studentId || s.admissionNumber}
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
                              : s.status === "deleted"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          }`}
                        >
                          {s.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : s.status === "deleted" ? (
                            <RotateCcw className="h-3 w-3 text-gray-500" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === "deleted" ? (
                            <button
                              onClick={() => handleRestoreStudent(s)}
                              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              title="Restore deleted student"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </button>
                          ) : (
                            <ResponsiveActionMenu
                              primaryActions={[
                                {
                                  label: "Transfer",
                                  icon: <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />,
                                  onClick: () => {
                                    setTransferringStudent(s);
                                    setTargetClassId("");
                                    setTargetSectionId("");
                                  },
                                  className: "hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-600",
                                },
                                {
                                  label: "Photo",
                                  icon: <Camera className="h-3.5 w-3.5 text-blue-600" />,
                                  onClick: () => {
                                    setPhotoEditingStudent(s);
                                    setEditPhotoPreview(s.photoUrl || null);
                                    setEditPhotoFile(null);
                                  },
                                  className: "hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600",
                                },
                              ]}
                              secondaryActions={[
                                {
                                  label: "View Full Profile",
                                  icon: <Eye className="h-3.5 w-3.5 text-blue-600" />,
                                  onClick: () => router.push(`/admin/students/${s.id}`),
                                },
                                {
                                  label: "Share Fee Details",
                                  icon: <Share2 className="h-3.5 w-3.5 text-emerald-600" />,
                                  onClick: () => setShareFeeStudent(s),
                                },
                                {
                                  label: "Report Complaint",
                                  icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />,
                                  onClick: () => setComplaintStudent(s),
                                },
                                {
                                  label: s.status === "active" ? "Disable Account" : "Activate Account",
                                  icon: <Power className="h-3.5 w-3.5 text-amber-600" />,
                                  onClick: () => handleToggleStatus(s),
                                  disabled: togglingId === s.id,
                                },
                                {
                                  label: "Delete Student",
                                  icon: <Trash2 className="h-3.5 w-3.5 text-rose-600" />,
                                  onClick: () => handleDeleteStudent(s),
                                  destructive: true,
                                },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs">
              <div className="text-gray-500 dark:text-gray-400">
                Showing <span className="font-bold text-gray-900 dark:text-white">{filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.min(currentPage * pageSize, filteredStudents.length)}
                </span>{" "}
                of <span className="font-bold text-gray-900 dark:text-white">{filteredStudents.length}</span> students
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 font-semibold disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-gray-300 px-2.5 py-1 font-semibold disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* ==========================================
          MODAL: ENROLL NEW STUDENT
      ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <EntitlementGate feature="student_management" title="Student Management Locked" requiredPlan="Starter Plan">
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
                    Student ID / Admission No <span className="text-gray-400 font-normal">(Auto if blank)</span>
                  </label>
                  <input
                    id="student-adm-no"
                    name="admissionNumber"
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                    placeholder="Auto (e.g. SBCI1) if blank"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Auto-generated with School Short Code & atomic counter (SBCI1, SBCI2...)
                  </p>
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
                    {uniqueClasses.map((cls) => (
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

                <div className="col-span-1 sm:col-span-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>
                    Roll number (1, 2, 3...) will be automatically assigned sequentially for the chosen class.
                  </span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="student-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Initial Password <span className="text-red-500">*</span> (Min 6 chars)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !usePhoneAsPassword;
                        setUsePhoneAsPassword(next);
                        if (next) {
                          const digits = phone.replace(/\D/g, "");
                          if (digits) setPassword(digits);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                        usePhoneAsPassword
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                          : "text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={usePhoneAsPassword}
                        onChange={() => {}}
                        className="h-3 w-3 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                      />
                      Same as Phone as Password
                    </button>
                  </div>
                  <input
                    id="student-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (usePhoneAsPassword && e.target.value !== phone.replace(/\D/g, "")) {
                        setUsePhoneAsPassword(false);
                      }
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  {usePhoneAsPassword && (
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                      ✓ Password synced to phone digits ({phone ? phone.replace(/\D/g, "") || "enter phone below" : "enter phone below"}).
                    </p>
                  )}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      if (usePhoneAsPassword) {
                        const digits = val.replace(/\D/g, "");
                        setPassword(digits);
                      }
                    }}
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
        </EntitlementGate>
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

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors shadow-xs">
                    <Upload className="h-4 w-4" />
                    <span>{editPhotoFile ? "Choose Different Photo" : "Select Student Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoChange}
                      className="hidden"
                    />
                  </label>

                  {editPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawImageForCrop(editPhotoPreview);
                        setCropTarget("edit");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Crop className="h-3.5 w-3.5 text-blue-600" />
                      <span>Adjust / Crop</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Drag & zoom to center face • Auto-compressed for fast loading
                </p>
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

      {/* Transfer Student Modal */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-950 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Transfer Student Class
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transferringStudent.name} ({transferringStudent.studentId || transferringStudent.admissionNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferringStudent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs space-y-1">
              <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Current Placement</span>
              <p className="font-bold text-gray-900 dark:text-white">
                {transferringStudent.className} ({transferringStudent.sectionName || "Default"}) • Current Roll No: {transferringStudent.rollNumber ?? "-"}
              </p>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => {
                    setTargetClassId(e.target.value);
                    setTargetSectionId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select Target Class</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Section <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!targetClassId}
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select Target Section</option>
                  {classes
                    .find((c) => c.id === targetClassId)
                    ?.sections?.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  💡 Automatic Roll Number & Fee Recalculation
                </p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-400">
                  The student will be assigned the next sequential roll number in the target class. Future unpaid fee ledger items will be updated to the new class fee structure while preserving all completed past payments.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setTransferringStudent(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || !targetClassId || !targetSectionId}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    "Confirm Transfer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Image Crop & Adjust Modal */}
      {rawImageForCrop && (
        <ImageCropModal
          isOpen={Boolean(rawImageForCrop)}
          imageSrc={rawImageForCrop}
          fileName={cropFileName}
          title={cropTarget === "enroll" ? "Adjust Student Photo" : "Adjust & Crop Photo"}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setRawImageForCrop(null);
            setCropTarget(null);
          }}
        />
      )}

      {/* Register Complaint Modal */}
      {complaintStudent && (
        <RegisterComplaintModal
          isOpen={Boolean(complaintStudent)}
          onClose={() => setComplaintStudent(null)}
          student={{
            id: complaintStudent.id,
            studentId: complaintStudent.studentId || complaintStudent.admissionNumber,
            uid: (complaintStudent as any).uid || (complaintStudent as any).userId || complaintStudent.id,
            name: complaintStudent.name,
            className: complaintStudent.className,
            sectionName: complaintStudent.sectionName,
            rollNumber: complaintStudent.rollNumber,
          }}
        />
      )}

      {/* Global Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleConfirmDelete}
        title="Archive Student Record"
        itemName={deletingStudent?.name}
        itemId={deletingStudent?.studentId || deletingStudent?.admissionNumber}
        isDeleting={isDeletingInProgress}
        message={`Are you sure you want to archive ${deletingStudent?.name}? Archiving safely preserves all fee demands, payments, ledger vouchers, and academic history while removing the student from active rosters and decrementing your plan capacity usage.`}
      />

      {/* Bulk Delete Students Modal */}
      <BulkDeleteStudentsModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        selectedCount={effectiveSelectedCount}
        isAllFiltered={isAllFilteredSelected}
        filterSummary={{
          className: selectedClass?.name,
          sectionName: selectedSectionFilter !== "all" ? selectedSectionFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          searchQuery: debouncedSearch || undefined,
        }}
        isDeleting={isBulkDeleting}
      />

      {/* Centralized Share Fee Details Modal */}
      {shareFeeStudent && (
        <ShareFeeModal
          isOpen={Boolean(shareFeeStudent)}
          onClose={() => setShareFeeStudent(null)}
          schoolId={schoolId}
          student={{
            id: shareFeeStudent.id,
            name: shareFeeStudent.name,
            admissionNumber: shareFeeStudent.admissionNumber || shareFeeStudent.studentId,
            rollNumber: shareFeeStudent.rollNumber,
            className: shareFeeStudent.className,
            sectionName: shareFeeStudent.sectionName,
            phone: shareFeeStudent.phone,
            parentPhone: shareFeeStudent.guardianPhone,
          }}
        />
      )}
        </div>

        {/* =========================================================
            CONNECTED MOBILE SHEETS & MODALS (Screens 1, 3, 4, 5, 6, 7, 8, 9)
        ========================================================= */}
        {/* Screen 1: Mobile Navigation Drawer */}
        <AdminMobileNavDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          schoolName={profile?.schoolName || (profile as any)?.tenantSettings?.schoolName || "SBCI School"}
        />

        {/* Screen 3: Filter Options Bottom Sheet */}
        <StudentFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          uniqueClasses={uniqueClasses}
          filters={mobileFilters}
          onChangeFilter={handleChangeMobileFilter}
          onReset={handleResetMobileFilters}
          onApply={() => setIsFilterSheetOpen(false)}
        />

        {/* Screen 4: Student Profile Bottom Sheet / Modal */}
        <StudentProfileSheet
          isOpen={Boolean(selectedStudentForProfile)}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          schoolId={schoolId}
          onOpenActions={(student) => {
            setSelectedStudentForProfile(null);
            setSelectedStudentForActions(student);
          }}
          onOpenFees={(student) => {
            setSelectedStudentForProfile(null);
            setSelectedStudentForFees(student);
          }}
          onEditStudent={(student) => {
            setSelectedStudentForProfile(null);
            router.push(`/admin/students/${student.id}`);
          }}
        />

        {/* Screen 5: Student Actions Bottom Sheet */}
        <StudentActionsSheet
          isOpen={Boolean(selectedStudentForActions)}
          onClose={() => setSelectedStudentForActions(null)}
          student={selectedStudentForActions}
          onViewProfile={(student) => setSelectedStudentForProfile(student)}
          onViewFees={(student) => setSelectedStudentForFees(student)}
          onEditStudent={(student) => {
            setSelectedStudentForActions(null);
            router.push(`/admin/students/${student.id}`);
          }}
          onAssignClass={(student) => setTransferringStudent(student)}
          onDeactivateStudent={(student) => setDeletingStudent(student)}
        />

        {/* Screens 6, 7, 8: Add Student 4-Step Wizard Modal */}
        <AddStudentWizardModal
          isOpen={isAddWizardOpen}
          onClose={() => setIsAddWizardOpen(false)}
          schoolId={schoolId}
          uniqueClasses={uniqueClasses}
          onStudentCreated={() => {
            loadData();
            refetchLimit(true);
          }}
        />

        {/* Screen 9: Student Fee Details Bottom Sheet */}
        <StudentFeeDetailsSheet
          isOpen={Boolean(selectedStudentForFees)}
          onClose={() => setSelectedStudentForFees(null)}
          student={selectedStudentForFees}
          schoolId={schoolId}
        />
      </div>
    </EntitlementGate>
  );
}
