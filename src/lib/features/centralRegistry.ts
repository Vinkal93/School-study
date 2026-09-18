/**
 * CENTRAL FEATURE REGISTRY — SINGLE SOURCE OF TRUTH
 * 
 * Central catalog of all platform capabilities, modules, sidebar navigation items,
 * and security feature-gates.
 * 
 * Connects:
 *   Central Feature Registry
 *     <-> Super Admin Feature Management (/super-admin/features)
 *     <-> Super Admin Plan Editor (/super-admin/pricing)
 *     <-> Super Admin Custom Access & Overrides
 *     <-> School Admin Sidebar Navigation
 *     <-> Real-time Entitlement Evaluation (EntitlementContext)
 *     <-> Backend API Feature Guards (featureGuard.ts)
 */

export type FeatureStatus = "active" | "coming_soon" | "under_development" | "disabled";
export type FeatureVisibility = "visible" | "hidden" | "showcase";
export type FeatureCategory =
  | "core"
  | "academic"
  | "financial"
  | "analytics"
  | "security"
  | "ai"
  | "integration";

export interface CentralFeatureDefinition {
  featureId: string;
  name: string;
  description: string;
  category: FeatureCategory;
  iconName: string;
  route: string;
  status: FeatureStatus;
  visibility: FeatureVisibility;
  requiredPlans: string[]; // e.g. ["plan_free", "plan_base", "plan_starter", "plan_professional", "plan_enterprise"] or ["all"]
  allowCustomAccess: boolean;
  sortOrder: number;
  subItems?: { label: string; href: string; featureKey?: string }[];
  aliases?: string[];
  moduleKey?: string;
  isDangerous?: boolean;
  launchDate?: string;
  apiEndpoints?: { path: string; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL"; description?: string }[];
}

export const CENTRAL_FEATURE_REGISTRY: CentralFeatureDefinition[] = [
  // 1. Core Dashboard
  {
    featureId: "school_dashboard",
    name: "Dashboard",
    description: "Real-time key metrics, operational summaries, and rapid administrative shortcuts.",
    category: "core",
    iconName: "LayoutDashboard",
    route: "/admin",
    status: "active",
    visibility: "visible",
    requiredPlans: ["all"],
    allowCustomAccess: false, // Evergreen baseline core
    sortOrder: 1,
    aliases: ["dashboard", "module:dashboard"],
    moduleKey: "dashboard",
    apiEndpoints: [{ path: "/api/admin/dashboard", method: "ALL" }],
  },

  // 2. AI Assistant & Workspace
  {
    featureId: "ai_assistant",
    name: "AI Assistant & Mode",
    description: "Generative AI workspace, intelligent document parsing, administrative copilots, and AI reporting.",
    category: "ai",
    iconName: "Sparkles",
    route: "/admin/ai",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 2,
    aliases: ["ai", "module:ai", "ai_workspace", "ai_mode"],
    moduleKey: "ai",
    apiEndpoints: [
      { path: "/api/ai/chat", method: "ALL" },
      { path: "/api/ai/conversations", method: "ALL" },
      { path: "/api/ai/entitlement", method: "ALL" },
    ],
  },

  // 3. Inquiries & Admissions Intake
  {
    featureId: "inquiries_portal",
    name: "Admissions & Inquiries",
    description: "Public inquiries triage, prospective student intake, follow-ups, and campus tour scheduling.",
    category: "core",
    iconName: "MessageSquare",
    route: "/admin/inquiries",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 3,
    aliases: ["inquiries", "module:inquiries", "leads"],
    moduleKey: "inquiries",
    apiEndpoints: [{ path: "/api/school/inquiries", method: "ALL" }],
  },

  // 4. Teachers & Faculty
  {
    featureId: "teacher_management",
    name: "Teachers & Faculty",
    description: "Faculty management, subject allocations, teaching workload distribution, and teacher accounts.",
    category: "core",
    iconName: "Users",
    route: "/admin/teachers",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_free", "plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 4,
    aliases: ["teachers", "module:teachers", "teacher_portal"],
    moduleKey: "teachers",
    apiEndpoints: [{ path: "/api/admin/teachers", method: "ALL" }],
  },

  // 5. Rules & Policies
  {
    featureId: "rules_policies",
    name: "Rules & Policies",
    description: "Institutional guidelines, disciplinary codes, attendance penalties, and staff policy configurations.",
    category: "security",
    iconName: "ShieldCheck",
    route: "/admin/rules",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 5,
    aliases: ["rules", "module:rules", "policies"],
    moduleKey: "rules_policies",
    apiEndpoints: [{ path: "/api/rules", method: "ALL" }],
  },

  // 6. Student Admissions & Directory
  {
    featureId: "student_management",
    name: "Students Directory & Admissions",
    description: "Complete student profiles, enrollment numbers, class rosters, photo records, and guardian info.",
    category: "core",
    iconName: "GraduationCap",
    route: "/admin/students",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_free", "plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 6,
    aliases: ["students", "module:students", "student_portal"],
    moduleKey: "students",
    apiEndpoints: [
      { path: "/api/admin/students", method: "ALL" },
      { path: "/api/admin/students/bulk-delete", method: "POST" },
    ],
  },

  // 7. Classes & Section Management
  {
    featureId: "class_management",
    name: "Classes & Sections",
    description: "Grade level hierarchy, stream partitioning, section allocations, and student promotions.",
    category: "academic",
    iconName: "BookOpen",
    route: "/admin/classes",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_free", "plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 7,
    subItems: [
      { label: "All Classes", href: "/admin/classes" },
      { label: "Promote / Transfer", href: "/admin/classes/transfer" },
    ],
    aliases: ["classes", "module:classes"],
    moduleKey: "classes",
    apiEndpoints: [{ path: "/api/classes", method: "ALL" }],
  },

  // 8. Data Backup & Cloud Sync
  {
    featureId: "backup_sync",
    name: "Data Backup & Cloud Sync",
    description: "Google Sheets bi-directional mirror, bulk XLSX/CSV data exports, and automated cloud backups.",
    category: "integration",
    iconName: "Database",
    route: "/admin/backup",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 8,
    subItems: [
      { label: "Export & Backup", href: "/admin/backup?tab=export" },
      { label: "Import Data", href: "/admin/backup?tab=import" },
    ],
    aliases: ["backup", "module:backup", "data_backup", "sync", "import_export"],
    moduleKey: "backup",
    apiEndpoints: [
      { path: "/api/admin/backup/export", method: "ALL" },
      { path: "/api/admin/backup/import/execute", method: "ALL" },
    ],
  },

  // 9. Timetable & Bell Automation
  {
    featureId: "timetable_bells",
    name: "Timetable & Bell Automation",
    description: "Weekly period schedules, conflict checks, teacher substitutions, and automated bell timers.",
    category: "academic",
    iconName: "Clock",
    route: "/admin/timetable",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 9,
    aliases: ["timetable", "module:timetable", "bells"],
    moduleKey: "timetable",
    apiEndpoints: [{ path: "/api/timetable", method: "ALL" }],
  },

  // 10. Daily Attendance
  {
    featureId: "basic_attendance",
    name: "Attendance Management",
    description: "Daily and period-wise student & staff attendance tracking with real-time registers.",
    category: "academic",
    iconName: "ClipboardCheck",
    route: "/admin/attendance",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_free", "plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 10,
    aliases: ["attendance", "module:attendance"],
    moduleKey: "attendance",
    apiEndpoints: [{ path: "/api/attendance", method: "ALL" }],
  },

  // 11. Attendance Automation (RFID / Biometric)
  {
    featureId: "attendance_automation",
    name: "Advanced Attendance Automation",
    description: "Automated RFID/biometric hardware sync, punch logs, and automated instant absence SMS/alerts.",
    category: "academic",
    iconName: "Sparkles",
    route: "/admin/attendance/automation",
    status: "active",
    visibility: "showcase",
    requiredPlans: ["plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 11,
    aliases: ["biometric_attendance", "rfid_attendance"],
    moduleKey: "attendance",
  },

  // 12. Reports & Analytics
  {
    featureId: "advanced_reports",
    name: "Reports & Analytics",
    description: "Academic scorecards, financial audit summaries, attendance heatmaps, and custom data exports.",
    category: "analytics",
    iconName: "FileText",
    route: "/admin/reports",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 12,
    aliases: ["reports", "module:reports", "reports_exports"],
    moduleKey: "reports",
    apiEndpoints: [
      { path: "/api/admin/reports", method: "ALL" },
      { path: "/api/reports/export", method: "ALL" },
    ],
  },

  // 13. Notices & Circulars
  {
    featureId: "notices_announcements",
    name: "Notices & Broadcast Circulars",
    description: "Direct circular broadcasts to classes, teachers, parents, or whole school with attachments.",
    category: "academic",
    iconName: "Bell",
    route: "/admin/notices",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 13,
    aliases: ["notices", "module:notices", "announcements"],
    moduleKey: "notices",
    apiEndpoints: [{ path: "/api/notices", method: "ALL" }],
  },

  // 14. Fee Management & Accounting
  {
    featureId: "fee_management",
    name: "Fee Management & Collection",
    description: "Automated fee heads, installments, online Razorpay payments, receipts, and defaulter tracking.",
    category: "financial",
    iconName: "CreditCard",
    route: "/admin/fees",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 14,
    subItems: [
      { label: "Fee Dashboard", href: "/admin/fees", featureKey: "fee_dashboard" },
      { label: "Fee Structure", href: "/admin/fees/structures", featureKey: "fee_structures" },
      { label: "Student Fees", href: "/admin/fees/student-fees", featureKey: "fee_student_fees" },
      { label: "Collect Fee", href: "/admin/fees/collect", featureKey: "fee_collect" },
      { label: "Transactions", href: "/admin/fees/transactions", featureKey: "fee_transactions" },
      { label: "Student Ledger", href: "/admin/fees/ledger", featureKey: "fee_ledger" },
      { label: "Cash & Bank Ledger", href: "/admin/fees/cash-bank", featureKey: "fee_cash_bank" },
      { label: "Accounting & Trial Balance", href: "/admin/fees/accounting", featureKey: "fee_accounting" },
      { label: "Dues / Defaulters", href: "/admin/fees/defaulters", featureKey: "fee_defaulters" },
      { label: "Discounts / Concessions", href: "/admin/fees/discounts", featureKey: "fee_discounts" },
      { label: "Receipts", href: "/admin/fees/receipts", featureKey: "fee_receipts" },
      { label: "Fee Reports", href: "/admin/fees/reports", featureKey: "fee_reports" },
      { label: "Fee Settings", href: "/admin/fees/settings", featureKey: "fee_settings" },
    ],
    aliases: ["fees", "module:fees", "fee_collection"],
    moduleKey: "fees",
    apiEndpoints: [
      { path: "/api/fees", method: "ALL" },
      { path: "/api/fees/collect", method: "ALL" },
      { path: "/api/fees/structures", method: "ALL" },
    ],
  },

  // 15. Subscription & Billing
  {
    featureId: "subscription_billing",
    name: "Subscription & Billing",
    description: "School plan subscription details, upgrade portal, usage limits, and invoices.",
    category: "core",
    iconName: "CreditCard",
    route: "/admin/billing",
    status: "active",
    visibility: "visible",
    requiredPlans: ["all"],
    allowCustomAccess: false, // Always available to school admins
    sortOrder: 15,
    aliases: ["billing", "module:billing", "subscription"],
    moduleKey: "billing",
    apiEndpoints: [{ path: "/api/billing/subscription", method: "ALL" }],
  },

  // 16. Multi-School Network Management (Enterprise)
  {
    featureId: "multi_school_management",
    name: "Multi-School Network",
    description: "Manage multiple branch campuses, unified branding, and cross-campus staff rotation under one roof.",
    category: "integration",
    iconName: "Building2",
    route: "/admin/branches",
    status: "coming_soon",
    visibility: "showcase",
    requiredPlans: ["plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 16,
    aliases: ["branches", "network"],
  },

  // 17. Homework & Assignments
  {
    featureId: "homework_management",
    name: "Homework & Assignments",
    description: "Teacher homework publishing, student submissions, digital grading, and parent reminders.",
    category: "academic",
    iconName: "ClipboardList",
    route: "/admin/homework",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 17,
    aliases: ["homework", "module:homework"],
    moduleKey: "homework",
    apiEndpoints: [{ path: "/api/homework", method: "ALL" }],
  },

  // 18. Examination & Gradebook
  {
    featureId: "exam_gradebook",
    name: "Examinations & Marks",
    description: "Exam schedules, mark sheets, report card generator, grading scales, and parent result publishing.",
    category: "academic",
    iconName: "Award",
    route: "/admin/exams",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 18,
    aliases: ["exams", "module:exams", "gradebook"],
    moduleKey: "exams",
    apiEndpoints: [{ path: "/api/exams", method: "ALL" }],
  },

  // 19. Staff Accounts
  {
    featureId: "staff_accounts",
    name: "Staff & Co-Admin Accounts",
    description: "Manage multiple admin staff seats with custom role allocations.",
    category: "core",
    iconName: "Users",
    route: "/school-admin/staff",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 19,
    aliases: ["staff", "co_admin"],
    moduleKey: "staff",
  },

  // 20. Student & Parent Portal Access
  {
    featureId: "student_portal_access",
    name: "Student & Parent Portal Access",
    description: "Dedicated mobile and desktop portal for students and parents to view attendance, marks, and fees.",
    category: "academic",
    iconName: "GraduationCap",
    route: "/student",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 20,
    aliases: ["student_portal", "parent_portal"],
    moduleKey: "students",
  },

  // 21. Teacher Portal Access
  {
    featureId: "teacher_portal_access",
    name: "Teacher Portal Access",
    description: "Dedicated portal for teachers to log attendance, assign homework, and submit grades.",
    category: "academic",
    iconName: "Users",
    route: "/teacher",
    status: "active",
    visibility: "visible",
    requiredPlans: ["plan_base", "plan_starter", "plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 21,
    aliases: ["teacher_portal"],
    moduleKey: "teachers",
  },

  // 22. Library Management
  {
    featureId: "library_management",
    name: "Library & Book Catalog",
    description: "Book inventory, barcode scanning, issue/return logs, and overdue fine calculations.",
    category: "academic",
    iconName: "BookOpen",
    route: "/admin/library",
    status: "coming_soon",
    visibility: "showcase",
    requiredPlans: ["plan_professional", "plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 22,
    aliases: ["library", "module:library"],
    moduleKey: "library",
  },

  // 23. Transport Management
  {
    featureId: "transport_management",
    name: "Transport & Fleet Tracking",
    description: "School bus routes, vehicle GPS tracker sync, driver assignments, and student transport fees.",
    category: "integration",
    iconName: "Building2",
    route: "/admin/transport",
    status: "coming_soon",
    visibility: "showcase",
    requiredPlans: ["plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 23,
    aliases: ["transport", "module:transport", "buses"],
    moduleKey: "transport",
  },

  // 24. Priority Support & Dedicated Onboarding
  {
    featureId: "priority_support",
    name: "Priority Support & Dedicated Onboarding",
    description: "Dedicated account manager, SLA-backed ticket response times, and 1-on-1 staff onboarding.",
    category: "core",
    iconName: "Sparkles",
    route: "/admin/support",
    status: "active",
    visibility: "showcase",
    requiredPlans: ["plan_enterprise"],
    allowCustomAccess: true,
    sortOrder: 24,
    aliases: ["support", "vip_support"],
    moduleKey: "support",
  },
];

/**
 * Returns all features in the central registry sorted by sortOrder.
 */
export function getAllCentralFeatures(): CentralFeatureDefinition[] {
  return [...CENTRAL_FEATURE_REGISTRY].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Finds a central feature by featureId or any registered alias.
 */
export function getCentralFeature(keyOrId: string): CentralFeatureDefinition | undefined {
  if (!keyOrId) return undefined;
  const clean = keyOrId.trim().toLowerCase();
  const normalized = clean.replace(/[:.]/g, "_");

  return CENTRAL_FEATURE_REGISTRY.find(
    (f) =>
      f.featureId.toLowerCase() === clean ||
      f.featureId.toLowerCase().replace(/[:.]/g, "_") === normalized ||
      f.aliases?.some(
        (a) => a.toLowerCase() === clean || a.toLowerCase().replace(/[:.]/g, "_") === normalized
      ) ||
      (f.moduleKey && (f.moduleKey.toLowerCase() === clean || `module:${f.moduleKey.toLowerCase()}` === clean))
  );
}

/**
 * Returns all features that are available for a given plan.
 */
export function getFeaturesForPlan(planId: string): CentralFeatureDefinition[] {
  const normalizedPlan = planId.toLowerCase().trim();
  return CENTRAL_FEATURE_REGISTRY.filter(
    (f) =>
      f.requiredPlans.includes("all") ||
      f.requiredPlans.some((p) => p.toLowerCase() === normalizedPlan || normalizedPlan.includes(p.toLowerCase()))
  );
}

/**
 * Maps a central feature to the legacy FeatureRegistryItem format
 * for compatibility with code consuming src/lib/features/featureRegistry.ts.
 */
export function toFeatureRegistryItem(f: CentralFeatureDefinition) {
  return {
    key: f.featureId,
    moduleKey: f.moduleKey || f.featureId,
    displayName: f.name,
    description: f.description,
    category: f.category,
    route: f.route,
    status: (f.status === "active" ? "ACTIVE" : f.status.toUpperCase()) as any,
    sortOrder: f.sortOrder,
  };
}

/**
 * Maps a central feature to the legacy FeatureDefinition format
 * for compatibility with code consuming src/lib/feature-control/featureRegistry.ts.
 */
export function toFeatureControlDefinition(f: CentralFeatureDefinition) {
  return {
    id: f.moduleKey ? `module:${f.moduleKey}` : `feat:${f.featureId}`,
    key: f.featureId,
    name: f.name,
    moduleKey: f.moduleKey || f.featureId,
    category: (f.category === "core" || f.category === "academic" ? "module" : "feature") as any,
    description: f.description,
    defaultRollout: (f.status === "active" ? "ON_FOR_ALL" : "OFF") as any,
    apiEndpoints: f.apiEndpoints || [],
    isDangerous: f.isDangerous,
  };
}
