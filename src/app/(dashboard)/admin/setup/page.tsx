"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2,
  Calendar,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getSchoolById } from "@/lib/services/school.service";
import {
  saveAcademicYear,
  saveClassesAndSections,
  saveInitialTeachers,
  saveInitialStudents,
  completeSchoolSetup,
} from "@/lib/services/setup.service";
import type { School } from "@/types";
import { toast } from "sonner";

interface ClassInput {
  name: string;
  sections: string[];
}

interface TeacherInput {
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
}

interface StudentInput {
  name: string;
  rollNumber?: string;
  classId: string;
  sectionId?: string;
  parentPhone?: string;
}

export default function SchoolSetupWizardPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 2: Academic Year
  const [academicYearName, setAcademicYearName] = useState("2025-2026");
  const [startDate, setStartDate] = useState("2025-04-01");
  const [endDate, setEndDate] = useState("2026-03-31");

  // Step 3: Classes & Sections
  const [classesList, setClassesList] = useState<ClassInput[]>([
    { name: "Class 1", sections: ["A", "B"] },
    { name: "Class 2", sections: ["A", "B"] },
    { name: "Class 3", sections: ["A", "B"] },
    { name: "Class 4", sections: ["A", "B"] },
    { name: "Class 5", sections: ["A", "B"] },
  ]);
  const [newClassName, setNewClassName] = useState("");

  // Step 4: Teachers
  const [teachersList, setTeachersList] = useState<TeacherInput[]>([
    { name: "", email: "", phone: "", subjects: [] },
  ]);

  // Step 5: Students
  const [studentsList, setStudentsList] = useState<StudentInput[]>([
    { name: "", rollNumber: "", classId: "Class 1", parentPhone: "" },
  ]);

  useEffect(() => {
    async function load() {
      if (profile?.schoolId) {
        const s = await getSchoolById(profile.schoolId);
        setSchool(s);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  // Helper to add class
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    setClassesList((prev) => [
      ...prev,
      { name: newClassName.trim(), sections: ["A"] },
    ]);
    setNewClassName("");
  };

  const handleRemoveClass = (index: number) => {
    setClassesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSection = (classIndex: number, sectionName: string) => {
    if (!sectionName.trim()) return;
    setClassesList((prev) =>
      prev.map((c, i) =>
        i === classIndex
          ? { ...c, sections: [...c.sections, sectionName.trim().toUpperCase()] }
          : c
      )
    );
  };

  const handleRemoveSection = (classIndex: number, secIndex: number) => {
    setClassesList((prev) =>
      prev.map((c, i) =>
        i === classIndex
          ? { ...c, sections: c.sections.filter((_, sIdx) => sIdx !== secIndex) }
          : c
      )
    );
  };

  // Helper for teachers
  const handleAddTeacherRow = () => {
    setTeachersList((prev) => [...prev, { name: "", email: "", phone: "", subjects: [] }]);
  };

  const handleRemoveTeacherRow = (index: number) => {
    setTeachersList((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper for students
  const handleAddStudentRow = () => {
    setStudentsList((prev) => [
      ...prev,
      { name: "", rollNumber: "", classId: classesList[0]?.name || "", parentPhone: "" },
    ]);
  };

  const handleRemoveStudentRow = (index: number) => {
    setStudentsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Complete setup handler
  const handleCompleteSetup = async () => {
    if (!profile?.schoolId) {
      toast.error("School context missing.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save Academic Year
      await saveAcademicYear(profile.schoolId, {
        name: academicYearName,
        startDate,
        endDate,
      });

      // 2. Save Classes & Sections
      if (classesList.length > 0) {
        await saveClassesAndSections(profile.schoolId, classesList);
      }

      // 3. Save initial teachers (filter non-empty)
      const validTeachers = teachersList.filter((t) => t.name.trim() && t.email.trim());
      if (validTeachers.length > 0) {
        await saveInitialTeachers(profile.schoolId, validTeachers);
      }

      // 4. Save initial students (filter non-empty)
      const validStudents = studentsList.filter((s) => s.name.trim());
      if (validStudents.length > 0) {
        await saveInitialStudents(profile.schoolId, validStudents);
      }

      // 5. Mark school setup completed
      await completeSchoolSetup(profile.schoolId);

      toast.success("School setup completed successfully! Welcome to your dashboard.");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize school setup.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const steps = [
    { number: 1, title: "School Info", icon: <Building2 className="h-4 w-4" /> },
    { number: 2, title: "Academic Year", icon: <Calendar className="h-4 w-4" /> },
    { number: 3, title: "Classes & Sections", icon: <BookOpen className="h-4 w-4" /> },
    { number: 4, title: "Teachers (Optional)", icon: <Users className="h-4 w-4" /> },
    { number: 5, title: "Students (Optional)", icon: <GraduationCap className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Wizard Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
          <Sparkles className="h-4 w-4" />
          <span>INITIAL SCHOOL ONBOARDING WIZARD</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configure {school?.name || "Your School"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Complete these simple setup steps to get your school portal ready. You can also skip optional steps and add records later.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s) => (
            <button
              key={s.number}
              onClick={() => setCurrentStep(s.number)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                currentStep === s.number
                  ? "bg-blue-600 text-white"
                  : currentStep > s.number
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {currentStep > s.number ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.icon}
              <span>{s.number}. {s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Contents */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 space-y-6">
        {/* STEP 1: School Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 1: Verify School Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Review the core information provisioned by the Super Admin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">School Name</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {school?.name || "—"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">School Code</span>
                <p className="font-semibold font-mono text-gray-900 dark:text-white mt-1">
                  {school?.code || "—"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">Location</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {school?.city ? `${school.city}, ${school.state || ""}` : "Not specified"}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <span className="text-xs text-gray-500 dark:text-gray-400">Primary Contact</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-1">
                  {school?.email || school?.phone || "—"}
                </p>
              </div>
            </div>

            {school?.logoUrl && (
              <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <img src={school.logoUrl} alt="Logo" className="h-12 w-12 rounded object-contain" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">School Logo</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Uploaded & Configured</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Proceed to Academic Year
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Academic Year */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 2: Academic Year Configuration
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set up the active academic session for student attendance and records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  required
                  value={academicYearName}
                  onChange={(e) => setAcademicYearName(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Proceed to Classes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Classes & Sections */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Step 3: Classes & Sections Setup
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Define the grades/classes offered by your school and their sections.
              </p>
            </div>

            {/* Add class input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Enter class name (e.g. Class 6 or Grade 10)..."
                className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddClass}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Class
              </button>
            </div>

            {/* List of classes */}
            <div className="space-y-3">
              {classesList.map((cls, cIdx) => (
                <div
                  key={cIdx}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/30"
                >
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {cls.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-gray-500 mr-1">Sections:</span>
                      {cls.sections.map((sec, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {sec}
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(cIdx, sIdx)}
                            className="text-blue-500 hover:text-blue-700 font-bold ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const nextLetter = String.fromCharCode(65 + cls.sections.length);
                          handleAddSection(cIdx, nextLetter);
                        }}
                        className="rounded border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:border-blue-500 hover:text-blue-600"
                      >
                        + Add Section
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cIdx)}
                    className="self-end sm:self-center text-red-500 hover:text-red-700 p-1 rounded"
                    title="Remove class"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Proceed to Teachers
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Teachers (Optional) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Step 4: Teachers Onboarding (Optional)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Add your initial faculty members now or add them later from the dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Skip this step →
              </button>
            </div>

            <div className="space-y-3">
              {teachersList.map((t, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 items-center"
                >
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeachersList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                      );
                    }}
                    placeholder="Teacher full name"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <input
                    type="email"
                    value={t.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeachersList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, email: val } : item))
                      );
                    }}
                    placeholder="Teacher email"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={t.phone || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTeachersList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, phone: val } : item))
                        );
                      }}
                      placeholder="Phone (optional)"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    {teachersList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeacherRow(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTeacherRow}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Teacher
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Proceed to Students
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Students (Optional) & Finish */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Step 5: Students Onboarding (Optional)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Enroll initial students or finalize setup now and add students later.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {studentsList.map((s, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 items-center"
                >
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentsList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                      );
                    }}
                    placeholder="Student full name"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={s.rollNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentsList((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, rollNumber: val } : item))
                      );
                    }}
                    placeholder="Roll Number (e.g. 101)"
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={s.parentPhone || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudentsList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, parentPhone: val } : item))
                        );
                      }}
                      placeholder="Parent Phone"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    {studentsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStudentRow(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddStudentRow}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Student
              </button>
            </div>

            {/* Finish Card */}
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Ready to Complete Setup!
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Clicking below will save your Academic Session, Classes, and Members, and activate your School Admin workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizing School Setup...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Setup & Launch Dashboard
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
