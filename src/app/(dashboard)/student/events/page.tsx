"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Calendar } from "lucide-react";

export default function StudentEventsPage() {
  return (
    <StudentComingSoon
      title="School Events & Calendar"
      category="School Services"
      description="Stay updated with school annual functions, sports meets, parent-teacher meetings, holidays, and celebrations."
      icon={Calendar}
      iconColor="text-orange-500 bg-orange-50 dark:bg-orange-950/40"
      features={[
        "Annual academic and cultural activity calendar",
        "Upcoming PTM and parent event schedules",
        "Event registration and participation sign-ups",
        "Sync events directly with Google Calendar",
      ]}
    />
  );
}
