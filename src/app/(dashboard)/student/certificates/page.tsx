"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Award } from "lucide-react";

export default function StudentCertificatesPage() {
  return (
    <StudentComingSoon
      title="Certificates & Achievements"
      category="Academics"
      description="View and download co-curricular awards, sports certificates, academic merit letters, and participation badges."
      icon={Award}
      iconColor="text-rose-500 bg-rose-50 dark:bg-rose-950/40"
      features={[
        "Official school achievement certificates with digital signature",
        "Sports day, Olympiad, and debate competition awards",
        "High-resolution printable PDF downloads",
        "Shareable student achievement portfolio link",
      ]}
    />
  );
}
