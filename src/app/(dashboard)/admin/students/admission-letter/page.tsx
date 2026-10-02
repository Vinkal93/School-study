"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Share2,
  Copy,
  Search,
  ArrowLeft,
  CheckCircle2,
  School,
  Calendar,
  User,
  ShieldCheck,
  Download,
  Check,
} from "lucide-react";

function AdmissionLetterContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const schoolName = profile?.schoolName || "Global Public Academy";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";

  const { data: cachedStudents, isLoading } = useAppQuery<StudentProfile[]>(
    isQueryEnabled ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: isQueryEnabled, staleTime: 30_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);

  // Selected Student
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [studentSearch, setStudentSearch] = useState("");

  // Letter Customization Options
  const [refNumber, setRefNumber] = useState(`ADM/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportingDate, setReportingDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [academicSession, setAcademicSession] = useState("2026 - 2027");
  const [signatoryName, setSignatoryName] = useState("Dr. R. K. Mukherjee");
  const [signatoryTitle, setSignatoryTitle] = useState("Principal / Head of Institution");
  const [copied, setCopied] = useState(false);

  // If initialStudentId is passed in URL query, select it once students load
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const match = students.find(
        (s) => s.id === initialStudentId || s.studentId === initialStudentId
      );
      if (match) {
        setSelectedStudentId(match.id);
      }
    } else if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [initialStudentId, students, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!activeStudent) return;
    const text = `PROVISIONAL ADMISSION LETTER\n${schoolName}\nRef: ${refNumber}\nDate: ${issueDate}\n\nDear Parent,\nWe are pleased to confirm the admission of ${activeStudent.name} into ${activeStudent.className} (${activeStudent.sectionName}) for the Academic Session ${academicSession}.\nStudent ID: ${activeStudent.studentId || activeStudent.id}\nReporting Date: ${reportingDate}\n\nAuthorized Signatory:\n${signatoryName}\n${signatoryTitle}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Letter summary copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumbs (Hidden when printing) */}
      <div className="print:hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/students" className="hover:text-blue-600 transition">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200 font-semibold">
              Admission Letter
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FileText className="h-6 w-6" />
            </div>
            Admission Letter & Certificate Generator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate and print official institutional admission letters on school letterhead for newly enrolled students.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Students</span>
          </Link>
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>Copy Text</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official Letter</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (Hidden on Print), Right A4 Document View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Options / Config Column (Hidden when printing) */}
        <div className="print:hidden lg:col-span-4 space-y-5">
          {/* Select Student Box */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span>1. Select Student</span>
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {students
                .filter((s) => {
                  const q = studentSearch.toLowerCase().trim();
                  return (
                    !q ||
                    (s.name && String(s.name).toLowerCase().includes(q)) ||
                    (s.studentId && String(s.studentId).toLowerCase().includes(q)) ||
                    (s.className && String(s.className).toLowerCase().includes(q))
                  );
                })
                .slice(0, 15)
                .map((student) => {
                  const isSelected = activeStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                        isSelected
                          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold"
                          : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div>
                        <div>{student.name}</div>
                        <div className="text-[11px] text-gray-400 font-normal">
                          {student.className} - {student.sectionName} • ID: {student.studentId || student.id.slice(0, 6)}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Letter Settings Box */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>2. Letter Details</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Letter Reference Number
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Reporting / Orientation Date
                </label>
                <input
                  type="date"
                  value={reportingDate}
                  onChange={(e) => setReportingDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Academic Session
                </label>
                <input
                  type="text"
                  value={academicSession}
                  onChange={(e) => setAcademicSession(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Signatory Authority Name
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Signatory Designation
                </label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right A4 Printable Sheet Document Preview */}
        <div className="lg:col-span-8 flex justify-center">
          <div
            id="printable-admission-letter"
            className="w-full max-w-3xl bg-white text-gray-900 p-8 sm:p-12 rounded-2xl border border-gray-200 shadow-lg print:shadow-none print:border-none print:m-0 print:p-8 print:w-full"
            style={{ minHeight: "297mm" }}
          >
            {/* School Official Header */}
            <div className="text-center pb-6 border-b-2 border-gray-900">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xl">
                  {schoolName.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-wide text-gray-900 uppercase">
                    {schoolName}
                  </h1>
                  <p className="text-[11px] text-gray-600 tracking-wider uppercase font-semibold">
                    Recognized Institution • Affiliated to CBSE / State Board
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Institutional Campus, Civil Lines, Contact: +91 98765 43210 • admissions@{schoolId || "school"}.edu
              </p>
            </div>

            {/* Letter Title Banner */}
            <div className="text-center my-6">
              <span className="inline-block px-4 py-1.5 rounded-md bg-gray-100 text-gray-900 font-bold text-sm tracking-wider uppercase border border-gray-300">
                Official Letter of Provisional Admission
              </span>
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center justify-between text-xs text-gray-600 mb-6 font-mono border-b border-gray-200 pb-3">
              <div>
                <strong>Ref No:</strong> {refNumber}
              </div>
              <div>
                <strong>Date:</strong> {issueDate}
              </div>
            </div>

            {/* Salutation */}
            {activeStudent ? (
              <div className="space-y-5 text-sm leading-relaxed text-gray-800">
                <p>
                  To,<br />
                  <strong>The Parents / Guardian of {activeStudent.name}</strong><br />
                  {activeStudent.address || "Institutional Resident Area"}
                </p>

                <p>
                  Dear Parent / Guardian,
                </p>

                <p>
                  We are pleased to inform you that following the review of your application, <strong>{activeStudent.name}</strong> has been offered provisional admission to <strong>{schoolName}</strong> for the upcoming <strong>Academic Session {academicSession}</strong>.
                </p>

                {/* Candidate Particulars Table */}
                <div className="my-4 rounded-xl border border-gray-300 overflow-hidden text-xs">
                  <div className="bg-gray-100 px-4 py-2 font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300">
                    Candidate Enrollment Particulars
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3">
                      <span className="text-gray-500 block">Student Full Name:</span>
                      <strong className="text-sm text-gray-900">{activeStudent.name}</strong>
                    </div>
                    <div className="p-3">
                      <span className="text-gray-500 block">Student ID Number:</span>
                      <strong className="text-sm font-mono text-blue-700">
                        {activeStudent.studentId || activeStudent.admissionNumber || activeStudent.id}
                      </strong>
                    </div>
                    <div className="p-3">
                      <span className="text-gray-500 block">Class & Section:</span>
                      <strong className="text-sm text-gray-900">
                        {activeStudent.className} - {activeStudent.sectionName}
                      </strong>
                    </div>
                    <div className="p-3">
                      <span className="text-gray-500 block">Assigned Roll Number:</span>
                      <strong className="text-sm font-mono text-gray-900">
                        #{activeStudent.rollNumber ?? "Auto-assigned"}
                      </strong>
                    </div>
                    <div className="p-3">
                      <span className="text-gray-500 block">Father / Guardian Name:</span>
                      <strong className="text-sm text-gray-900">
                        {activeStudent.fatherName || activeStudent.guardianName || "N/A"}
                      </strong>
                    </div>
                    <div className="p-3">
                      <span className="text-gray-500 block">Registered Phone:</span>
                      <strong className="text-sm font-mono text-gray-900">
                        {activeStudent.guardianPhone || activeStudent.phone || "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Terms and Instructions */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900">
                    Instructions & Reporting Schedule:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 pl-1">
                    <li>
                      <strong>Orientation & Campus Reporting:</strong> The candidate is expected to report to campus on <strong>{reportingDate}</strong> at 08:30 AM in full school uniform.
                    </li>
                    <li>
                      <strong>Required Document Verification:</strong> Please bring the original Transfer Certificate (TC), verified Birth Certificate, 4 passport-size photographs, and Aadhaar card copy to the admissions desk.
                    </li>
                    <li>
                      <strong>School Portal Access:</strong> Credentials for homework, attendance, and fee receipts have been provisioned and can be accessed at the school web portal.
                    </li>
                  </ul>
                </div>

                <p className="pt-2">
                  We look forward to welcoming {activeStudent.name} into our academic family and partnering with you in their holistic growth and excellence.
                </p>

                {/* Signatory Section */}
                <div className="mt-14 pt-6 flex items-end justify-between border-t border-gray-200">
                  <div className="text-center">
                    <div className="h-16 w-32 border border-dashed border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400 font-mono mb-1">
                      [Institutional Seal]
                    </div>
                    <span className="text-[11px] text-gray-500">Official Stamp</span>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="h-12 w-40 ml-auto border-b border-gray-800 flex items-end justify-center pb-1 font-serif italic text-gray-700">
                      {signatoryName}
                    </div>
                    <div className="font-bold text-xs text-gray-900">{signatoryName}</div>
                    <div className="text-[11px] text-gray-600">{signatoryTitle}</div>
                    <div className="text-[10px] text-gray-500">{schoolName}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400">
                Please select a student from the sidebar to preview the admission letter.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdmissionLetterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Admission Letter Generator...</div>}>
      <AdmissionLetterContent />
    </Suspense>
  );
}
