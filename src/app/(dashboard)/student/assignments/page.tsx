"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { FileText } from "lucide-react";

export default function StudentAssignmentsPage() {
  return (
    <StudentComingSoon
      title="Course Assignments"
      category="Academics"
      description="Access project assignments, download reference materials, upload your solutions, and view teacher evaluations."
      icon={FileText}
      iconColor="text-purple-500 bg-purple-50 dark:bg-purple-950/40"
      features={[
        "Term projects and subject assignment briefs",
        "Multiple file format uploads (PDF, DOCX, ZIP)",
        "Plagiarism checking & evaluation remarks",
        "Cumulative internal assessment score tracking",
      ]}
    />
  );
}
