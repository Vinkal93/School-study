import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CustomOfferRecord, CustomPlanAccessRecord } from "@/types/reports";
import { BILLING_COLLECTIONS } from "./plans";
import { createBillingAuditLog } from "./audit";
import { createAccessOverride } from "./subscriptionAdjustmentEngine";

export interface CreateCustomOfferInput {
  schoolId: string;
  schoolName: string;
  originalPlanId: string;
  offerPlanId: string;
  originalPricePaise: number;
  customPricePaise: number;
  durationDays?: number;
  couponCode?: string;
  expiresInDays?: number;
  notes?: string;
}

/**
 * Super Admin: Creates a school-specific custom pricing offer.
 * Does NOT alter the global plan price.
 */
export async function createCustomOffer(
  input: CreateCustomOfferInput,
  actorId: string = "super_admin"
): Promise<CustomOfferRecord> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  if (!input.schoolId) throw new Error("schoolId is required.");
  if (typeof input.customPricePaise !== "number" || input.customPricePaise < 0) {
    throw new Error("A valid non-negative customPricePaise is required.");
  }

  const durationDays = input.durationDays || 30;
  const expiresInDays = input.expiresInDays || 14;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 86400000).toISOString();
  const discountPaise = Math.max(0, input.originalPricePaise - input.customPricePaise);

  const offerRef = doc(collection(db, BILLING_COLLECTIONS.CUSTOM_OFFERS));
  const offerRecord: CustomOfferRecord = {
    id: offerRef.id,
    schoolId: input.schoolId,
    schoolName: input.schoolName || input.schoolId,
    originalPlanId: input.originalPlanId,
    offerPlanId: input.offerPlanId,
    originalPricePaise: input.originalPricePaise,
    customPricePaise: input.customPricePaise,
    durationDays,
    discountPaise,
    couponCode: input.couponCode?.trim().toUpperCase(),
    status: "ACTIVE",
    expiresAt,
    notes: input.notes?.trim() || "Super Admin custom offer",
    createdBy: actorId,
    createdAt: now.toISOString(),
  };

  await setDoc(offerRef, offerRecord);

  try {
    await createBillingAuditLog(
      actorId,
      "super_admin",
      "CUSTOM_OFFER_CREATED" as any,
      "schoolSubscription",
      input.schoolId,
      {
        offerId: offerRef.id,
        offerPlanId: input.offerPlanId,
        customPricePaise: input.customPricePaise,
        discountPaise,
        expiresAt,
      }
    );
  } catch (auditErr) {
    console.warn("Notice: custom offer audit log write deferred:", auditErr);
  }

  return offerRecord;
}

/**
 * Checks if a school has an active unexpired custom offer for a plan.
 */
export async function getSchoolActiveCustomOffer(
  schoolId: string,
  planId?: string
): Promise<CustomOfferRecord | null> {
  const db = getFirebaseDb();
  if (!db || !schoolId) return null;

  try {
    const q = query(
      collection(db, BILLING_COLLECTIONS.CUSTOM_OFFERS),
      where("schoolId", "==", schoolId),
      where("status", "==", "ACTIVE")
    );
    const snap = await getDocs(q);
    const now = Date.now();

    const activeOffers: CustomOfferRecord[] = [];
    for (const d of snap.docs) {
      const data = d.data() as CustomOfferRecord;
      if (new Date(data.expiresAt).getTime() > now) {
        if (!planId || data.offerPlanId === planId) {
          activeOffers.push(data);
        }
      }
    }

    // Return the best/latest active offer
    return activeOffers.length > 0 ? activeOffers[0] : null;
  } catch (err) {
    console.warn("Notice: lookup active custom offer failed:", err);
    return null;
  }
}

/**
 * Marks a custom offer as claimed upon successful payment / order fulfillment.
 */
export async function claimCustomOffer(
  offerId: string,
  schoolId: string,
  orderId: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !offerId) return;

  try {
    const offerRef = doc(db, BILLING_COLLECTIONS.CUSTOM_OFFERS, offerId);
    await updateDoc(offerRef, {
      status: "CLAIMED",
      claimedAt: new Date().toISOString(),
      orderId,
    });
  } catch (err) {
    console.warn("Failed to mark custom offer as claimed:", err);
  }
}

/**
 * Super Admin: Grants Demo or Custom Plan Access without requiring payment.
 * Automatically restores normal plan upon expiration.
 */
export async function grantDemoOrCustomAccess(
  schoolId: string,
  schoolName: string,
  accessTier: "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM",
  durationDays: number = 7,
  featuresGranted: string[] = ["advanced_reports", "attendance_automation", "notices_announcements"],
  reason: string = "Demo access preview",
  actorId: string = "super_admin"
): Promise<CustomPlanAccessRecord> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const now = new Date();
  const endAt = new Date(now.getTime() + durationDays * 86400000).toISOString();

  // 1. Create underlying Access Overrides for each granted feature
  for (const feat of featuresGranted) {
    await createAccessOverride(schoolId, {
      type: "FEATURE_GRANT",
      featureKey: feat,
      durationDays,
      reason: `[${accessTier} DEMO] ${reason}`,
      createdBy: actorId,
    });
  }

  // 2. Create Temporary Full Access Override
  await createAccessOverride(schoolId, {
    type: "TEMPORARY_ACCESS",
    durationDays,
    reason: `[${accessTier} DEMO] ${reason}`,
    createdBy: actorId,
  });

  // 3. Record in customPlanAccess ledger
  const accessRef = doc(collection(db, BILLING_COLLECTIONS.CUSTOM_ACCESS));
  const record: CustomPlanAccessRecord = {
    id: accessRef.id,
    schoolId,
    schoolName: schoolName || schoolId,
    accessTier,
    featuresGranted,
    durationDays,
    startAt: now.toISOString(),
    endAt,
    isDemo: true,
    reason,
    status: "ACTIVE",
    createdBy: actorId,
    createdAt: now.toISOString(),
  };

  await setDoc(accessRef, record);

  try {
    await createBillingAuditLog(
      actorId,
      "super_admin",
      "CUSTOM_ACCESS_GRANTED" as any,
      "schoolSubscription",
      schoolId,
      {
        accessId: accessRef.id,
        accessTier,
        durationDays,
        featuresGranted,
        endAt,
      }
    );
  } catch (auditErr) {
    console.warn("Notice: demo access audit log write deferred:", auditErr);
  }

  return record;
}

/**
 * Super Admin: Lists all custom offers.
 */
export async function listAllCustomOffers(): Promise<CustomOfferRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(collection(db, BILLING_COLLECTIONS.CUSTOM_OFFERS));
    const list = snap.docs.map((d) => d.data() as CustomOfferRecord);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn("Failed to load custom offers:", err);
    return [];
  }
}

/**
 * Super Admin: Lists all custom plan / demo access records.
 */
export async function listAllCustomPlanAccess(): Promise<CustomPlanAccessRecord[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(collection(db, BILLING_COLLECTIONS.CUSTOM_ACCESS));
    const list = snap.docs.map((d) => d.data() as CustomPlanAccessRecord);
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn("Failed to load custom plan access records:", err);
    return [];
  }
}
