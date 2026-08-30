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
import type { Plan, PlanVersion, FeatureDefinition, PlanLimits, PlanStatus, BillingCycle } from "@/types";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { createBillingAuditLog } from "./audit";

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
  displayOrder?: number;
  status?: PlanStatus;
  features: string[];
  limits: PlanLimits;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  displayOrder?: number;
  isPopular?: boolean;
  status?: PlanStatus;
  monthlyPricePaise?: number;
  annualPricePaise?: number;
  features?: string[];
  limits?: PlanLimits;
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
function validatePlanLimitsAndFeatures(limits: PlanLimits, features: string[]): { cleanLimits: PlanLimits; cleanFeatures: string[] } {
  for (const [key, val] of Object.entries(limits)) {
    if (typeof val !== "number" || isNaN(val) || val < -1) {
      throw new Error(`Invalid capacity limit for "${key}". Limits must be a non-negative integer or -1 for Unlimited.`);
    }
  }

  const cleanFeatures = Array.from(new Set(features.map((f) => f.trim()).filter(Boolean)));
  return { cleanLimits: limits, cleanFeatures };
}

/**
 * Initializes default plans, plan versions, and feature definitions into Firestore if not present.
 */
export async function initializeDefaultBillingCatalog(): Promise<void> {
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
        features: ["student_management", "teacher_management", "basic_attendance", "school_dashboard"],
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
        features: [
          "student_management",
          "teacher_management",
          "attendance_automation",
          "school_dashboard",
          "notices_announcements",
          "advanced_reports",
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
        features: [
          "student_management",
          "teacher_management",
          "attendance_automation",
          "school_dashboard",
          "notices_announcements",
          "advanced_reports",
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
      }
    }
  } catch (error) {
    console.warn("Failed to initialize billing catalog:", error);
  }
}

export async function getActivePlan(planId: string): Promise<Plan | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  const planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, planId));
  if (!planSnap.exists()) return null;
  const plan = { id: planSnap.id, ...planSnap.data() } as Plan;
  return plan.status === "ACTIVE" ? plan : null;
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
  if (!db) return [];

  await initializeDefaultBillingCatalog();

  try {
    const snap = await getDocs(collection(db, BILLING_COLLECTIONS.PLANS));
    const allPlans = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Plan[];
    return allPlans
      .filter((p) => p.status === "ACTIVE")
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } catch (err) {
    console.warn("getAllPlans error:", err);
    return [];
  }
}

export async function getAllPlansAdmin(): Promise<Plan[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  await initializeDefaultBillingCatalog();

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
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const snap = await getDocs(
      query(collection(db, BILLING_COLLECTIONS.PLAN_VERSIONS), where("planId", "==", planId))
    );

    if (snap.empty) return null;

    const versions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanVersion[];
    const activeVersions = versions.filter((v) => v.status === "ACTIVE");

    if (activeVersions.length === 0) return null;
    return activeVersions.sort((a, b) => b.version - a.version)[0];
  } catch (err) {
    console.warn("getActivePlanVersion error:", err);
    return null;
  }
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

  const { cleanLimits, cleanFeatures } = validatePlanLimitsAndFeatures(input.limits, input.features);

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
    features: cleanFeatures,
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
  });

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

  const isPriceOrFeatureChange =
    (input.monthlyPricePaise !== undefined && input.monthlyPricePaise !== currentVersion.monthlyPrice) ||
    (input.annualPricePaise !== undefined && input.annualPricePaise !== currentVersion.annualPrice) ||
    (input.features !== undefined && JSON.stringify(input.features) !== JSON.stringify(currentVersion.features)) ||
    (input.limits !== undefined && JSON.stringify(input.limits) !== JSON.stringify(currentVersion.limits));

  let cleanLimits = currentPlan.limits;
  let cleanFeatures = currentPlan.features;

  if (input.limits || input.features) {
    const validated = validatePlanLimitsAndFeatures(
      input.limits || currentPlan.limits,
      input.features || currentPlan.features
    );
    cleanLimits = validated.cleanLimits;
    cleanFeatures = validated.cleanFeatures;
  }

  const nowIso = new Date().toISOString();

  const updatedPlanData: Partial<Plan> = {
    name: input.name !== undefined ? input.name.trim() : currentPlan.name,
    description: input.description !== undefined ? input.description.trim() : currentPlan.description,
    displayOrder: input.displayOrder !== undefined ? input.displayOrder : currentPlan.displayOrder,
    isPopular: input.isPopular !== undefined ? input.isPopular : currentPlan.isPopular,
    status: input.status !== undefined ? input.status : currentPlan.status,
    features: cleanFeatures,
    limits: cleanLimits,
    updatedAt: nowIso,
  };

  await updateDoc(planRef, updatedPlanData);
  const updatedPlan = { ...currentPlan, ...updatedPlanData };

  let newVersionCreated = false;

  if (isPriceOrFeatureChange) {
    const nextVersionNum = currentVersion.version + 1;
    const newVersionId = `${planId}_v${nextVersionNum}`;

    await updateDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, currentVersion.id), {
      status: "DEPRECATED",
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
      limits: cleanLimits,
      effectiveFrom: nowIso,
      effectiveUntil: null,
      status: "ACTIVE",
      createdAt: nowIso,
    };

    await setDoc(doc(db, BILLING_COLLECTIONS.PLAN_VERSIONS, newVersionId), newPlanVersion);
    newVersionCreated = true;

    await createBillingAuditLog(actorId, "super_admin", "PLAN_VERSION_CREATED", "planVersion", newVersionId, {
      planId,
      oldVersion: currentVersion.version,
      newVersion: nextVersionNum,
      monthlyPrice: newPlanVersion.monthlyPrice,
    });
  }

  await createBillingAuditLog(actorId, "super_admin", "PLAN_UPDATED", "plan", planId, {
    planName: updatedPlan.name,
    newVersionCreated,
  });

  return { plan: updatedPlan, newVersionCreated };
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
      displayOrder: sourcePlan.displayOrder + 1,
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
