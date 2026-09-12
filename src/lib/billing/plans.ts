import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { Plan, PlanVersion, FeatureDefinition, PlanLimits, PlanStatus, BillingCycle, FeatureAccessMode } from "@/types";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { createBillingAuditLog } from "./audit";


export const DEFAULT_STATIC_PLANS: Plan[] = [
  {
    id: "plan_free",
    name: "Free Plan",
    slug: "free",
    description: "Essential modules for evaluation and trial schools.",
    status: "ACTIVE",
    displayOrder: 0,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      inquiries_portal: "HIDDEN",
      rules_policies: "HIDDEN",
      timetable_bells: "HIDDEN",
      notices_announcements: "HIDDEN",
      advanced_reports: "HIDDEN",
      fee_management: "HIDDEN",
      attendance_automation: "HIDDEN",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 100,
      maxTeachers: 10,
      maxClasses: 5,
      maxStaffAccounts: 1,
      maxParents: 100,
      maxStorageBytes: 500 * 1024 * 1024,
      maxNotifications: 500,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_base",
    name: "Base Plan",
    slug: "base",
    description: "Core institution features for daily school administration.",
    status: "ACTIVE",
    displayOrder: 1,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "notices_announcements",
      "subscription_billing",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      inquiries_portal: "SHOWCASE",
      rules_policies: "SHOWCASE",
      timetable_bells: "SHOWCASE",
      advanced_reports: "SHOWCASE",
      fee_management: "HIDDEN",
      attendance_automation: "HIDDEN",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
      maxParents: 500,
      maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
      maxNotifications: 2000,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_starter",
    name: "Starter Plan",
    slug: "starter",
    description: "Core modules for small schools and new academies.",
    status: "ACTIVE",
    displayOrder: 1,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "inquiries_portal",
      "notices_announcements",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      rules_policies: "SHOWCASE",
      timetable_bells: "SHOWCASE",
      advanced_reports: "SHOWCASE",
      fee_management: "HIDDEN",
      attendance_automation: "HIDDEN",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_growth",
    name: "Growth Plan",
    slug: "growth",
    description: "Advanced tools for expanding schools and growing student bodies.",
    status: "ACTIVE",
    displayOrder: 2,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "inquiries_portal",
      "rules_policies",
      "timetable_bells",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      attendance_automation: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      advanced_reports: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
      rules_policies: "FULL_ACCESS",
      timetable_bells: "FULL_ACCESS",
      fee_management: "SHOWCASE",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 1500,
      maxTeachers: 60,
      maxClasses: 40,
      maxStaffAccounts: 6,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_professional",
    name: "Professional Plan",
    slug: "professional",
    description: "Advanced controls & analytics for growing institutions.",
    status: "ACTIVE",
    displayOrder: 3,
    isPopular: true,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
      "inquiries_portal",
      "rules_policies",
      "timetable_bells",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      attendance_automation: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      advanced_reports: "FULL_ACCESS",
      fee_management: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
      rules_policies: "FULL_ACCESS",
      timetable_bells: "FULL_ACCESS",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: 2000,
      maxTeachers: 100,
      maxClasses: 60,
      maxStaffAccounts: 10,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_enterprise",
    name: "Enterprise Plan",
    slug: "enterprise",
    description: "Custom limits and dedicated support for large networks.",
    status: "ACTIVE",
    displayOrder: 4,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
      "inquiries_portal",
      "rules_policies",
      "timetable_bells",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      attendance_automation: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      advanced_reports: "FULL_ACCESS",
      fee_management: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
      rules_policies: "FULL_ACCESS",
      timetable_bells: "FULL_ACCESS",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: -1,
      maxTeachers: -1,
      maxClasses: -1,
      maxStaffAccounts: -1,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan_custom",
    name: "Custom Plan",
    slug: "custom",
    description: "Tailored enterprise architecture and customized capabilities.",
    status: "ACTIVE",
    displayOrder: 5,
    isPopular: false,
    publicVisible: true,
    version: 1,
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
      "inquiries_portal",
      "rules_policies",
      "timetable_bells",
    ],
    featureAccess: {
      student_management: "FULL_ACCESS",
      teacher_management: "FULL_ACCESS",
      class_management: "FULL_ACCESS",
      basic_attendance: "FULL_ACCESS",
      attendance_automation: "FULL_ACCESS",
      school_dashboard: "FULL_ACCESS",
      notices_announcements: "FULL_ACCESS",
      advanced_reports: "FULL_ACCESS",
      fee_management: "FULL_ACCESS",
      inquiries_portal: "FULL_ACCESS",
      rules_policies: "FULL_ACCESS",
      timetable_bells: "FULL_ACCESS",
      subscription_billing: "FULL_ACCESS",
    },
    limits: {
      maxStudents: -1,
      maxTeachers: -1,
      maxClasses: -1,
      maxStaffAccounts: -1,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_STATIC_PLAN_VERSIONS: Record<string, PlanVersion> = {
  plan_free: {
    id: "plan_free_v1",
    planId: "plan_free",
    version: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
    ],
    limits: {
      maxStudents: 100,
      maxTeachers: 10,
      maxClasses: 5,
      maxStaffAccounts: 1,
      maxParents: 100,
      maxStorageBytes: 500 * 1024 * 1024,
      maxNotifications: 500,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_base: {
    id: "plan_base_v1",
    planId: "plan_base",
    version: 1,
    monthlyPrice: 39900,
    annualPrice: 29900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
      "notices_announcements",
      "subscription_billing",
    ],
    limits: {
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
      maxParents: 500,
      maxStorageBytes: 2 * 1024 * 1024 * 1024,
      maxNotifications: 2000,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_starter: {
    id: "plan_starter_v1",
    planId: "plan_starter",
    version: 1,
    monthlyPrice: 99900,
    annualPrice: 79900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "school_dashboard",
    ],
    limits: {
      maxStudents: 500,
      maxTeachers: 20,
      maxClasses: 15,
      maxStaffAccounts: 2,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_growth: {
    id: "plan_growth_v1",
    planId: "plan_growth",
    version: 1,
    monthlyPrice: 149900,
    annualPrice: 119900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
    ],
    limits: {
      maxStudents: 1500,
      maxTeachers: 60,
      maxClasses: 40,
      maxStaffAccounts: 6,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_professional: {
    id: "plan_professional_v1",
    planId: "plan_professional",
    version: 1,
    monthlyPrice: 199900,
    annualPrice: 159900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
    ],
    limits: {
      maxStudents: 2000,
      maxTeachers: 100,
      maxClasses: 60,
      maxStaffAccounts: 10,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_enterprise: {
    id: "plan_enterprise_v1",
    planId: "plan_enterprise",
    version: 1,
    monthlyPrice: 499900,
    annualPrice: 399900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
    ],
    limits: {
      maxStudents: -1,
      maxTeachers: -1,
      maxClasses: -1,
      maxStaffAccounts: -1,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  plan_custom: {
    id: "plan_custom_v1",
    planId: "plan_custom",
    version: 1,
    monthlyPrice: 499900,
    annualPrice: 399900,
    currency: "INR",
    features: [
      "student_management",
      "teacher_management",
      "class_management",
      "basic_attendance",
      "attendance_automation",
      "school_dashboard",
      "notices_announcements",
      "advanced_reports",
      "fee_management",
    ],
    limits: {
      maxStudents: -1,
      maxTeachers: -1,
      maxClasses: -1,
      maxStaffAccounts: -1,
    },
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

export const BILLING_COLLECTIONS = {
  PLANS: "plans",
  PLAN_VERSIONS: "planVersions",
  SCHOOL_SUBSCRIPTIONS: "schoolSubscriptions",
  FEATURE_DEFINITIONS: "featureDefinitions",
  ACCESS_POLICIES: "accessPolicies",
  SUBSCRIPTION_NOTIFICATIONS: "subscriptionNotifications",
  AUDIT_LOGS: "audit_logs",
  ORDERS: "orders",
  PAYMENTS: "payments",
  INVOICES: "invoices",
  FINANCE_TRANSACTIONS: "financeTransactions",
  WEBHOOK_EVENTS: "webhookEvents",
  SUBSCRIPTION_ADJUSTMENTS: "subscriptionAdjustments",
  ACCESS_OVERRIDES: "accessOverrides",
  LIMIT_OVERRIDES: "limitOverrides",
  PENALTIES: "penalties",
  FINANCIAL_ADJUSTMENTS: "financialAdjustments",
  CUSTOM_OFFERS: "customOffers",
  CUSTOM_ACCESS: "customPlanAccess",
} as const;

export interface CreatePlanInput {
  name: string;
  slug: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  currency?: string;
  isPopular?: boolean;
  publicVisible?: boolean;
  displayOrder?: number;
  status?: PlanStatus;
  features?: string[];
  featureAccess?: Record<string, FeatureAccessMode>;
  limits: PlanLimits;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  displayOrder?: number;
  isPopular?: boolean;
  publicVisible?: boolean;
  isArchived?: boolean;
  status?: PlanStatus;
  monthlyPricePaise?: number;
  annualPricePaise?: number;
  features?: string[];
  featureAccess?: Record<string, FeatureAccessMode>;
  limits?: PlanLimits;
  changeNotes?: string;
}

/**
 * Helper using Firestore query to enforce only one plan marked as Popular.
 */
async function enforceSinglePopularPlan(targetPlanId?: string, actorId: string = "super_admin"): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const popularQuery = query(collection(db, BILLING_COLLECTIONS.PLANS), where("isPopular", "==", true));
  const popularSnap = await getDocs(popularQuery);

  for (const docSnap of popularSnap.docs) {
    if (docSnap.id !== targetPlanId) {
      await updateDoc(doc(db, BILLING_COLLECTIONS.PLANS, docSnap.id), {
        isPopular: false,
        updatedAt: new Date().toISOString(),
      });
      await createBillingAuditLog(actorId, "super_admin", "POPULAR_PLAN_CHANGED", "plan", docSnap.id, {
        isPopular: false,
      });
    }
  }
}

/**
 * Server-side Limit & Feature Key Validation.
 */
function validatePlanLimitsAndFeatures(
  limits: PlanLimits,
  features?: string[],
  featureAccess?: Record<string, FeatureAccessMode>
): { cleanLimits: PlanLimits; cleanFeatures: string[]; cleanFeatureAccess: Record<string, FeatureAccessMode> } {
  for (const [key, val] of Object.entries(limits)) {
    if (typeof val !== "number" || isNaN(val) || val < -1) {
      throw new Error(`Invalid capacity limit for "${key}". Limits must be a non-negative integer or -1 for Unlimited.`);
    }
  }

  const cleanFeatureAccess: Record<string, FeatureAccessMode> = {};
  if (featureAccess && typeof featureAccess === "object") {
    for (const [fKey, mode] of Object.entries(featureAccess)) {
      if (typeof fKey === "string" && fKey.trim()) {
        const validMode: FeatureAccessMode =
          mode === "FULL_ACCESS" || mode === "SHOWCASE" || mode === "HIDDEN" ? mode : "FULL_ACCESS";
        cleanFeatureAccess[fKey.trim()] = validMode;
      }
    }
  }

  // Derive or sanitize cleanFeatures
  let cleanFeatures: string[] = [];
  if (features && Array.isArray(features)) {
    cleanFeatures = Array.from(new Set(features.map((f) => f.trim()).filter(Boolean)));
    // If featureAccess is not set for a feature in cleanFeatures, default it to FULL_ACCESS
    for (const f of cleanFeatures) {
      if (!cleanFeatureAccess[f]) {
        cleanFeatureAccess[f] = "FULL_ACCESS";
      }
    }
  } else {
    cleanFeatures = Object.keys(cleanFeatureAccess).filter((k) => cleanFeatureAccess[k] === "FULL_ACCESS");
  }

  return { cleanLimits: limits, cleanFeatures, cleanFeatureAccess };
}

/**
 * Initializes default plans, plan versions, and feature definitions into Firestore if not present.
 */
export async function initializeDefaultBillingCatalog(): Promise<void> {
  // Default static plans already exist in memory for client rendering.
  // Never attempt Firestore write initialization from browser for regular users or school admins.
  if (typeof window !== "undefined") {
    return;
  }
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const defaultPlans: Plan[] = [
      {
        id: "plan_starter",
        name: "Starter Plan",
        slug: "starter",
        description: "Essential school management tools for small institutions.",
        status: "ACTIVE",
        displayOrder: 1,
        isPopular: false,
        publicVisible: true,
        version: 1,
        features: [
          "student_management",
          "teacher_management",
          "class_management",
          "basic_attendance",
          "school_dashboard"
        ],
        limits: {
          maxStudents: 500,
          maxTeachers: 20,
          maxClasses: 15,
          maxStaffAccounts: 2,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "plan_professional",
        name: "Professional Plan",
        slug: "professional",
        description: "Advanced controls & analytics for growing institutions.",
        status: "ACTIVE",
        displayOrder: 2,
        isPopular: true,
        publicVisible: true,
        version: 1,
        features: [
          "student_management",
          "teacher_management",
          "class_management",
          "basic_attendance",
          "attendance_automation",
          "school_dashboard",
          "notices_announcements",
          "advanced_reports",
          "fee_management",
        ],
        limits: {
          maxStudents: 2000,
          maxTeachers: 100,
          maxClasses: 60,
          maxStaffAccounts: 10,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "plan_enterprise",
        name: "Enterprise Plan",
        slug: "enterprise",
        description: "Custom limits and dedicated support for large networks.",
        status: "ACTIVE",
        displayOrder: 3,
        isPopular: false,
        publicVisible: true,
        version: 1,
        features: [
          "student_management",
          "teacher_management",
          "class_management",
          "basic_attendance",
          "attendance_automation",
          "school_dashboard",
          "notices_announcements",
          "advanced_reports",
          "fee_management",
        ],
        limits: {
          maxStudents: -1,
          maxTeachers: -1,
          maxClasses: -1,
          maxStaffAccounts: -1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of defaultPlans) {
      const planRef = doc(db, BILLING_COLLECTIONS.PLANS, p.id);
      const planSnap = await getDoc(planRef);

      if (!planSnap.exists()) {
        await setDoc(planRef, p);

        const versionId = `${p.id}_v1`;
        const versionRef = doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, versionId);

        let monthlyPricePaise = 0;
        let annualPricePaise = 0;

        if (p.slug === "starter") {
          monthlyPricePaise = 99900;
          annualPricePaise = 79900;
        } else if (p.slug === "professional") {
          monthlyPricePaise = 199900;
          annualPricePaise = 159900;
        }

        const planVersion: PlanVersion = {
          id: versionId,
          planId: p.id,
          version: 1,
          monthlyPrice: monthlyPricePaise,
          annualPrice: annualPricePaise,
          currency: "INR",
          features: p.features,
          limits: p.limits,
          effectiveFrom: new Date().toISOString(),
          effectiveUntil: null,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };

        await setDoc(versionRef, planVersion);
      } else {
        // Synchronize default features if existing uncustomized default doc is missing class_management
        const existingData = planSnap.data() as Plan;
        const updates: Partial<Plan> = {};
        if (existingData.publicVisible === undefined) {
          updates.publicVisible = true;
        }
        if (existingData.version === undefined) {
          updates.version = 1;
        }
        if (p.slug === "professional" && existingData.features && !existingData.features.includes("class_management")) {
          updates.features = Array.from(new Set([...existingData.features, "class_management", "basic_attendance", "fee_management"]));
        }
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date().toISOString();
          await updateDoc(planRef, updates);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to initialize billing catalog:", error);
  }
}

const g = globalThis as any;
if (!g.__BILLING_PLANS_CACHE__) g.__BILLING_PLANS_CACHE__ = new Map<string, Plan>();
const memoryPlans: Map<string, Plan> = g.__BILLING_PLANS_CACHE__;

export function cachePlan(plan: Plan): void {
  if (!plan || !plan.id) return;
  memoryPlans.set(plan.id, plan);
  if (plan.slug) memoryPlans.set(plan.slug, plan);
  const norm = normalizePlanId(plan.id);
  if (norm) memoryPlans.set(norm, plan);
}

export function getCachedPlan(planId: string): Plan | null {
  if (!planId) return null;
  const norm = normalizePlanId(planId);
  return memoryPlans.get(planId) || memoryPlans.get(norm) || null;
}

export function clearPlanCache(planId?: string): void {
  if (planId) {
    const norm = normalizePlanId(planId);
    memoryPlans.delete(planId);
    memoryPlans.delete(norm);
    if (norm.startsWith("plan_")) memoryPlans.delete(norm.replace(/^plan_/, ""));
  } else {
    memoryPlans.clear();
  }
}

export function broadcastPlanChange(planId?: string): void {
  clearPlanCache(planId);
  if (typeof window !== "undefined") {
    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("school_study_realtime_sync");
        bc.postMessage({ type: "PLAN_UPDATED", planId, timestamp: Date.now() });
        bc.close();
      }
      localStorage.setItem("school_study_plan_updated", String(Date.now()));
    } catch {}
  }
}

export function normalizePlanId(planId?: string): string {
  if (!planId) return "plan_starter";
  const lower = planId.toLowerCase().trim();
  if (lower === "growth" || lower === "plan_growth") return "plan_growth";
  if (lower === "custom" || lower === "plan_custom") return "plan_custom";
  if (lower === "free" || lower === "plan_free") return "plan_free";
  if (lower === "starter" || lower === "plan_starter") return "plan_starter";
  if (
    lower === "professional" ||
    lower === "plan_professional" ||
    lower === "pro" ||
    lower === "plan_pro"
  )
    return "plan_professional";
  if (lower === "enterprise" || lower === "plan_enterprise") return "plan_enterprise";
  return lower.startsWith("plan_") ? lower : `plan_${lower}`;
}

export async function getActivePlan(planId: string): Promise<Plan | null> {
  const normId = normalizePlanId(planId);
  const cached = getCachedPlan(normId) || getCachedPlan(planId);
  if (cached && cached.status === "ACTIVE" && !cached.isArchived) {
    return cached;
  }

  const db = getFirebaseDb();
  if (db) {
    try {
      // 1. Try normalized ID (e.g. plan_starter)
      let planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, normId));

      // 2. If not found, try original planId (e.g. starter or custom id)
      if (!planSnap.exists() && planId && planId !== normId) {
        planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, planId));
      }

      // 3. If not found, try stripped prefix (e.g. starter)
      if (!planSnap.exists()) {
        const stripped = normId.replace(/^plan_/, "");
        if (stripped && stripped !== normId && stripped !== planId) {
          planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, stripped));
        }
      }

      // 4. If not found, query by slug
      if (!planSnap.exists()) {
        const cleanSlug = normId.replace(/^plan_/, "");
        const slugQuery = query(collection(db, BILLING_COLLECTIONS.PLANS), where("slug", "==", cleanSlug));
        const slugSnap = await getDocs(slugQuery);
        if (!slugSnap.empty) {
          const planDoc = slugSnap.docs[0];
          const plan = { id: planDoc.id, ...planDoc.data() } as Plan;
          if (plan.status === "ACTIVE" && !plan.isArchived) {
            cachePlan(plan);
            return plan;
          }
        }
      } else {
        const plan = { id: planSnap.id, ...planSnap.data() } as Plan;
        if (plan.status === "ACTIVE" && !plan.isArchived) {
          cachePlan(plan);
          return plan;
        }
      }
    } catch (err) {
      console.warn("getActivePlan lookup notice:", err);
    }
  }

  const fallback = DEFAULT_STATIC_PLANS.find(
    (p) => p.id === normId || p.slug === normId || p.id === planId || p.slug === planId
  );
  if (fallback) {
    cachePlan(fallback);
  }
  return fallback || null;
}

export async function getPlanVersion(planId: string, version: number): Promise<PlanVersion | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  const versionId = `${planId}_v${version}`;
  const versionSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, versionId));
  if (!versionSnap.exists()) return null;

  return { id: versionSnap.id, ...versionSnap.data() } as PlanVersion;
}

export async function calculatePlanPrice(
  planId: string,
  billingCycle: BillingCycle
): Promise<{ pricePaise: number; currency: string; planVersionId: string }> {
  const activeVersion = await getActivePlanVersion(planId);
  if (!activeVersion) {
    throw new Error(`Active pricing configuration for plan "${planId}" not found.`);
  }

  const pricePaise = billingCycle === "annual" ? activeVersion.annualPrice : activeVersion.monthlyPrice;

  return {
    pricePaise,
    currency: activeVersion.currency || "INR",
    planVersionId: activeVersion.id,
  };
}

export async function getAllPlans(): Promise<Plan[]> {
  const db = getFirebaseDb();
  if (db) {
    if (typeof window === "undefined") {
      await initializeDefaultBillingCatalog().catch(() => {});
    }
    try {
      const snap = await getDocs(collection(db, BILLING_COLLECTIONS.PLANS));
      if (!snap.empty) {
        const allPlans = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Plan[];
        const filtered = allPlans
          .filter((p) => p.status === "ACTIVE" && p.publicVisible !== false && !p.isArchived)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        if (filtered.length > 0) return filtered;
      }
    } catch (err) {
      console.warn("getAllPlans error:", err);
    }
  }
  return [...DEFAULT_STATIC_PLANS].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export async function getAllPlansAdmin(): Promise<Plan[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  if (typeof window === "undefined") {
    await initializeDefaultBillingCatalog().catch(() => {});
  }

  try {
    const snap = await getDocs(collection(db, BILLING_COLLECTIONS.PLANS));
    const allPlans = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Plan[];
    return allPlans.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    console.warn("getAllPlansAdmin error:", err);
    return [];
  }
}

export async function getActivePlanVersion(planId: string): Promise<PlanVersion | null> {
  const normId = normalizePlanId(planId);
  const db = getFirebaseDb();
  if (db) {
    try {
      const snap = await getDocs(
        query(collection(db, BILLING_COLLECTIONS.PLAN_VERSIONS), where("planId", "==", normId))
      );

      if (!snap.empty) {
        const versions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanVersion[];
        const activeVersions = versions.filter((v) => v.status === "ACTIVE");
        if (activeVersions.length > 0) {
          return activeVersions.sort((a, b) => b.version - a.version)[0];
        }
      }
    } catch (err) {
      console.warn("getActivePlanVersion error:", err);
    }
  }

  const fallback = DEFAULT_STATIC_PLAN_VERSIONS[normId] || DEFAULT_STATIC_PLAN_VERSIONS[planId];
  return fallback || null;
}

export async function getPlanVersions(planId: string): Promise<PlanVersion[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(
      query(collection(db, BILLING_COLLECTIONS.PLAN_VERSIONS), where("planId", "==", planId))
    );

    const versions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanVersion[];
    return versions.sort((a, b) => b.version - a.version);
  } catch (err) {
    console.warn("getPlanVersions error:", err);
    return [];
  }
}

export async function createPlan(input: CreatePlanInput, actorId: string = "super_admin"): Promise<Plan> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  if (input.monthlyPricePaise < 0 || input.annualPricePaise < 0) {
    throw new Error("Plan price cannot be negative.");
  }

  const { cleanLimits, cleanFeatures, cleanFeatureAccess } = validatePlanLimitsAndFeatures(
    input.limits,
    input.features,
    input.featureAccess
  );

  const existingQuery = query(collection(db, BILLING_COLLECTIONS.PLANS), where("slug", "==", input.slug.trim().toLowerCase()));
  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error(`A plan with slug "${input.slug}" already exists.`);
  }

  if (input.isPopular) {
    await enforceSinglePopularPlan(undefined, actorId);
  }

  const planId = `plan_${input.slug.trim().toLowerCase()}`;
  const nowIso = new Date().toISOString();

  const plan: Plan = {
    id: planId,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    description: input.description.trim(),
    status: input.status || "ACTIVE",
    displayOrder: input.displayOrder || 1,
    isPopular: input.isPopular || false,
    publicVisible: input.publicVisible ?? true,
    version: 1,
    isArchived: false,
    features: cleanFeatures,
    featureAccess: cleanFeatureAccess,
    limits: cleanLimits,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(doc(db, BILLING_COLLECTIONS.PLANS, planId), plan);

  const versionId = `${planId}_v1`;
  const planVersion: PlanVersion = {
    id: versionId,
    planId: planId,
    version: 1,
    monthlyPrice: input.monthlyPricePaise,
    annualPrice: input.annualPricePaise,
    currency: input.currency || "INR",
    features: cleanFeatures,
    featureAccess: cleanFeatureAccess,
    limits: cleanLimits,
    effectiveFrom: nowIso,
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: nowIso,
  };

  await setDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, versionId), planVersion);

  await createBillingAuditLog(actorId, "super_admin", "PLAN_CREATED", "plan", planId, {
    planName: plan.name,
    version: 1,
    monthlyPrice: input.monthlyPricePaise,
    publicVisible: plan.publicVisible,
  });

  broadcastPlanChange(planId);
  return plan;
}

export async function updatePlan(
  planId: string,
  input: UpdatePlanInput,
  actorId: string = "super_admin"
): Promise<{ plan: Plan; newVersionCreated: boolean }> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
  const planSnap = await getDoc(planRef);

  if (!planSnap.exists()) {
    throw new Error(`Plan "${planId}" not found.`);
  }

  const currentPlan = { id: planSnap.id, ...planSnap.data() } as Plan;
  const currentVersion = await getActivePlanVersion(planId);

  if (!currentVersion) {
    throw new Error(`Active version for plan "${planId}" not found.`);
  }

  if (input.isPopular) {
    await enforceSinglePopularPlan(planId, actorId);
  }

  const isFeatureAccessChange =
    input.featureAccess !== undefined &&
    JSON.stringify(input.featureAccess) !== JSON.stringify(currentVersion.featureAccess || currentPlan.featureAccess || {});

  const isPriceOrFeatureChange =
    (input.monthlyPricePaise !== undefined && input.monthlyPricePaise !== currentVersion.monthlyPrice) ||
    (input.annualPricePaise !== undefined && input.annualPricePaise !== currentVersion.annualPrice) ||
    (input.features !== undefined && JSON.stringify(input.features) !== JSON.stringify(currentVersion.features)) ||
    (input.limits !== undefined && JSON.stringify(input.limits) !== JSON.stringify(currentVersion.limits)) ||
    isFeatureAccessChange;

  let cleanLimits = currentPlan.limits;
  let cleanFeatures = currentPlan.features;
  let cleanFeatureAccess = currentPlan.featureAccess || currentVersion.featureAccess || {};

  if (input.limits || input.features || input.featureAccess) {
    const validated = validatePlanLimitsAndFeatures(
      input.limits || currentPlan.limits,
      input.features || currentPlan.features,
      input.featureAccess || currentPlan.featureAccess || currentVersion.featureAccess
    );
    cleanLimits = validated.cleanLimits;
    cleanFeatures = validated.cleanFeatures;
    cleanFeatureAccess = validated.cleanFeatureAccess;
  }

  const nowIso = new Date().toISOString();

  const updatedPlanData: Partial<Plan> = {
    name: input.name !== undefined ? input.name.trim() : currentPlan.name,
    description: input.description !== undefined ? input.description.trim() : currentPlan.description,
    displayOrder: input.displayOrder !== undefined ? input.displayOrder : currentPlan.displayOrder,
    isPopular: input.isPopular !== undefined ? input.isPopular : currentPlan.isPopular,
    publicVisible: input.publicVisible !== undefined ? input.publicVisible : currentPlan.publicVisible,
    isArchived: input.isArchived !== undefined ? input.isArchived : currentPlan.isArchived,
    status: input.status !== undefined ? input.status : currentPlan.status,
    features: cleanFeatures,
    featureAccess: cleanFeatureAccess,
    limits: cleanLimits,
    updatedAt: nowIso,
  };

  let newVersionCreated = false;

  if (isPriceOrFeatureChange) {
    const nextVersionNum = (currentVersion.version || 1) + 1;
    const newVersionId = `${planId}_v${nextVersionNum}`;

    await updateDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, currentVersion.id), {
      status: "ARCHIVED",
      effectiveUntil: nowIso,
    });

    const newPlanVersion: PlanVersion = {
      id: newVersionId,
      planId: planId,
      version: nextVersionNum,
      monthlyPrice: input.monthlyPricePaise !== undefined ? input.monthlyPricePaise : currentVersion.monthlyPrice,
      annualPrice: input.annualPricePaise !== undefined ? input.annualPricePaise : currentVersion.annualPrice,
      currency: "INR",
      features: cleanFeatures,
      featureAccess: cleanFeatureAccess,
      limits: cleanLimits,
      effectiveFrom: nowIso,
      effectiveUntil: null,
      status: "ACTIVE",
      changeNotes: input.changeNotes || `Updated to version ${nextVersionNum}`,
      createdAt: nowIso,
    };

    await setDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, newVersionId), newPlanVersion);
    updatedPlanData.version = nextVersionNum;
    newVersionCreated = true;

    await createBillingAuditLog(actorId, "super_admin", "PLAN_VERSION_CREATED", "planVersion", newVersionId, {
      planId,
      oldVersion: currentVersion.version,
      newVersion: nextVersionNum,
      monthlyPrice: newPlanVersion.monthlyPrice,
      annualPrice: newPlanVersion.annualPrice,
    });

    if (isFeatureAccessChange) {
      await createBillingAuditLog(actorId, "super_admin", "PLAN_FEATURE_ACCESS_CHANGED", "plan", planId, {
        planId,
        version: nextVersionNum,
        featureAccess: cleanFeatureAccess,
      });
    }
  }

  await updateDoc(planRef, updatedPlanData);
  const updatedPlan = { ...currentPlan, ...updatedPlanData };
  cachePlan(updatedPlan);

  // Server-side dual write if adminDb is available
  if (typeof window === "undefined") {
    try {
      const { getSafeAdminDb } = await import("@/lib/firebase/admin");
      const adminDb = getSafeAdminDb();
      if (adminDb) {
        await adminDb.collection(BILLING_COLLECTIONS.PLANS).doc(planId).set(updatedPlanData, { merge: true });
      }
    } catch (adminErr) {
      console.warn("adminDb plan update notice:", adminErr);
    }
  }

  await createBillingAuditLog(actorId, "super_admin", "PLAN_UPDATED", "plan", planId, {
    planName: updatedPlan.name,
    newVersionCreated,
    publicVisible: updatedPlan.publicVisible,
  });

  broadcastPlanChange(planId);
  return { plan: updatedPlan, newVersionCreated };
}

export async function archivePlan(planId: string, actorId: string = "super_admin"): Promise<Plan> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error(`Plan "${planId}" not found.`);

  const nowIso = new Date().toISOString();
  const updateData = {
    status: "ARCHIVED" as PlanStatus,
    isArchived: true,
    publicVisible: false,
    updatedAt: nowIso,
  };

  await updateDoc(planRef, updateData);

  await createBillingAuditLog(actorId, "super_admin", "PLAN_ARCHIVED", "plan", planId, {
    planId,
    archivedAt: nowIso,
  });

  broadcastPlanChange(planId);
  return { id: planSnap.id, ...planSnap.data(), ...updateData } as Plan;
}

export async function togglePlanStatus(
  planId: string,
  targetStatus: PlanStatus,
  actorId: string = "super_admin"
): Promise<Plan> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const planRef = doc(db, BILLING_COLLECTIONS.PLANS, planId);
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) throw new Error(`Plan "${planId}" not found.`);

  const nowIso = new Date().toISOString();
  await updateDoc(planRef, { status: targetStatus, updatedAt: nowIso });

  await createBillingAuditLog(actorId, "super_admin", "MANUAL_ACCESS_CHANGE", "plan", planId, {
    newStatus: targetStatus,
  });

  broadcastPlanChange(planId);
  return { id: planSnap.id, ...planSnap.data(), status: targetStatus, updatedAt: nowIso } as Plan;
}

export async function duplicatePlan(
  sourcePlanId: string,
  newSlug: string,
  newName?: string,
  actorId: string = "super_admin"
): Promise<Plan> {
  const sourcePlan = await getActivePlan(sourcePlanId);
  if (!sourcePlan) throw new Error(`Source plan "${sourcePlanId}" not found.`);

  const sourceVersion = await getActivePlanVersion(sourcePlanId);

  return await createPlan(
    {
      name: newName || `${sourcePlan.name} (Copy)`,
      slug: newSlug,
      description: sourcePlan.description,
      monthlyPricePaise: sourceVersion?.monthlyPrice || 0,
      annualPricePaise: sourceVersion?.annualPrice || 0,
      currency: sourceVersion?.currency || "INR",
      isPopular: false,
      publicVisible: false,
      displayOrder: (sourcePlan.displayOrder || 1) + 1,
      status: "INACTIVE",
      features: sourcePlan.features,
      limits: sourcePlan.limits,
    },
    actorId
  );
}

export async function getAllFeatureDefinitions(): Promise<FeatureDefinition[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(collection(db, BILLING_COLLECTIONS.FEATURE_DEFINITIONS));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FeatureDefinition[];
    }
  } catch (err) {
    console.warn("getAllFeatureDefinitions error:", err);
  }

  const nowIso = new Date().toISOString();

  return [
    { id: "student_management", key: "student_management", name: "Student Management", category: "core", description: "Manage student profiles & admissions", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
    { id: "teacher_management", key: "teacher_management", name: "Teacher Management", category: "core", description: "Manage teacher profiles & assignments", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
    { id: "attendance_automation", key: "attendance_automation", name: "Attendance Automation", category: "academic", description: "Track attendance for students & teachers", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
    { id: "school_dashboard", key: "school_dashboard", name: "School Dashboard", category: "core", description: "Real-time analytics for school admins", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
    { id: "notices_announcements", key: "notices_announcements", name: "Notices & Announcements", category: "academic", description: "Broadcast notices to students & teachers", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
    { id: "advanced_reports", key: "advanced_reports", name: "Advanced Reports", category: "analytics", description: "Detailed academic and attendance reporting", defaultValue: true, valueType: "boolean", createdAt: nowIso, updatedAt: nowIso },
  ];
}

/**
 * Safely deletes a pricing plan if no active schools or historical records reference it.
 * If referenced, safely archives the plan to protect subscriber and financial data integrity.
 */
export async function deletePlan(
  planId: string,
  actorId: string = "super_admin"
): Promise<{ success: boolean; archived?: boolean; message: string }> {
  let adminDb: any = null;
  if (typeof window === "undefined") {
    try {
      const adminModule = await import("@/lib/firebase/admin");
      adminDb = typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
    } catch (e) {}
  }

  let activeSubscriptionsCount = 0;
  let totalSubscriptionsCount = 0;
  let invoicesCount = 0;

  if (adminDb) {
    try {
      const activeSnap = await adminDb
        .collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)
        .where("planId", "==", planId)
        .where("status", "in", ["ACTIVE", "TRIAL", "GRACE_PERIOD", "PENDING"])
        .get();
      activeSubscriptionsCount = activeSnap.docs.length;

      const allSubSnap = await adminDb
        .collection(BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)
        .where("planId", "==", planId)
        .get();
      totalSubscriptionsCount = allSubSnap.docs.length;

      const invoiceSnap = await adminDb
        .collection(BILLING_COLLECTIONS.INVOICES)
        .where("planId", "==", planId)
        .get();
      invoicesCount = invoiceSnap.docs.length;
    } catch (e) {}
  } else {
    const db = getFirebaseDb();
    if (db) {
      try {
        const qActive = query(
          collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS),
          where("planId", "==", planId),
          where("status", "in", ["ACTIVE", "TRIAL", "GRACE_PERIOD", "PENDING"])
        );
        const activeSnap = await getDocs(qActive);
        activeSubscriptionsCount = activeSnap.docs.length;

        const qAll = query(
          collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS),
          where("planId", "==", planId)
        );
        const allSnap = await getDocs(qAll);
        totalSubscriptionsCount = allSnap.docs.length;
      } catch (e) {}
    }
  }

  // If referenced by any active/past subscription or invoice, ARCHIVE instead of hard deleting
  if (activeSubscriptionsCount > 0 || totalSubscriptionsCount > 0 || invoicesCount > 0) {
    await archivePlan(planId, actorId);
    return {
      success: true,
      archived: true,
      message: `Plan "${planId}" is referenced by ${activeSubscriptionsCount > 0 ? `${activeSubscriptionsCount} active subscription(s)` : `${totalSubscriptionsCount} historical subscription(s) / ${invoicesCount} invoice(s)`}. To preserve accounting integrity, the plan was safely ARCHIVED instead of deleted.`,
    };
  }

  // Clean unreferenced deletion
  if (adminDb) {
    await adminDb.collection(BILLING_COLLECTIONS.PLANS).doc(planId).delete();
    const verSnap = await adminDb.collection(BILLING_COLLECTIONS.PLAN_VERSIONS).where("planId", "==", planId).get();
    for (const doc of verSnap.docs) {
      await doc.ref.delete();
    }
  } else {
    const db = getFirebaseDb();
    if (db) {
      await deleteDoc(doc(db, BILLING_COLLECTIONS.PLANS, planId));
      const verSnap = await getDocs(query(collection(db, BILLING_COLLECTIONS.PLAN_VERSIONS), where("planId", "==", planId)));
      for (const d of verSnap.docs) {
        await deleteDoc(d.ref);
      }
    }
  }

  await createBillingAuditLog(actorId, "super_admin", "PLAN_DELETED", "plan", planId, {}).catch(() => {});

  broadcastPlanChange(planId);
  return { success: true, archived: false, message: `Plan "${planId}" deleted successfully.` };
}
