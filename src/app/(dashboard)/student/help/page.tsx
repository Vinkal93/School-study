"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { HelpCircle } from "lucide-react";

export default function StudentHelpPage() {
  return (
    <StudentComingSoon
      title="Help & Student Support"
      category="Account & Support"
      description="Instant helpdesk assistance, FAQs, direct school administration helpline, and ticketing support."
      icon={HelpCircle}
      iconColor="text-blue-500 bg-blue-50 dark:bg-blue-950/40"
      features={[
        "Instant student portal FAQ guide",
        "Direct school admin & class teacher contact directory",
        "Submit support tickets for technical or fee issues",
        "Emergency SOS & helpline contacts",
      ]}
    />
  );
}
