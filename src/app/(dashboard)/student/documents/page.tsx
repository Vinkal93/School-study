"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Folder } from "lucide-react";

export default function StudentDocumentsPage() {
  return (
    <StudentComingSoon
      title="Student Documents"
      category="Academics"
      description="Secure digital repository for school ID cards, transfer certificates, birth certificates, and verification records."
      icon={Folder}
      iconColor="text-sky-500 bg-sky-50 dark:bg-sky-950/40"
      features={[
        "Cloud-verified student identity and enrollment documents",
        "Transfer certificate (TC) and character certificate requests",
        "Secure document download with QR-code verification",
        "Aadhaar / ID verification status tracker",
      ]}
    />
  );
}
