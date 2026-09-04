"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  FileCheck,
  Plus,
  Calendar,
  Award,
  Users,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Save,
  X,
  ChevronRight,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  subscribeToTeacherTests,
  createTeacherTest,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import type { TeacherTest, StudentProfile, TestScore } from "@/types";
import { toast } from "sonner";

export default function TeacherTestsPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlClassId = searchParams.get("classId");
  const urlTestId = searchParams.get("testId");

  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [tests, setTests] = useState<TeacherTest[]>([]);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalClassId, setModalClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [syllabus, setSyllabus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Score Entry Modal / Drawer
  const [activeTestForMarks, setActiveTestForMarks] = useState<TeacherTest | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [loadingScores, setLoadingScores] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);

  // 1. Initial Load: Teacher Profile & Classes
  useEffect(() => {
    async function init() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setClasses(ctx.assignedClasses);
        const match = ctx.assignedClasses.find((c) => c.classId === urlClassId);
        if (match) {
          setSelectedClassId(match.classId);
        } else if (ctx.assignedClasses.length > 0) {
          setSelectedClassId(ctx.assignedClasses[0].classId);
        }
      } catch (err) {
        console.error("Failed to load teacher context:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail, urlClassId]);

  // 2. Real-time Subscription to Tests
  useEffect(() => {
    if (!schoolId) return;
    const unsub = subscribeToTeacherTests(schoolId, selectedClassId, (liveTests) => {
      setTests(liveTests);
      if (urlTestId && !activeTestForMarks) {
        const matched = liveTests.find((t) => t.id === urlTestId);
        if (matched) openMarksModal(matched);
      }
    });
    return () => unsub();
  }, [schoolId, selectedClassId, urlTestId]);

  // Open Score Entry Modal
  const openMarksModal = async (test: TeacherTest) => {
    setActiveTestForMarks(test);
    setLoadingScores(true);
    try {
      const db = getFirebaseDb();
      const [stuList, scoreSnap] = await Promise.all([
        getStudentsByClassAndSection(schoolId, test.classId, test.sectionId),
        getDocs(collection(db, "schools", schoolId, "tests", test.id, "scores")),
      ]);

      setStudents(stuList);
      const sMap: Record<string, number> = {};
      const fMap: Record<string, string> = {};

      scoreSnap.docs.forEach((d) => {
        const data = d.data();
        sMap[data.studentId] = data.marksObtained;
        if (data.feedback) fMap[data.studentId] = data.feedback;
      });

      setScoreMap(sMap);
      setFeedbackMap(fMap);
    } catch (err) {
      console.error("Failed to load test roster:", err);
      toast.error("Failed to load students for test.");
    } finally {
      setLoadingScores(false);
    }
  };

  // Create Test Submit
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) {
      toast.error("Please fill in test title and subject.");
      return;
    }

    const cls = classes.find((c) => c.classId === (modalClassId || selectedClassId));
    if (!cls) {
      toast.error("Please select a target class");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTeacherTest(schoolId, {
        schoolId,
        teacherId: teacherUid,
        classId: cls.classId,
        className: cls.className,
        sectionId: cls.sectionId,
        sectionName: cls.sectionName,
        subject: subject.trim(),
        title: title.trim(),
        maxMarks: Number(maxMarks) || 100,
        testDate,
        syllabus: syllabus.trim(),
      });

      toast.success("Test schedule created!");
      setShowCreateModal(false);
      setTitle("");
      setSyllabus("");
    } catch (err) {
      console.error("Failed to create test:", err);
      toast.error("Failed to create test");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Scores
  const handleSaveScores = async () => {
    if (!activeTestForMarks) return;
    setIsSavingScores(true);
    try {
      const db = getFirebaseDb();
      for (const stu of students) {
        const marks = scoreMap[stu.id] ?? 0;
        const feedback = feedbackMap[stu.id] || "";
        const scoreDocRef = doc(
          db,
          "schools",
          schoolId,
          "tests",
          activeTestForMarks.id,
          "scores",
          stu.id
        );

        await setDoc(scoreDocRef, {
          testId: activeTestForMarks.id,
          studentId: stu.id,
          studentName: stu.name,
          rollNumber: stu.rollNumber || null,
          marksObtained: marks,
          maxMarks: activeTestForMarks.maxMarks,
          feedback,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success("Test marks saved successfully!");
      setActiveTestForMarks(null);
    } catch (err) {
      console.error("Failed to save scores:", err);
      toast.error("Failed to save student scores.");
    } finally {
      setIsSavingScores(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Class Tests & Exam Marks
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Schedule upcoming unit tests, enter student scores, calculate percentages, and publish report grades.
            </p>
          </div>

          <button
            onClick={() => {
              setModalClassId(selectedClassId);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create New Test
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setSelectedClassId("")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedClassId === ""
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All Classes
        </button>
        {classes.map((cls) => {
          const isSelected = cls.classId === selectedClassId;
          return (
            <button
              key={cls.classId}
              onClick={() => setSelectedClassId(cls.classId)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cls.className} {cls.sectionName ? `(${cls.sectionName})` : ""}
            </button>
          );
        })}
      </div>

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
          <Award className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No tests created yet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;Create New Test&rdquo; to schedule a unit or monthly test for your students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                    {test.subject}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Max: {test.maxMarks} Marks
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
                  {test.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{test.className}</p>

                {test.syllabus && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    Syllabus: {test.syllabus}
                  </p>
                )}

                <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Test Date: {test.testDate}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => openMarksModal(test)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Enter / Edit Scores
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-rose-600" />
                Schedule New Test
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Classroom *
                </label>
                <select
                  value={modalClassId || selectedClassId}
                  onChange={(e) => setModalClassId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className} {c.sectionName ? `(${c.sectionName})` : ""} - {c.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Marks *
                  </label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit Test 2 - Organic Chemistry & Photosynthesis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Date *
                </label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Syllabus / Topics Covered
                </label>
                <textarea
                  rows={2}
                  placeholder="Chapters 3, 4 and formula definitions..."
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Test Scores Drawer / Modal */}
      {activeTestForMarks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 flex flex-col justify-between border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded uppercase">
                    {activeTestForMarks.subject}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    Enter Marks: {activeTestForMarks.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Max Marks: <strong className="text-slate-800 dark:text-slate-200">{activeTestForMarks.maxMarks}</strong> • Class: {activeTestForMarks.className}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTestForMarks(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Roster & Marks Input Table */}
              <div className="my-4 max-h-[55vh] overflow-y-auto">
                {loadingScores ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading class roster...
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    No students found enrolled in this class.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Roll</th>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">
                          Marks (Max {activeTestForMarks.maxMarks})
                        </th>
                        <th className="py-2.5 px-3">%</th>
                        <th className="py-2.5 px-3">Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {students.map((stu) => {
                        const marks = scoreMap[stu.id] ?? 0;
                        const pct = Math.round((marks / activeTestForMarks.maxMarks) * 100);

                        return (
                          <tr key={stu.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-extrabold">#{stu.rollNumber || "—"}</td>
                            <td className="py-2.5 px-3 font-semibold">{stu.name}</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min={0}
                                max={activeTestForMarks.maxMarks}
                                value={scoreMap[stu.id] ?? ""}
                                onChange={(e) => {
                                  const val = Math.min(
                                    activeTestForMarks.maxMarks,
                                    Math.max(0, Number(e.target.value))
                                  );
                                  setScoreMap((prev) => ({ ...prev, [stu.id]: val }));
                                }}
                                className="w-20 px-2 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-center"
                                placeholder="0"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-blue-600">{pct}%</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                placeholder="Optional note..."
                                value={feedbackMap[stu.id] || ""}
                                onChange={(e) =>
                                  setFeedbackMap((prev) => ({
                                    ...prev,
                                    [stu.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTestForMarks(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScores}
                disabled={isSavingScores}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSavingScores ? "Saving..." : "Save Scores"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
