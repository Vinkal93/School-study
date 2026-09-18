"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ArrowRight,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2,
  Layers,
  RotateCcw,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  executeSessionPromotion,
  type ClassPromotionMapping,
  type SessionPromotionResult,
  getStudents,
} from "@/lib/services/student.service";
import { setCurrentAcademicYear } from "@/lib/services/academic.service";
import type { AcademicYear, SchoolClass, StudentProfile } from "@/types";
import { getCanonicalClassOrder } from "@/lib/utils/academic-normalizer";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export interface SessionPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  fromYear: AcademicYear | null;
  toYear: AcademicYear;
  classes: SchoolClass[];
  onSuccess: () => void;
}

export function SessionPromotionModal({
  isOpen,
  onClose,
  schoolId,
  fromYear,
  toYear,
  classes,
  onSuccess,
}: SessionPromotionModalProps) {
  const [shouldPromote, setShouldPromote] = useState(true);
  const [resetRollNumbers, setResetRollNumbers] = useState(true);
  const [autoAssignFees, setAutoAssignFees] = useState(true);
  const [graduatingAction, setGraduatingAction] = useState<"graduated" | "archived">("graduated");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  // Sorted classes by grade sequence
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const oA = a.order ?? getCanonicalClassOrder(a.name);
      const oB = b.order ?? getCanonicalClassOrder(b.name);
      return oA - oB;
    });
  }, [classes]);

  // Load active students count to preview promotion impact
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    setLoadingStudents(true);
    getStudents(schoolId)
      .then((res) => {
        const activeOnly = res.filter((s) => s.status === "active" || !s.status);
        setStudents(activeOnly);
      })
      .catch((err) => {
        console.warn("Failed to load students for promotion preview:", err);
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [isOpen, schoolId]);

  // Active students count map by classId
  const countByClassId = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const current = map.get(s.classId) || 0;
      map.set(s.classId, current + 1);
    });
    return map;
  }, [students]);

  // Default auto-promotion mapping
  const [mappings, setMappings] = useState<ClassPromotionMapping[]>([]);

  useEffect(() => {
    if (sortedClasses.length === 0) return;

    const initial: ClassPromotionMapping[] = sortedClasses.map((cls, idx) => {
      const isHighest = idx === sortedClasses.length - 1;
      if (isHighest) {
        return {
          sourceClassId: cls.id,
          sourceClassName: cls.name,
          targetClassId: "GRADUATE",
          targetClassName: "Graduated",
        };
      } else {
        const nextCls = sortedClasses[idx + 1];
        const defaultSection = nextCls.sections?.[0];
        return {
          sourceClassId: cls.id,
          sourceClassName: cls.name,
          targetClassId: nextCls.id,
          targetClassName: nextCls.name,
          targetSectionId: defaultSection?.id,
          targetSectionName: defaultSection?.name,
        };
      }
    });

    setMappings(initial);
  }, [sortedClasses]);

  const handleUpdateMapping = (sourceClassId: string, targetValue: string) => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.sourceClassId !== sourceClassId) return m;

        if (targetValue === "GRADUATE") {
          return {
            ...m,
            targetClassId: "GRADUATE",
            targetClassName: "Graduated",
            targetSectionId: undefined,
            targetSectionName: undefined,
          };
        }
        if (targetValue === "RETAIN") {
          return {
            ...m,
            targetClassId: "RETAIN",
            targetClassName: m.sourceClassName,
            targetSectionId: undefined,
            targetSectionName: undefined,
          };
        }

        const foundClass = sortedClasses.find((c) => c.id === targetValue);
        return {
          ...m,
          targetClassId: targetValue,
          targetClassName: foundClass?.name || "",
          targetSectionId: foundClass?.sections?.[0]?.id,
          targetSectionName: foundClass?.sections?.[0]?.name,
        };
      })
    );
  };

  // Summary Metrics
  const summary = useMemo(() => {
    let totalPromoting = 0;
    let totalGraduating = 0;
    let totalRetaining = 0;

    mappings.forEach((m) => {
      const count = countByClassId.get(m.sourceClassId) || 0;
      if (m.targetClassId === "GRADUATE") totalGraduating += count;
      else if (m.targetClassId === "RETAIN") totalRetaining += count;
      else totalPromoting += count;
    });

    return {
      totalEligible: students.length,
      totalPromoting,
      totalGraduating,
      totalRetaining,
    };
  }, [mappings, countByClassId, students]);

  const handleExecute = async () => {
    setIsProcessing(true);
    try {
      if (shouldPromote) {
        const res = await executeSessionPromotion({
          schoolId,
          fromYearId: fromYear?.id || "",
          fromYearName: fromYear?.name || "Previous Session",
          toYearId: toYear.id,
          toYearName: toYear.name,
          classMappings: mappings,
          resetRollNumbers,
          autoAssignFees,
          graduatingAction,
        });

        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        toast.success(
          `Academic Year ${toYear.name} is now Active! ${res.promotedCount} students promoted, ${res.graduatedCount} graduated.`
        );
      } else {
        // Just activate the academic year without promoting students
        await setCurrentAcademicYear(schoolId, toYear.id);
        toast.success(`Academic Year ${toYear.name} set as active session.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed session promotion:", err);
      toast.error(err?.message || "Failed to switch academic session.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={() => {
        if (!isProcessing) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shadow-xs">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Activate Academic Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Transition institutional operations to a new academic year
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Transition Badge Banner */}
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <div className="text-center sm:text-left">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Current Session
              </span>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {fromYear?.name || "None"}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="text-center sm:text-left">
              <span className="block text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">
                New Session
              </span>
              <span className="font-bold text-sm text-blue-700 dark:text-blue-300">
                {toYear.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Period:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {toYear.startDate} to {toYear.endDate}
            </span>
          </div>
        </div>

        {/* Option: Promote Students Toggle */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={shouldPromote}
              onChange={(e) => setShouldPromote(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Promote eligible students to next class for {toYear.name}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatically advances students into the next sequential grade, preserves all past marks, fees and ledger entries, and assigns new session records.
              </p>
            </div>
          </label>

          {shouldPromote && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {/* Promotion Config Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={resetRollNumbers}
                    onChange={(e) => setResetRollNumbers(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Reassign roll numbers (1, 2, 3...)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={autoAssignFees}
                    onChange={(e) => setAutoAssignFees(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Auto-assign new fee structures</span>
                </label>
              </div>

              {/* Impact Preview Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Promoting</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {loadingStudents ? "..." : summary.totalPromoting}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Graduating</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {loadingStudents ? "..." : summary.totalGraduating}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Affected</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {loadingStudents ? "..." : summary.totalEligible}
                  </span>
                </div>
              </div>

              {/* Class-wise Custom Mapping Accordion/Table */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Class Progression Plan:
                </span>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  {mappings.map((m) => {
                    const studentCount = countByClassId.get(m.sourceClassId) || 0;
                    return (
                      <div
                        key={m.sourceClassId}
                        className="p-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {m.sourceClassName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-semibold shrink-0">
                            {studentCount} student{studentCount === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={m.targetClassId}
                            onChange={(e) => handleUpdateMapping(m.sourceClassId, e.target.value)}
                            className="appearance-none pl-2.5 pr-6 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="GRADUATE">🎓 Mark as Graduated</option>
                            <option value="RETAIN">🔁 Retain in Same Class</option>
                            <optgroup label="Promote to Class:">
                              {sortedClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Safety Warning */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-3 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Historical Integrity Guaranteed:</strong> Prior academic years ({fromYear?.name || "current"}), past fee collections, vouchers, and attendance records are never overwritten. A permanent chronological timeline entry is recorded on each student's profile.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing || loadingStudents}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Session Transition...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{shouldPromote ? `Promote & Activate ${toYear.name}` : `Activate ${toYear.name}`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
