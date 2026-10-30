"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  Plus,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Power,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  X,
  GraduationCap,
  CreditCard,
  UserCheck,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  getClassesWithSections,
  createClass,
  updateClass,
  toggleClassStatus,
  deleteClass,
  createSection,
  deleteSection,
} from "@/lib/services/academic.service";
import { getTeachers } from "@/lib/services/teacher.service";
import { checkPlanLimit } from "@/lib/billing";
import type { AcademicYear, SchoolClass, Section, PlanLimitCheckResult, TeacherProfile } from "@/types";
import { toast } from "sonner";
import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { SessionPromotionModal } from "@/components/admin/SessionPromotionModal";
import { useConfirm } from "@/components/common/ConfirmationContext";

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();
  const { confirm: confirmDialog } = useConfirm();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [limitStatus, setLimitStatus] = useState<PlanLimitCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classOrderInput, setClassOrderInput] = useState(1);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [classTeacherIdInput, setClassTeacherIdInput] = useState("");
  const [monthlyFeeInput, setMonthlyFeeInput] = useState("");
  const [admissionFeeInput, setAdmissionFeeInput] = useState("");
  const [initialSectionsInput, setInitialSectionsInput] = useState("A, B");
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);

  // Section add state per class
  const [addingSectionClassId, setAddingSectionClassId] = useState<string | null>(null);
  const [sectionNameInput, setSectionNameInput] = useState("");
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);

  // Academic Year modal
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [sessionPromotionTarget, setSessionPromotionTarget] = useState<AcademicYear | null>(null);
  const [yearNameInput, setYearNameInput] = useState("2026-27");
  const [startDateInput, setStartDateInput] = useState("2026-04-01");
  const [endDateInput, setEndDateInput] = useState("2027-03-31");
  const [isSubmittingYear, setIsSubmittingYear] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    if (profile?.role !== "super_admin" && !canAccess("class_management")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [years, cls, limitRes, teacherList] = await Promise.all([
        getAcademicYears(schoolId),
        getClassesWithSections(schoolId),
        checkPlanLimit(schoolId, "classes"),
        getTeachers(schoolId),
      ]);
      setAcademicYears(years);
      setClasses(cls);
      setLimitStatus(limitRes);
      setTeachers(teacherList);
    } catch (err) {
      console.error("Failed to load academic data:", err);
      toast.error("Failed to load classes and academic years.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const nonDeletedClasses = useMemo(
    () => classes.filter((c) => (c.status as any) !== "deleted"),
    [classes]
  );
  const effectiveClassCount = classes.length > 0 ? nonDeletedClasses.length : (limitStatus?.current ?? 0);
  const effectiveClassLimit = limitStatus?.limit ?? 50;
  const isClassLimitReached = limitStatus && effectiveClassLimit !== -1 ? effectiveClassCount >= effectiveClassLimit : false;

  useEffect(() => {
    if (!schoolId || !limitStatus || classes.length === 0 || loading) return;
    if (limitStatus.current !== nonDeletedClasses.length) {
      import("@/lib/billing/usage").then(({ reconcileSchoolUsage }) => {
        reconcileSchoolUsage(schoolId, "classes_page_auto_sync").then(() => {
          checkPlanLimit(schoolId, "classes").then((res) => setLimitStatus(res)).catch(() => {});
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [schoolId, limitStatus, classes.length, nonDeletedClasses.length, loading]);

  // Handle Create or Update Class
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) return;

    if (!editingClass && limitStatus && !limitStatus.allowed) {
      toast.error(
        limitStatus.message ||
          `Class limit reached. Your plan allows ${limitStatus.limit} classes. You already have ${limitStatus.current}. Upgrade your plan to add more.`
      );
      return;
    }

    setIsSubmittingClass(true);

    try {
      const selectedTeacher = teachers.find((t) => t.id === classTeacherIdInput);
      const teacherName = selectedTeacher ? selectedTeacher.name || (selectedTeacher as any).fullName : "";

      const classData: any = {
        name: classNameInput.trim(),
        order: Number(classOrderInput) || 1,
        academicYearId: selectedAcademicYearId || null,
        classTeacherId: classTeacherIdInput || null,
        classTeacherName: teacherName || null,
      };

      if (monthlyFeeInput.trim() !== "") {
        classData.monthlyFee = Math.max(0, parseFloat(monthlyFeeInput) || 0);
      }
      if (admissionFeeInput.trim() !== "") {
        classData.admissionFee = Math.max(0, parseFloat(admissionFeeInput) || 0);
      }

      if (editingClass) {
        await updateClass(schoolId, editingClass.id, classData);
        toast.success(`Updated "${classNameInput}"`);
      } else {
        const sectionsList = initialSectionsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        classData.initialSections = sectionsList;
        await createClass(schoolId, classData);
        toast.success(`Class "${classNameInput}" created with ${sectionsList.length} sections!`);
      }

      setIsClassModalOpen(false);
      setEditingClass(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save class.");
    } finally {
      setIsSubmittingClass(false);
    }
  };

  // Handle Toggle Class Status
  const handleToggleClass = async (cls: SchoolClass) => {
    const nextStatus = cls.status === "active" ? "inactive" : "active";
    try {
      await toggleClassStatus(schoolId, cls.id, nextStatus);
      setClasses((prev) =>
        prev.map((c) => (c.id === cls.id ? { ...c, status: nextStatus } : c))
      );
      toast.success(
        `Class "${cls.name}" is now ${nextStatus === "active" ? "Active" : "Inactive"}.`
      );
    } catch (err) {
      toast.error("Failed to update class status.");
    }
  };

  // Handle Delete Class
  const handleDeleteClass = async (cls: SchoolClass) => {
    const ok = await confirmDialog({
      title: "Delete Class",
      message: `Are you sure you want to delete "${cls.name}" and all its sections? Associated students will need class reassignment.`,
      confirmLabel: "Delete Class",
      confirmVariant: "danger",
    });
    if (!ok) return;

    try {
      await deleteClass(schoolId, cls.id);
      setClasses((prev) => prev.filter((c) => c.id !== cls.id));
      toast.success(`Deleted "${cls.name}"`);
    } catch (err) {
      toast.error("Failed to delete class.");
    }
  };

  // Handle Add Section to Class
  const handleAddSection = async (classId: string) => {
    if (!sectionNameInput.trim()) return;
    setIsSubmittingSection(true);
    try {
      await createSection(schoolId, classId, { name: sectionNameInput.trim() });
      toast.success("Section added successfully!");
      setAddingSectionClassId(null);
      setSectionNameInput("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add section.");
    } finally {
      setIsSubmittingSection(false);
    }
  };

  // Handle Delete Section
  const handleDeleteSection = async (classId: string, sectionId: string, sectionName: string) => {
    const ok = await confirmDialog({
      title: "Delete Section",
      message: `Are you sure you want to delete section "${sectionName}"?`,
      confirmLabel: "Delete Section",
      confirmVariant: "danger",
    });
    if (!ok) return;

    try {
      await deleteSection(schoolId, classId, sectionId);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, sections: c.sections?.filter((s) => s.id !== sectionId) }
            : c
        )
      );
      toast.success(`Deleted ${sectionName}`);
    } catch (err) {
      toast.error("Failed to delete section.");
    }
  };

  // Handle Create Academic Year
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearNameInput.trim()) return;
    setIsSubmittingYear(true);
    try {
      await createAcademicYear(schoolId, {
        name: yearNameInput.trim(),
        startDate: startDateInput,
        endDate: endDateInput,
        isCurrent: true,
      });
      toast.success(`Academic Year "${yearNameInput}" activated!`);
      setIsYearModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create academic year.");
    } finally {
      setIsSubmittingYear(false);
    }
  };

  const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

  return (
    <EntitlementGate
      feature="class_management"
      title="Classes & Sections Management"
      description="Configure grades, divisions, and manage class structures for your school."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* =========================================================
            HEADER & ACTION TOOLBAR (Design System 3.0)
        ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-900/60">
                <Calendar className="h-3.5 w-3.5" />
                <span>SESSION: {currentYear?.name || "Not Configured"}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {nonDeletedClasses.length} Active {nonDeletedClasses.length === 1 ? "Class" : "Classes"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Classes & Sections
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Configure grade levels, division sections, assigned class mentors, and baseline tuition structures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/students/promote"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shadow-2xs"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Session Promotion</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (profile?.role !== "super_admin" && !canAccess("class_management")) {
                  toast.error("Class Management is not included in your current plan. Please upgrade to unlock.");
                  return;
                }
                setIsYearModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-2xs cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{academicYears.length === 0 ? "Set Academic Year" : "Academic Sessions"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (profile?.role !== "super_admin" && !canAccess("class_management")) {
                  toast.error("Class Management is not included in your current plan. Please upgrade to unlock.");
                  return;
                }
                if (limitStatus && !limitStatus.allowed) {
                  toast.error(
                    limitStatus.message ||
                      `Class limit reached. Your plan allows ${limitStatus.limit} classes. You already have ${limitStatus.current}.`
                  );
                  return;
                }
                setEditingClass(null);
                setClassNameInput("");
                setClassOrderInput(classes.length + 1);
                setSelectedAcademicYearId(currentYear?.id || "");
                setClassTeacherIdInput("");
                setMonthlyFeeInput("");
                setAdmissionFeeInput("");
                setInitialSectionsInput("A, B");
                setIsClassModalOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                limitStatus && !limitStatus.allowed
                  ? "bg-slate-500 hover:bg-slate-600 opacity-90"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              }`}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Capacity Warning Banner */}
        {isClassLimitReached && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  Class capacity limit reached ({effectiveClassCount} of {effectiveClassLimit} classes used)
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Your current tier prevents creating additional classes. Upgrade your plan to increase limit.
                </p>
              </div>
            </div>
            <Link
              href="/admin/billing"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Upgrade Capacity</span>
            </Link>
          </div>
        )}

        {/* =========================================================
            CLASSES CARD GRID (Material 3 Surface Elevation)
        ========================================================= */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-3">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Classes Configured Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Define your first grade level, sections, and tuition fee structure to start registering students and taking roll call.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingClass(null);
                setClassNameInput("");
                setClassOrderInput(1);
                setSelectedAcademicYearId(currentYear?.id || "");
                setClassTeacherIdInput("");
                setMonthlyFeeInput("");
                setAdmissionFeeInput("");
                setInitialSectionsInput("A, B");
                setIsClassModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Class</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classes.map((cls) => {
              const isActive = cls.status === "active";

              return (
                <div
                  key={cls.id}
                  className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                    isActive
                      ? "border-slate-200/80 dark:border-slate-800"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-75"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header: Order, Name, Action Buttons */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-black text-white shadow-xs">
                          {cls.order}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                            {cls.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            ID: {cls.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClass(cls);
                            setClassNameInput(cls.name);
                            setClassOrderInput(cls.order);
                            setSelectedAcademicYearId(cls.academicYearId || currentYear?.id || "");
                            setClassTeacherIdInput(cls.classTeacherId || "");
                            setMonthlyFeeInput(cls.monthlyFee !== undefined ? cls.monthlyFee.toString() : "");
                            setAdmissionFeeInput(cls.admissionFee !== undefined ? cls.admissionFee.toString() : "");
                            setIsClassModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Fees Breakdown Card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider font-bold">
                          Monthly Fee
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          ₹{cls.monthlyFee !== undefined ? cls.monthlyFee.toLocaleString("en-IN") : "0"}
                          <span className="text-[10px] font-normal text-slate-400 ml-0.5">/mo</span>
                        </span>
                      </div>
                      <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700" />
                      <div className="text-right">
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider font-bold">
                          Admission Fee
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          ₹{cls.admissionFee !== undefined ? cls.admissionFee.toLocaleString("en-IN") : "0"}
                        </span>
                      </div>
                    </div>

                    {/* Class Teacher Mentor */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400 block">
                            Class Mentor
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate block">
                            {cls.classTeacherName || (cls.classTeacherId ? "Assigned" : "Not Assigned")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(cls);
                          setClassNameInput(cls.name);
                          setClassOrderInput(cls.order);
                          setSelectedAcademicYearId(cls.academicYearId || currentYear?.id || "");
                          setClassTeacherIdInput(cls.classTeacherId || "");
                          setMonthlyFeeInput(cls.monthlyFee !== undefined ? cls.monthlyFee.toString() : "");
                          setAdmissionFeeInput(cls.admissionFee !== undefined ? cls.admissionFee.toString() : "");
                          setIsClassModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        {cls.classTeacherId ? "Change" : "Assign"}
                      </button>
                    </div>

                    {/* Sections Container */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Sections ({cls.sections?.length || 0})
                        </span>
                        {addingSectionClassId !== cls.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingSectionClassId(cls.id);
                              setSectionNameInput("");
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3 stroke-[3]" />
                            <span>Add Section</span>
                          </button>
                        )}
                      </div>

                      {/* Inline Add Section Form */}
                      {addingSectionClassId === cls.id && (
                        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 animate-in fade-in duration-150">
                          <input
                            type="text"
                            value={sectionNameInput}
                            onChange={(e) => setSectionNameInput(e.target.value)}
                            placeholder="e.g. C or Section C"
                            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSection(cls.id)}
                            disabled={isSubmittingSection}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                          >
                            {isSubmittingSection ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingSectionClassId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {cls.sections && cls.sections.length > 0 ? (
                          cls.sections.map((sec) => (
                            <span
                              key={sec.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700"
                            >
                              <Layers className="h-3 w-3 text-slate-400" />
                              <span>{sec.name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(cls.id, sec.id, sec.name)}
                                className="text-slate-400 hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
                                title={`Delete section ${sec.name}`}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                            No sections created yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Status & Power Toggle */}
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        isActive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>{isActive ? "Active Class" : "Inactive"}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleClass(cls)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Power className="h-3 w-3" />
                      <span>{isActive ? "Deactivate" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================
            MODAL: ADD / EDIT CLASS
        ========================================================= */}
        {isClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <EntitlementGate feature="class_management" title="Class Management Locked" requiredPlan="Starter Plan">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingClass ? "Edit Class Details" : "Add New Class"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsClassModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveClass} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Class Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={classNameInput}
                      onChange={(e) => setClassNameInput(e.target.value)}
                      placeholder="e.g. Class 10 or Grade 10"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Numerical Order (For Sorting)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={classOrderInput}
                      onChange={(e) => setClassOrderInput(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Monthly Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="10"
                        value={monthlyFeeInput}
                        onChange={(e) => setMonthlyFeeInput(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Recurring monthly tuition</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Admission Fee (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="50"
                        value={admissionFeeInput}
                        onChange={(e) => setAdmissionFeeInput(e.target.value)}
                        placeholder="e.g. 3000"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">One-time registration</p>
                    </div>
                  </div>

                  {academicYears.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Academic Session
                      </label>
                      <select
                        value={selectedAcademicYearId}
                        onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Default Active Session</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.name} ({ay.startDate} to {ay.endDate}){ay.isCurrent ? " - Current" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Assign Class Mentor (Teacher)
                    </label>
                    <select
                      value={classTeacherIdInput}
                      onChange={(e) => setClassTeacherIdInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- No Class Teacher Assigned --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name || (t as any).fullName || "Teacher"} {t.teacherCode ? `(${t.teacherCode})` : ""}{" "}
                          {t.designation ? `• ${t.designation}` : t.subjects?.[0] ? `• ${t.subjects[0]}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!editingClass && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Initial Sections (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={initialSectionsInput}
                        onChange={(e) => setInitialSectionsInput(e.target.value)}
                        placeholder="A, B, C"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">e.g. A, B will create Section A and Section B.</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsClassModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingClass}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingClass ? "Saving..." : editingClass ? "Save Changes" : "Create Class"}
                    </button>
                  </div>
                </form>
              </div>
            </EntitlementGate>
          </div>
        )}

        {/* =========================================================
            MODAL: ACADEMIC SESSIONS
        ========================================================= */}
        {isYearModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <EntitlementGate feature="class_management" title="Class Management Locked" requiredPlan="Starter Plan">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Academic Sessions
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsYearModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Existing Sessions */}
                {academicYears.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Existing Sessions
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {academicYears.map((y) => (
                        <div
                          key={y.id}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs ${
                            y.isCurrent
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 font-bold"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          }`}
                        >
                          <div>
                            <span className="font-bold">{y.name}</span>
                            <span className="text-slate-400 ml-2">({y.startDate} to {y.endDate})</span>
                          </div>
                          {y.isCurrent ? (
                            <span className="text-[10px] bg-emerald-600 text-white rounded-full px-2 py-0.5">
                              Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSessionPromotionTarget(y);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs cursor-pointer"
                            >
                              Make Active & Promote
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add new year form */}
                <form onSubmit={handleCreateYear} className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Add New Academic Session:
                  </span>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Session Name
                    </label>
                    <input
                      type="text"
                      required
                      value={yearNameInput}
                      onChange={(e) => setYearNameInput(e.target.value)}
                      placeholder="e.g. 2026-27"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={startDateInput}
                        onChange={(e) => setStartDateInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={endDateInput}
                        onChange={(e) => setEndDateInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsYearModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingYear}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingYear ? "Saving..." : "Add & Activate Session"}
                    </button>
                  </div>
                </form>
              </div>
            </EntitlementGate>
          </div>
        )}

        {/* Academic Session Promotion Modal */}
        {sessionPromotionTarget && (
          <SessionPromotionModal
            isOpen={Boolean(sessionPromotionTarget)}
            onClose={() => setSessionPromotionTarget(null)}
            schoolId={schoolId}
            fromYear={currentYear || null}
            toYear={sessionPromotionTarget}
            classes={classes}
            onSuccess={() => {
              loadData();
            }}
          />
        )}
      </div>
    </EntitlementGate>
  );
}
