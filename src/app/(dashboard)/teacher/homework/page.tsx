"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  ClipboardList,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
  Users,
  Sparkles,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getClassBells } from "@/lib/services/timetable.service";
import {
  createHomework,
  subscribeToTeacherHomework,
  deleteHomework,
} from "@/lib/services/homework.service";
import type { SchoolClass, Section } from "@/types";
import type { ClassBell, HomeworkItem, CreateHomeworkInput } from "@/types/timetable";
import { toast } from "sonner";

export default function TeacherHomeworkPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherId = profile?.uid || "";
  const teacherName = profile?.name || "Teacher";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [classBells, setClassBells] = useState<ClassBell[]>([]);
  const [selectedBellId, setSelectedBellId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [bookName, setBookName] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assignedDate, setAssignedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );

  // 1. Initial load of classes
  useEffect(() => {
    async function loadMeta() {
      if (!schoolId) return;
      try {
        const cList = await getClassesWithSections(schoolId);
        setClasses(cList);
        if (cList.length > 0) {
          setSelectedClassId(cList[0].id);
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [schoolId]);

  // 2. Real-time subscription to teacher's homework
  useEffect(() => {
    if (!schoolId || !teacherId) return;
    const unsubscribe = subscribeToTeacherHomework(schoolId, teacherId, (items) => {
      setHomeworkList(items);
    });
    return () => unsubscribe();
  }, [schoolId, teacherId]);

  // 3. Load bells when selectedClassId changes in modal
  useEffect(() => {
    async function loadBells() {
      if (!schoolId || !selectedClassId) {
        setClassBells([]);
        return;
      }
      try {
        const bells = await getClassBells(schoolId, selectedClassId);
        setClassBells(bells.filter((b) => !b.isBreak));
      } catch (err) {
        console.error("Failed to load class bells:", err);
      }
    }
    loadBells();
  }, [schoolId, selectedClassId]);

  // Auto-fill subject & book when teacher picks a Bell
  const handleBellChange = (bellId: string) => {
    setSelectedBellId(bellId);
    const bell = classBells.find((b) => b.id === bellId);
    if (bell) {
      if (bell.subject) setSubject(bell.subject);
      if (bell.bookName) setBookName(bell.bookName);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections: Section[] = selectedClass?.sections || [];

  const handleOpenNew = () => {
    setSelectedBellId("");
    setSubject("");
    setBookName("");
    setTitle("");
    setDescription("");
    setAssignedDate(new Date().toISOString().split("T")[0]);
    setDueDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setShowModal(true);
  };

  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.error("Please select a class.");
      return;
    }
    if (!subject.trim() || !title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields (Subject, Title, Description).");
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenBell = classBells.find((b) => b.id === selectedBellId);
      const chosenSection = availableSections.find((s) => s.id === selectedSectionId);

      const input: CreateHomeworkInput = {
        classId: selectedClass.id,
        className: selectedClass.name,
        sectionId: selectedSectionId || undefined,
        sectionName: chosenSection?.name || undefined,
        bellId: chosenBell?.id || undefined,
        bellNumber: chosenBell?.bellNumber || undefined,
        subject: subject.trim(),
        bookName: bookName.trim(),
        title: title.trim(),
        description: description.trim(),
        assignedDate,
        dueDate,
      };

      await createHomework(schoolId, teacherId, teacherName, input);
      toast.success("Homework assigned successfully! Students can now view it.");
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign homework.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (homeworkId: string) => {
    if (!confirm("Are you sure you want to delete this homework?")) return;
    try {
      await deleteHomework(schoolId, homeworkId);
      toast.success("Homework assignment removed.");
    } catch (err) {
      toast.error("Failed to delete homework.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <ClipboardList className="h-4 w-4" />
            <span>Teacher Portal • Academics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Homework Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign homework linked to daily timetable bells and books. Students see assignments in real-time.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Assign New Homework</span>
        </button>
      </div>

      {/* Homework List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Your Active Assignments ({homeworkList.length})
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>
        ) : homeworkList.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No homework assigned yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "Assign New Homework" to post your first task for today's periods.
            </p>
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-sm hover:bg-amber-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assign Homework</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Class & Bell</th>
                  <th className="py-3.5 px-4">Subject & Book</th>
                  <th className="py-3.5 px-4">Assignment Title & Details</th>
                  <th className="py-3.5 px-4">Assigned Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {homeworkList.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {h.className} {h.sectionName ? `(${h.sectionName})` : ""}
                        </p>
                        {h.bellNumber && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            <Clock className="h-3 w-3" />
                            Bell {h.bellNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {h.subject}
                        </span>
                        {h.bookName && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {h.bookName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{h.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{h.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {h.assignedDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                      {h.dueDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                        title="Delete assignment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Homework Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Assign Homework
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Post today's class assignment directly to students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHomework} className="space-y-4 text-xs">
              {/* Class & Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Class *
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSectionId("");
                      setSelectedBellId("");
                    }}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Section (Optional)
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">All Sections</option>
                    {availableSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Link to Timetable Bell */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Link to Timetable Bell / Period (Optional)
                </label>
                <select
                  value={selectedBellId}
                  onChange={(e) => handleBellChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="">-- No specific Bell linked --</option>
                  {classBells.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bell {b.bellNumber} ({b.startTime}-{b.endTime}): {b.subject} {b.bookName ? `[${b.bookName}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject & Book */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Book / Chapter (Optional)
                  </label>
                  <input
                    type="text"
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="e.g. NCERT Chapter 4"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Homework Title */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Homework Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Exercise 4.2 Questions 1 to 5"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Instructions / Description */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instructions & Description *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the homework assignment, page numbers, formulas, and submission requirements..."
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Assigned Date
                  </label>
                  <input
                    type="date"
                    value={assignedDate}
                    onChange={(e) => setAssignedDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold text-amber-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Posting..." : "Assign Homework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
