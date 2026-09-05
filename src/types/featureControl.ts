export type FeatureCategory = "module" | "feature" | "action" | "api";

export type RolloutMode = "OFF" | "ON_FOR_ALL" | "BETA" | "SELECTED_SCHOOLS";

export type OverrideType = "ALLOW" | "DENY" | "CUSTOM_LIMIT";

export interface ApiEndpointDefinition {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL";
  description?: string;
}

export interface FeatureDefinition {
  id: string; // e.g. "module:students", "feature:students.delete", "action:fee.refund"
  key: string; // clean lookup key e.g. "students", "students.delete", "fee.refund"
  name: string;
  moduleKey: string; // e.g. "students", "teachers", "attendance", "fees"
  category: FeatureCategory;
  description: string;
  isDangerous?: boolean; // highlight with warning in UI
  apiEndpoints?: ApiEndpointDefinition[];
  defaultRollout: RolloutMode;
}

export interface GlobalFeatureState {
  featureId: string; // matches FeatureDefinition.id
  rolloutMode: RolloutMode;
  selectedSchoolIds: string[];
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
  reason?: string;
}

export interface SchoolFeatureOverride {
  id?: string;
  schoolId: string;
  featureId: string; // matches FeatureDefinition.id or key
  overrideType: OverrideType;
  limitValue?: number; // for CUSTOM_LIMIT
  reason: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureControlAuditEntry {
  id: string;
  featureId: string;
  featureName?: string;
  category: FeatureCategory;
  previousState: any;
  newState: any;
  target: "GLOBAL" | string; // "GLOBAL" or target schoolId
  actorId: string;
  actorEmail?: string;
  reason: string;
  timestamp: string;
}

export interface FeatureControlOverview {
  totalModules: number;
  activeModules: number;
  disabledModules: number;
  totalFeatures: number;
  activeFeatures: number;
  betaFeatures: number;
  activeActions: number;
  dangerousActionsKilled: number;
  activeOverridesCount: number;
  affectedSchoolsCount: number;
}
