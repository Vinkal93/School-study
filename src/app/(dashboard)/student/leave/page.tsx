"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { FileSpreadsheet } from "lucide-react";

export default function StudentLeavePage() {
  return (
    <StudentComingSoon
      title="Apply Leave & Excuses"
      category="School Services"
      description="Submit leave applications directly to class teachers, attach medical certificates, and track approval status."
      icon={FileSpreadsheet}
      iconColor="text-teal-500 bg-teal-50 dark:bg-teal-950/40"
      features={[
        "Online student leave application form with reason selection",
        "Medical certificate & prescription attachment",
        "Class teacher review, comment & approval notifications",
        "Total leave balance and annual absence history",
      ]}
    />
  );
}
