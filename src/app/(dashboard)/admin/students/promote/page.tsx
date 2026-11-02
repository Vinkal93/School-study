"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents, transferStudentsBulk } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import type { StudentProfile, SchoolClass } from "@/types";
import { toast } from "sonner";
import { WholeSchoolPromotion } from "@/components/admin/WholeSchoolPromotion";
import { useConfirm } from "@/components/common/ConfirmationContext";
import { Checkbox } from "@/components/ui/Checkbox";
import { EnterprisePageLayout } from "@/components/layout/EnterprisePageLayout";
import {
  ArrowRight,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";

export default function PromoteStudentsPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";
  const { confirm: confirmDialog } = useConfirm();

  // Mode Switcher: "whole_school" vs "class_batch"
  const [promotionMode, setPromotionMode] = useState<"whole_school" | "class_batch">("whole_school");

  // SWR queries for students and classes
  const {
    data: cachedStudents,
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
  } = useAppQuery<StudentProfile[]>(
    isQueryEnabled ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: isQueryEnabled, staleTime: 30_000 }
  );

  const { data: cachedClasses, isLoading: isClassesLoading } = useAppQuery<SchoolClass[]>(
    isQueryEnabled ? `classes:${schoolId}` : null,
    () => getClassesWithSections(schoolId),
    { enabled: isQueryEnabled, staleTime: 60_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);
  const classes = useMemo(() => cachedClasses || [], [cachedClasses]);

  // Setup Form State for Class Batch Mode
  const [sourceClassId, setSourceClassId] = useState("");
  const [sourceSectionId, setSourceSectionId] = useState("all");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [rollNumberMode, setRollNumberMode] = useState<"sequential" | "keep">("keep");
  const [autoAssignFees, setAutoAssignFees] = useState(false);
  const [promotionReason, setPromotionReason] = useState("Annual Academic Session Promotion");

  // Selected Student IDs
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  // Individual student actions: 'promote' | 'retain' | 'graduate'
  const [studentActionOverrides, setStudentActionOverrides] = useState<Record<string, "promote" | "retain" | "graduate">>({});

  // Execution State
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<{
    promotedCount: number;
    sourceClassName: string;
    targetClassName: string;
  } | null>(null);

  // Source Class & Sections
  const sourceClass = useMemo(() => {
    return classes.find((c) => c.id === sourceClassId);
  }, [classes, sourceClassId]);

  const sourceSections = useMemo(() => {
    return sourceClass?.sections || [];
  }, [sourceClass]);

  // Target Class & Sections
  const targetClass = useMemo(() => {
    return classes.find((c) => c.id === targetClassId);
  }, [classes, targetClassId]);

  const targetSections = useMemo(() => {
    return targetClass?.sections || [];
  }, [targetClass]);

  // Students eligible in the selected source class & section
  const eligibleStudents = useMemo(() => {
    if (!sourceClassId) return [];
    return students
      .filter((s) => {
        const matchesClass = s.classId === sourceClassId;
        const matchesSection =
          sourceSectionId === "all" ? true : s.sectionId === sourceSectionId;
        const isActive = (s.status ? String(s.status).toLowerCase() : "active") === "active";
        return matchesClass && matchesSection && isActive;
      })
      .sort((a, b) => (Number(a.rollNumber) || 9999) - (Number(b.rollNumber) || 9999));
  }, [students, sourceClassId, sourceSectionId]);

  // Automatically select all eligible students when source class changes
  const handleSourceClassChange = (newClassId: string) => {
    setSourceClassId(newClassId);
    setSourceSectionId("all");
    setPromotionResult(null);

    // Pre-select all students of that class
    const inClass = students.filter(
      (s) =>
        s.classId === newClassId &&
        (s.status ? String(s.status).toLowerCase() : "active") === "active"
    );
    setSelectedStudentIds(inClass.map((s) => s.id));
    setStudentActionOverrides({});
  };

  const handleTargetClassChange = (newTargetId: string) => {
    setTargetClassId(newTargetId);
    const cls = classes.find((c) => c.id === newTargetId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setTargetSectionId(cls.sections[0].id);
    } else {
      setTargetSectionId("");
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(eligibleStudents.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleActionOverride = (studentId: string, action: "promote" | "retain" | "graduate") => {
    setStudentActionOverrides((prev) => ({ ...prev, [studentId]: action }));
  };

  // Execute Batch Promotion
  const handleExecutePromotion = async () => {
    if (!sourceClassId) {
      toast.error("Please select a source class.");
      return;
    }

    if (!targetClassId) {
      toast.error("Please select a target class or mark as graduated.");
      return;
    }

    if (sourceClassId === targetClassId) {
      toast.error("Source and target classes cannot be identical.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student to promote.");
      return;
    }

    const sourceClassName = sourceClass?.name || "Current Class";
    const targetClassName =
      targetClassId === "GRADUATE" ? "Graduated" : targetClass?.name || "Target Class";

    // Students to promote (excluding ones marked retain)
    const studentsToPromote = selectedStudentIds.filter(
      (id) => (studentActionOverrides[id] || "promote") === "promote"
    );

    if (studentsToPromote.length === 0) {
      toast.error("No students marked for promotion. Check student action overrides.");
      return;
    }

    const confirmed = await confirmDialog({
      title: "Confirm Batch Promotion",
      message: `You are about to promote ${studentsToPromote.length} students from ${sourceClassName} to ${targetClassName}. Roll numbers and fee ledgers will be updated accordingly. Proceed?`,
      confirmLabel: `Promote ${studentsToPromote.length} Students`,
      confirmVariant: "warning",
    });
    if (!confirmed) return;

    setIsPromoting(true);
    try {
      const targetSectionObj = targetSections.find((s) => s.id === targetSectionId);
      const targetSectionName = targetSectionObj?.name || "Section A";

      await transferStudentsBulk(
        schoolId,
        {
          sourceClassId,
          sourceClassName,
          sourceSectionId,
          sourceSectionName: sourceSectionId === "all" ? "All Sections" : "Selected Section",
          targetClassId,
          targetClassName,
          targetSectionId: targetSectionId || "sec_default",
          targetSectionName,
          studentIds: studentsToPromote,
          actionType: targetClassId === "GRADUATE" ? "graduate" : "promote",
          rollNumberMode,
          reason: promotionReason,
          autoAssignFees,
        },
        firebaseUser?.uid || "admin"
      );

      setPromotionResult({
        promotedCount: studentsToPromote.length,
        sourceClassName,
        targetClassName,
      });

      toast.success(
        `Successfully promoted ${studentsToPromote.length} students to ${targetClassName}!`
      );
      refetchStudents(true);
    } catch (err: any) {
      console.error("Promotion execution error:", err);
      toast.error(err.message || "Failed to execute student promotion.");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <EnterprisePageLayout
      breadcrumbs={[
        { name: "Students", url: "/admin/students" },
        { name: "Promotion & Advancement", url: "/admin/students/promote" },
      ]}
      title="Student Promotion & Cohort Transfer"
      badge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-900/60">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Academic Transition</span>
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {students.length} Registered Students
          </span>
        </div>
      }
      description="Advance students to the next academic grade, allocate roll numbers, and assign next-session fees."
      secondaryActions={
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Students Directory</span>
        </Link>
      }
    >

      {/* =========================================================
          MODE SWITCHER / TAB SEGMENTATION (Design System 3.0)
      ========================================================= */}
      <div className="flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto self-start">
        <button
          type="button"
          onClick={() => setPromotionMode("whole_school")}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            promotionMode === "whole_school"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Whole School Cohort Advancement</span>
        </button>

        <button
          type="button"
          onClick={() => setPromotionMode("class_batch")}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            promotionMode === "class_batch"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ArrowRight className="h-4 w-4" />
          <span>Class & Batch Transfer</span>
        </button>
      </div>

      {/* =========================================================
          MODE A: WHOLE SCHOOL SESSION PROMOTION
      ========================================================= */}
      {promotionMode === "whole_school" && (
        <WholeSchoolPromotion
          schoolId={schoolId}
          actorId={profile?.uid || ""}
          students={students}
          classes={classes}
          onComplete={() => {
            refetchStudents(true);
          }}
        />
      )}

      {/* =========================================================
          MODE B: GRANULAR CLASS & BATCH PROMOTION
      ========================================================= */}
      {promotionMode === "class_batch" && (
        <div className="space-y-6">
          {/* SUCCESS CONFIRMATION BANNER */}
          {promotionResult && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Promotion Batch Executed Successfully!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Promoted <strong>{promotionResult.promotedCount}</strong> students from{" "}
                  <strong>{promotionResult.sourceClassName}</strong> to{" "}
                  <strong>{promotionResult.targetClassName}</strong>. Roll numbers and fee ledgers have been provisioned.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/admin/students"
                    className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline"
                  >
                    View Updated Student Directory →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: CLASS MAPPING SETUP */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  1. Source & Target Class Selection
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Define the source cohort and destination class for academic advancement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Source Class */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Source Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceClassId}
                  onChange={(e) => handleSourceClassChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Source Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Section */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Source Section
                </label>
                <select
                  value={sourceSectionId}
                  disabled={!sourceClassId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50 font-medium cursor-pointer"
                >
                  <option value="all">All Sections</option>
                  {sourceSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Class */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Class (Promote To) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => handleTargetClassChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Destination Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                  <option value="GRADUATE">🎓 Mark Graduated / Completed</option>
                </select>
              </div>

              {/* Target Section */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Section
                </label>
                <select
                  value={targetSectionId}
                  disabled={!targetClassId || targetClassId === "GRADUATE"}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white disabled:opacity-50 font-medium cursor-pointer"
                >
                  {targetSections.length > 0 ? (
                    targetSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Section A (Default)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Options Row */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Roll Number Strategy:
                </label>
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setRollNumberMode("sequential")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      rollNumberMode === "sequential"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Auto Sequential (1, 2, 3...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRollNumberMode("keep")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      rollNumberMode === "keep"
                        ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Keep Existing Roll
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="autoAssignFees"
                  checked={autoAssignFees}
                  onChange={(e) => setAutoAssignFees(e.target.checked)}
                />
                <label
                  htmlFor="autoAssignFees"
                  className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Automatically provision target class fee structure for the new session
                </label>
              </div>
            </div>
          </div>

          {/* STEP 2: STUDENT ROSTER REVIEW */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  2. Student Cohort Review ({eligibleStudents.length} Students)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select which students to promote, retain in grade, or mark graduated.
                </p>
              </div>

              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedStudentIds.length} of {eligibleStudents.length} selected for promotion
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/75 text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <Checkbox
                        checked={
                          eligibleStudents.length > 0 &&
                          selectedStudentIds.length === eligibleStudents.length
                        }
                        indeterminate={
                          selectedStudentIds.length > 0 &&
                          selectedStudentIds.length < eligibleStudents.length
                        }
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Current Roll</th>
                    <th className="py-3 px-4">Promotion Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {!sourceClassId ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Please select a source class above to load enrolled students.
                      </td>
                    </tr>
                  ) : eligibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No active students enrolled in this source class.
                      </td>
                    </tr>
                  ) : (
                    eligibleStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      const currentAction = studentActionOverrides[student.id] || "promote";

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                            isSelected ? "bg-blue-50/20 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleStudent(student.id)}
                            />
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {student.name}
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {student.studentId || student.admissionNumber || "-"}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold">
                            #{student.rollNumber ?? "-"}
                          </td>

                          <td className="py-3 px-4">
                            <select
                              value={currentAction}
                              onChange={(e) =>
                                handleActionOverride(student.id, e.target.value as any)
                              }
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                            >
                              <option value="promote">Promote to Next Class</option>
                              <option value="retain">Retain in Current Class</option>
                              <option value="graduate">Graduate / TC Issued</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* STEP 3: EXECUTION FOOTER */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedStudentIds.length > 0
                  ? `Ready to promote ${selectedStudentIds.length} students into ${
                      targetClass?.name || "Target Class"
                    }.`
                  : "Select students to proceed with promotion."}
              </div>

              <button
                type="button"
                disabled={isPromoting || selectedStudentIds.length === 0 || !targetClassId}
                onClick={handleExecutePromotion}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isPromoting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Batch Promotion...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Execute Promotion Batch ({selectedStudentIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnterprisePageLayout>
  );
}
