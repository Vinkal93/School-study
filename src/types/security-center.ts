/**
 * SUPER ADMIN SECURITY COMMAND CENTER DATA CONTRACTS
 * Red Team + Blue Team Internal Security Operations Platform
 */

export type SecurityCategory =
  | "AUTH"
  | "RBAC"
  | "TENANT"
  | "API"
  | "FIRESTORE"
  | "STORAGE"
  | "SESSION"
  | "ENTITLEMENT"
  | "BILLING"
  | "FINANCE"
  | "REPORTS"
  | "REALTIME"
  | "INPUT"
  | "SECRETS"
  | "CONFIGURATION"
  | "BUSINESS_LOGIC";

export type SecuritySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type FindingStatus =
  | "OPEN"
  | "TRIAGED"
  | "IN_PROGRESS"
  | "FIXED"
  | "RETEST_REQUIRED"
  | "VERIFIED"
  | "FALSE_POSITIVE"
  | "ACCEPTED_RISK"
  | "CLOSED";

export type TestExecutionStatus = "PASS" | "FAIL" | "SKIPPED" | "ERROR" | "NOT_TESTED";

export type IncidentStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "CONTAINED"
  | "MITIGATED"
  | "RESOLVED"
  | "CLOSED";

export type SecurityHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "NOT_VERIFIED";

export type TargetEnvironment = "STAGING" | "PRODUCTION";

export interface SecurityScope {
  environment: TargetEnvironment;
  target: string;
  allowedRoutes: string[];
  testAccounts: string[];
  isSafeNonDestructive: boolean;
}

export interface SecurityTestDefinition {
  id: string;
  category: SecurityCategory;
  name: string;
  description: string;
  risk: SecuritySeverity;
  expectedResult: string;
  actualResult?: string;
  status: TestExecutionStatus;
  evidence?: string;
  endpoint?: string;
  httpMethod?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  testIdentity?: string;
  lastRunAt?: string;
  executedBy?: string;
}

export interface SecurityEvidence {
  id: string;
  type: "request_response" | "log_reference" | "code_location" | "test_result" | "screenshot_url";
  title: string;
  content: string;
  timestamp: string;
  redacted: boolean;
}

export interface SecurityRetestRecord {
  id: string;
  retestedAt: string;
  retestedBy: string;
  previousStatus: string;
  retestResult: "PASS" | "FAIL";
  evidence: string;
  notes?: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  affectedComponent: string;
  affectedRouteOrApi?: string;
  affectedSchoolOrScope?: string;
  description: string;
  expected: string;
  actual: string;
  impact: string;
  evidence: SecurityEvidence[];
  discoveredBy: string;
  discoveredAt: string;
  status: FindingStatus;
  owner?: string;
  remediation?: string;
  fixReference?: string;
  retestStatus: "NOT_REQUESTED" | "REQUIRED" | "IN_PROGRESS" | "PASSED" | "FAILED";
  retestHistory: SecurityRetestRecord[];
  closedAt?: string;
  closedBy?: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  severity: SecuritySeverity;
  status: IncidentStatus;
  affectedSystem: string;
  affectedSchools: string[];
  timeline: Array<{
    timestamp: string;
    event: string;
    actor: string;
  }>;
  linkedFindingIds: string[];
  actions: string[];
  owner: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface SecurityTestRun {
  id: string;
  environment: TargetEnvironment;
  scope: string;
  operator: string;
  startTime: string;
  endTime: string;
  testsExecuted: number;
  passed: number;
  failed: number;
  criticalCount: number;
  highCount: number;
  findingsCreated: number;
  status: "COMPLETED" | "PARTIAL" | "BLOCKED" | "FAILED";
  results: Array<{
    testId: string;
    name: string;
    category: SecurityCategory;
    status: TestExecutionStatus;
    expected: string;
    actual: string;
    executionTimeMs: number;
  }>;
}

export interface SecurityScoreCard {
  score: number | null; // null if not tested
  health: SecurityHealthStatus;
  trend: "UP" | "DOWN" | "STABLE" | "NONE";
  explanation: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  untestedCount: number;
  coveragePercentage: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  openFindings: number;
  inProgressFindings: number;
  awaitingRetestFindings: number;
  verifiedFixes: number;
  failedRetests: number;
  lastScanAt: string | null;
  lastReviewAt: string | null;
}

export interface FrontendPatternResult {
  file: string;
  line?: number;
  pattern: string;
  risk: SecuritySeverity;
  recommendation: string;
  status: "VERIFIED_SAFE" | "POTENTIAL_RISK" | "DETECTED";
}

export interface SecurityReportData {
  reportId: string;
  title: string;
  type:
    | "SUMMARY"
    | "AUTHENTICATION"
    | "RBAC"
    | "TENANT_ISOLATION"
    | "API_SECURITY"
    | "ENTITLEMENT"
    | "FINANCE"
    | "FINDINGS"
    | "REMEDIATION"
    | "EXECUTIVE";
  generatedAt: string;
  generatedBy: string;
  summary: string;
  scoreCard: SecurityScoreCard;
  findings: SecurityFinding[];
  testRuns: SecurityTestRun[];
  incidents: SecurityIncident[];
}
