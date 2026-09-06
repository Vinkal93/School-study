/**
 * GRANULAR CAPABILITY SCHEMA & HIERARCHICAL REGISTRY
 * 
 * Defines hierarchical module -> page -> tab -> section -> action -> export -> limit mappings.
 * Supports backward compatibility with legacy high-level feature keys and dot-notation keys.
 */

import type { PermissionCategory } from "@/types/billing";

export type { PermissionCategory };

export interface GranularPermissionDefinition {
  id: string;
  name: string;
  category: PermissionCategory;
  featureKey: string; // High-level parent module key for backward compatibility
  parentKey?: string;
  description: string;
  defaultPlans: ("starter" | "professional" | "enterprise")[];
  aliases?: string[];
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
    aliases: ["students", "student_portal"],
  },
  {
    id: "student_page",
    name: "Students Directory Page",
    category: "page",
    featureKey: "student_management",
    parentKey: "student_management",
    description: "Access to the main student list and search view (/admin/students).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["students.page", "students.directory"],
  },
  {
    id: "student_profile",
    name: "Student Profile View",
    category: "page",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "View detailed individual student profiles and academic history.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["students.profile"],
  },
  {
    id: "student_tab_attendance",
    name: "Attendance History Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View individual student daily attendance logs and percentages.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["students.tab_attendance"],
  },
  {
    id: "student_tab_fees",
    name: "Fees & Payment History Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View fee breakdown, invoice history, and fee status for a student.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["students.tab_fees"],
  },
  {
    id: "student_tab_documents",
    name: "Documents & Certificates Tab",
    category: "tab",
    featureKey: "student_management",
    parentKey: "student_profile",
    description: "View and upload student identity documents and certificates.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["students.tab_documents"],
  },
  {
    id: "student_action_add",
    name: "Enroll New Student",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Provision new student credentials and assign to class/section.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["students.add", "students.create"],
  },
  {
    id: "student_action_edit",
    name: "Edit Student Profile",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Update student details, parent contact information, and photo.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["students.edit", "students.update"],
  },
  {
    id: "student_action_delete",
    name: "Delete / Deactivate Student",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Deactivate or remove student account from school records.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["students.delete", "students.deactivate"],
  },
  {
    id: "student_action_import",
    name: "Bulk Import Students",
    category: "action",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Batch import student rosters via CSV or spreadsheet.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["students.import"],
  },
  {
    id: "student_action_export",
    name: "Export Student Roster",
    category: "export",
    featureKey: "student_management",
    parentKey: "student_page",
    description: "Download student roster lists as CSV or Excel.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["students.export"],
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
    aliases: ["teachers", "teacher_portal"],
  },
  {
    id: "teacher_page",
    name: "Faculty Directory Page",
    category: "page",
    featureKey: "teacher_management",
    parentKey: "teacher_management",
    description: "Access to the faculty directory view (/admin/teachers).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["teachers.page", "teachers.directory"],
  },
  {
    id: "teacher_profile",
    name: "Faculty Profile View",
    category: "page",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "View teacher credentials, timetable assignments, and workload.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["teachers.profile"],
  },
  {
    id: "teacher_action_add",
    name: "Add Faculty Member",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Create teacher account and generate login credentials.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["teachers.add", "teachers.create"],
  },
  {
    id: "teacher_action_edit",
    name: "Edit Teacher Details",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Modify teacher profile, subjects taught, and contact details.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["teachers.edit", "teachers.update"],
  },
  {
    id: "teacher_action_assign",
    name: "Assign Class Teacher",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Assign class teacher responsibility for specific grades and sections.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["teachers.assign"],
  },
  {
    id: "teacher_action_suspend",
    name: "Suspend Faculty Account",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Temporarily suspend teacher portal login access.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["teachers.suspend"],
  },
  {
    id: "teacher_action_delete",
    name: "Deactivate / Delete Teacher",
    category: "action",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Revoke teacher access and deactivate account.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["teachers.delete", "teachers.deactivate"],
  },
  {
    id: "teacher_action_export",
    name: "Export Faculty Directory",
    category: "export",
    featureKey: "teacher_management",
    parentKey: "teacher_page",
    description: "Download faculty directory in CSV or Excel.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["teachers.export"],
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
    aliases: ["classes"],
  },
  {
    id: "class_page",
    name: "Classes Directory Page",
    category: "page",
    featureKey: "class_management",
    parentKey: "class_management",
    description: "Access to classes management view (/admin/classes).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["classes.page"],
  },
  {
    id: "class_tab_sections",
    name: "Sections Management Tab",
    category: "tab",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Create and manage class divisions (Section A, B, C).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["classes.tab_sections"],
  },
  {
    id: "class_tab_sessions",
    name: "Academic Session Management Tab",
    category: "tab",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Configure academic years (2026-27) and start/end dates.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["classes.tab_sessions"],
  },
  {
    id: "class_action_add",
    name: "Add New Class",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Define new class grade levels.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["classes.add", "classes.create"],
  },
  {
    id: "class_action_edit",
    name: "Edit Class Info",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Update class ordering and display name.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["classes.edit", "classes.update"],
  },
  {
    id: "class_action_delete",
    name: "Delete Class",
    category: "action",
    featureKey: "class_management",
    parentKey: "class_page",
    description: "Remove class and associated section records.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["classes.delete"],
  },

  // ==========================================
  // MODULE: TIMETABLE & BELL AUTOMATION
  // ==========================================
  {
    id: "timetable_bells",
    name: "Timetable & Bell Automation Module",
    category: "module",
    featureKey: "timetable_bells",
    description: "Schedule period routines, teacher slots, and automatic bell chimes.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["timetable", "schedule"],
  },
  {
    id: "timetable_page",
    name: "Timetable Management Page",
    category: "page",
    featureKey: "timetable_bells",
    parentKey: "timetable_bells",
    description: "Access to the timetable scheduler (/admin/timetable).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["timetable.page"],
  },
  {
    id: "timetable_create_slot",
    name: "Create Timetable Slot",
    category: "action",
    featureKey: "timetable_bells",
    parentKey: "timetable_page",
    description: "Create period slots with assigned subjects and teachers.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["timetable.create_slot", "timetable.add"],
  },
  {
    id: "timetable_edit_slot",
    name: "Edit Timetable Slot",
    category: "action",
    featureKey: "timetable_bells",
    parentKey: "timetable_page",
    description: "Modify slot timing, teacher reassignment, or subject.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["timetable.edit_slot", "timetable.edit"],
  },
  {
    id: "timetable_delete_slot",
    name: "Delete Timetable Slot",
    category: "action",
    featureKey: "timetable_bells",
    parentKey: "timetable_page",
    description: "Delete slot or clear weekly routine.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["timetable.delete_slot", "timetable.delete"],
  },
  {
    id: "timetable_bells_automation",
    name: "Automated Bell Schedule",
    category: "action",
    featureKey: "timetable_bells",
    parentKey: "timetable_page",
    description: "Automatic bell triggers for period starts, intervals, and dispersal.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["timetable.bells_automation", "bells.automation"],
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
    aliases: ["attendance", "attendance_automation"],
  },
  {
    id: "attendance_page",
    name: "Daily Attendance Page",
    category: "page",
    featureKey: "basic_attendance",
    parentKey: "basic_attendance",
    description: "Access to daily attendance portal (/admin/attendance).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["attendance.page"],
  },
  {
    id: "attendance_action_mark",
    name: "Mark & Submit Attendance",
    category: "action",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Record present/absent/late status for class students.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["attendance.mark", "attendance.submit"],
  },
  {
    id: "attendance_action_edit",
    name: "Edit Past Attendance Record",
    category: "action",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Update previously submitted attendance records.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["attendance.edit", "attendance.update"],
  },
  {
    id: "attendance_action_automation",
    name: "Automated Attendance Aggregates",
    category: "action",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Automated monthly attendance percentage calculation & alert triggers.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["attendance.automation"],
  },
  {
    id: "attendance_action_export",
    name: "Export Attendance Logs",
    category: "export",
    featureKey: "basic_attendance",
    parentKey: "attendance_page",
    description: "Download attendance history records.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["attendance.export", "attendance.export_csv"],
  },

  // ==========================================
  // MODULE: ADVANCED REPORTS
  // ==========================================
  {
    id: "advanced_reports",
    name: "Advanced Reports & Analytics Module",
    category: "module",
    featureKey: "advanced_reports",
    description: "School analytics, attendance summaries, fee collection reports, and data exports.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports", "reports_export", "analytics"],
  },
  {
    id: "reports_page",
    name: "Reports Center Page",
    category: "page",
    featureKey: "advanced_reports",
    parentKey: "advanced_reports",
    description: "Access to reports dashboard (/admin/reports).",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.page"],
  },
  {
    id: "reports_tab_preview",
    name: "Live Report Preview Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Generate and view interactive data table previews on screen.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.tab_preview", "reports.tab_overview"],
  },
  {
    id: "reports_tab_export",
    name: "Data Export Center Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Export operational data as CSV, Excel, or PDF.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.tab_export"],
  },
  {
    id: "reports_tab_attendance",
    name: "Attendance Reports Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Class-wise, student-wise, and teacher-wise attendance analytics.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.tab_attendance"],
  },
  {
    id: "reports_tab_fees",
    name: "Fee Collection Analytics Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Revenue trends, head-wise collections, and outstanding dues breakdown.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.tab_fees"],
  },
  {
    id: "reports_tab_analytics",
    name: "Institutional Analytics Tab",
    category: "tab",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Academic year performance charts and student growth metrics.",
    defaultPlans: ["enterprise"],
    aliases: ["reports.tab_analytics"],
  },
  {
    id: "reports_action_generate",
    name: "Generate Custom Report",
    category: "action",
    featureKey: "advanced_reports",
    parentKey: "reports_page",
    description: "Execute complex filter queries across institutional datasets.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.generate"],
  },
  {
    id: "reports_action_export_csv",
    name: "Export CSV Report",
    category: "export",
    featureKey: "advanced_reports",
    parentKey: "reports_tab_export",
    description: "Download report datasets in raw CSV format.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.export_csv", "reports.export"],
  },
  {
    id: "reports_action_export_xlsx",
    name: "Export Excel (XLSX) Report",
    category: "export",
    featureKey: "advanced_reports",
    parentKey: "reports_tab_export",
    description: "Download styled Excel spreadsheet reports with summary headers.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["reports.export_xlsx"],
  },
  {
    id: "reports_action_export_pdf",
    name: "Export PDF Document",
    category: "export",
    featureKey: "advanced_reports",
    parentKey: "reports_tab_export",
    description: "Download official printable PDF reports with school header & watermark.",
    defaultPlans: ["enterprise"],
    aliases: ["reports.export_pdf"],
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
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["notices", "announcements"],
  },
  {
    id: "notices_page",
    name: "Notice Board Page",
    category: "page",
    featureKey: "notices_announcements",
    parentKey: "notices_announcements",
    description: "Access to notice board management (/admin/notices).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["notices.page"],
  },
  {
    id: "notice_action_publish",
    name: "Publish New Notice",
    category: "action",
    featureKey: "notices_announcements",
    parentKey: "notices_page",
    description: "Compose and publish circulars with target audience selection.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["notices.publish", "notices.create"],
  },
  {
    id: "notice_action_delete",
    name: "Delete Notice",
    category: "action",
    featureKey: "notices_announcements",
    parentKey: "notices_page",
    description: "Remove published notices from student/teacher boards.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["notices.delete"],
  },
  {
    id: "notice_action_target",
    name: "Target Specific Audiences",
    category: "action",
    featureKey: "notices_announcements",
    parentKey: "notices_page",
    description: "Filter notice visibility by grade, section, or role.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["notices.target_audience", "notices.filter"],
  },

  // ==========================================
  // MODULE: FEE MANAGEMENT
  // ==========================================
  {
    id: "fee_management",
    name: "Fee Management Module",
    category: "module",
    featureKey: "fee_management",
    description: "Complete student fee structures, collection, ledger, discounts, and receipts.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees", "fee_collection_system"],
  },
  {
    id: "fee_dashboard",
    name: "Fee Dashboard Page",
    category: "page",
    featureKey: "fee_management",
    parentKey: "fee_management",
    description: "Access to fee overview dashboard (/admin/fees).",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.dashboard", "fees.page"],
  },
  {
    id: "fee_structure",
    name: "Fee Structure Management",
    category: "tab",
    featureKey: "fee_management",
    parentKey: "fee_dashboard",
    description: "Create and manage fee heads, class structures, and frequencies.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.structure"],
  },
  {
    id: "fee_collection",
    name: "Collect Fee Action",
    category: "action",
    featureKey: "fee_management",
    parentKey: "fee_dashboard",
    description: "Record fee payments, full & partial payments, and issue receipts.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.collect", "fees.payment"],
  },
  {
    id: "fee_partial_payment",
    name: "Partial Payment Collection",
    category: "action",
    featureKey: "fee_management",
    parentKey: "fee_collection",
    description: "Accept installment and partial fee payments.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.partial_payment", "fees.installments"],
  },
  {
    id: "fee_refund",
    name: "Refund Fee Transaction",
    category: "action",
    featureKey: "fee_management",
    parentKey: "fee_collection",
    description: "Authorize and process fee refunds with audit documentation.",
    defaultPlans: ["enterprise"],
    aliases: ["fees.refund"],
  },
  {
    id: "fee_discounts",
    name: "Fee Discounts & Concessions",
    category: "action",
    featureKey: "fee_management",
    parentKey: "fee_dashboard",
    description: "Apply scholarships, concessions, and custom fee adjustments.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.discounts", "fees.scholarships"],
  },
  {
    id: "fee_transactions",
    name: "Transactions Ledger",
    category: "page",
    featureKey: "fee_management",
    parentKey: "fee_management",
    description: "View financial transaction log and receipt history.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.transactions", "fees.ledger"],
  },
  {
    id: "fee_receipts",
    name: "Receipt Generation & Print",
    category: "action",
    featureKey: "fee_management",
    parentKey: "fee_transactions",
    description: "Generate, view, print, and download official payment receipts.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.receipts", "fees.print_receipt"],
  },
  {
    id: "fee_reports",
    name: "Fee Reports & Defaulters",
    category: "page",
    featureKey: "fee_management",
    parentKey: "fee_management",
    description: "Daily, monthly, class-wise, and defaulter fee collection reports.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.reports", "fees.defaulters"],
  },
  {
    id: "fee_exports",
    name: "Fee Data Export",
    category: "export",
    featureKey: "fee_management",
    parentKey: "fee_reports",
    description: "Export fee reports in CSV, XLSX, and PDF format.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["fees.export", "fees.export_pdf", "fees.export_xlsx", "fees.export_csv"],
  },

  // ==========================================
  // MODULE: RULES & POLICIES
  // ==========================================
  {
    id: "rules_policies",
    name: "Rules & Policies Module",
    category: "module",
    featureKey: "rules_policies",
    description: "School disciplinary rules, fine structures, and positive reward criteria.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["rules", "policies"],
  },
  {
    id: "rules_page",
    name: "Rules Management Page",
    category: "page",
    featureKey: "rules_policies",
    parentKey: "rules_policies",
    description: "Access to the school rules catalog (/admin/rules).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["rules.page"],
  },
  {
    id: "rules_action_create",
    name: "Create Rule / Policy",
    category: "action",
    featureKey: "rules_policies",
    parentKey: "rules_page",
    description: "Define new institutional code of conduct rules.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["rules.create", "rules.add"],
  },
  {
    id: "rules_action_edit",
    name: "Edit Rule / Policy",
    category: "action",
    featureKey: "rules_policies",
    parentKey: "rules_page",
    description: "Modify existing rule criteria or fine amounts.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["rules.edit", "rules.update"],
  },
  {
    id: "rules_action_delete",
    name: "Delete Rule / Policy",
    category: "action",
    featureKey: "rules_policies",
    parentKey: "rules_page",
    description: "Remove obsolete school rules.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["rules.delete"],
  },
  {
    id: "rules_action_apply_fine",
    name: "Apply Disciplinary Fine",
    category: "action",
    featureKey: "rules_policies",
    parentKey: "rules_page",
    description: "Levy fine against student disciplinary violation.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["rules.apply_fine", "rules.fine"],
  },
  {
    id: "rules_action_apply_reward",
    name: "Issue Merit / Reward",
    category: "action",
    featureKey: "rules_policies",
    parentKey: "rules_page",
    description: "Award merit points or recognition badges to students.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["rules.apply_reward", "rules.reward"],
  },

  // ==========================================
  // MODULE: INQUIRIES & ADMISSION LEADS
  // ==========================================
  {
    id: "inquiries_portal",
    name: "Inquiries & Admission Leads Module",
    category: "module",
    featureKey: "inquiries_portal",
    description: "Manage prospective student admission leads, inquiries, and follow-ups.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["inquiries", "leads"],
  },
  {
    id: "inquiries_page",
    name: "Inquiries Directory Page",
    category: "page",
    featureKey: "inquiries_portal",
    parentKey: "inquiries_portal",
    description: "Access to the inquiries management portal (/admin/inquiries).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["inquiries.page"],
  },
  {
    id: "inquiries_action_create",
    name: "Record New Inquiry",
    category: "action",
    featureKey: "inquiries_portal",
    parentKey: "inquiries_page",
    description: "Create manual admission inquiry or walk-in lead.",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["inquiries.create", "inquiries.add"],
  },
  {
    id: "inquiries_action_edit_status",
    name: "Update Inquiry Status",
    category: "action",
    featureKey: "inquiries_portal",
    parentKey: "inquiries_page",
    description: "Change lead status (New, Contacted, Converted, Closed).",
    defaultPlans: ["starter", "professional", "enterprise"],
    aliases: ["inquiries.edit_status", "inquiries.update"],
  },
  {
    id: "inquiries_action_delete",
    name: "Delete Inquiry Lead",
    category: "action",
    featureKey: "inquiries_portal",
    parentKey: "inquiries_page",
    description: "Remove duplicate or invalid admission inquiries.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["inquiries.delete"],
  },
  {
    id: "inquiries_action_export",
    name: "Export Inquiries List",
    category: "export",
    featureKey: "inquiries_portal",
    parentKey: "inquiries_page",
    description: "Download inquiries list in CSV or Excel format.",
    defaultPlans: ["professional", "enterprise"],
    aliases: ["inquiries.export"],
  },
];

/**
 * Maps any alias (e.g. "students.add", "fees.collect") to canonical definition ID (e.g. "student_action_add", "fee_collection").
 */
export function canonicalizeCapabilityKey(key: string): string {
  if (!key) return key;
  const cleanKey = key.trim().toLowerCase();

  // Exact ID match
  const exact = GRANULAR_PERMISSIONS.find((p) => p.id.toLowerCase() === cleanKey);
  if (exact) return exact.id;

  // Alias match
  const aliasMatch = GRANULAR_PERMISSIONS.find(
    (p) => p.aliases?.some((a) => a.toLowerCase() === cleanKey)
  );
  if (aliasMatch) return aliasMatch.id;

  // FeatureKey match (top-level module)
  const featMatch = GRANULAR_PERMISSIONS.find(
    (p) => p.featureKey.toLowerCase() === cleanKey && p.category === "module"
  );
  if (featMatch) return featMatch.id;

  return cleanKey;
}

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
  const canonical = canonicalizeCapabilityKey(key);
  const found = GRANULAR_PERMISSIONS.find((p) => p.id === canonical);
  return found ? found.featureKey : key;
}

/**
 * Returns direct parent key in the hierarchy (e.g. student_action_add -> student_page -> student_management).
 */
export function getParentCapabilityKey(key: string): string | undefined {
  const canonical = canonicalizeCapabilityKey(key);
  const found = GRANULAR_PERMISSIONS.find((p) => p.id === canonical);
  return found?.parentKey || (found && found.category !== "module" ? found.featureKey : undefined);
}

/**
 * Checks if childKey is a descendant or alias of parentKey.
 */
export function isChildCapability(childKey: string, parentKey: string): boolean {
  const childCanonical = canonicalizeCapabilityKey(childKey);
  const parentCanonical = canonicalizeCapabilityKey(parentKey);

  if (childCanonical === parentCanonical) return true;

  const childDef = GRANULAR_PERMISSIONS.find((p) => p.id === childCanonical);
  if (!childDef) return false;

  let currentParent = childDef.parentKey;
  while (currentParent) {
    if (currentParent === parentCanonical) return true;
    const parentDef = GRANULAR_PERMISSIONS.find((p) => p.id === currentParent);
    currentParent = parentDef?.parentKey;
  }

  return childDef.featureKey === parentCanonical;
}

/**
 * Returns full hierarchical tree representation.
 */
export function getCapabilityHierarchy() {
  const modules = GRANULAR_PERMISSIONS.filter((p) => p.category === "module");
  return modules.map((m) => {
    const children = GRANULAR_PERMISSIONS.filter((p) => p.featureKey === m.id && p.id !== m.id);
    return {
      ...m,
      children,
    };
  });
}
