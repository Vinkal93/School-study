"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Users,
  Search,
  Filter,
  Layers,
  Check,
  Calendar,
  BookOpen,
} from "lucide-react";
import { getAcademicYears, getClassesWithSections } from "@/lib/services/academic.service";
import { getStudentsByClassSection, transferStudentsBulk } from "@/lib/services/student.service";
import type { AcademicYear, SchoolClass, StudentProfile, TransferStudentsInput } from "@/types";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function AdminClassTransferPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Source selection
  const [sourceYearId, setSourceYearId] = useState("");
  const [sourceClassId, setSourceClassId] = useState("");
  const [sourceSectionId, setSourceSectionId] = useState("all");

  // Destination selection
  const [targetYearId, setTargetYearId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");

  // Options
  const [actionType, setActionType] = useState<"promote" | "transfer" | "graduate">("promote");
  const [rollNumberMode, setRollNumberMode] = useState<"sequential" | "keep">("sequential");
  const [autoAssignFees, setAutoAssignFees] = useState(true);

  // Student list & selection
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Submitting state
  const [isTransferring, setIsTransferring] = useState(false);

  // Load initial academic years and classes
  useEffect(() => {
    if (!schoolId) return;
    const init = async () => {
      setLoadingInitial(true);
      try {
        const [years, cls] = await Promise.all([
          getAcademicYears(schoolId),
          getClassesWithSections(schoolId),
        ]);
        setAcademicYears(years);
        setClasses(cls);

        // Auto-select active year
        const activeYear = years.find((y) => y.isCurrent) || years[0];
        if (activeYear) {
          setSourceYearId(activeYear.id);
          setTargetYearId(activeYear.id);
        }

        if (cls.length > 0) {
          setSourceClassId(cls[0].id);
          // Suggest next class if available
          if (cls.length > 1) {
            setTargetClassId(cls[1].id);
            if (cls[1].sections && cls[1].sections.length > 0) {
              setTargetSectionId(cls[1].sections[0].id);
            }
          } else {
            setTargetClassId(cls[0].id);
            if (cls[0].sections && cls[0].sections.length > 0) {
              setTargetSectionId(cls[0].sections[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load academic setup:", err);
        toast.error("Failed to load classes or academic years.");
      } finally {
        setLoadingInitial(false);
      }
    };
    init();
  }, [schoolId]);

  // When source class changes, reload students
  useEffect(() => {
    if (!schoolId || !sourceClassId) return;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const list = await getStudentsByClassSection(
          schoolId,
          sourceClassId,
          sourceSectionId === "all" ? undefined : sourceSectionId,
          sourceYearId || undefined
        );
        setStudents(list);
        // By default select all active students
        setSelectedStudentIds(new Set(list.map((s) => s.id)));
      } catch (err) {
        console.error("Failed to load students:", err);
        toast.error("Failed to load students for selected class.");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [schoolId, sourceClassId, sourceSectionId, sourceYearId]);

  // Selected source and target class objects
  const sourceClass = classes.find((c) => c.id === sourceClassId);
  const targetClass = classes.find((c) => c.id === targetClassId);

  // Auto-set target section if empty when target class changes
  useEffect(() => {
    if (targetClass && targetClass.sections && targetClass.sections.length > 0) {
      if (!targetSectionId || !targetClass.sections.some((s) => s.id === targetSectionId)) {
        setTargetSectionId(targetClass.sections[0].id);
      }
    }
  }, [targetClassId, targetClass, targetSectionId]);

  // Filtered student list by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
        (s.rollNumber && s.rollNumber.toString().includes(q))
    );
  }, [students, searchQuery]);

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecuteTransfer = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error("Please select at least one student to transfer.");
      return;
    }

    if (actionType !== "graduate") {
      if (!targetClassId) {
        toast.error("Please select a target class.");
        return;
      }
      if (!targetSectionId) {
        toast.error("Please select a target section.");
        return;
      }
    }

    const targetSection = targetClass?.sections?.find((s) => s.id === targetSectionId);
    const sourceSection = sourceClass?.sections?.find((s) => s.id === sourceSectionId);

    const confirmMsg = actionType === "graduate"
      ? `Are you sure you want to graduate/archive ${selectedStudentIds.size} student(s)?`
      : `Are you sure you want to ${actionType === "promote" ? "promote" : "transfer"} ${
          selectedStudentIds.size
        } student(s) from ${sourceClass?.name || "current class"} to ${
          targetClass?.name || ""
        } (${targetSection?.name || "Section A"})?`;

    if (!confirm(confirmMsg)) return;

    setIsTransferring(true);
    try {
      const input: TransferStudentsInput = {
        sourceClassId,
        sourceClassName: sourceClass?.name || "Unknown Class",
        sourceSectionId: sourceSectionId === "all" ? "" : sourceSectionId,
        sourceSectionName: sourceSection?.name || "All Sections",
        sourceAcademicYearId: sourceYearId,
        targetClassId: actionType === "graduate" ? "" : targetClassId,
        targetClassName: actionType === "graduate" ? "Graduated" : targetClass?.name || "",
        targetSectionId: actionType === "graduate" ? "" : targetSectionId,
        targetSectionName: actionType === "graduate" ? "" : targetSection?.name || "A",
        targetAcademicYearId: targetYearId,
        studentIds: Array.from(selectedStudentIds),
        actionType,
        rollNumberMode,
        autoAssignFees,
        reason: actionType === "promote" ? "Annual Class Promotion" : actionType === "graduate" ? "School Graduation" : "Section Transfer",
      };

      const res = await transferStudentsBulk(schoolId, input, profile?.email || profile?.uid || "admin");

      if (res.success) {
        toast.success(
          `Successfully ${actionType === "promote" ? "promoted" : "transferred"} ${res.transferredCount} student(s)!`
        );
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });

        // Refresh student list
        const updatedList = await getStudentsByClassSection(
          schoolId,
          sourceClassId,
          sourceSectionId === "all" ? undefined : sourceSectionId,
          sourceYearId || undefined
        );
        setStudents(updatedList);
        setSelectedStudentIds(new Set());
      }
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast.error(err?.message || "Failed to complete student transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 mb-2 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Classes
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            Class-wise Student Promotion & Transfer
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Shift students to new standard/class, promote passed batches, or reassign sections in bulk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/backup"
            className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
          >
            Backup First (.xlsx / .csv)
          </Link>
        </div>
      </div>

      {/* 1. SOURCE & DESTINATION SETUP CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> 1. Source (Current Class)
            </span>
            <span className="text-xs text-gray-400 font-medium">
              {students.length} Student(s) in roster
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Academic Year */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Academic Session
              </label>
              <select
                value={sourceYearId}
                onChange={(e) => setSourceYearId(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Class */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Class / Standard
              </label>
              <select
                value={sourceClassId}
                onChange={(e) => setSourceClassId(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Section */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Section
              </label>
              <select
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
              >
                <option value="all">All Sections</option>
                {sourceClass?.sections?.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Destination Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 2. Destination (New Class)
            </span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActionType("promote")}
                className={`py-0.5 px-2 rounded-md transition ${
                  actionType === "promote"
                    ? "bg-white dark:bg-gray-900 text-emerald-600 shadow-xs"
                    : "text-gray-500"
                }`}
              >
                Promote
              </button>
              <button
                type="button"
                onClick={() => setActionType("transfer")}
                className={`py-0.5 px-2 rounded-md transition ${
                  actionType === "transfer"
                    ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                    : "text-gray-500"
                }`}
              >
                Transfer
              </button>
              <button
                type="button"
                onClick={() => setActionType("graduate")}
                className={`py-0.5 px-2 rounded-md transition ${
                  actionType === "graduate"
                    ? "bg-white dark:bg-gray-900 text-purple-600 shadow-xs"
                    : "text-gray-500"
                }`}
              >
                Graduate
              </button>
            </div>
          </div>

          {actionType === "graduate" ? (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-xs">
              <p className="font-bold">Graduation / Alumni Archive Mode</p>
              <p className="mt-1 text-[11px] opacity-90">
                Selected students will be archived with status &quot;archived&quot; and their complete historical ledger/results will remain preserved.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Academic Year */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Session
                </label>
                <select
                  value={targetYearId}
                  onChange={(e) => setTargetYearId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Class */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Class
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Section */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 font-medium text-gray-800 dark:text-gray-200"
                >
                  {targetClass?.sections?.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. TRANSFER PREFERENCES */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Roll Number Strategy
            </label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="rollStrategy"
                  checked={rollNumberMode === "sequential"}
                  onChange={() => setRollNumberMode("sequential")}
                  className="text-indigo-600"
                />
                <span>Auto-Assign (1, 2, 3...)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="rollStrategy"
                  checked={rollNumberMode === "keep"}
                  onChange={() => setRollNumberMode("keep")}
                  className="text-indigo-600"
                />
                <span>Retain Existing Roll No</span>
              </label>
            </div>
          </div>

          <div className="border-l border-gray-200 dark:border-gray-800 pl-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={autoAssignFees}
                onChange={(e) => setAutoAssignFees(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              <span>Auto-assign target class fee structure for the new session</span>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={selectedStudentIds.size === 0 || isTransferring}
          onClick={handleExecuteTransfer}
          className="py-2.5 px-5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 transition ml-auto"
        >
          {isTransferring ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Processing Transfer...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>
                {actionType === "promote"
                  ? `Promote ${selectedStudentIds.size} Student(s)`
                  : actionType === "graduate"
                  ? `Graduate ${selectedStudentIds.size} Student(s)`
                  : `Transfer ${selectedStudentIds.size} Student(s)`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 3. STUDENT ROSTER SELECTION TABLE */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold py-1 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 transition"
            >
              {selectedStudentIds.size === filteredStudents.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-xs font-semibold text-gray-500">
              <strong className="text-indigo-600 dark:text-indigo-400">
                {selectedStudentIds.size}
              </strong>{" "}
              of {filteredStudents.length} selected
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search student by name, roll, adm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>

        {/* Table Body */}
        {loadingStudents ? (
          <div className="py-12 flex items-center justify-center text-xs text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No active students found in this class/section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.size === filteredStudents.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                  </th>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Current Class</th>
                  <th className="py-3 px-4">Target Preview</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filteredStudents.map((s, idx) => {
                  const isSelected = selectedStudentIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : "hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(s.id)}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                        #{s.rollNumber || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{s.name}</div>
                        <div className="text-[11px] text-gray-400">{s.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                        {s.admissionNumber || s.studentId || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {s.className} ({s.sectionName || "A"})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {actionType === "graduate" ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                            🎓 Graduate & Archive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <span>{targetClass?.name || "Target"}</span>
                            <ArrowRight className="h-3 w-3 inline" />
                            <span>
                              Section {targetClass?.sections?.find((sec) => sec.id === targetSectionId)?.name || "A"}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                          }`}
                        >
                          {isSelected ? "Selected" : "Skip"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
