"use client";

import { useEffect, useState } from "react";
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
import { checkPlanLimit } from "@/lib/billing";
import type { AcademicYear, SchoolClass, Section, PlanLimitCheckResult } from "@/types";
import { toast } from "sonner";

import { useEntitlement } from "@/context/EntitlementContext";
import { EntitlementGate } from "@/components/common/EntitlementGate";

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const { canAccess } = useEntitlement();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [limitStatus, setLimitStatus] = useState<PlanLimitCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classOrderInput, setClassOrderInput] = useState(1);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
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
      const [years, cls, limitRes] = await Promise.all([
        getAcademicYears(schoolId),
        getClassesWithSections(schoolId),
        checkPlanLimit(schoolId, "classes"),
      ]);
      setAcademicYears(years);
      setClasses(cls);
      setLimitStatus(limitRes);
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

  // Handle Class Creation / Edit
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      toast.error("Please enter a class name.");
      return;
    }

    setIsSubmittingClass(true);
    try {
      const monthlyFeeNum = monthlyFeeInput ? parseFloat(monthlyFeeInput) : 0;
      const admissionFeeNum = admissionFeeInput ? parseFloat(admissionFeeInput) : 0;

      if (editingClass) {
        // Edit
        await updateClass(schoolId, editingClass.id, {
          name: classNameInput.trim(),
          order: classOrderInput,
          academicYearId: selectedAcademicYearId || undefined,
          monthlyFee: monthlyFeeNum,
          admissionFee: admissionFeeNum,
        });
        toast.success(`Updated "${classNameInput}"`);
      } else {
        // Create
        const sections = initialSectionsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        await createClass(schoolId, {
          name: classNameInput.trim(),
          order: classOrderInput,
          academicYearId: selectedAcademicYearId || undefined,
          initialSections: sections.length > 0 ? sections : ["A"],
          monthlyFee: monthlyFeeNum,
          admissionFee: admissionFeeNum,
        });
        toast.success(`Class "${classNameInput}" created successfully!`);
      }

      setIsClassModalOpen(false);
      setEditingClass(null);
      setClassNameInput("");
      setMonthlyFeeInput("");
      setAdmissionFeeInput("");
      setInitialSectionsInput("A, B");
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
    if (!confirm(`Are you sure you want to delete "${cls.name}" and all its sections?`)) {
      return;
    }
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
    if (!confirm(`Delete ${sectionName}?`)) return;
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
      limitKey="classes"
      currentCount={classes.length}
      title="Classes & Sections Management"
      description="Configure grades, divisions, and manage class structures for your school."
      requiredPlan="Starter Plan"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              <span>SESSION: {currentYear?.name || "Not Configured"}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Classes & Sections Management
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Configure grades, divisions, and manage class structures for your school.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (profile?.role !== "super_admin" && !canAccess("class_management")) {
                  toast.error("Class Management is not included in your current plan. Please upgrade to unlock.");
                  return;
                }
                setIsYearModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Calendar className="h-4 w-4" />
              {academicYears.length === 0 ? "Set Academic Year" : "Academic Sessions"}
            </button>
            <button
              onClick={() => {
                if (profile?.role !== "super_admin" && !canAccess("class_management")) {
                  toast.error("Class Management is not included in your current plan. Please upgrade to unlock.");
                  return;
                }
                if (limitStatus && !limitStatus.allowed) {
                  toast.error(
                    `Class limit reached (${limitStatus.current}/${limitStatus.limit}). Upgrade plan to add more classes.`
                  );
                  return;
                }
                setEditingClass(null);
                setClassNameInput("");
                setClassOrderInput(classes.length + 1);
                setSelectedAcademicYearId(currentYear?.id || "");
                setMonthlyFeeInput("");
                setAdmissionFeeInput("");
                setInitialSectionsInput("A, B");
                setIsClassModalOpen(true);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
                limitStatus && !limitStatus.allowed
                  ? "bg-slate-500 hover:bg-slate-600 opacity-90 cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>Add New Class</span>
            </button>
          </div>
        </div>

      {/* Plan Capacity Limit Warning Banner */}
      {limitStatus && !limitStatus.allowed && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 p-4 flex items-center justify-between gap-4 text-red-800 dark:text-red-300">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Class Capacity Limit Reached ({limitStatus.current}/${limitStatus.limit}). </span>
              <span>Your school has reached the maximum class limit for your current plan.</span>
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

      {/* Classes List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            No classes created yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by adding grade levels and section divisions.
          </p>
          <button
            onClick={() => {
              setEditingClass(null);
              setClassNameInput("");
              setClassOrderInput(1);
              setSelectedAcademicYearId(currentYear?.id || "");
              setMonthlyFeeInput("");
              setAdmissionFeeInput("");
              setInitialSectionsInput("A, B");
              setIsClassModalOpen(true);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className={`rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-950 transition-all flex flex-col justify-between ${
                cls.status === "active"
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-red-200 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10 opacity-75"
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {cls.order}
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {cls.name}
                      </h3>
                      <span className="text-xs font-mono text-gray-400">
                        ID: {cls.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingClass(cls);
                        setClassNameInput(cls.name);
                        setClassOrderInput(cls.order);
                        setSelectedAcademicYearId(cls.academicYearId || currentYear?.id || "");
                        setMonthlyFeeInput(cls.monthlyFee !== undefined ? cls.monthlyFee.toString() : "");
                        setAdmissionFeeInput(cls.admissionFee !== undefined ? cls.admissionFee.toString() : "");
                        setIsClassModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      title="Edit class"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Delete class"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Class Fees Info */}
                <div className="py-2.5 px-3 my-2 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Monthly Fee</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{cls.monthlyFee !== undefined ? cls.monthlyFee.toLocaleString("en-IN") : "0"}<span className="text-[10px] font-normal text-gray-400">/mo</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Admission Fee</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{cls.admissionFee !== undefined ? cls.admissionFee.toLocaleString("en-IN") : "0"}
                    </span>
                  </div>
                </div>

                {/* Sections List */}
                <div className="py-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      SECTIONS ({cls.sections?.length || 0})
                    </span>
                    {addingSectionClassId !== cls.id && (
                      <button
                        onClick={() => {
                          setAddingSectionClassId(cls.id);
                          setSectionNameInput("");
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Section
                      </button>
                    )}
                  </div>

                  {/* Inline Add Section Form */}
                  {addingSectionClassId === cls.id && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                      <input
                        type="text"
                        value={sectionNameInput}
                        onChange={(e) => setSectionNameInput(e.target.value)}
                        placeholder="e.g. C or Section C"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddSection(cls.id)}
                        disabled={isSubmittingSection}
                        className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmittingSection ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => setAddingSectionClassId(null)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {cls.sections && cls.sections.length > 0 ? (
                      cls.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <Layers className="h-3 w-3 text-gray-400" />
                          {sec.name}
                          <button
                            onClick={() => handleDeleteSection(cls.id, sec.id, sec.name)}
                            className="text-gray-400 hover:text-red-500 font-bold ml-1"
                            title="Delete section"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">No sections created yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    cls.status === "active" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {cls.status === "active" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {cls.status === "active" ? "Active Class" : "Inactive"}
                </span>

                <button
                  onClick={() => handleToggleClass(cls)}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1"
                >
                  <Power className="h-3 w-3" />
                  {cls.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          MODAL: ADD / EDIT CLASS
      ========================================== */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <EntitlementGate feature="class_management" title="Class Management Locked" requiredPlan="Starter Plan">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingClass ? "Edit Class" : "Add New Class"}
              </h3>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="e.g. Class 10 or Grade 10"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Numerical Order (For sorting)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={classOrderInput}
                  onChange={(e) => setClassOrderInput(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monthly Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="10"
                    value={monthlyFeeInput}
                    onChange={(e) => setMonthlyFeeInput(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Recurring tuition fee</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Fee (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="50"
                    value={admissionFeeInput}
                    onChange={(e) => setAdmissionFeeInput(e.target.value)}
                    placeholder="e.g. 3000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">One-time registration fee</p>
                </div>
              </div>

              {academicYears.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Academic Year Session
                  </label>
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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

              {!editingClass && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Initial Sections (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={initialSectionsInput}
                    onChange={(e) => setInitialSectionsInput(e.target.value)}
                    placeholder="A, B, C"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">e.g. A, B will create Section A and Section B.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmittingClass ? "Saving..." : editingClass ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </EntitlementGate>
      </div>
    )}

      {/* ==========================================
          MODAL: ACADEMIC YEARS
      ========================================== */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <EntitlementGate feature="class_management" title="Class Management Locked" requiredPlan="Starter Plan">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Academic Sessions
              </h3>
              <button
                onClick={() => setIsYearModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List of existing years */}
            {academicYears.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500">Existing Sessions:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {academicYears.map((y) => (
                    <div
                      key={y.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                        y.isCurrent
                          ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300 font-semibold"
                          : "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                    >
                      <div>
                        <span>{y.name}</span>
                        <span className="text-gray-400 ml-2">({y.startDate} to {y.endDate})</span>
                      </div>
                      {y.isCurrent ? (
                        <span className="text-[10px] bg-green-600 text-white rounded px-1.5 py-0.5">Active</span>
                      ) : (
                        <button
                          onClick={async () => {
                            await setCurrentAcademicYear(schoolId, y.id);
                            toast.success(`Set ${y.name} as active session`);
                            loadData();
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Make Active
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new year form */}
            <form onSubmit={handleCreateYear} className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Add New Academic Session:</span>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  required
                  value={yearNameInput}
                  onChange={(e) => setYearNameInput(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingYear}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmittingYear ? "Saving..." : "Add & Activate Session"}
                </button>
              </div>
            </form>
          </div>
        </EntitlementGate>
      </div>
    )}
      </div>
    </EntitlementGate>
  );
}
