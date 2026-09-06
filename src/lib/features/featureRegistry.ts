import type { FeatureRegistryItem } from "@/types";

/**
 * Standard Feature Registry Catalog
 * Authoritative system capabilities definition for Phase 1 Plan & Pricing Foundation
 * and Phase 2 Dynamic Sidebar Entitlements.
 */
export const FEATURE_REGISTRY: FeatureRegistryItem[] = [
  // 1. Core & School Dashboard
  {
    key: "school_dashboard",
    moduleKey: "dashboard",
    displayName: "School Admin Dashboard",
    description: "Real-time key metrics, quick stats, announcements overview, and operational summary.",
    category: "core",
    route: "/school-admin",
    status: "ACTIVE",
    sortOrder: 1,
  },
  {
    key: "staff_accounts",
    moduleKey: "dashboard",
    displayName: "Staff & Co-Admin Accounts",
    description: "Manage multiple admin staff seats with custom role allocations.",
    category: "core",
    route: "/school-admin/staff",
    status: "ACTIVE",
    sortOrder: 2,
  },

  // 2. Student Management
  {
    key: "student_management",
    moduleKey: "students",
    displayName: "Student Management & Admissions",
    description: "Complete student lifecycle, admission intake, student profiles, parent info, and documents.",
    category: "core",
    route: "/school-admin/students",
    status: "ACTIVE",
    sortOrder: 3,
  },
  {
    key: "student_portal_access",
    moduleKey: "students",
    displayName: "Student & Parent Portal Access",
    description: "Dedicated mobile and desktop portal for students and parents to view attendance, marks, and fees.",
    category: "academic",
    route: "/student",
    status: "ACTIVE",
    sortOrder: 4,
  },

  // 3. Teacher Management
  {
    key: "teacher_management",
    moduleKey: "teachers",
    displayName: "Teacher Management",
    description: "Teacher registry, departmental assignments, teaching load, and profile verification.",
    category: "core",
    route: "/school-admin/teachers",
    status: "ACTIVE",
    sortOrder: 5,
  },
  {
    key: "teacher_portal_access",
    moduleKey: "teachers",
    displayName: "Teacher Portal Access",
    description: "Dedicated portal for teachers to log attendance, assign homework, and submit grades.",
    category: "academic",
    route: "/teacher",
    status: "ACTIVE",
    sortOrder: 6,
  },

  // 4. Classes & Sections
  {
    key: "class_management",
    moduleKey: "classes",
    displayName: "Class & Section Management",
    description: "Grade level hierarchy, streams, section partitioning, and class teacher allocations.",
    category: "academic",
    route: "/school-admin/classes",
    status: "ACTIVE",
    sortOrder: 7,
  },

  // 5. Attendance
  {
    key: "basic_attendance",
    moduleKey: "attendance",
    displayName: "Daily Attendance Marking",
    description: "Manual and batch daily attendance marking for students and staff.",
    category: "academic",
    route: "/school-admin/attendance",
    status: "ACTIVE",
    sortOrder: 8,
  },
  {
    key: "attendance_automation",
    moduleKey: "attendance",
    displayName: "Advanced Attendance Automation",
    description: "Automated attendance tracking, RFID/biometric device sync, and automated absence alerts.",
    category: "academic",
    route: "/school-admin/attendance/automation",
    status: "ACTIVE",
    sortOrder: 9,
  },

  // 6. Timetable & Bell Automation
  {
    key: "timetable_bells",
    moduleKey: "timetable_bells",
    displayName: "Timetable & Bell Automation",
    description: "Weekly period scheduler, conflict detection, teacher substitution, and automated bell timers.",
    category: "academic",
    route: "/school-admin/timetable",
    status: "ACTIVE",
    sortOrder: 10,
  },

  // 7. Rules & Policies
  {
    key: "rules_policies",
    moduleKey: "rules_policies",
    displayName: "Rules, Policies & Fines/Rewards",
    description: "Institution policy builder, teacher late-arrival deductions, conduct rewards, and audit logs.",
    category: "security",
    route: "/school-admin/rules",
    status: "ACTIVE",
    sortOrder: 11,
  },

  // 8. Notices & Broadcasts
  {
    key: "notices_announcements",
    moduleKey: "notices",
    displayName: "Notices & Broadcast Announcements",
    description: "Targeted notices to whole school, specific classes, teachers, or parents with attachment support.",
    category: "academic",
    route: "/school-admin/notices",
    status: "ACTIVE",
    sortOrder: 12,
  },

  // 9. Fee Management
  {
    key: "fee_management",
    moduleKey: "fee_management",
    displayName: "Fee Collection & Dues Management",
    description: "Automated fee heads, installment schedules, online UPI/card payment collection, and instant receipts.",
    category: "financial",
    route: "/school-admin/fees",
    status: "ACTIVE",
    sortOrder: 13,
  },

  // 10. Reports & Exports
  {
    key: "advanced_reports",
    moduleKey: "reports_exports",
    displayName: "Advanced Reports & Data Exports",
    description: "Custom analytics, attendance heatmaps, fee collection ledgers, and instant PDF/Excel exports.",
    category: "analytics",
    route: "/school-admin/reports",
    status: "ACTIVE",
    sortOrder: 14,
  },

  // 11. Inquiries Portal 2.0
  {
    key: "inquiries_portal",
    moduleKey: "inquiries",
    displayName: "Admission & Parent Inquiries 2.0",
    description: "Interactive public inquiry portal, lead triage board, automated follow-up status, and school tour scheduling.",
    category: "core",
    route: "/school-admin/inquiries",
    status: "ACTIVE",
    sortOrder: 15,
  },

  // 12. Dedicated Support & Enterprise Capabilities
  {
    key: "multi_school_management",
    moduleKey: "subscription_billing",
    displayName: "Multi-School Network Management",
    description: "Centralized super-admin control across multiple branch campuses under a single management entity.",
    category: "integration",
    route: "/school-admin/branches",
    status: "ACTIVE",
    sortOrder: 16,
  },
  {
    key: "priority_support",
    moduleKey: "subscription_billing",
    displayName: "Priority Support & Dedicated Onboarding",
    description: "Dedicated account manager, SLA-backed ticket response times, and 1-on-1 staff onboarding.",
    category: "core",
    status: "ACTIVE",
    sortOrder: 17,
  },
];

/**
 * Returns all active feature registry items sorted by sortOrder.
 */
export function getAllFeatureRegistry(): FeatureRegistryItem[] {
  return [...FEATURE_REGISTRY].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Returns features grouped by category.
 */
export function getFeatureRegistryByCategory(): Record<string, FeatureRegistryItem[]> {
  const grouped: Record<string, FeatureRegistryItem[]> = {};
  for (const item of FEATURE_REGISTRY) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}

/**
 * Validates feature keys against known registry.
 * Returns valid sanitized keys.
 */
export function sanitizeFeatureKeys(keys: string[]): string[] {
  const validKeys = new Set(FEATURE_REGISTRY.map((f) => f.key));
  return Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
}

/**
 * Resolves a feature key to its human-readable display name.
 */
export function getFeatureDisplayName(key: string): string {
  const item = FEATURE_REGISTRY.find((f) => f.key === key);
  if (item) return item.displayName;
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
