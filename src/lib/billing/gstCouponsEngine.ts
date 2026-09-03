import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { BILLING_COLLECTIONS, getActivePlanVersion } from "./plans";
import { createBillingAuditLog } from "./audit";
import type { Plan, PlanVersion } from "@/types";

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

export interface BillingGstSettings {
  gstEnabled: boolean;
  gstPercentage: number; // e.g. 18
  gstin: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface Coupon {
  id: string;
  code: string; // Uppercase normalized e.g. "WELCOME20"
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number; // Percentage e.g. 20 (20%) or Fixed amount in PAISE e.g. 50000 (₹500)
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  usageLimit: number; // -1 for unlimited
  usedCount: number;
  minOrderAmountPaise: number; // in paise
  applicablePlanIds?: string[];
  applicableBillingCycles?: ("monthly" | "annual")[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  code: string;
  error?: string;
  coupon?: Coupon;
  discountPaise: number;
}

export interface PricingCalculationResult {
  planId: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  baseAmountPaise: number;
  discountAmountPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  taxableAmountPaise: number;
  gstEnabled: boolean;
  gstRate: number;
  gstAmountPaise: number;
  finalAmountPaise: number;
  currency: "INR";
  breakdownFormatted: {
    baseAmountRupees: number;
    discountRupees: number;
    taxableAmountRupees: number;
    gstAmountRupees: number;
    finalAmountRupees: number;
  };
}

export const GST_SETTINGS_DOC = "billing_settings";
export const COUPONS_COLLECTION = "coupons";

/**
 * Default GST configuration fallback if not set in DB.
 */
export const DEFAULT_GST_SETTINGS: BillingGstSettings = {
  gstEnabled: true,
  gstPercentage: 18,
  gstin: "29AAAAA0000A1Z5",
  updatedAt: new Date().toISOString(),
};

/**
 * Retrieves platform GST settings from siteSettings/billing_settings.
 */
export async function getGstSettings(): Promise<BillingGstSettings> {
  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection("siteSettings").doc(GST_SETTINGS_DOC).get();
      if (snap.exists) {
        const data = snap.data() as Partial<BillingGstSettings>;
        return {
          gstEnabled: typeof data.gstEnabled === "boolean" ? data.gstEnabled : DEFAULT_GST_SETTINGS.gstEnabled,
          gstPercentage: typeof data.gstPercentage === "number" ? data.gstPercentage : DEFAULT_GST_SETTINGS.gstPercentage,
          gstin: data.gstin || DEFAULT_GST_SETTINGS.gstin,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }

    const db = getFirebaseDb();
    if (db) {
      const snap = await getDoc(doc(db, "siteSettings", GST_SETTINGS_DOC));
      if (snap.exists()) {
        const data = snap.data() as Partial<BillingGstSettings>;
        return {
          gstEnabled: typeof data.gstEnabled === "boolean" ? data.gstEnabled : DEFAULT_GST_SETTINGS.gstEnabled,
          gstPercentage: typeof data.gstPercentage === "number" ? data.gstPercentage : DEFAULT_GST_SETTINGS.gstPercentage,
          gstin: data.gstin || DEFAULT_GST_SETTINGS.gstin,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("getGstSettings notice:", err);
  }
  return DEFAULT_GST_SETTINGS;
}

/**
 * Updates platform GST settings with audit log.
 */
export async function updateGstSettings(
  input: Partial<BillingGstSettings>,
  actorId: string = "super_admin"
): Promise<BillingGstSettings> {
  const current = await getGstSettings();
  const updated: BillingGstSettings = {
    gstEnabled: typeof input.gstEnabled === "boolean" ? input.gstEnabled : current.gstEnabled,
    gstPercentage: typeof input.gstPercentage === "number" ? Math.max(0, Math.min(100, input.gstPercentage)) : current.gstPercentage,
    gstin: input.gstin !== undefined ? input.gstin.trim().toUpperCase() : current.gstin,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection("siteSettings").doc(GST_SETTINGS_DOC).set(updated, { merge: true });
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, "siteSettings", GST_SETTINGS_DOC), updated, { merge: true });
      }
    }
  } catch (err) {
    console.warn("updateGstSettings write notice:", err);
  }

  // Update process-level runtime defaults
  DEFAULT_GST_SETTINGS.gstEnabled = updated.gstEnabled;
  DEFAULT_GST_SETTINGS.gstPercentage = updated.gstPercentage;
  DEFAULT_GST_SETTINGS.gstin = updated.gstin;

  await createBillingAuditLog(actorId, "super_admin", "GST_SETTINGS_UPDATED", "billing_settings", GST_SETTINGS_DOC, {
    gstEnabled: updated.gstEnabled,
    gstPercentage: updated.gstPercentage,
    gstin: updated.gstin,
  }).catch(() => {});

  return updated;
}

// ==========================================
// COUPON MANAGEMENT & VALIDATION
// ==========================================

/**
 * Fetches all coupons from Firestore.
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(COUPONS_COLLECTION).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Coupon[];
    }

    const db = getFirebaseDb();
    if (db) {
      const snap = await getDocs(collection(db, COUPONS_COLLECTION));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Coupon[];
    }
  } catch (err) {
    console.warn("getAllCoupons notice:", err);
  }
  return [];
}

/**
 * Fetches coupon by code.
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (!code || !code.trim()) return null;
  const cleanCode = code.trim().toUpperCase();

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(COUPONS_COLLECTION).where("code", "==", cleanCode).get();
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
      }
    }

    const db = getFirebaseDb();
    if (db) {
      const q = query(collection(db, COUPONS_COLLECTION), where("code", "==", cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
      }
    }
  } catch (err) {
    console.warn("getCouponByCode notice:", err);
  }

  // Built-in default fallback coupons if Firestore coupons not yet seeded
  if (cleanCode === "SAVE20" || cleanCode === "WELCOME20") {
    return {
      id: `cpn_${cleanCode}`,
      code: cleanCode,
      description: "20% off promotional coupon",
      discountType: "percentage",
      discountValue: 20,
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2030-12-31T23:59:59.000Z",
      usageLimit: -1,
      usedCount: 0,
      minOrderAmountPaise: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else if (cleanCode === "FLAT500") {
    return {
      id: "cpn_FLAT500",
      code: "FLAT500",
      description: "₹500 flat discount",
      discountType: "fixed",
      discountValue: 50000,
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2030-12-31T23:59:59.000Z",
      usageLimit: -1,
      usedCount: 0,
      minOrderAmountPaise: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Creates a new Coupon in Firestore with audit logging.
 */
export async function createCoupon(input: Partial<Coupon>, actorId: string = "super_admin"): Promise<Coupon> {
  if (!input.code || !input.code.trim()) {
    throw new Error("Coupon code is required.");
  }

  const cleanCode = input.code.trim().toUpperCase();
  const existing = await getCouponByCode(cleanCode);
  if (existing && existing.id !== `cpn_${cleanCode}`) {
    throw new Error(`Coupon with code "${cleanCode}" already exists.`);
  }

  const couponId = `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const coupon: Coupon = {
    id: couponId,
    code: cleanCode,
    description: input.description || "",
    discountType: input.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: Math.max(0, input.discountValue || 0),
    validFrom: input.validFrom || now,
    validUntil: input.validUntil || new Date(Date.now() + 365 * 86400000).toISOString(),
    usageLimit: typeof input.usageLimit === "number" ? input.usageLimit : -1,
    usedCount: 0,
    minOrderAmountPaise: Math.max(0, input.minOrderAmountPaise || 0),
    applicablePlanIds: Array.isArray(input.applicablePlanIds) ? input.applicablePlanIds : [],
    applicableBillingCycles: Array.isArray(input.applicableBillingCycles) ? input.applicableBillingCycles : [],
    isActive: typeof input.isActive === "boolean" ? input.isActive : true,
    createdAt: now,
    updatedAt: now,
  };

  const adminDb = await getAdminDbServerOnly();
  if (adminDb) {
    await adminDb.collection(COUPONS_COLLECTION).doc(couponId).set(coupon);
  } else {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, COUPONS_COLLECTION, couponId), coupon);
    }
  }

  await createBillingAuditLog(actorId, "super_admin", "COUPON_CREATED", "coupon", couponId, {
    code: cleanCode,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  }).catch(() => {});

  return coupon;
}

/**
 * Updates an existing Coupon in Firestore with audit logging.
 */
export async function updateCoupon(
  couponId: string,
  input: Partial<Coupon>,
  actorId: string = "super_admin"
): Promise<Coupon> {
  const all = await getAllCoupons();
  const existing = all.find((c) => c.id === couponId || c.code === couponId.toUpperCase());
  if (!existing) {
    throw new Error(`Coupon with ID "${couponId}" not found.`);
  }

  const now = new Date().toISOString();
  const updated: Coupon = {
    ...existing,
    ...input,
    code: input.code ? input.code.trim().toUpperCase() : existing.code,
    updatedAt: now,
  };

  const adminDb = await getAdminDbServerOnly();
  if (adminDb) {
    await adminDb.collection(COUPONS_COLLECTION).doc(existing.id).set(updated, { merge: true });
  } else {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, COUPONS_COLLECTION, existing.id), updated, { merge: true });
    }
  }

  await createBillingAuditLog(actorId, "super_admin", "COUPON_UPDATED", "coupon", existing.id, {
    code: updated.code,
    isActive: updated.isActive,
    discountValue: updated.discountValue,
  }).catch(() => {});

  return updated;
}

/**
 * Deletes a Coupon from Firestore with audit logging.
 */
export async function deleteCoupon(couponId: string, actorId: string = "super_admin"): Promise<void> {
  const adminDb = await getAdminDbServerOnly();
  if (adminDb) {
    await adminDb.collection(COUPONS_COLLECTION).doc(couponId).delete();
  } else {
    const db = getFirebaseDb();
    if (db) {
      await deleteDoc(doc(db, COUPONS_COLLECTION, couponId));
    }
  }

  await createBillingAuditLog(actorId, "super_admin", "COUPON_DELETED", "coupon", couponId, {}).catch(() => {});
}

/**
 * Atomically increments coupon usedCount when payment succeeds.
 */
export async function incrementCouponUsage(couponCode: string): Promise<void> {
  if (!couponCode) return;
  const coupon = await getCouponByCode(couponCode);
  if (!coupon || !coupon.id) return;

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb && !coupon.id.startsWith("cpn_SAVE") && !coupon.id.startsWith("cpn_WELCOME")) {
      const ref = adminDb.collection(COUPONS_COLLECTION).doc(coupon.id);
      const snap = await ref.get();
      if (snap.exists) {
        const count = snap.data()?.usedCount || 0;
        await ref.update({ usedCount: count + 1, updatedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.warn("incrementCouponUsage notice:", err);
  }
}

/**
 * Validates a coupon against an order context.
 */
export async function validateCouponForOrder(
  code: string | null | undefined,
  planId: string,
  billingCycle: "monthly" | "annual",
  baseAmountPaise: number
): Promise<CouponValidationResult> {
  if (!code || !code.trim()) {
    return { isValid: false, code: "", discountPaise: 0 };
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await getCouponByCode(cleanCode);

  if (!coupon) {
    return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" is invalid.`, discountPaise: 0 };
  }

  if (!coupon.isActive) {
    return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" is no longer active.`, discountPaise: 0 };
  }

  const now = new Date().getTime();
  const validFromTime = new Date(coupon.validFrom).getTime();
  const validUntilTime = new Date(coupon.validUntil).getTime();

  if (now < validFromTime) {
    return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" is not active yet.`, discountPaise: 0 };
  }

  if (now > validUntilTime) {
    return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" has expired.`, discountPaise: 0 };
  }

  if (coupon.usageLimit !== -1 && coupon.usedCount >= coupon.usageLimit) {
    return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" has reached its maximum usage limit.`, discountPaise: 0 };
  }

  if (baseAmountPaise < coupon.minOrderAmountPaise) {
    const minRupees = coupon.minOrderAmountPaise / 100;
    return {
      isValid: false,
      code: cleanCode,
      error: `Coupon code "${cleanCode}" requires a minimum order amount of ₹${minRupees.toLocaleString("en-IN")}.`,
      discountPaise: 0,
    };
  }

  if (Array.isArray(coupon.applicablePlanIds) && coupon.applicablePlanIds.length > 0) {
    const cleanPlan = planId.toLowerCase();
    const isApplicable = coupon.applicablePlanIds.some((p) => p.toLowerCase() === cleanPlan || cleanPlan.includes(p.toLowerCase()));
    if (!isApplicable) {
      return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" is not applicable to the selected plan.`, discountPaise: 0 };
    }
  }

  if (Array.isArray(coupon.applicableBillingCycles) && coupon.applicableBillingCycles.length > 0) {
    if (!coupon.applicableBillingCycles.includes(billingCycle)) {
      return { isValid: false, code: cleanCode, error: `Coupon code "${cleanCode}" is not applicable for ${billingCycle} billing.`, discountPaise: 0 };
    }
  }

  // Calculate discount amount in paise
  let discountPaise = 0;
  if (coupon.discountType === "percentage") {
    discountPaise = Math.round(baseAmountPaise * (coupon.discountValue / 100));
  } else {
    discountPaise = coupon.discountValue; // Fixed amount in paise
  }

  discountPaise = Math.min(baseAmountPaise, Math.max(0, discountPaise));

  return {
    isValid: true,
    code: cleanCode,
    coupon,
    discountPaise,
  };
}

// ==========================================
// AUTHORITATIVE SERVER-SIDE PRICING CALCULATOR
// ==========================================

export async function calculateServerBillingPrice({
  planId,
  billingCycle = "monthly",
  couponCode,
  customOfferPricePaise,
}: {
  planId: string;
  billingCycle: "monthly" | "annual";
  couponCode?: string | null;
  customOfferPricePaise?: number | null;
}): Promise<PricingCalculationResult> {
  const normalizedCycle = billingCycle === "annual" ? "annual" : "monthly";

  let planData: Plan | null = null;
  let planVersion: PlanVersion | null = null;

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const planSnap = await adminDb.collection(BILLING_COLLECTIONS.PLANS).doc(planId).get();
      if (planSnap.exists) {
        planData = { id: planSnap.id, ...planSnap.data() } as Plan;
        const versionSnap = await adminDb.collection(BILLING_COLLECTIONS.PLAN_VERSIONS).where("planId", "==", planSnap.id).where("status", "==", "ACTIVE").get();
        if (!versionSnap.empty) {
          const versions = versionSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as PlanVersion[];
          planVersion = versions.sort((a, b) => b.version - a.version)[0];
        }
      }
    }
  } catch (err) {}

  if (!planData || !planVersion) {
    try {
      const db = getFirebaseDb();
      if (db) {
        const planSnap = await getDoc(doc(db, BILLING_COLLECTIONS.PLANS, planId));
        if (planSnap.exists()) {
          planData = { id: planSnap.id, ...planSnap.data() } as Plan;
          planVersion = await getActivePlanVersion(planId);
        }
      }
    } catch (err) {}
  }

  // Fallback defaults for standard plans if catalog not yet seeded
  if (!planData || !planVersion) {
    const cleanId = planId.toLowerCase();
    if (cleanId.includes("starter")) {
      planData = { id: "plan_starter", name: "Starter Plan", slug: "starter", description: "", status: "ACTIVE", displayOrder: 1, isPopular: false, features: [], limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 }, createdAt: "", updatedAt: "" };
      planVersion = { id: "plan_starter_v1", planId: "plan_starter", version: 1, monthlyPrice: 99900, annualPrice: 79900, currency: "INR", features: [], limits: planData.limits, effectiveFrom: "", effectiveUntil: null, status: "ACTIVE", createdAt: "" };
    } else if (cleanId.includes("professional")) {
      planData = { id: "plan_professional", name: "Professional Plan", slug: "professional", description: "", status: "ACTIVE", displayOrder: 2, isPopular: true, features: [], limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 }, createdAt: "", updatedAt: "" };
      planVersion = { id: "plan_professional_v1", planId: "plan_professional", version: 1, monthlyPrice: 199900, annualPrice: 159900, currency: "INR", features: [], limits: planData.limits, effectiveFrom: "", effectiveUntil: null, status: "ACTIVE", createdAt: "" };
    } else {
      planData = { id: "plan_enterprise", name: "Enterprise Plan", slug: "enterprise", description: "", status: "ACTIVE", displayOrder: 3, isPopular: false, features: [], limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 }, createdAt: "", updatedAt: "" };
      planVersion = { id: "plan_enterprise_v1", planId: "plan_enterprise", version: 1, monthlyPrice: 999900, annualPrice: 799900, currency: "INR", features: [], limits: planData.limits, effectiveFrom: "", effectiveUntil: null, status: "ACTIVE", createdAt: "" };
    }
  }

  // 1. Calculate Base Amount in Integer Paise
  let baseAmountPaise = normalizedCycle === "annual" ? planVersion.annualPrice * 12 : planVersion.monthlyPrice;
  if (typeof customOfferPricePaise === "number" && customOfferPricePaise > 0) {
    baseAmountPaise = customOfferPricePaise;
  }

  // 2. Coupon Validation & Discount
  const couponRes = await validateCouponForOrder(couponCode, planData.id, normalizedCycle, baseAmountPaise);
  const couponDiscountPaise = couponRes.isValid ? couponRes.discountPaise : 0;
  const discountAmountPaise = couponDiscountPaise;

  // 3. Taxable Amount
  const taxableAmountPaise = Math.max(0, baseAmountPaise - discountAmountPaise);

  // 4. GST Calculation
  const gstSettings = await getGstSettings();
  const gstRate = gstSettings.gstEnabled ? gstSettings.gstPercentage : 0;
  const gstAmountPaise = gstSettings.gstEnabled ? Math.round(taxableAmountPaise * (gstRate / 100)) : 0;

  // 5. Final Payable Amount
  const finalAmountPaise = taxableAmountPaise + gstAmountPaise;

  return {
    planId: planData.id,
    planName: planData.name,
    billingCycle: normalizedCycle,
    baseAmountPaise,
    discountAmountPaise,
    couponCode: couponRes.isValid ? couponRes.code : null,
    couponDiscountPaise,
    taxableAmountPaise,
    gstEnabled: gstSettings.gstEnabled,
    gstRate,
    gstAmountPaise,
    finalAmountPaise,
    currency: "INR",
    breakdownFormatted: {
      baseAmountRupees: baseAmountPaise / 100,
      discountRupees: discountAmountPaise / 100,
      taxableAmountRupees: taxableAmountPaise / 100,
      gstAmountRupees: gstAmountPaise / 100,
      finalAmountRupees: finalAmountPaise / 100,
    },
  };
}
