"use client";

import { StudentComingSoon } from "@/components/student/StudentComingSoon";
import { Library as LibraryIcon } from "lucide-react";

export default function StudentLibraryPage() {
  return (
    <StudentComingSoon
      title="Digital Library"
      category="Academics"
      description="Explore the school library catalog, track borrowed books, check return due dates, and access digital e-books."
      icon={LibraryIcon}
      iconColor="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
      features={[
        "Online school book catalog search",
        "Active book issue history & return countdowns",
        "Book reservation and renewal requests",
        "Free digital curriculum e-books and study references",
      ]}
    />
  );
}
