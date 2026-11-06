/**
 * ARCHITECTURE & INVESTOR INTELLIGENCE CENTER 5.0
 * Authoritative Type Definitions
 */

export type VerificationState = "VERIFIED" | "CONFIGURED_UNVERIFIED" | "PLANNED" | "MANUAL_VERIFICATION_REQUIRED";

export type ArchitectureDiagramType = "TECHNICAL" | "BUSINESS_PROCESS" | "INVESTOR_SIMPLIFIED";

export type ComponentCategory =
  | "FRONTEND"
  | "API_GATEWAY"
  | "AUTH_IDENTITY"
  | "BUSINESS_CORE"
  | "DATABASE_STORAGE"
  | "PAYMENT_BILLING"
  | "COMMUNICATION"
  | "TELEMETRY_MONITORING"
  | "SECURITY_FIREWALL"
  | "MOBILE_RUNTIME"
  | "EXTERNAL_INTEGRATION";

export interface ArchitectureNode {
  id: string;
  name: string;
  shortName: string;
  category: ComponentCategory;
  diagrams: ArchitectureDiagramType[];
  description: string;
  technology: string;
  runtime: string;
  owner: string;
  environment: "PRODUCTION" | "PREVIEW" | "SHARED";
  verificationState: VerificationState;
  healthStatus: "HEALTHY" | "DEGRADED" | "STANDBY" | "UNAVAILABLE";
  x: number;
  y: number;
  width?: number;
  height?: number;
  dependencies: string[]; // Node IDs
  dataOutputs: string[];   // Node IDs
  featuresCovered: string[];
  securityControls: string[];
  documentationLink?: string;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  protocol: "HTTPS/REST" | "WSS/REALTIME" | "SDK/INTERNAL" | "DATABASE_CONN" | "WEBHOOK_HMAC";
  direction: "ONE_WAY" | "BI_DIRECTIONAL";
  diagrams: ArchitectureDiagramType[];
  encrypted: boolean;
  authenticated: boolean;
}

export interface IntegrationEntity {
  id: string;
  name: string;
  provider: string;
  category: "CLOUD_HOSTING" | "DATABASE" | "AUTHENTICATION" | "PAYMENTS" | "MESSAGING" | "MONITORING" | "SECURITY" | "MOBILE";
  businessPurpose: string;
  integratedFeatures: string[];
  connectionStatus: "ACTIVE_VERIFIED" | "CONFIGURED" | "PARTIAL" | "NOT_CONFIGURED";
  healthCheckEndpoint?: string;
  lastVerifiedAt: string;
  failureImpact: "CRITICAL" | "DEGRADED_PERFORMANCE" | "NON_ESSENTIAL_FALLBACK";
  estimatedMonthlyCost: string;
  configurationCompleteness: number; // 0 - 100%
  documentationUrl: string;
  sanitizedConfigKeys: string[];
}

export interface FeatureCapability {
  id: string;
  name: string;
  moduleKey: string;
  category: "CORE" | "ACADEMIC" | "FINANCIAL" | "ANALYTICS" | "SECURITY" | "COMMUNICATION" | "AI";
  description: string;
  intendedRoles: ("SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT")[];
  businessBenefit: string;
  route: string;
  apiEndpoints: string[];
  databaseCollections: string[];
  integrationsUsed: string[];
  implementationStatus: "IMPLEMENTED_VERIFIED" | "PARTIALLY_WORKING" | "PLANNED";
  testCoverage: "RELEASE_SUITE_COVERED" | "MANUAL_VERIFIED" | "PENDING_SUITE";
}

export interface DatabaseEntity {
  collectionName: string;
  displayName: string;
  category: "TENANT_CORE" | "USERS_AUTH" | "FINANCE_BILLING" | "ACADEMICS" | "COMMUNICATION" | "AUDIT_TELEMETRY" | "SYSTEM";
  documentStructureSummary: string;
  tenantKeyField: string;
  isMultiTenantIsolated: boolean;
  securityRuleSummary: string;
  relations: { targetCollection: string; foreignKey: string; relationType: "ONE_TO_MANY" | "MANY_TO_ONE" | "ONE_TO_ONE" }[];
  approximateFieldCount: number;
}

export interface DataFlowStep {
  stepNumber: number;
  actor: string;
  action: string;
  endpointOrMethod: string;
  validationBoundary: string;
  authorizationCheck: string;
  targetCollectionOrService: string;
  description: string;
}

export interface DataFlowModel {
  id: string;
  name: string;
  summary: string;
  businessContext: string;
  steps: DataFlowStep[];
}

export interface SecurityControlItem {
  id: string;
  domain: "IDENTITY_MFA" | "RBAC_PERMISSIONS" | "TENANT_ISOLATION" | "API_AUTH" | "DATABASE_RULES" | "SECRETS" | "ABUSE_FIREWALL" | "PAYMENT_INTEGRITY" | "AUDIT_LOGGING" | "BACKUP_DISASTER_RECOVERY";
  name: string;
  description: string;
  implementationMechanism: string;
  status: "VERIFIED_IMPLEMENTED" | "IMPLEMENTED_UNTESTED" | "PARTIALLY_IMPLEMENTED" | "PLANNED";
  asvsLevel: "LEVEL_1" | "LEVEL_2" | "LEVEL_3";
  verificationEvidence: string;
}

export interface BusinessIntelligenceMetrics {
  totalRegisteredSchools: number;
  activeSchools: number;
  trialSchools: number;
  paidSchools: number;
  totalStudents: number;
  activeAdmins: number;
  planDistribution: { planName: string; schoolCount: number; revenuePaise: number }[];
  monthlyRecurringRevenueInr: number;
  annualRecurringRevenueRunRateInr: number;
  conversionRatePercent: number;
  churnRatePercent: number;
  averageRevenuePerPaidSchoolInr: number;
  grossMarginEstimatePercent: number;
  measuredAssumptions: {
    hostingInfraCostMonthlyInr: number;
    databaseOperationsCostMonthlyInr: number;
    paymentGatewayFeePercent: number;
  };
  reconciliationNotes: string;
  lastCalculatedAt: string;
}

export interface CapacityPreset {
  name: string;
  schoolCount: number;
  avgStudentsPerSchool: number;
  avgUsersPerSchool: number;
  reqPerUserPerDay: number;
  dbOpsPerRequest: number;
  peakConcurrencyRatio: number;
  fileStorageGbPerSchool: number;
  monthlyMessagesPerSchool: number;
}

export interface CapacityProjection {
  totalUsers: number;
  totalStudents: number;
  dailyRequests: number;
  peakRequestsPerSecond: number;
  dailyDatabaseOperations: number;
  totalStorageGb: number;
  monthlyBandwidthGb: number;
  monthlyMessages: number;
  estimatedInfraCostInr: number;
  estimatedRevenueInr: number;
  projectedGrossMarginPercent: number;
  limitingBottleneck: string;
  recommendedScalingActions: string[];
}

export interface InvestorSlide {
  id: number;
  title: string;
  subtitle: string;
  category: "VISION" | "MARKET" | "PRODUCT" | "TECH" | "TRACTION" | "FINANCIALS" | "ROADMAP";
  bulletPoints: string[];
  highlightMetrics?: { label: string; value: string; detail?: string }[];
  diagramNodeFocus?: string[];
  speakerNotes: string;
  sanitizedOnly: boolean;
}

export interface ArchitectureIntelligenceOverview {
  summary: string;
  verifiedModulesCount: number;
  totalIntegrationsCount: number;
  activeIntegrationsCount: number;
  databaseEntitiesCount: number;
  registeredFeaturesCount: number;
  verifiedSecurityControlsCount: number;
  environments: {
    production: { url: string; platform: string; branch: string; status: string; lastDeployed: string };
    preview: { platform: string; status: string; isolatedDatabases: boolean };
  };
  knownArchitectureRisks: { risk: string; severity: "LOW" | "MEDIUM" | "HIGH"; mitigation: string }[];
}

export type ArchitecturePermission =
  | "architecture_intelligence.view"
  | "architecture_intelligence.internal"
  | "architecture_intelligence.integrations"
  | "architecture_intelligence.security"
  | "architecture_intelligence.business"
  | "architecture_intelligence.export";
