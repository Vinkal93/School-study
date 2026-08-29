"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { GraduationCap } from "lucide-react";

export default function StudentExamsPage() {
  return (
    <StudentComingSoon
      title="Exams & Report Cards"
      category="Academics"
      description="View upcoming examination schedules, downloadable admit cards, and digitized term-wise report cards."
      icon={GraduationCap}
      iconColor="text-blue-500 bg-blue-50 dark:bg-blue-950/40"
      features={[
        "Upcoming unit test & term examination datesheet",
        "Hall ticket & admit card download",
        "Digital marksheet and subject grade analytics",
        "Historical term-over-term performance graphs",
      ]}
    />
  );
}
