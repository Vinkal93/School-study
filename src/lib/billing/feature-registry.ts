/**
 * CENTRALIZED FEATURE METADATA REGISTRY
 *
 * Provides customer-facing human-readable labels, descriptions, categories,
 * and curated card highlights for public pricing, registration, and plan comparisons.
 * Eliminates internal raw keys (e.g. "module:dashboard", "faculty", "Fee Whatsapp Reminder").
 */

import { ADMIN_FEATURE_REGISTRY, type AdminFeatureItem } from "@/lib/features/adminFeatureRegistry";
import type { Plan } from "@/types";

export interface FeatureMetadata {
  key: string;
  label: string;
  description: string;
  category: string;
  sortOrder: number;
  icon?: string;
  isPopularHighlight?: boolean;
}

// Curated dictionary for raw key mappings to polish customer display
const KNOWN_KEY_MAPPINGS: Record<string, { label: string; description: string; category: string; order: number }> = {
  // Core Modules
  school_dashboard: {
    label: "School Dashboard & Analytics",
    description: "Real-time key metrics, student-teacher count, and quick institution insights.",
    category: "Dashboard",
    order: 1,
  },
  "module:dashboard": {
    label: "School Dashboard & Analytics",
    description: "Real-time key metrics, student-teacher count, and quick institution insights.",
    category: "Dashboard",
    order: 1,
  },
  student_management: {
    label: "Student Admissions & Records",
    description: "Complete admissions pipeline, roll numbers, student profiles, and roster directory.",
    category: "Students",
    order: 2,
  },
  students: {
    label: "Student Admissions & Records",
    description: "Complete admissions pipeline, roll numbers, student profiles, and roster directory.",
    category: "Students",
    order: 2,
  },
  "Student Directory": {
    label: "Student Directory & Search",
    description: "Instant search, multi-filter student directory, and family linkage.",
    category: "Students",
    order: 3,
  },
  teacher_management: {
    label: "Teacher & Staff Management",
    description: "Faculty onboarding, class teacher assignments, and staff credentials.",
    category: "Staff & Teachers",
    order: 4,
  },
  teachers: {
    label: "Teacher & Staff Management",
    description: "Faculty onboarding, class teacher assignments, and staff credentials.",
    category: "Staff & Teachers",
    order: 4,
  },
  faculty: {
    label: "Faculty & Staff Portal",
    description: "Teacher portal access, subject assignments, and personal schedule tracking.",
    category: "Staff & Teachers",
    order: 5,
  },
  class_management: {
    label: "Class & Section Management",
    description: "Organize grades, sections, class capacities, and subject allocations.",
    category: "Academics",
    order: 6,
  },
  classes: {
    label: "Class & Section Management",
    description: "Organize grades, sections, class capacities, and subject allocations.",
    category: "Academics",
    order: 6,
  },
  basic_attendance: {
    label: "Daily Attendance Tracking",
    description: "Fast daily roll-call attendance for classes with instant status logging.",
    category: "Attendance",
    order: 7,
  },
  attendance: {
    label: "Daily Attendance Tracking",
    description: "Fast daily roll-call attendance for classes with instant status logging.",
    category: "Attendance",
    order: 7,
  },
  attendance_automation: {
    label: "Automated Attendance & Alerts",
    description: "Automated absentee detection, SMS alerts to parents, and monthly roster summaries.",
    category: "Attendance",
    order: 8,
  },
  fee_management: {
    label: "Fee Collection & Invoicing",
    description: "Custom fee structures, automatic invoice generation, payment receipts, and dues ledger.",
    category: "Fees & Finance",
    order: 9,
  },
  fees: {
    label: "Fee Collection & Invoicing",
    description: "Custom fee structures, automatic invoice generation, payment receipts, and dues ledger.",
    category: "Fees & Finance",
    order: 9,
  },
  "Fee Whatsapp Reminder": {
    label: "WhatsApp Fee Reminders",
    description: "Automated WhatsApp payment alerts and due date notices directly to parents.",
    category: "Fees & Finance",
    order: 10,
  },
  fee_whatsapp_reminder: {
    label: "WhatsApp Fee Reminders",
    description: "Automated WhatsApp payment alerts and due date notices directly to parents.",
    category: "Fees & Finance",
    order: 10,
  },
  notices_announcements: {
    label: "Notices & Broadcasts",
    description: "Publish circulars, holiday notices, and announcements to parents and staff.",
    category: "Communication",
    order: 11,
  },
  notices: {
    label: "Notices & Broadcasts",
    description: "Publish circulars, holiday notices, and announcements to parents and staff.",
    category: "Communication",
    order: 11,
  },
  inquiries_portal: {
    label: "Admissions Inquiries Desk",
    description: "Capture prospect inquiries, track follow-ups, and convert leads into enrollments.",
    category: "Admissions",
    order: 12,
  },
  inquiries: {
    label: "Admissions Inquiries Desk",
    description: "Capture prospect inquiries, track follow-ups, and convert leads into enrollments.",
    category: "Admissions",
    order: 12,
  },
  advanced_reports: {
    label: "Advanced Analytics & Reports",
    description: "In-depth financial reports, attendance trends, collection summaries, and audit logs.",
    category: "Reports",
    order: 13,
  },
  reports: {
    label: "Advanced Analytics & Reports",
    description: "In-depth financial reports, attendance trends, collection summaries, and audit logs.",
    category: "Reports",
    order: 13,
  },
  timetable_bells: {
    label: "Timetable & Bell Scheduler",
    description: "Smart period scheduling, faculty allocation conflict check, and timetable printouts.",
    category: "Academics",
    order: 14,
  },
  timetable: {
    label: "Timetable & Bell Scheduler",
    description: "Smart period scheduling, faculty allocation conflict check, and timetable printouts.",
    category: "Academics",
    order: 14,
  },
  rules_policies: {
    label: "Institutional Rules & Policies",
    description: "Document repository for code of conduct, school bylaws, and staff compliance.",
    category: "Administration",
    order: 15,
  },
  rules: {
    label: "Institutional Rules & Policies",
    description: "Document repository for code of conduct, school bylaws, and staff compliance.",
    category: "Administration",
    order: 15,
  },
  subscription_billing: {
    label: "Subscription & Invoicing Self-Service",
    description: "Manage school subscription, download GST tax invoices, and upgrade online.",
    category: "Administration",
    order: 16,
  },
  billing: {
    label: "Subscription & Invoicing Self-Service",
    description: "Manage school subscription, download GST tax invoices, and upgrade online.",
    category: "Administration",
    order: 16,
  },
};

/**
 * Resolves a normalized, human-readable FeatureMetadata object for any feature key or identifier.
 */
export function getFeatureMetadata(rawKey: string): FeatureMetadata {
  if (!rawKey) {
    return {
      key: "unknown",
      label: "General Feature",
      description: "Standard institution functionality.",
      category: "General",
      sortOrder: 999,
    };
  }

  const cleanKey = rawKey.trim();

  // 1. Direct dictionary match
  if (KNOWN_KEY_MAPPINGS[cleanKey]) {
    const item = KNOWN_KEY_MAPPINGS[cleanKey];
    return {
      key: cleanKey,
      label: item.label,
      description: item.description,
      category: item.category,
      sortOrder: item.order,
    };
  }

  // 2. Registry match via ADMIN_FEATURE_REGISTRY
  const regItem = ADMIN_FEATURE_REGISTRY.find(
    (f) =>
      f.key.toLowerCase() === cleanKey.toLowerCase() ||
      f.id.toLowerCase() === cleanKey.toLowerCase() ||
      (f.aliases && f.aliases.some((a) => a.toLowerCase() === cleanKey.toLowerCase()))
  );

  if (regItem) {
    return {
      key: cleanKey,
      label: regItem.label,
      description: regItem.description,
      category: regItem.category || "Institution",
      sortOrder: regItem.sortOrder || 50,
      icon: regItem.icon,
    };
  }

  // 3. Clean human-readable fallback (never show "module:dashboard" or raw snake_case)
  let formattedLabel = cleanKey
    .replace(/^module:/i, "")
    .replace(/^action:/i, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ");

  formattedLabel = formattedLabel
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim();

  return {
    key: cleanKey,
    label: formattedLabel || "Institutional Tool",
    description: "Standard institution functionality.",
    category: "Institution",
    sortOrder: 100,
  };
}

/**
 * Curates 5 to 7 high-impact, human-readable features for a plan card.
 * Guarantees visual consistency across plans without overwhelming long lists.
 */
export function getCuratedCardFeatures(plan: Plan, maxCount: number = 6): FeatureMetadata[] {
  // Specific priority curation per plan slug
  const priorityMap: Record<string, string[]> = {
    free: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "subscription_billing",
    ],
    base: [
      "student_management",
      "teacher_management",
      "school_dashboard",
      "student_portal_access",
      "teacher_portal_access",
      "class_management",
    ],
    starter: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "notices_announcements",
    ],
    growth: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "fee_management",
      "inquiries_portal",
      "notices_announcements",
    ],
    professional: [
      "student_management",
      "teacher_management",
      "class_management",
      "attendance_automation",
      "fee_management",
      "Fee Whatsapp Reminder",
      "advanced_reports",
    ],
    enterprise: [
      "student_management",
      "teacher_management",
      "attendance_automation",
      "fee_management",
      "Fee Whatsapp Reminder",
      "advanced_reports",
      "rules_policies",
    ],
  };

  const preferredKeys = priorityMap[plan.slug] || priorityMap[plan.id] || [];
  const planFeatures = plan.features || [];

  const resolved: FeatureMetadata[] = [];
  const seenLabels = new Set<string>();

  const isFeatureEnabled = (key: string): boolean => {
    if (!planFeatures.length) return true;
    const k = key.toLowerCase().trim().replace(/^module:/, "");
    if (
      planFeatures.some((f) => {
        const fClean = f.toLowerCase().trim().replace(/^module:/, "");
        return fClean === k || fClean.replace(/_/g, " ") === k.replace(/_/g, " ");
      })
    ) {
      return true;
    }
    if (plan.featureAccess) {
      if (plan.featureAccess[key] === "FULL_ACCESS" || plan.featureAccess[k] === "FULL_ACCESS") return true;
      if (plan.featureAccess[key] === "HIDDEN" || plan.featureAccess[k] === "HIDDEN") return false;
    }
    return false;
  };

  // 1. First add preferred highlights that are enabled in this plan
  for (const key of preferredKeys) {
    if (resolved.length >= maxCount) break;
    if (isFeatureEnabled(key)) {
      const meta = getFeatureMetadata(key);
      if (!seenLabels.has(meta.label)) {
        seenLabels.add(meta.label);
        resolved.push(meta);
      }
    }
  }

  // 2. Backfill with other features from plan's actual features list
  for (const key of planFeatures) {
    if (resolved.length >= maxCount) break;
    const meta = getFeatureMetadata(key);
    if (!seenLabels.has(meta.label)) {
      seenLabels.add(meta.label);
      resolved.push(meta);
    }
  }

  // 3. Fallback if still empty and plan has no features
  if (resolved.length === 0) {
    for (const key of preferredKeys) {
      if (resolved.length >= maxCount) break;
      const meta = getFeatureMetadata(key);
      if (!seenLabels.has(meta.label)) {
        seenLabels.add(meta.label);
        resolved.push(meta);
      }
    }
  }

  return resolved;
}

/**
 * Groups all features of a plan by module category for the "View all features" modal.
 */
export function getGroupedPlanFeatures(
  plan: Plan
): Record<string, Array<{ key: string; label: string; description: string; enabled: boolean }>> {
  const groups: Record<string, Array<{ key: string; label: string; description: string; enabled: boolean }>> = {};

  const canonicalCatalog = [
    { key: "school_dashboard", category: "Dashboard" },
    { key: "student_management", category: "Student Management" },
    { key: "teacher_management", category: "Faculty & Staff" },
    { key: "class_management", category: "Academics" },
    { key: "basic_attendance", category: "Attendance" },
    { key: "attendance_automation", category: "Attendance" },
    { key: "fee_management", category: "Fees & Finance" },
    { key: "fee_whatsapp_reminder", category: "Fees & Finance" },
    { key: "notices_announcements", category: "Communication" },
    { key: "inquiries_portal", category: "Admissions Desk" },
    { key: "timetable_bells", category: "Academics" },
    { key: "rules_policies", category: "Administration" },
    { key: "advanced_reports", category: "Reports & Analytics" },
    { key: "subscription_billing", category: "Billing & Invoicing" },
  ];

  const planFeaturesSet = new Set(
    (plan.features || []).map((f) => f.toLowerCase().trim().replace(/^module:/, "").replace(/_/g, " "))
  );

  const isFeatureEnabled = (key: string, aliases: string[] = []): boolean => {
    const k = key.toLowerCase().trim().replace(/^module:/, "").replace(/_/g, " ");
    if (planFeaturesSet.has(k) || planFeaturesSet.has(key.toLowerCase().trim())) return true;
    for (const alias of aliases) {
      const a = alias.toLowerCase().trim().replace(/^module:/, "").replace(/_/g, " ");
      if (planFeaturesSet.has(a) || planFeaturesSet.has(alias.toLowerCase().trim())) return true;
    }
    if (plan.featureAccess) {
      if (plan.featureAccess[key] === "FULL_ACCESS" || plan.featureAccess[k] === "FULL_ACCESS") return true;
      for (const alias of aliases) {
        if (plan.featureAccess[alias] === "FULL_ACCESS") return true;
      }
      if (plan.featureAccess[key] === "HIDDEN" || plan.featureAccess[k] === "HIDDEN") return false;
    }
    return false;
  };

  const seenKeys = new Set<string>();

  // 1. Process canonicalCatalog first to preserve standard categorization
  canonicalCatalog.forEach((item) => {
    const meta = getFeatureMetadata(item.key);
    const category = item.category;
    if (!groups[category]) groups[category] = [];

    const enabled = isFeatureEnabled(item.key, []);
    seenKeys.add(item.key.toLowerCase());

    groups[category].push({
      key: meta.key,
      label: meta.label,
      description: meta.description,
      enabled,
    });
  });

  // 2. Also process any additional custom features from the plan
  (plan.features || []).forEach((fKey) => {
    const clean = fKey.toLowerCase().trim().replace(/^module:/, "");
    if (!seenKeys.has(clean) && !seenKeys.has(fKey.toLowerCase())) {
      const meta = getFeatureMetadata(fKey);
      const category = meta.category || "Additional Modules";
      if (!groups[category]) groups[category] = [];

      if (!groups[category].some((x) => x.label === meta.label)) {
        groups[category].push({
          key: fKey,
          label: meta.label,
          description: meta.description,
          enabled: true,
        });
      }
    }
  });

  return groups;
}
