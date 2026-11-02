"use client";

import { useState } from "react";
import type { AcademicYear, SchoolClass, StudentProfile } from "@/types";
import { useAppQuery } from "@/lib/cache";
import { getAcademicYears } from "@/lib/services/academic.service";
import { previewSchoolPromotion, promoteWholeSchool } from "@/lib/services/school-promotion.service";
import { EntitlementGate } from "@/components/common/EntitlementGate";
import { useConfirm } from "@/components/common/ConfirmationContext";
import {
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export function WholeSchoolPromotion({
  schoolId,
  actorId,
  students,
  classes,
  onComplete,
}: {
  schoolId: string;
  actorId: string;
  students: StudentProfile[];
  classes: SchoolClass[];
  onComplete: () => void;
}) {
  const { confirm: confirmDialog } = useConfirm();
  const { data: years = [] } = useAppQuery<AcademicYear[]>(
    schoolId ? `academicYears:${schoolId}` : null,
    () => getAcademicYears(schoolId),
    { enabled: !!schoolId }
  );

  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ReturnType<typeof previewSchoolPromotion> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [showPreviewList, setShowPreviewList] = useState(false);

  const sourceClasses = classes.filter((c) =>
    students.some(
      (s) =>
        s.classId === c.id &&
        s.academicYearId === source &&
        String(s.status || "active").toLowerCase() === "active"
    )
  );

  const change = () => {
    setPreview(null);
    setMessage("");
  };

  const handleSuggestNextClass = () => {
    const suggested: Record<string, string> = {};
    sourceClasses.forEach((c) => {
      const grade = c.name.match(/\d+/);
      if (!grade) return;
      const next = classes.filter(
        (t) =>
          t.status === "active" &&
          (!t.academicYearId || t.academicYearId === target) &&
          Number(t.name.match(/\d+/)?.[0]) === Number(grade[0]) + 1
      );
      if (next.length === 1) suggested[c.id] = next[0].id;
    });
    setMapping(suggested);
    change();
  };

  const handleReviewPromotion = () => {
    try {
      const rows = previewSchoolPromotion(students, classes, mapping, source, target);
      if (!rows.length) {
        throw new Error("No active students found in the selected source session.");
      }
      setPreview(rows);
      setMessage(`Ready to advance ${rows.length} students across ${Object.keys(mapping).length} classes.`);
      setShowPreviewList(true);
    } catch (err) {
      setPreview(null);
      setMessage(err instanceof Error ? err.message : "Preview failed.");
    }
  };

  const handleExecutePromotion = async () => {
    if (!preview || preview.length === 0) return;

    const confirmed = await confirmDialog({
      title: "Confirm Whole School Promotion",
      message: `You are about to promote ${preview.length} students from the source session to the target session. Existing roll numbers and matching section names will be preserved. Proceed?`,
      confirmLabel: `Promote ${preview.length} Students`,
      confirmVariant: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    setFailures([]);
    try {
      const result = await promoteWholeSchool(schoolId, preview, source, target, actorId);
      setMessage(
        `Promotion Complete: ${result.promoted} promoted successfully, ${result.skipped} already processed, ${result.errors.length} failed.`
      );
      setFailures(result.errors);
      setPreview(null);
      onComplete();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setBusy(false);
    }
  };

  const unassignedStudentsCount = students.filter(
    (s) => !s.academicYearId && String(s.status || "active").toLowerCase() === "active"
  ).length;

  return (
    <EntitlementGate capability="student_promote" type="section">
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-xs space-y-6">
        {/* Title & Guidance */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                <Sparkles className="h-3 w-3" />
                <span>Automated Cohort Advancement</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Promote the Whole School
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Advance all grade cohorts from one academic session to the next in one atomic operation. Roll numbers are preserved, matching section names are aligned, and fees are assigned in the next session.
            </p>
          </div>
        </div>

        {/* Step 1: Session Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Source Academic Session (Current) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                aria-label="Source academic session"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  change();
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select source session</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.startDate} to {y.endDate}){y.isCurrent ? " - Current" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Academic Session (Next Year) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                aria-label="Target academic session"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  change();
                }}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select destination session</option>
                {years
                  .filter((y) => y.id !== source)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} ({y.startDate} to {y.endDate})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Warning if unassigned students exist */}
        {unassignedStudentsCount > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>{unassignedStudentsCount}</strong> active students have no academic session assigned. Please assign their current session under Student Directory before including them in whole school promotion.
            </span>
          </div>
        )}

        {/* Step 2: Cohort Mapping */}
        {source && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Step 2: Map Grade Cohort Destinations ({sourceClasses.length} Active Classes)
                </span>
                <p className="text-xs text-slate-500">
                  Specify which higher grade each class advances to.
                </p>
              </div>

              <button
                disabled={busy || sourceClasses.length === 0}
                type="button"
                onClick={handleSuggestNextClass}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 hover:bg-blue-100 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Auto-Suggest Next Grade (e.g. 1st → 2nd)</span>
              </button>
            </div>

            {sourceClasses.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                No classes with active enrolled students found for the selected session.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {sourceClasses.map((c) => {
                  const studentCount = students.filter(
                    (s) =>
                      s.classId === c.id &&
                      s.academicYearId === source &&
                      String(s.status || "active").toLowerCase() === "active"
                  ).length;

                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 sm:w-1/3">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {studentCount} {studentCount === 1 ? "student" : "students"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <select
                          aria-label={`Destination for ${c.name}`}
                          value={mapping[c.id] || ""}
                          onChange={(e) => {
                            setMapping({ ...mapping, [c.id]: e.target.value });
                            change();
                          }}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">Choose Destination Class</option>
                          {classes
                            .filter(
                              (t) =>
                                t.id !== c.id &&
                                t.status === "active" &&
                                (!t.academicYearId || t.academicYearId === target)
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Execution Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={busy || !source || !target || sourceClasses.length === 0}
            type="button"
            onClick={handleReviewPromotion}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            Review Promotion Preview
          </button>

          {preview && (
            <button
              disabled={busy}
              type="button"
              onClick={handleExecutePromotion}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{busy ? "Promoting Students..." : `Apply Promotion to ${preview.length} Students`}</span>
            </button>
          )}

          {preview && (
            <button
              type="button"
              onClick={() => setShowPreviewList(!showPreviewList)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <span>{showPreviewList ? "Hide Student List" : "Show Student List"}</span>
              {showPreviewList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Failures List */}
        {failures.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs text-rose-800 dark:text-rose-300">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{failures.length} student records could not be promoted:</span>
            </span>
            <ul className="list-disc list-inside space-y-1 pl-2">
              {failures.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Collapsible Preview Table */}
        {preview && showPreviewList && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-150">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Promotion Manifest Preview ({preview.length} Students)
            </span>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">Roll No.</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Current Class</th>
                    <th className="p-2.5">Target Destination</th>
                    <th className="p-2.5">Target Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {preview.map(({ student, target: tCls, section }) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-mono">{student.rollNumber || "—"}</td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{student.name}</td>
                      <td className="p-2.5">{student.className || "Class"}</td>
                      <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{tCls.name}</td>
                      <td className="p-2.5">{section?.name || "Auto"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </EntitlementGate>
  );
}
export default WholeSchoolPromotion;
