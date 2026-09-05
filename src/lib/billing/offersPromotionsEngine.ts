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
  limit,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { BILLING_COLLECTIONS } from "./plans";
import { createBillingAuditLog } from "./audit";
import { getGstSettings } from "./gstCouponsEngine";
import type {
  OfferPromotion,
  PromotionCampaign,
  CouponRedemptionRecord,
  OffersDashboardMetrics,
  ValidateCouponInput,
  ValidateCouponResponse,
  CreateOfferPromotionInput,
  OfferStatus,
  CampaignStatus,
} from "@/types/offerPromotion";

export const OFFERS_COLLECTION = "offersPromotions";
export const CAMPAIGNS_COLLECTION = "promotionCampaigns";
export const REDEMPTIONS_COLLECTION = "couponRedemptions";

async function getAdminDbServerOnly() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function" ? adminModule.getSafeAdminDb() : null;
  } catch (e) {
    return null;
  }
}

// Global in-memory fallback stores for local testing / zero-credential serverless resilience
const g = globalThis as any;
if (!g.__SCHOOL_STUDY_OFFERS_STORE__) {
  g.__SCHOOL_STUDY_OFFERS_STORE__ = new Map<string, OfferPromotion>();
}
if (!g.__SCHOOL_STUDY_CAMPAIGNS_STORE__) {
  g.__SCHOOL_STUDY_CAMPAIGNS_STORE__ = new Map<string, PromotionCampaign>();
}
if (!g.__SCHOOL_STUDY_REDEMPTIONS_STORE__) {
  g.__SCHOOL_STUDY_REDEMPTIONS_STORE__ = new Map<string, CouponRedemptionRecord>();
}

const memoryOffers: Map<string, OfferPromotion> = g.__SCHOOL_STUDY_OFFERS_STORE__;
const memoryCampaigns: Map<string, PromotionCampaign> = g.__SCHOOL_STUDY_CAMPAIGNS_STORE__;
const memoryRedemptions: Map<string, CouponRedemptionRecord> = g.__SCHOOL_STUDY_REDEMPTIONS_STORE__;

/**
 * Seed initial standard default offers if stores are empty
 */
function ensureSeededDefaults() {
  if (memoryCampaigns.size === 0) {
    const defaultCampaign: PromotionCampaign = {
      id: "CMP-FESTIVE26",
      name: "Festive Season 2026",
      description: "Annual festive promotion for academic onboarding",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-12-31T23:59:59.000Z",
      budgetLimitPaise: 50000000, // ₹5,00,000
      totalSpentPaise: 0,
      totalRevenuePaise: 0,
      attachedOfferIds: ["OFR-DIWALI50"],
      targetPlans: ["ALL"],
      status: "ACTIVE",
      notes: "High conversion annual festive package",
      createdBy: "system",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    memoryCampaigns.set(defaultCampaign.id, defaultCampaign);
  }

  if (memoryOffers.size === 0) {
    const nowIso = new Date().toISOString();
    const defaults: OfferPromotion[] = [
      {
        id: "OFR-WELCOME20",
        name: "Welcome New School 20% Off",
        title: "Welcome 20% Off",
        description: "20% discount on any monthly or annual plan for all schools",
        code: "WELCOME20",
        discountType: "PERCENTAGE",
        discountValue: 20,
        maxDiscountCapPaise: 200000, // ₹2,000 max cap
        minOrderAmountPaise: 0,
        maxTotalRedemptions: 1000,
        maxRedemptionsPerSchool: 1,
        maxRedemptionsPerUser: 1,
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2030-12-31T23:59:59.000Z",
        applicablePlans: ["ALL"],
        applicableBillingCycles: ["all"],
        targetAudience: "ALL",
        autoApply: false,
        priority: 1,
        isStackable: false,
        status: "ACTIVE",
        termsAndConditions: "Valid on first transaction or renewal. Cannot combine with other coupons.",
        usedCount: 0,
        totalDiscountGivenPaise: 0,
        totalRevenueGeneratedPaise: 0,
        createdBy: "system",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "OFR-FLAT500",
        name: "Flat ₹500 Instant Discount",
        title: "Flat ₹500 Off",
        description: "Instant ₹500 off on subscriptions over ₹1,000",
        code: "FLAT500",
        discountType: "FIXED_AMOUNT",
        discountValue: 50000, // ₹500
        minOrderAmountPaise: 100000, // ₹1,000
        maxTotalRedemptions: 500,
        maxRedemptionsPerSchool: 1,
        maxRedemptionsPerUser: 1,
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2030-12-31T23:59:59.000Z",
        applicablePlans: ["ALL"],
        applicableBillingCycles: ["all"],
        targetAudience: "ALL",
        autoApply: false,
        priority: 2,
        isStackable: false,
        status: "ACTIVE",
        termsAndConditions: "Minimum purchase ₹1,000 required.",
        usedCount: 0,
        totalDiscountGivenPaise: 0,
        totalRevenueGeneratedPaise: 0,
        createdBy: "system",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "OFR-DIWALI50",
        name: "Festive Season 50% Off",
        title: "Festive 50% Special",
        description: "50% off on Professional and Enterprise annual plans up to ₹5,000",
        code: "DIWALI50",
        discountType: "PERCENTAGE",
        discountValue: 50,
        maxDiscountCapPaise: 500000, // ₹5,000
        minOrderAmountPaise: 500000, // ₹5,000
        maxTotalRedemptions: 250,
        maxRedemptionsPerSchool: 1,
        maxRedemptionsPerUser: 1,
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-12-31T23:59:59.000Z",
        applicablePlans: ["plan_professional", "plan_enterprise"],
        applicableBillingCycles: ["annual"],
        targetAudience: "ALL",
        autoApply: false,
        priority: 10,
        isStackable: false,
        campaignId: "CMP-FESTIVE26",
        campaignName: "Festive Season 2026",
        status: "ACTIVE",
        termsAndConditions: "Annual subscriptions only. Maximum discount ₹5,000.",
        usedCount: 0,
        totalDiscountGivenPaise: 0,
        totalRevenueGeneratedPaise: 0,
        createdBy: "system",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: "OFR-STARTUP100",
        name: "New School Early Bird",
        title: "New School ₹1,000 Off",
        description: "Exclusive ₹1,000 onboarding subsidy for newly registered schools",
        code: "STARTUP100",
        discountType: "FIXED_AMOUNT",
        discountValue: 100000, // ₹1,000
        minOrderAmountPaise: 200000, // ₹2,000
        maxTotalRedemptions: 100,
        maxRedemptionsPerSchool: 1,
        maxRedemptionsPerUser: 1,
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2027-12-31T23:59:59.000Z",
        applicablePlans: ["ALL"],
        applicableBillingCycles: ["all"],
        targetAudience: "NEW_CUSTOMERS_ONLY",
        autoApply: false,
        priority: 5,
        isStackable: false,
        status: "ACTIVE",
        termsAndConditions: "Applicable only to schools making their first subscription purchase.",
        usedCount: 0,
        totalDiscountGivenPaise: 0,
        totalRevenueGeneratedPaise: 0,
        createdBy: "system",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    for (const d of defaults) {
      memoryOffers.set(d.id, d);
    }
  }
}

ensureSeededDefaults();

/**
 * Computes dynamic status for an offer based on dates and limits
 */
export function computeEffectiveOfferStatus(offer: OfferPromotion): OfferStatus {
  if (offer.status === "ARCHIVED" || offer.status === "PAUSED" || offer.status === "DRAFT") {
    return offer.status;
  }

  const nowMs = Date.now();
  if (offer.endDate) {
    const endMs = new Date(offer.endDate).getTime();
    if (nowMs > endMs) return "EXPIRED";
  }

  if (offer.startDate) {
    const startMs = new Date(offer.startDate).getTime();
    if (nowMs < startMs) return "SCHEDULED";
  }

  if (offer.maxTotalRedemptions !== -1 && (offer.usedCount || 0) >= offer.maxTotalRedemptions) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

/**
 * Generates human-friendly ID e.g. OFR-829103
 */
export function generatePromoOfferId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `OFR-${rand}`;
}

export function generateCampaignId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `CMP-${rand}`;
}

// ==========================================
// OFFER PROMOTIONS CRUD
// ==========================================

export async function getAllOffers(filters?: {
  status?: string;
  search?: string;
  planId?: string;
  discountType?: string;
  campaignId?: string;
}): Promise<OfferPromotion[]> {
  ensureSeededDefaults();
  let list: OfferPromotion[] = [];

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(OFFERS_COLLECTION).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as OfferPromotion[];
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDocs(collection(db, OFFERS_COLLECTION));
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as OfferPromotion[];
      }
    }
  } catch (e) {
    // Fallback to memory
  }

  // Merge in-memory defaults if not present
  for (const [id, rec] of memoryOffers.entries()) {
    if (!list.some((o) => o.id === id || o.code === rec.code)) {
      list.push(rec);
    }
  }

  // Compute live effective status
  list = list.map((o) => ({
    ...o,
    status: computeEffectiveOfferStatus(o),
  }));

  // Apply filters
  if (filters?.status && filters.status !== "ALL") {
    list = list.filter((o) => o.status === filters.status);
  }

  if (filters?.discountType && filters.discountType !== "ALL") {
    list = list.filter((o) => o.discountType === filters.discountType);
  }

  if (filters?.campaignId && filters.campaignId !== "ALL") {
    list = list.filter((o) => o.campaignId === filters.campaignId);
  }

  if (filters?.planId && filters.planId !== "ALL") {
    const targetPlan = filters.planId.toLowerCase();
    list = list.filter(
      (o) =>
        o.applicablePlans.includes("ALL") ||
        o.applicablePlans.some((p) => p.toLowerCase() === targetPlan)
    );
  }

  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        (o.name || "").toLowerCase().includes(q) ||
        (o.title || "").toLowerCase().includes(q) ||
        (o.description || "").toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function getOfferById(id: string): Promise<OfferPromotion | null> {
  if (!id) return null;
  ensureSeededDefaults();

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const docSnap = await adminDb.collection(OFFERS_COLLECTION).doc(id).get();
      if (docSnap.exists) {
        const data = { id: docSnap.id, ...docSnap.data() } as OfferPromotion;
        return { ...data, status: computeEffectiveOfferStatus(data) };
      }
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDoc(doc(db, OFFERS_COLLECTION, id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as OfferPromotion;
          return { ...data, status: computeEffectiveOfferStatus(data) };
        }
      }
    }
  } catch (e) {}

  const mem = memoryOffers.get(id);
  if (mem) return { ...mem, status: computeEffectiveOfferStatus(mem) };
  return null;
}

export async function getOfferByCode(code: string): Promise<OfferPromotion | null> {
  if (!code || !code.trim()) return null;
  const clean = code.trim().toUpperCase();
  ensureSeededDefaults();

  const all = await getAllOffers();
  return all.find((o) => o.code.toUpperCase() === clean) || null;
}

export async function createOffer(
  input: CreateOfferPromotionInput,
  actorId: string = "super_admin"
): Promise<OfferPromotion> {
  if (!input.name || !input.name.trim()) throw new Error("Offer name is required.");
  if (!input.code || !input.code.trim()) throw new Error("Coupon code is required.");
  if (typeof input.discountValue !== "number" || input.discountValue < 0) {
    throw new Error("Discount value must be a non-negative number.");
  }

  const cleanCode = input.code.trim().toUpperCase();
  const existing = await getOfferByCode(cleanCode);
  if (existing) {
    throw new Error(`An offer with coupon code "${cleanCode}" already exists.`);
  }

  const id = generatePromoOfferId();
  const now = new Date().toISOString();

  const offer: OfferPromotion = {
    id,
    name: input.name.trim(),
    title: input.title?.trim() || input.name.trim(),
    description: input.description?.trim() || "",
    code: cleanCode,
    discountType: input.discountType || "PERCENTAGE",
    discountValue: input.discountValue,
    maxDiscountCapPaise: input.maxDiscountCapPaise,
    minOrderAmountPaise: input.minOrderAmountPaise || 0,
    maxTotalRedemptions: typeof input.maxTotalRedemptions === "number" ? input.maxTotalRedemptions : -1,
    maxRedemptionsPerSchool: typeof input.maxRedemptionsPerSchool === "number" ? input.maxRedemptionsPerSchool : 1,
    maxRedemptionsPerUser: typeof input.maxRedemptionsPerUser === "number" ? input.maxRedemptionsPerUser : 1,
    startDate: input.startDate || now,
    endDate: input.endDate || null,
    applicablePlans: Array.isArray(input.applicablePlans) && input.applicablePlans.length > 0 ? input.applicablePlans : ["ALL"],
    applicableBillingCycles: Array.isArray(input.applicableBillingCycles) && input.applicableBillingCycles.length > 0 ? input.applicableBillingCycles : ["all"],
    targetAudience: input.targetAudience || "ALL",
    targetSchoolIds: input.targetSchoolIds || [],
    autoApply: Boolean(input.autoApply),
    priority: typeof input.priority === "number" ? input.priority : 1,
    isStackable: Boolean(input.isStackable),
    campaignId: input.campaignId,
    status: input.status || "ACTIVE",
    termsAndConditions: input.termsAndConditions || "",
    notes: input.notes || "",
    internalReason: input.internalReason || "",
    usedCount: 0,
    totalDiscountGivenPaise: 0,
    totalRevenueGeneratedPaise: 0,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };

  offer.status = computeEffectiveOfferStatus(offer);
  memoryOffers.set(id, offer);

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(OFFERS_COLLECTION).doc(id).set(offer);
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, OFFERS_COLLECTION, id), offer);
      }
    }
  } catch (err: any) {
    console.warn("createOffer Firestore write notice:", err?.message);
  }

  await createBillingAuditLog(actorId, "super_admin", "OFFER_CREATED" as any, "coupon" as any, id, {
    code: cleanCode,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
  }).catch(() => {});

  return offer;
}

export async function updateOffer(
  id: string,
  input: Partial<CreateOfferPromotionInput>,
  actorId: string = "super_admin"
): Promise<OfferPromotion> {
  const existing = await getOfferById(id);
  if (!existing) throw new Error(`Offer "${id}" not found.`);

  if (input.code && input.code.trim().toUpperCase() !== existing.code) {
    const codeCheck = await getOfferByCode(input.code);
    if (codeCheck && codeCheck.id !== id) {
      throw new Error(`Coupon code "${input.code.toUpperCase()}" is already used by another offer.`);
    }
  }

  const now = new Date().toISOString();
  const updated: OfferPromotion = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    code: input.code !== undefined ? input.code.trim().toUpperCase() : existing.code,
    discountType: input.discountType || existing.discountType,
    discountValue: input.discountValue !== undefined ? input.discountValue : existing.discountValue,
    maxDiscountCapPaise: input.maxDiscountCapPaise !== undefined ? input.maxDiscountCapPaise : existing.maxDiscountCapPaise,
    minOrderAmountPaise: input.minOrderAmountPaise !== undefined ? input.minOrderAmountPaise : existing.minOrderAmountPaise,
    maxTotalRedemptions: input.maxTotalRedemptions !== undefined ? input.maxTotalRedemptions : existing.maxTotalRedemptions,
    maxRedemptionsPerSchool: input.maxRedemptionsPerSchool !== undefined ? input.maxRedemptionsPerSchool : existing.maxRedemptionsPerSchool,
    maxRedemptionsPerUser: input.maxRedemptionsPerUser !== undefined ? input.maxRedemptionsPerUser : existing.maxRedemptionsPerUser,
    startDate: input.startDate || existing.startDate,
    endDate: input.endDate !== undefined ? input.endDate : existing.endDate,
    applicablePlans: input.applicablePlans || existing.applicablePlans,
    applicableBillingCycles: input.applicableBillingCycles || existing.applicableBillingCycles,
    targetAudience: input.targetAudience || existing.targetAudience,
    targetSchoolIds: input.targetSchoolIds || existing.targetSchoolIds,
    autoApply: input.autoApply !== undefined ? input.autoApply : existing.autoApply,
    priority: input.priority !== undefined ? input.priority : existing.priority,
    isStackable: input.isStackable !== undefined ? input.isStackable : existing.isStackable,
    campaignId: input.campaignId !== undefined ? input.campaignId : existing.campaignId,
    status: input.status || existing.status,
    termsAndConditions: input.termsAndConditions !== undefined ? input.termsAndConditions : existing.termsAndConditions,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    internalReason: input.internalReason !== undefined ? input.internalReason : existing.internalReason,
    updatedAt: now,
  };

  updated.status = computeEffectiveOfferStatus(updated);
  memoryOffers.set(id, updated);

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(OFFERS_COLLECTION).doc(id).set(updated, { merge: true });
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, OFFERS_COLLECTION, id), updated, { merge: true });
      }
    }
  } catch (err: any) {
    console.warn("updateOffer Firestore write notice:", err?.message);
  }

  await createBillingAuditLog(actorId, "super_admin", "OFFER_UPDATED" as any, "coupon" as any, id, {
    code: updated.code,
    status: updated.status,
  }).catch(() => {});

  return updated;
}

export async function setOfferStatus(
  id: string,
  status: OfferStatus,
  actorId: string = "super_admin"
): Promise<OfferPromotion> {
  return updateOffer(id, { status }, actorId);
}

export async function duplicateOffer(
  id: string,
  newCode?: string,
  actorId: string = "super_admin"
): Promise<OfferPromotion> {
  const orig = await getOfferById(id);
  if (!orig) throw new Error(`Offer "${id}" not found.`);

  const generatedCode = newCode?.trim().toUpperCase() || `${orig.code}_COPY_${Math.floor(100 + Math.random() * 900)}`;
  return createOffer(
    {
      name: `${orig.name} (Copy)`,
      title: orig.title ? `${orig.title} (Copy)` : undefined,
      description: orig.description,
      code: generatedCode,
      discountType: orig.discountType,
      discountValue: orig.discountValue,
      maxDiscountCapPaise: orig.maxDiscountCapPaise,
      minOrderAmountPaise: orig.minOrderAmountPaise,
      maxTotalRedemptions: orig.maxTotalRedemptions,
      maxRedemptionsPerSchool: orig.maxRedemptionsPerSchool,
      maxRedemptionsPerUser: orig.maxRedemptionsPerUser,
      startDate: new Date().toISOString(),
      endDate: orig.endDate,
      applicablePlans: [...orig.applicablePlans],
      applicableBillingCycles: [...orig.applicableBillingCycles],
      targetAudience: orig.targetAudience,
      targetSchoolIds: orig.targetSchoolIds ? [...orig.targetSchoolIds] : [],
      autoApply: orig.autoApply,
      priority: orig.priority,
      isStackable: orig.isStackable,
      campaignId: orig.campaignId,
      status: "DRAFT",
      termsAndConditions: orig.termsAndConditions,
      notes: `Duplicated from ${orig.id} (${orig.code})`,
      internalReason: `Cloned by ${actorId}`,
    },
    actorId
  );
}

export async function archiveOffer(id: string, actorId: string = "super_admin"): Promise<OfferPromotion> {
  return setOfferStatus(id, "ARCHIVED", actorId);
}

// ==========================================
// CAMPAIGNS MANAGEMENT
// ==========================================

export async function getAllCampaigns(): Promise<PromotionCampaign[]> {
  ensureSeededDefaults();
  let list: PromotionCampaign[] = [];

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      const snap = await adminDb.collection(CAMPAIGNS_COLLECTION).get();
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PromotionCampaign[];
    } else {
      const db = getFirebaseDb();
      if (db) {
        const snap = await getDocs(collection(db, CAMPAIGNS_COLLECTION));
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PromotionCampaign[];
      }
    }
  } catch (e) {}

  for (const [id, rec] of memoryCampaigns.entries()) {
    if (!list.some((c) => c.id === id)) {
      list.push(rec);
    }
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

export async function createCampaign(
  input: Partial<PromotionCampaign>,
  actorId: string = "super_admin"
): Promise<PromotionCampaign> {
  if (!input.name || !input.name.trim()) throw new Error("Campaign name is required.");

  const id = generateCampaignId();
  const now = new Date().toISOString();

  const campaign: PromotionCampaign = {
    id,
    name: input.name.trim(),
    description: input.description?.trim() || "",
    startDate: input.startDate || now,
    endDate: input.endDate || null,
    budgetLimitPaise: input.budgetLimitPaise,
    totalSpentPaise: 0,
    totalRevenuePaise: 0,
    attachedOfferIds: Array.isArray(input.attachedOfferIds) ? input.attachedOfferIds : [],
    targetPlans: Array.isArray(input.targetPlans) ? input.targetPlans : ["ALL"],
    status: input.status || "ACTIVE",
    notes: input.notes || "",
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
  };

  memoryCampaigns.set(id, campaign);

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(CAMPAIGNS_COLLECTION).doc(id).set(campaign);
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, CAMPAIGNS_COLLECTION, id), campaign);
      }
    }
  } catch (err: any) {
    console.warn("createCampaign Firestore write notice:", err?.message);
  }

  await createBillingAuditLog(actorId, "super_admin", "CAMPAIGN_CREATED" as any, "coupon" as any, id, {
    name: campaign.name,
    status: campaign.status,
  }).catch(() => {});

  return campaign;
}

export async function updateCampaign(
  id: string,
  input: Partial<PromotionCampaign>,
  actorId: string = "super_admin"
): Promise<PromotionCampaign> {
  const all = await getAllCampaigns();
  const existing = all.find((c) => c.id === id);
  if (!existing) throw new Error(`Campaign "${id}" not found.`);

  const now = new Date().toISOString();
  const updated: PromotionCampaign = {
    ...existing,
    ...input,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    updatedAt: now,
  };

  memoryCampaigns.set(id, updated);

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      await adminDb.collection(CAMPAIGNS_COLLECTION).doc(id).set(updated, { merge: true });
    } else {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, CAMPAIGNS_COLLECTION, id), updated, { merge: true });
      }
    }
  } catch (err: any) {
    console.warn("updateCampaign Firestore write notice:", err?.message);
  }

  return updated;
}

export async function setCampaignStatus(
  id: string,
  status: CampaignStatus,
  actorId: string = "super_admin"
): Promise<PromotionCampaign> {
  return updateCampaign(id, { status }, actorId);
}

// ==========================================
// REDEMPTIONS & AUDIT LOGS
// ==========================================

export async function getAllRedemptions(filters?: {
  offerId?: string;
  schoolId?: string;
  limit?: number;
}): Promise<CouponRedemptionRecord[]> {
  let list: CouponRedemptionRecord[] = [];

  try {
    const adminDb = await getAdminDbServerOnly();
    if (adminDb) {
      let q: any = adminDb.collection(REDEMPTIONS_COLLECTION);
      if (filters?.offerId) q = q.where("offerId", "==", filters.offerId);
      if (filters?.schoolId) q = q.where("schoolId", "==", filters.schoolId);
      const snap = await q.get();
      list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as CouponRedemptionRecord[];
    } else {
      const db = getFirebaseDb();
      if (db) {
        let q: any = collection(db, REDEMPTIONS_COLLECTION);
        if (filters?.offerId) q = query(q, where("offerId", "==", filters.offerId));
        if (filters?.schoolId) q = query(q, where("schoolId", "==", filters.schoolId));
        const snap = await getDocs(q);
        list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CouponRedemptionRecord[];
      }
    }
  } catch (e) {}

  for (const [id, rec] of memoryRedemptions.entries()) {
    if (!list.some((r) => r.id === id)) {
      if (!filters?.offerId || rec.offerId === filters.offerId) {
        if (!filters?.schoolId || rec.schoolId === filters.schoolId) {
          list.push(rec);
        }
      }
    }
  }

  list.sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
  if (filters?.limit && filters.limit > 0) {
    list = list.slice(0, filters.limit);
  }
  return list;
}

// ==========================================
// AUTHORITATIVE CHECKOUT VALIDATOR
// ==========================================

export async function validateOfferForCheckout(
  input: ValidateCouponInput
): Promise<ValidateCouponResponse> {
  const { code, planId, billingCycle, schoolId, userId, isFirstPurchase } = input;
  const cleanCode = code ? code.trim().toUpperCase() : "";

  const emptyResponse: ValidateCouponResponse = {
    isValid: false,
    code: cleanCode,
    discountPaise: 0,
    discountRupees: 0,
    baseAmountPaise: input.baseAmountPaise || 0,
    taxableAmountPaise: input.baseAmountPaise || 0,
    gstAmountPaise: 0,
    finalAmountPaise: input.baseAmountPaise || 0,
    finalAmountRupees: (input.baseAmountPaise || 0) / 100,
  };

  if (!cleanCode) return { ...emptyResponse, error: "Please provide a coupon code." };

  const offer = await getOfferByCode(cleanCode);
  if (!offer) {
    return { ...emptyResponse, error: `Coupon code "${cleanCode}" is invalid.` };
  }

  const effectiveStatus = computeEffectiveOfferStatus(offer);
  if (effectiveStatus !== "ACTIVE") {
    if (effectiveStatus === "SCHEDULED") {
      return { ...emptyResponse, error: `Coupon code "${cleanCode}" has not started yet.` };
    }
    if (effectiveStatus === "EXPIRED") {
      return { ...emptyResponse, error: `Coupon code "${cleanCode}" has expired or reached maximum redemptions.` };
    }
    return { ...emptyResponse, error: `Coupon code "${cleanCode}" is no longer active.` };
  }

  // Check global redemptions cap
  if (offer.maxTotalRedemptions !== -1 && (offer.usedCount || 0) >= offer.maxTotalRedemptions) {
    return { ...emptyResponse, error: `Coupon code "${cleanCode}" has reached its total usage limit.` };
  }

  // Check Plan applicability
  if (!offer.applicablePlans.includes("ALL")) {
    const normPlan = planId.toLowerCase();
    const matches = offer.applicablePlans.some(
      (p) => p.toLowerCase() === normPlan || normPlan.includes(p.toLowerCase())
    );
    if (!matches) {
      return {
        ...emptyResponse,
        error: `Coupon code "${cleanCode}" is not applicable to the selected plan (${planId}).`,
      };
    }
  }

  // Check Billing Cycle applicability
  if (!offer.applicableBillingCycles.includes("all")) {
    if (!offer.applicableBillingCycles.includes(billingCycle)) {
      return {
        ...emptyResponse,
        error: `Coupon code "${cleanCode}" is valid only for ${offer.applicableBillingCycles.join(" or ")} billing.`,
      };
    }
  }

  // Check Target Audience
  if (offer.targetAudience === "NEW_CUSTOMERS_ONLY") {
    if (isFirstPurchase === false) {
      return {
        ...emptyResponse,
        error: `Coupon code "${cleanCode}" is valid for new customer first purchases only.`,
      };
    }
  }

  if (offer.targetAudience === "SPECIFIC_SCHOOLS" && schoolId) {
    if (!offer.targetSchoolIds?.includes(schoolId)) {
      return {
        ...emptyResponse,
        error: `Coupon code "${cleanCode}" is not applicable to this school.`,
      };
    }
  }

  // Check Per-School & Per-User redemption limits
  if (schoolId && offer.maxRedemptionsPerSchool !== -1) {
    const schoolRedemptions = await getAllRedemptions({ offerId: offer.id, schoolId });
    if (schoolRedemptions.length >= offer.maxRedemptionsPerSchool) {
      return {
        ...emptyResponse,
        error: `Coupon code "${cleanCode}" has already been redeemed the maximum allowed times by this school.`,
      };
    }
  }

  // Compute Base Amount if not provided
  let baseAmountPaise = input.baseAmountPaise;
  if (!baseAmountPaise || baseAmountPaise <= 0) {
    const cleanP = planId.toLowerCase();
    if (cleanP.includes("starter")) {
      baseAmountPaise = billingCycle === "annual" ? 79900 * 12 : 99900;
    } else if (cleanP.includes("professional")) {
      baseAmountPaise = billingCycle === "annual" ? 159900 * 12 : 199900;
    } else {
      baseAmountPaise = billingCycle === "annual" ? 799900 * 12 : 999900;
    }
  }

  // Check Minimum Order Amount
  if (offer.minOrderAmountPaise > 0 && baseAmountPaise < offer.minOrderAmountPaise) {
    const minRupees = offer.minOrderAmountPaise / 100;
    return {
      ...emptyResponse,
      baseAmountPaise,
      error: `Coupon "${cleanCode}" requires a minimum order amount of ₹${minRupees.toLocaleString("en-IN")}.`,
    };
  }

  // Compute Authoritative Discount
  let discountPaise = 0;
  let appliedCap = false;

  if (offer.discountType === "PERCENTAGE") {
    discountPaise = Math.round(baseAmountPaise * (offer.discountValue / 100));
    if (offer.maxDiscountCapPaise && offer.maxDiscountCapPaise > 0) {
      if (discountPaise > offer.maxDiscountCapPaise) {
        discountPaise = offer.maxDiscountCapPaise;
        appliedCap = true;
      }
    }
  } else if (offer.discountType === "FIXED_AMOUNT") {
    discountPaise = offer.discountValue;
  } else if (offer.discountType === "CUSTOM_PLAN_PRICE") {
    discountPaise = Math.max(0, baseAmountPaise - offer.discountValue);
  } else {
    discountPaise = 0;
  }

  discountPaise = Math.min(baseAmountPaise, Math.max(0, discountPaise));

  // Authoritative Tax & Final Calculation
  const taxableAmountPaise = Math.max(0, baseAmountPaise - discountPaise);
  const gstSettings = await getGstSettings();
  const gstRate = gstSettings.gstEnabled ? gstSettings.gstPercentage : 0;
  const gstAmountPaise = gstSettings.gstEnabled ? Math.round(taxableAmountPaise * (gstRate / 100)) : 0;
  const finalAmountPaise = taxableAmountPaise + gstAmountPaise;

  return {
    isValid: true,
    code: offer.code,
    offerId: offer.id,
    discountPaise,
    discountRupees: discountPaise / 100,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    appliedCap,
    baseAmountPaise,
    taxableAmountPaise,
    gstAmountPaise,
    finalAmountPaise,
    finalAmountRupees: finalAmountPaise / 100,
    terms: offer.termsAndConditions,
  };
}

// ==========================================
// CONCURRENCY-SAFE ATOMIC REDEMPTION
// ==========================================

export async function executeAtomicCouponRedemption(params: {
  couponCode: string;
  schoolId: string;
  schoolName?: string;
  userId: string;
  userEmail?: string;
  orderId: string;
  paymentId: string;
  invoiceId?: string;
  planId: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  baseAmountPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  finalAmountPaise: number;
}): Promise<{ success: boolean; redemptionId: string; offerId: string }> {
  const {
    couponCode,
    schoolId,
    schoolName,
    userId,
    userEmail,
    orderId,
    paymentId,
    invoiceId,
    planId,
    planName,
    billingCycle,
    baseAmountPaise,
    discountAmountPaise,
    taxAmountPaise,
    finalAmountPaise,
  } = params;

  if (!couponCode) throw new Error("couponCode is required for redemption.");
  const offer = await getOfferByCode(couponCode);
  if (!offer) throw new Error(`Offer for coupon "${couponCode}" not found.`);

  const redemptionId = `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const redemptionRecord: CouponRedemptionRecord = {
    id: redemptionId,
    offerId: offer.id,
    couponCode: offer.code,
    campaignId: offer.campaignId,
    schoolId,
    schoolName: schoolName || schoolId,
    userId,
    userEmail: userEmail || "",
    orderId,
    paymentId,
    invoiceId: invoiceId || "",
    planId,
    planName,
    billingCycle,
    baseAmountPaise,
    discountAmountPaise,
    taxAmountPaise,
    finalAmountPaise,
    redeemedAt: now,
    status: "SUCCESS",
  };

  const adminDb = await getAdminDbServerOnly();
  if (adminDb) {
    // Execute atomic transaction in Admin DB
    const offerRef = adminDb.collection(OFFERS_COLLECTION).doc(offer.id);
    const redemptionRef = adminDb.collection(REDEMPTIONS_COLLECTION).doc(redemptionId);

    await adminDb.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(offerRef);
      if (snap.exists) {
        const liveData = snap.data() as OfferPromotion;
        if (
          liveData.maxTotalRedemptions !== -1 &&
          (liveData.usedCount || 0) >= liveData.maxTotalRedemptions
        ) {
          throw new Error(`Offer "${offer.code}" has already reached its maximum total redemptions.`);
        }

        const newUsedCount = (liveData.usedCount || 0) + 1;
        const newDiscountTotal = (liveData.totalDiscountGivenPaise || 0) + discountAmountPaise;
        const newRevenueTotal = (liveData.totalRevenueGeneratedPaise || 0) + finalAmountPaise;

        transaction.update(offerRef, {
          usedCount: newUsedCount,
          totalDiscountGivenPaise: newDiscountTotal,
          totalRevenueGeneratedPaise: newRevenueTotal,
          updatedAt: now,
        });
      } else {
        // First write to Firestore if only existed in memory
        transaction.set(offerRef, {
          ...offer,
          usedCount: (offer.usedCount || 0) + 1,
          totalDiscountGivenPaise: (offer.totalDiscountGivenPaise || 0) + discountAmountPaise,
          totalRevenueGeneratedPaise: (offer.totalRevenueGeneratedPaise || 0) + finalAmountPaise,
          updatedAt: now,
        });
      }

      transaction.set(redemptionRef, redemptionRecord);
    });

    // Update campaign if attached
    if (offer.campaignId) {
      try {
        const campRef = adminDb.collection(CAMPAIGNS_COLLECTION).doc(offer.campaignId);
        const campSnap = await campRef.get();
        if (campSnap.exists) {
          const camp = campSnap.data() as PromotionCampaign;
          await campRef.update({
            totalSpentPaise: (camp.totalSpentPaise || 0) + discountAmountPaise,
            totalRevenuePaise: (camp.totalRevenuePaise || 0) + finalAmountPaise,
            updatedAt: now,
          });
        }
      } catch (e) {}
    }
  }

  // Update in-memory stores
  memoryRedemptions.set(redemptionId, redemptionRecord);
  const memOffer = memoryOffers.get(offer.id);
  if (memOffer) {
    memOffer.usedCount = (memOffer.usedCount || 0) + 1;
    memOffer.totalDiscountGivenPaise = (memOffer.totalDiscountGivenPaise || 0) + discountAmountPaise;
    memOffer.totalRevenueGeneratedPaise = (memOffer.totalRevenueGeneratedPaise || 0) + finalAmountPaise;
    memOffer.updatedAt = now;
  }

  if (offer.campaignId) {
    const memCamp = memoryCampaigns.get(offer.campaignId);
    if (memCamp) {
      memCamp.totalSpentPaise = (memCamp.totalSpentPaise || 0) + discountAmountPaise;
      memCamp.totalRevenuePaise = (memCamp.totalRevenuePaise || 0) + finalAmountPaise;
      memCamp.updatedAt = now;
    }
  }

  // Write billing audit log
  await createBillingAuditLog(userId || "school_admin", "school_admin", "COUPON_REDEEMED" as any, "coupon" as any, redemptionId, {
    offerId: offer.id,
    couponCode: offer.code,
    orderId,
    paymentId,
    discountAmountPaise,
    finalAmountPaise,
  }).catch(() => {});

  return { success: true, redemptionId, offerId: offer.id };
}

// ==========================================
// DASHBOARD METRICS
// ==========================================

export async function getOffersDashboardMetrics(): Promise<OffersDashboardMetrics> {
  const [offers, campaigns, redemptions] = await Promise.all([
    getAllOffers(),
    getAllCampaigns(),
    getAllRedemptions(),
  ]);

  let activeOffers = 0;
  let scheduledOffers = 0;
  let expiredOffers = 0;
  let pausedOffers = 0;
  let totalDiscountGivenPaise = 0;
  let totalRevenueGeneratedPaise = 0;

  for (const o of offers) {
    if (o.status === "ACTIVE") activeOffers++;
    else if (o.status === "SCHEDULED") scheduledOffers++;
    else if (o.status === "EXPIRED") expiredOffers++;
    else if (o.status === "PAUSED") pausedOffers++;

    totalDiscountGivenPaise += o.totalDiscountGivenPaise || 0;
    totalRevenueGeneratedPaise += o.totalRevenueGeneratedPaise || 0;
  }

  const totalRedemptions = redemptions.length || offers.reduce((acc, o) => acc + (o.usedCount || 0), 0);
  const totalOffers = offers.length;
  const conversionRate = totalOffers > 0 ? parseFloat(((totalRedemptions / totalOffers) * 100).toFixed(1)) : 0;

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;

  return {
    totalOffers,
    activeOffers,
    scheduledOffers,
    expiredOffers,
    pausedOffers,
    totalRedemptions,
    totalDiscountGivenPaise,
    totalDiscountGivenRupees: totalDiscountGivenPaise / 100,
    totalRevenueGeneratedPaise,
    totalRevenueGeneratedRupees: totalRevenueGeneratedPaise / 100,
    conversionRate,
    totalCampaigns: campaigns.length,
    activeCampaigns,
  };
}
