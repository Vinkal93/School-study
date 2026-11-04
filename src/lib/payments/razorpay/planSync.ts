import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { loadRazorpayCredentials } from "./razorpayClient";
import { createRazorpayPlan } from "./subscriptions";

export interface RazorpayPlanMapping {
  id: string; // Mapping doc ID e.g. "plan_starter_v1_monthly_test"
  internalPlanId: string;
  planVersionId: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  amountPaise: number;
  currency: string;
  razorpayPlanId: string;
  gatewayEnvironment: "test" | "live";
  syncStatus: "SYNCED" | "FAILED" | "PENDING";
  lastSyncAt: string;
  lastSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetOrCreatePlanMappingInput {
  planId: string;
  planVersionId: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  amountPaise: number;
  currency?: string;
}

/**
 * Normalizes document ID for the plan mapping table.
 */
function buildMappingDocId(
  planId: string,
  planVersionId: string,
  billingCycle: "monthly" | "annual",
  env: "test" | "live"
): string {
  const cleanPlanId = planId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanVersion = planVersionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${cleanPlanId}_${cleanVersion}_${billingCycle}_${env}`;
}

/**
 * Authoritatively retrieves or provisions a reusable Razorpay provider plan mapping.
 * Prevents redundant plan creation on the payment gateway while preserving plan versioning.
 */
export async function getOrCreateRazorpayPlanMapping(
  input: GetOrCreatePlanMappingInput
): Promise<{ razorpayPlanId: string; isNew: boolean; mapping: RazorpayPlanMapping }> {
  const {
    planId,
    planVersionId,
    planName,
    billingCycle,
    amountPaise,
    currency = "INR",
  } = input;

  const creds = await loadRazorpayCredentials();
  const environment: "test" | "live" = creds.isLiveMode ? "live" : "test";
  const mappingDocId = buildMappingDocId(planId, planVersionId, billingCycle, environment);

  const adminDb = getSafeAdminDb();

  // 1. Try to find existing mapping in Admin Firestore
  if (adminDb) {
    try {
      const snap = await adminDb.collection("razorpayPlanMappings").doc(mappingDocId).get();
      if (snap.exists) {
        const data = snap.data() as RazorpayPlanMapping;
        // Verify that amount matches exactly; if matching, reuse existing Razorpay Plan ID
        if (data.amountPaise === amountPaise && data.razorpayPlanId && data.syncStatus === "SYNCED") {
          return { razorpayPlanId: data.razorpayPlanId, isNew: false, mapping: data };
        }
      }
    } catch (err) {
      console.warn("[Razorpay PlanSync] Error querying adminDb for existing mapping:", err);
    }
  } else {
    // Client SDK fallback if running in client/edge environment
    try {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        const snap = await getDoc(doc(clientDb, "razorpayPlanMappings", mappingDocId));
        if (snap.exists()) {
          const data = snap.data() as RazorpayPlanMapping;
          if (data.amountPaise === amountPaise && data.razorpayPlanId && data.syncStatus === "SYNCED") {
            return { razorpayPlanId: data.razorpayPlanId, isNew: false, mapping: data };
          }
        }
      }
    } catch (err) {
      console.warn("[Razorpay PlanSync] Error querying clientDb for existing mapping:", err);
    }
  }

  // 2. If no valid existing mapping exists, provision a new plan on Razorpay
  const period = billingCycle === "annual" ? "yearly" : "monthly";
  const interval = 1;

  let razorpayPlan: any = null;
  try {
    razorpayPlan = await createRazorpayPlan({
      period,
      interval,
      name: `${planName} (${billingCycle.toUpperCase()})`,
      amountPaise,
      currency,
    });
  } catch (err: any) {
    console.error(`[Razorpay PlanSync] Failed to create Razorpay plan for ${mappingDocId}:`, err);
    throw new Error(`Failed to synchronize plan with Razorpay: ${err?.message || "Gateway error"}`);
  }

  if (!razorpayPlan || !razorpayPlan.id) {
    throw new Error("Razorpay returned invalid plan entity without ID.");
  }

  const now = new Date().toISOString();
  const mapping: RazorpayPlanMapping = {
    id: mappingDocId,
    internalPlanId: planId,
    planVersionId,
    planName,
    billingCycle,
    amountPaise,
    currency,
    razorpayPlanId: razorpayPlan.id,
    gatewayEnvironment: environment,
    syncStatus: "SYNCED",
    lastSyncAt: now,
    lastSyncError: null,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Persist mapping for future reuse
  if (adminDb) {
    await adminDb
      .collection("razorpayPlanMappings")
      .doc(mappingDocId)
      .set(mapping, { merge: true })
      .catch((e) => console.warn("[Razorpay PlanSync] Error persisting mapping in adminDb:", e));
  } else {
    try {
      const clientDb = getFirebaseDb();
      if (clientDb) {
        await setDoc(doc(clientDb, "razorpayPlanMappings", mappingDocId), mapping, { merge: true });
      }
    } catch (e) {
      console.warn("[Razorpay PlanSync] Error persisting mapping in clientDb:", e);
    }
  }

  return { razorpayPlanId: razorpayPlan.id, isNew: true, mapping };
}
