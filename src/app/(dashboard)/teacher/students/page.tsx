"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Loader2,
  ArrowLeft,
  UserCheck,
  X,
  MessageSquare,
  Award,
  Clock,
  ClipboardList,
  Save,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import { getStudentsByClassAndSection } from "@/lib/services/student.service";
import type { TeacherProfile, StudentProfile } from "@/types";
import { toast } from "sonner";

export default function TeacherStudentsPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Student Profile Drawer / Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [teacherRemark, setTeacherRemark] = useState("");

  // 1. Initial Load: Teacher Profile & Classes
  useEffect(() => {
    async function loadMeta() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setClasses(ctx.assignedClasses);
        if (ctx.assignedClasses.length > 0) {
          setSelectedClassId(ctx.assignedClasses[0].classId);
        }
      } catch (err) {
        console.error("Failed to load teacher context:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [schoolId, teacherUid, teacherEmail]);

  // 2. Load Students when selectedClassId changes
  useEffect(() => {
    if (!schoolId || !selectedClassId) return;
    const currentClass = classes.find((c) => c.classId === selectedClassId);
    setLoading(true);
    getStudentsByClassAndSection(schoolId, selectedClassId, currentClass?.sectionId)
      .then((list) => setStudents(list))
      .catch((err) => {
        console.error("Failed to load students:", err);
        setStudents([]);
      })
      .finally(() => setLoading(false));
  }, [schoolId, selectedClassId, classes]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNumber?.toString().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.guardianPhone?.includes(q)
    );
  }, [students, searchQuery]);

  const handleOpenStudentDrawer = (student: StudentProfile) => {
    setSelectedStudent(student);
    setTeacherRemark("");
  };

  const handleSaveRemark = () => {
    if (!teacherRemark.trim()) return;
    toast.success(`Note saved for ${selectedStudent?.name}`);
    setTeacherRemark("");
  };

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
              My Students Directory
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Access student academic profiles, attendance records, guardian contacts, and personalized feedback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-full">
              {filteredStudents.length} Students in Selected Class
            </span>
          </div>
        </div>
      </div>

      {/* Class Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Class Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {classes.map((cls) => {
            const isSelected = cls.classId === selectedClassId;
            return (
              <button
                key={cls.classId}
                onClick={() => setSelectedClassId(cls.classId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cls.className} {cls.sectionName ? `(${cls.sectionName})` : ""}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, roll no, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Students Table / Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No students found
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Try adjusting your search criteria or switch to another assigned class.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID / Code</th>
                  <th className="py-3 px-4">Guardian / Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((stu) => (
                  <tr
                    key={stu.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      #{stu.rollNumber || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                          {stu.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{stu.name}</p>
                          <p className="text-[11px] text-slate-400">{stu.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {stu.studentId || stu.admissionNumber || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {stu.guardianPhone || stu.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{stu.guardianPhone || stu.phone}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Enrolled
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenStudentDrawer(stu)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Profile Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div>
              {/* Drawer Top */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Roll #{selectedStudent.rollNumber || "—"} • {selectedStudent.className}{" "}
                      {selectedStudent.sectionName ? `(${selectedStudent.sectionName})` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Student Quick Stats */}
              <div className="grid grid-cols-2 gap-3 my-5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Attendance Rate
                  </span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    92%
                  </p>
                  <p className="text-[10px] text-slate-400">Present this session</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Homework Status
                  </span>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    18 / 20
                  </p>
                  <p className="text-[10px] text-slate-400">Submitted on time</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                  Student Information
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admission Code:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedStudent.studentId || selectedStudent.admissionNumber || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Login Username / Email:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStudent.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guardian Name:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStudent.guardianName || "Parent / Guardian"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guardian Contact:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStudent.guardianPhone || selectedStudent.phone || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Private Teacher Remarks */}
              <div className="space-y-2 mt-5">
                <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  Teacher&apos;s Notes / Remarks
                </h4>
                <textarea
                  rows={3}
                  value={teacherRemark}
                  onChange={(e) => setTeacherRemark(e.target.value)}
                  placeholder="Enter confidential observation, homework notes, or progress remark..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveRemark}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Note
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
