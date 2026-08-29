"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { BellRing } from "lucide-react";

export default function StudentNotificationsPage() {
  return (
    <StudentComingSoon
      title="Notification Center"
      category="Account & Support"
      description="Centralized inbox for fee reminders, attendance alerts, exam announcements, and school administrative messages."
      icon={BellRing}
      iconColor="text-rose-500 bg-rose-50 dark:bg-rose-950/40"
      features={[
        "Real-time push notifications for important notices",
        "Categorized tabs: Fees, Attendance, Academics, General",
        "Mark as read and custom reminder snoozing",
        "WhatsApp / SMS delivery preference controls",
      ]}
    />
  );
}
