"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Bus } from "lucide-react";

export default function StudentTransportPage() {
  return (
    <StudentComingSoon
      title="Bus & Transport Tracking"
      category="School Services"
      description="Live GPS tracking of school buses, driver contact details, route stops, and pickup/drop arrival alerts."
      icon={Bus}
      iconColor="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
      features={[
        "Real-time GPS bus live location map",
        "Assigned route number and designated stop timings",
        "Bus driver and conductor verified contact info",
        "Estimated arrival time (ETA) push notifications",
      ]}
    />
  );
}
