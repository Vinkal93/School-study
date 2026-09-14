import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import type { FeatureRolloutDefinition, RolloutStage } from "@/types/ai";

export const DEFAULT_AI_ROLLOUT: FeatureRolloutDefinition = {
  id: "rollout_ai_mode",
  featureKey: "ai_mode",
  name: "AI Mode Assistant",
  description: "Context-aware school assistant for students, teachers, and administrators",
  stage: "ACTIVE",
  targetPlans: ["ALL"],
  targetPortals: ["super_admin", "school_admin", "teacher", "student", "parent", "accountant"],
  targetInstituteIds: [],
  rolloutPercentage: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

/**
 * Retrieves the rollout configuration for a feature.
 */
export async function getFeatureRollout(featureKey: string): Promise<FeatureRolloutDefinition> {
  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb.collection("feature_rollouts").doc(featureKey).get();
      if (snap.exists) {
        return { ...DEFAULT_AI_ROLLOUT, ...(snap.data() as FeatureRolloutDefinition) };
      }
    } catch (e) {}
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      const snap = await getDoc(doc(clientDb, "feature_rollouts", featureKey));
      if (snap.exists()) {
        return { ...DEFAULT_AI_ROLLOUT, ...(snap.data() as FeatureRolloutDefinition) };
      }
    } catch (e) {}
  }

  return DEFAULT_AI_ROLLOUT;
}

/**
 * Updates or creates a feature rollout definition.
 */
export async function saveFeatureRollout(
  rollout: FeatureRolloutDefinition,
  performerUid: string
): Promise<void> {
  const updated = {
    ...rollout,
    updatedAt: new Date().toISOString(),
    updatedBy: performerUid,
  };

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb.collection("feature_rollouts").doc(rollout.featureKey).set(updated, { merge: true });
    return;
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    await setDoc(doc(clientDb, "feature_rollouts", rollout.featureKey), updated, { merge: true });
  }
}

/**
 * Checks whether a given tenant, plan, and portal pass the feature's rollout rules.
 */
export function evaluateRollout(params: {
  rollout?: FeatureRolloutDefinition;
  instituteId?: string;
  portal: string;
  planId?: string;
}): { allowed: boolean; reason?: string } {
  const rollout = params.rollout || DEFAULT_AI_ROLLOUT;
  const { instituteId, portal, planId } = params;

  if (rollout.stage === "DISABLED") {
    return { allowed: false, reason: `Feature '${rollout.name}' is currently disabled.` };
  }

  if (rollout.stage === "PAUSED") {
    return { allowed: false, reason: `Feature '${rollout.name}' is temporarily paused.` };
  }

  if (rollout.stage === "DRAFT") {
    return { allowed: false, reason: `Feature '${rollout.name}' is in draft status.` };
  }

  // Check portal eligibility
  if (rollout.targetPortals && rollout.targetPortals.length > 0) {
    if (!rollout.targetPortals.includes(portal as any)) {
      return { allowed: false, reason: `Feature is not enabled for portal '${portal}'.` };
    }
  }

  // Check plan eligibility
  if (rollout.targetPlans && !rollout.targetPlans.includes("ALL")) {
    if (!planId || !rollout.targetPlans.includes(planId)) {
      return { allowed: false, reason: `Feature is not included in current subscription plan.` };
    }
  }

  // Check institute targeting
  if (rollout.targetInstituteIds && rollout.targetInstituteIds.length > 0) {
    if (!instituteId || !rollout.targetInstituteIds.includes(instituteId)) {
      return { allowed: false, reason: `Feature is not rolled out to this institute.` };
    }
  }

  // Check rollout percentage (hash instituteId or user for deterministic sticky rollout)
  if (rollout.rolloutPercentage < 100) {
    const hashTarget = instituteId || portal;
    let hash = 0;
    for (let i = 0; i < hashTarget.length; i++) {
      hash = (hash << 5) - hash + hashTarget.charCodeAt(i);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % 100;
    if (bucket >= rollout.rolloutPercentage) {
      return { allowed: false, reason: `Feature rollout cohort restriction.` };
    }
  }

  return { allowed: true };
}
