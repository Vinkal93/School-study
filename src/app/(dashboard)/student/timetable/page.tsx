"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Clock } from "lucide-react";

export default function StudentTimetablePage() {
  return (
    <StudentComingSoon
      title="Weekly Timetable"
      category="Academics"
      description="View full weekly class schedules, period timings, designated classrooms, and subject teacher assignments."
      icon={Clock}
      iconColor="text-teal-500 bg-teal-50 dark:bg-teal-950/40"
      features={[
        "Monday to Saturday interactive weekly timetable grid",
        "Classroom number and period breakdown",
        "Real-time substitute teacher alerts",
        "One-click timetable PDF export",
      ]}
    />
  );
}
