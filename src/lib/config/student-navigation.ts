/**
 * Centralized Student Navigation Configuration (Sections 16 & 17)
 */

export interface StudentNavItem {
  id: string;
  label: string;
  icon: "home" | "study" | "attendance" | "fees" | "more" | "homework" | "exams" | "notices" | "timetable" | "library" | "profile" | "settings" | "help";
  route: string;
  moduleKey?: string;
  badgeCount?: number;
}

export const STUDENT_BOTTOM_NAV_ITEMS: StudentNavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    route: "/student",
  },
  {
    id: "study",
    label: "Study",
    icon: "study",
    route: "/student/study",
    moduleKey: "study",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: "attendance",
    route: "/student/attendance",
    moduleKey: "attendance",
  },
  {
    id: "fees",
    label: "Fees",
    icon: "fees",
    route: "/student/fees",
    moduleKey: "fees",
  },
  {
    id: "more",
    label: "More",
    icon: "more",
    route: "/student/more",
  },
];

export const STUDENT_MORE_MODULES = {
  academics: [
    { id: "study", label: "Study Material", icon: "study" as const, route: "/student/study", moduleKey: "study" },
    { id: "homework", label: "Homework", icon: "homework" as const, route: "/student/homework", moduleKey: "homework" },
    { id: "exams", label: "Exams & Results", icon: "exams" as const, route: "/student/exams", moduleKey: "exams" },
    { id: "timetable", label: "Class Timetable", icon: "timetable" as const, route: "/student/timetable", moduleKey: "timetable" },
    { id: "library", label: "Digital Library", icon: "library" as const, route: "/student/library", moduleKey: "library" },
  ],
  school: [
    { id: "notices", label: "Notices & Announcements", icon: "notices" as const, route: "/student/notices", moduleKey: "notices" },
    { id: "attendance", label: "Attendance History", icon: "attendance" as const, route: "/student/attendance", moduleKey: "attendance" },
    { id: "fees", label: "Fees & Payment Receipts", icon: "fees" as const, route: "/student/fees", moduleKey: "fees" },
  ],
  account: [
    { id: "profile", label: "My Student Profile", icon: "profile" as const, route: "/student/profile" },
    { id: "settings", label: "Account Settings", icon: "settings" as const, route: "/student/settings" },
    { id: "help", label: "Help & Support", icon: "help" as const, route: "/contact" },
  ],
};
