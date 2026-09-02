/**
 * GRANULAR PERMISSION SCHEMA & DICTIONARY
 * 
 * Defines hierarchical module -> page -> tab -> section -> action mappings.
 * Supports backward compatibility with legacy high-level feature keys.
 */

export type PermissionCategory = "module" | "page" | "tab" | "section" | "action";

export interface GranularPermissionDefinition {
  id: string;
  name: string;
  category: PermissionCategory;
  featureKey: string; // High-level parent key for backward compatibility
  parentKey?: string;
  description: string;
  defaultPlans: ("starter" | "professional" | "enterprise")[];
}

export const GRANULAR_PERMISSIONS: GranularPermissionDefinition[] = [
  // ==========================================
  // MODULE: STUDENT MANAGEMENT
  // ==========================================
  {
    id: "student_management",
    name: "Student Management Module",
    category: "module",
    featureKey: "student_management",
    description: "Complete student admissions, profile management, and directory access.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_page",
    name: "Students Directory Page",
    category: "page",
    featureKey: "student_management",
    parentKey: "student_management",
    description: "Access to the main student list and search view (/admin/students).",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_profile",
    name: "Student Profile View",
    category: "page",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "View detailed individual student profiles and academic history.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_tab_attendance",
    name: "Attendance History Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View individual student daily attendance logs and percentages.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_tab_fees",
    name: "Fees & Payment History Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View fee breakdown, invoice history, and fee status for a student.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "student_tab_documents",
    name: "Documents & Certificates Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View and upload student identity documents and certificates.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "student_action_add",
    name: "Enroll New Student",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Provision new student credentials and assign to class/section.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_action_edit",
    name: "Edit Student Profile",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Update student details, parent contact information, and photo.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "student_action_delete",
    name: "Delete / Deactivate Student",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Deactivate or remove student account from school records.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "student_action_export",
    name: "Export Student Roster",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Download student roster lists as CSV or Excel.",
    defaultPlans: ["professional", "enterprise"],
  },

  // ==========================================
  // MODULE: TEACHER MANAGEMENT
  // ==========================================
  {
    id: "teacher_management",
    name: "Teacher Management Module",
    category: "module",
    featureKey: "teacher_management",
    description: "Faculty onboarding, teacher account provisioning, and subject assignments.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "teacher_page",
    name: "Faculty Directory Page",
    category: "page",
    featureKey: "teacher_management",
    parentKey: "teacher_management",
    description: "Access to the faculty directory view (/admin/teachers).",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "teacher_action_add",
    name: "Add Faculty Member",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Create teacher account and generate login credentials.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "teacher_action_edit",
    name: "Edit Teacher Details",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Modify teacher profile, subjects taught, and contact details.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "teacher_action_assign",
    name: "Assign Class Teacher",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Assign class teacher responsibility for specific grades and sections.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "teacher_action_delete",
    name: "Deactivate / Delete Teacher",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Revoke teacher access and deactivate account.",
    defaultPlans: ["professional", "enterprise"],
  },

  // ==========================================
  // MODULE: CLASS & ACADEMIC MANAGEMENT
  // ==========================================
  {
    id: "class_management",
    name: "Class Management Module",
    category: "module",
    featureKey: "class_management",
    description: "Grade structures, section allocation, and academic session setup.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "class_page",
    name: "Classes Directory Page",
    category: "page",
    featureKey: "class_management",
    parentKey: "class_management",
    description: "Access to classes management view (/admin/classes).",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "class_tab_sections",
    name: "Sections Management Tab",
    category: "tab",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Create and manage class divisions (Section A, B, C).",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "class_tab_sessions",
    name: "Academic Session Management Tab",
    category: "tab",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Configure academic years (2026-27) and start/end dates.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "class_action_add",
    name: "Add New Class",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Define new class grade levels.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "class_action_edit",
    name: "Edit Class Info",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Update class ordering and display name.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "class_action_delete",
    name: "Delete Class",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Remove class and associated section records.",
    defaultPlans: ["professional", "enterprise"],
  },

  // ==========================================
  // MODULE: ATTENDANCE MANAGEMENT
  // ==========================================
  {
    id: "basic_attendance",
    name: "Attendance Management Module",
    category: "module",
    featureKey: "basic_attendance",
    description: "Daily attendance recording and attendance summary logs.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "attendance_page",
    name: "Daily Attendance Page",
    category: "page",
    featureKey: "basic_attendance",
    parentKey: "basic_attendance",
    description: "Access to daily attendance portal (/admin/attendance).",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "attendance_action_mark",
    name: "Mark & Submit Attendance",
    category: "action",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Record present/absent/late status for class students.",
    defaultPlans: ["starter", "professional", "enterprise"],
  },
  {
    id: "attendance_action_export",
    name: "Export Attendance Logs",
    category: "action",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Download attendance history records.",
    defaultPlans: ["professional", "enterprise"],
  },

  // ==========================================
  // MODULE: ADVANCED REPORTS
  // ==========================================
  {
    id: "advanced_reports",
    name: "Advanced Reports & Exports Module",
    category: "module",
    featureKey: "advanced_reports",
    description: "School analytics, attendance summaries, fee collection reports, and data exports.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "reports_page",
    name: "Reports Center Page",
    category: "page",
    featureKey: "advanced_reports",
    parentKey: "advanced_reports",
    description: "Access to reports dashboard (/admin/reports).",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "reports_tab_preview",
    name: "Live Report Preview Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Generate and view interactive data table previews on screen.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "reports_tab_export",
    name: "Data Export Center Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Export operational data as CSV, Excel, or PDF.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "reports_action_export",
    name: "Trigger Data Export Download",
    category: "action",
    featureKey: "advanced_reports",
    parentKey: "reports_tab_export",
    description: "Server-side export file compilation and download.",
    defaultPlans: ["professional", "enterprise"],
  },

  // ==========================================
  // MODULE: NOTICES & ANNOUNCEMENTS
  // ==========================================
  {
    id: "notices_announcements",
    name: "Notices & Announcements Module",
    category: "module",
    featureKey: "notices_announcements",
    description: "Broadcast circulars, target notices to students/teachers/parents.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "notices_page",
    name: "Notice Board Page",
    category: "page",
    featureKey: "notices_announcements",
    parentKey: "notices_announcements",
    description: "Access to notice board management (/admin/notices).",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "notice_action_publish",
    name: "Publish New Notice",
    category: "action",
    featureKey: "notices_announcements",
    parentKey: "notices_page",
    description: "Compose and publish circulars with target audience selection.",
    defaultPlans: ["professional", "enterprise"],
  },
  {
    id: "notice_action_delete",
    name: "Delete Notice",
    category: "action",
    featureKey: "notices_announcements",
    parentKey: "notices_page",
    description: "Remove published notices from student/teacher boards.",
    defaultPlans: ["professional", "enterprise"],
  }
];

/**
 * Returns default granular permissions for a given plan slug (starter, professional, enterprise).
 */
export function getDefaultGranularPermissionsForPlan(planSlug: string): Record<string, boolean> {
  const slug = planSlug.replace("plan_", "").toLowerCase() as "starter" | "professional" | "enterprise";
  const permissions: Record<string, boolean> = {};

  for (const item of GRANULAR_PERMISSIONS) {
    permissions[item.id] = item.defaultPlans.includes(slug);
  }

  return permissions;
}

/**
 * Maps any granular permission key or high-level feature key to its parent feature key.
 */
export function getParentFeatureKey(key: string): string {
  const found = GRANULAR_PERMISSIONS.find((p) => p.id === key);
  return found ? found.featureKey : key;
}
