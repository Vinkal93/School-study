export type SchoolReportType =
  | "STUDENTS"
  | "TEACHERS"
  | "ATTENDANCE"
  | "CLASSES"
  | "FEES_PAYMENTS"
  | "INVOICES"
  | "ADMISSIONS"
  | "ACADEMIC_ACTIVITY";

export type SuperAdminReportType =
  | "GLOBAL_SCHOOLS"
  | "GLOBAL_SUBSCRIPTIONS"
  | "GLOBAL_REVENUE"
  | "GLOBAL_USERS"
  | "GLOBAL_COUPONS"
  | "GLOBAL_AUDIT_LOGS"
  | "GLOBAL_INQUIRIES";

export type ReportType = SchoolReportType | SuperAdminReportType;

export type ReportExportFormat = "csv" | "xlsx" | "pdf";

export interface ReportColumnDef {
  key: string;
  header: string;
  type?: "string" | "number" | "date" | "currency" | "badge";
  width?: number;
}

export interface ReportSummaryMetric {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
}

export interface ReportFilterOptions {
  dateFrom?: string;
  dateTo?: string;
  classId?: string;
  section?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReportDataResult {
  reportType: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  schoolId?: string;
  schoolName?: string;
  totalRecords: number;
  summaryMetrics: ReportSummaryMetric[];
  columns: ReportColumnDef[];
  rows: Record<string, any>[];
  isRestricted: boolean; // true for Starter plan preview (limited 3-5 rows, rest not sent)
  previewLimit?: number;
  requiredPlanFeature?: string;
}

export interface CustomOfferRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  originalPlanId: string;
  offerPlanId: string;
  originalPricePaise: number;
  customPricePaise: number;
  durationDays: number;
  discountPaise: number;
  couponCode?: string;
  status: "ACTIVE" | "CLAIMED" | "EXPIRED";
  expiresAt: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  claimedAt?: string;
  orderId?: string;
}

export interface CustomPlanAccessRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  accessTier: "PROFESSIONAL" | "ENTERPRISE" | "CUSTOM";
  featuresGranted: string[];
  durationDays: number;
  startAt: string;
  endAt: string;
  isDemo: boolean;
  reason: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdBy: string;
  createdAt: string;
}
