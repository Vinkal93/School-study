"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { ClipboardList } from "lucide-react";

export default function StudentHomeworkPage() {
  return (
    <StudentComingSoon
      title="Daily Homework"
      category="Academics"
      description="Track daily homework assignments, teacher notes, submission deadlines, and instant completion verification."
      icon={ClipboardList}
      iconColor="text-amber-500 bg-amber-50 dark:bg-amber-950/40"
      features={[
        "Subject-wise homework tasks with due dates",
        "Direct PDF / image submission attachment",
        "Teacher feedback and grading status",
        "Instant reminder notifications before submission",
      ]}
    />
  );
}
