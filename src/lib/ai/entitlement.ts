import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { AiGlobalSettings, AiEntitlementResult, AiPortalType } from "@/types/ai";
import { DEFAULT_AI_SETTINGS } from "@/types/ai";
import { getFeatureRollout, evaluateRollout } from "./rollout";
import { getEffectiveEntitlement } from "@/lib/billing/entitlement";
import type { AuthenticatedUser } from "@/lib/auth/serverAuth";

/**
 * Retrieves the global AI configuration from Firestore with in-memory caching.
 */
let cachedSettings: { data: AiGlobalSettings; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function getAiGlobalSettings(): Promise<AiGlobalSettings> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < CACHE_TTL_MS) {
    return cachedSettings.data;
  }

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb.collection("siteSettings").doc("ai_settings").get();
      if (snap.exists) {
        const data = { ...DEFAULT_AI_SETTINGS, ...(snap.data() as AiGlobalSettings) };
        cachedSettings = { data, fetchedAt: Date.now() };
        return data;
      }
    } catch (e) {}
  }

  const clientDb = getFirebaseDb();
  if (clientDb) {
    try {
      const snap = await getDoc(doc(clientDb, "siteSettings", "ai_settings"));
      if (snap.exists()) {
        const data = { ...DEFAULT_AI_SETTINGS, ...(snap.data() as AiGlobalSettings) };
        cachedSettings = { data, fetchedAt: Date.now() };
        return data;
      }
    } catch (e) {}
  }

  return DEFAULT_AI_SETTINGS;
}

/**
 * Updates the global AI settings in Firestore.
 */
export async function saveAiGlobalSettings(
  settings: Partial<AiGlobalSettings>,
  performerUid: string
): Promise<AiGlobalSettings> {
  const current = await getAiGlobalSettings();
  const updated: AiGlobalSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: performerUid,
  };

  const adminDb = getSafeAdminDb();
  if (adminDb) {
    await adminDb.collection("siteSettings").doc("ai_settings").set(updated, { merge: true });
  } else {
    const clientDb = getFirebaseDb();
    if (clientDb) {
      await setDoc(doc(clientDb, "siteSettings", "ai_settings"), updated, { merge: true });
    }
  }

  cachedSettings = { data: updated, fetchedAt: Date.now() };
  return updated;
}

/**
 * Maps app user role to AI Portal Type.
 */
export function mapRoleToAiPortal(role: string): AiPortalType {
  switch (role) {
    case "super_admin":
      return "super_admin";
    case "admin":
    case "school_admin":
      return "school_admin";
    case "teacher":
      return "teacher";
    case "student":
      return "student";
    case "parent":
      return "parent";
    case "accountant":
      return "accountant";
    case "receptionist":
      return "receptionist";
    default:
      return "student";
  }
}

export interface CanAccessAiParams {
  user: AuthenticatedUser;
  portalOverride?: AiPortalType;
}

/**
 * Authoritative 5-tier AI Access Entitlement Resolver.
 *
 * Tier 1: Emergency & Global AI Mode Switch
 * Tier 2: Super Admin Portal Matrix Configuration
 * Tier 3: Subscription Plan Entitlement & Quota
 * Tier 4: Feature Rollout Status & Cohort Targeting
 * Tier 5: Role & Institute Authorization Verification
 */
export async function canAccessAiFeature(params: CanAccessAiParams): Promise<AiEntitlementResult> {
  const { user, portalOverride } = params;
  const portal = portalOverride || mapRoleToAiPortal(user.role);

  // 1. Super Admin always has full administrative oversight access
  if (user.role === "super_admin") {
    return {
      allowed: true,
      status: 200,
      portal: "super_admin",
      planId: "FULL_CONTROL",
      planName: "Super Admin Control",
      quotaRemaining: Infinity,
      quotaTotal: -1,
      rolloutState: "ACTIVE",
    };
  }

  // 2. Fetch Global AI Configuration
  const settings = await getAiGlobalSettings();
  if (!settings.enabledGlobally) {
    return {
      allowed: false,
      reason: "AI Mode is currently disabled platform-wide by the administrator.",
      status: 503,
      portal,
    };
  }

  // 3. Portal Accessibility Verification
  if (!settings.portalAccess || !settings.portalAccess[portal]) {
    return {
      allowed: false,
      reason: `AI Mode is not enabled for the '${portal}' portal.`,
      status: 403,
      portal,
    };
  }

  // 4. Subscription Plan Entitlement & Quota (For school-affiliated users)
  let planId = "plan_free";
  let planName = "Free Plan";
  let quotaLimit = settings.monthlyQuotaPerPlan?.["plan_free"] ?? 20;

  if (user.schoolId) {
    try {
      const entitlement = await getEffectiveEntitlement(user.schoolId);
      planId = entitlement.plan.id;
      planName = entitlement.plan.name;

      if (entitlement.accessMode === "NO_ACCESS" || entitlement.accessMode === "RESTRICTED_ACCESS") {
        return {
          allowed: false,
          reason: "School subscription is inactive or suspended. AI access is restricted.",
          status: 403,
          portal,
          planId,
          planName,
        };
      }

      // Check if plan has quota configured
      if (settings.monthlyQuotaPerPlan && settings.monthlyQuotaPerPlan[planId] !== undefined) {
        quotaLimit = settings.monthlyQuotaPerPlan[planId];
      } else if (settings.monthlyQuotaPerPlan && settings.monthlyQuotaPerPlan[entitlement.plan.slug]) {
        quotaLimit = settings.monthlyQuotaPerPlan[entitlement.plan.slug];
      }
    } catch (e) {
      // Fall back to base plan limits
    }
  }

  // 5. Generic Feature Rollout Check
  const rollout = await getFeatureRollout("ai_mode");
  const rolloutCheck = evaluateRollout({
    rollout,
    instituteId: user.schoolId || undefined,
    portal,
    planId,
  });

  if (!rolloutCheck.allowed) {
    return {
      allowed: false,
      reason: rolloutCheck.reason || "AI Mode is not rolled out to this account cohort.",
      status: 403,
      portal,
      planId,
      planName,
      rolloutState: rollout.stage,
    };
  }

  return {
    allowed: true,
    status: 200,
    portal,
    planId,
    planName,
    quotaTotal: quotaLimit,
    quotaRemaining: quotaLimit === -1 ? Infinity : quotaLimit,
    rolloutState: rollout.stage,
  };
}
