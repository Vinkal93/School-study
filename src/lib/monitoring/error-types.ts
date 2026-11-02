/**
 * Comprehensive Enterprise Error Monitoring & Observability Types
 * School Study SaaS — Production Observability System 3.0
 */

export type ErrorSeverity = "critical" | "high" | "medium" | "low" | "info";

export type ErrorCategory =
  | "api"
  | "auth"
  | "authorization"
  | "database"
  | "payment"
  | "communication"
  | "frontend"
  | "background_job"
  | "system";

export type IncidentStatus = "new" | "investigating" | "monitoring" | "resolved" | "reopened";

export interface ClientMetadata {
  browser?: string;
  os?: string;
  device?: "mobile" | "tablet" | "desktop" | "unknown";
  userAgent?: string;
  url?: string;
  screenResolution?: string;
}

export interface ErrorEvent {
  eventId: string;
  referenceCode: string; // e.g. "ERR-A1B2C3D4"
  fingerprint: string;
  errorCode: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  module: string;
  operation: string;
  sanitizedRoute?: string;
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  schoolId?: string;
  userId?: string;
  userRole?: string;
  occurredAt: string; // ISO UTC
  environment: "production" | "preview" | "development";
  version: string;
  httpStatus?: number;
  sanitizedStack?: string;
  metadata?: Record<string, unknown>;
  clientMetadata?: ClientMetadata;
}

export interface IncidentNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ErrorIncident {
  id: string; // Deterministic fingerprint
  fingerprint: string;
  title: string;
  errorCode: string;
  module: string;
  operation: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  status: IncidentStatus;
  occurrences: number;
  affectedUsersCount: number;
  affectedSchoolsCount: number;
  affectedSchools: string[];
  affectedUserIds?: string[];
  firstSeen: string; // ISO UTC
  lastSeen: string; // ISO UTC
  latestEventId: string;
  latestMessage: string;
  sanitizedRoute?: string;
  sampleEvents: ErrorEvent[]; // Bounded sample of recent events
  assignedTo?: string;
  investigationNotes?: IncidentNote[];
  resolutionSummary?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  reopenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: "frequency" | "critical_error" | "rate_surge";
  threshold: number; // e.g. 5 occurrences
  timeWindowMinutes: number; // e.g. 10 minutes
  severity: ErrorSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  notificationChannels: Array<"in_app_banner" | "super_admin_log">;
}

export interface MonitoringStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  affectedSchoolsCount: number;
  affectedUsersCount: number;
  totalOccurrences: number;
  resolvedToday: number;
  topModules: Array<{ module: string; count: number }>;
  severityBreakdown: Record<ErrorSeverity, number>;
  statusBreakdown: Record<IncidentStatus, number>;
}

export interface CaptureContext {
  errorCode?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  module?: string;
  operation?: string;
  route?: string;
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  schoolId?: string;
  userId?: string;
  userRole?: string;
  httpStatus?: number;
  metadata?: Record<string, unknown>;
  clientMetadata?: ClientMetadata;
}
