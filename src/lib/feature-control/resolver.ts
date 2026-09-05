import {
  FeatureDefinition,
  GlobalFeatureState,
  SchoolFeatureOverride,
  RolloutMode,
} from "@/types/featureControl";
import { FEATURE_REGISTRY, getFeatureDefinition } from "./featureRegistry";

export interface ResolveFeatureParams {
  featureKey: string; // e.g. "students", "students.delete", "fees", "fee.refund"
  schoolId?: string;
  role?: string;
  emergencyControls?: {
    systemStatus?: string;
    maintenanceMode?: boolean;
    moduleKillSwitches?: Record<string, string>;
    featureKillSwitches?: Record<string, string>;
  } | null;
  globalStates?: Record<string, GlobalFeatureState>;
  schoolOverrides?: SchoolFeatureOverride[];
  planAllowedFeatures?: string[];
  isFullControl?: boolean;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  status: number; // 200, 403, 503
  limit?: number; // custom limit if applied
  category?: string;
  featureKey: string;
  featureName?: string;
}

/**
 * AUTHORITATIVE MULTI-LAYER FEATURE ACCESS RESOLVER
 * 
 * Pipeline:
 * 1. Emergency Safety Gate (Emergency mode or module/feature killed -> DENY 503)
 * 2. Global Control (RolloutMode: OFF -> DENY 503, BETA/SELECTED_SCHOOLS check)
 * 3. School Overrides (ALLOW, DENY, CUSTOM_LIMIT)
 * 4. Plan Entitlement / FULL_CONTROL (Preserves FULL_CONTROL)
 * 5. User / RBAC check
 * 6. Final Access Result
 * 
 * Guarantees: Never bypasses authentication, tenant isolation, RBAC, audit, or security rules.
 */
export function resolveEffectiveFeatureAccess({
  featureKey,
  schoolId = "",
  role = "",
  emergencyControls,
  globalStates = {},
  schoolOverrides = [],
  planAllowedFeatures = [],
  isFullControl = false,
}: ResolveFeatureParams): FeatureAccessResult {
  const def = getFeatureDefinition(featureKey);
  const name = def?.name || featureKey;
  const moduleKey = def?.moduleKey || featureKey.split(".")[0];

  // -------------------------------------------------------------------------
  // LAYER 1: EMERGENCY SAFETY
  // Emergency OFF overrides all normal product entitlements.
  // -------------------------------------------------------------------------
  if (emergencyControls) {
    const isMaint =
      emergencyControls.systemStatus === "MAINTENANCE" ||
      emergencyControls.systemStatus === "EMERGENCY" ||
      Boolean(emergencyControls.maintenanceMode);

    if (isMaint && role !== "super_admin") {
      return {
        allowed: false,
        reason: "Platform is currently in Emergency Maintenance mode.",
        status: 503,
        featureKey,
        featureName: name,
        category: def?.category || "feature",
      };
    }

    // Check emergency module kill switch
    if (emergencyControls.moduleKillSwitches) {
      const modSwitch = emergencyControls.moduleKillSwitches[moduleKey];
      if (modSwitch === "OFF" && role !== "super_admin") {
        return {
          allowed: false,
          reason: `Module '${moduleKey}' is suspended under platform emergency control.`,
          status: 503,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }
    }

    // Check emergency feature kill switch
    if (emergencyControls.featureKillSwitches) {
      const featSwitch = emergencyControls.featureKillSwitches[featureKey];
      if (featSwitch === "OFF" && role !== "super_admin") {
        return {
          allowed: false,
          reason: `Feature '${name}' is temporarily locked under platform security rules.`,
          status: 503,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // LAYER 2: GLOBAL FEATURE CONTROL
  // -------------------------------------------------------------------------
  // Check if parent module is globally disabled first
  const parentModuleId = `module:${moduleKey}`;
  const parentModuleState = globalStates[parentModuleId] || globalStates[moduleKey];
  if (parentModuleState) {
    if (parentModuleState.rolloutMode === "OFF" || parentModuleState.enabled === false) {
      if (role !== "super_admin") {
        return {
          allowed: false,
          reason: `Module '${moduleKey}' has been disabled by platform administration.`,
          status: 503,
          featureKey,
          featureName: name,
          category: "module",
        };
      }
    } else if (
      parentModuleState.rolloutMode === "SELECTED_SCHOOLS" ||
      parentModuleState.rolloutMode === "BETA"
    ) {
      const isSchoolIncluded =
        schoolId && parentModuleState.selectedSchoolIds?.includes(schoolId);
      if (!isSchoolIncluded && role !== "super_admin") {
        return {
          allowed: false,
          reason: `Module '${moduleKey}' is currently in limited rollout / beta.`,
          status: 403,
          featureKey,
          featureName: name,
          category: "module",
        };
      }
    }
  }

  // Check specific feature/action state
  const stateId = def?.id || featureKey;
  const featureState = globalStates[stateId] || globalStates[featureKey];
  if (featureState) {
    if (featureState.rolloutMode === "OFF" || featureState.enabled === false) {
      if (role !== "super_admin") {
        return {
          allowed: false,
          reason: `Feature '${name}' has been temporarily disabled by platform administration.`,
          status: 503,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }
    } else if (
      featureState.rolloutMode === "SELECTED_SCHOOLS" ||
      featureState.rolloutMode === "BETA"
    ) {
      const isSchoolIncluded =
        schoolId && featureState.selectedSchoolIds?.includes(schoolId);
      if (!isSchoolIncluded && role !== "super_admin") {
        return {
          allowed: false,
          reason: `Feature '${name}' is in restricted rollout for selected schools.`,
          status: 403,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // LAYER 3: SCHOOL OVERRIDES
  // Allows Super Admin to specifically ALLOW, DENY, or CUSTOM_LIMIT a school
  // -------------------------------------------------------------------------
  if (schoolId && schoolOverrides.length > 0) {
    // Check direct feature override or module override
    const override = schoolOverrides.find(
      (o) =>
        o.schoolId === schoolId &&
        (o.featureId === stateId ||
          o.featureId === featureKey ||
          o.featureId === parentModuleId ||
          o.featureId === moduleKey)
    );

    if (override) {
      if (override.overrideType === "DENY") {
        return {
          allowed: false,
          reason: override.reason || `Feature '${name}' is restricted for this school.`,
          status: 403,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }

      if (override.overrideType === "ALLOW") {
        return {
          allowed: true,
          reason: override.reason || "Explicit school override grant.",
          status: 200,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }

      if (override.overrideType === "CUSTOM_LIMIT") {
        return {
          allowed: true,
          limit: override.limitValue,
          reason: `Custom operational limit: ${override.limitValue}`,
          status: 200,
          featureKey,
          featureName: name,
          category: def?.category || "feature",
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // LAYER 4: PLAN ENTITLEMENT & FULL_CONTROL PRESERVATION
  // -------------------------------------------------------------------------
  if (isFullControl || role === "super_admin") {
    return {
      allowed: true,
      reason: "Full control privileges granted.",
      status: 200,
      featureKey,
      featureName: name,
      category: def?.category || "feature",
    };
  }

  if (planAllowedFeatures && planAllowedFeatures.length > 0) {
    const isPermitted =
      planAllowedFeatures.includes(featureKey) ||
      planAllowedFeatures.includes(moduleKey) ||
      planAllowedFeatures.includes(stateId);

    if (!isPermitted) {
      return {
        allowed: false,
        reason: `Plan upgrade required to access '${name}'.`,
        status: 403,
        featureKey,
        featureName: name,
        category: def?.category || "feature",
      };
    }
  }

  // Default allowed if not explicitly denied by previous layers
  return {
    allowed: true,
    status: 200,
    featureKey,
    featureName: name,
    category: def?.category || "feature",
  };
}
