"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Settings } from "lucide-react";

export default function StudentSettingsPage() {
  return (
    <StudentComingSoon
      title="Preferences & Settings"
      category="Account & Support"
      description="Manage account security, update parent contact details, switch app themes, and configure privacy preferences."
      icon={Settings}
      iconColor="text-slate-600 bg-slate-100 dark:bg-slate-800"
      features={[
        "Biometric & PIN security lock configuration",
        "Dark / Light theme customizer",
        "Language & regional font settings",
        "Password update and active session management",
      ]}
    />
  );
}
