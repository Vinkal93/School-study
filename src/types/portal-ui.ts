/**
 * PORTAL UI/UX VERSION SWITCHING TYPES
 * 
 * Supports independent versioning between "classic" (stable production)
 * and "new" (Modern UI 2.0) across all 4 portal tiers.
 */

export type PortalUIVersion = "classic" | "new";

export type PortalKey = "schoolAdmin" | "teacher" | "student" | "superAdmin";

export interface PortalUIHistoryItem {
  id: string;
  portal: PortalKey;
  from: PortalUIVersion;
  to: PortalUIVersion;
  changedAt: string;
  changedByUid: string;
  changedByName: string;
}

export interface PortalUISettings {
  schoolAdmin: PortalUIVersion;
  teacher: PortalUIVersion;
  student: PortalUIVersion;
  superAdmin: PortalUIVersion;
  updatedAt?: any;
  updatedByUid?: string;
  updatedByName?: string;
  history?: PortalUIHistoryItem[];
}

export const DEFAULT_PORTAL_UI_SETTINGS: PortalUISettings = {
  schoolAdmin: "classic",
  teacher: "classic",
  student: "classic",
  superAdmin: "classic",
  history: [],
};

export interface PortalMetaInfo {
  key: PortalKey;
  label: string;
  description: string;
  routePrefix: string;
  role: string;
}

export const PORTAL_LIST: PortalMetaInfo[] = [
  {
    key: "schoolAdmin",
    label: "School Admin Portal",
    description: "Administration dashboard, admissions, fee management, timetables & staff oversight.",
    routePrefix: "/admin",
    role: "school_admin",
  },
  {
    key: "teacher",
    label: "Teacher Portal",
    description: "Classroom attendance, daily homework posting, student roll books & syllabus progress.",
    routePrefix: "/teacher",
    role: "teacher",
  },
  {
    key: "student",
    label: "Student Portal",
    description: "Student dashboard, real-time timetable, attendance logs, fee receipts & homework tasks.",
    routePrefix: "/student",
    role: "student",
  },
  {
    key: "superAdmin",
    label: "Super Admin Portal",
    description: "Global SaaS multi-tenant controls, school subscriptions, billing, analytics & platform security.",
    routePrefix: "/super-admin",
    role: "super_admin",
  },
];
