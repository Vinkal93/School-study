/**
 * School Study — Billing, Entitlement & Access Policy Data Models
 * 
 * Money is strictly stored as integer PAISE (e.g. ₹999 = 99900 paise).
 * Floating point arithmetic must NEVER be used for financial calculations.
 */

export type PlanStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type PlanVersionStatus = "ACTIVE" | "ARCHIVED";

export type SubscriptionStatus =
  | "TRIAL"
  | "PENDING"
  | "ACTIVE"
  | "EXPIRING"
  | "GRACE_PERIOD"
  | "RESTRICTED"
  | "HALTED"
  | "EXPIRED"
  | "SUSPENDED"
  | "COMPLETED"
  | "CANCELLED";

export type AccessMode =
  | "FULL_ACCESS"
  | "EXPIRING"
  | "GRACE_ACCESS"
  | "RESTRICTED_ACCESS"
  | "NO_ACCESS";

export type BillingCycle = "monthly" | "annual";

export interface PlanLimits {
  maxStudents: number;
  maxTeachers: number;
  maxClasses: number;
  maxStaffAccounts: number;
  [key: string]: number;
}

export interface Plan {
  id: string;
  name: string;
  slug: string; // e.g. "starter", "professional", "enterprise"
  description: string;
  status: PlanStatus;
  displayOrder: number;
  isPopular: boolean;
  features: string[]; // Feature keys
  limits: PlanLimits;
  createdAt: string;
  updatedAt: string;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  monthlyPrice: number; // Integer PAISE (e.g. 99900 = ₹999)
  annualPrice: number; // Integer PAISE per month billed annually (e.g. 79900 = ₹799/mo)
  currency: string; // "INR"
  features: string[];
  limits: PlanLimits;
  effectiveFrom: string;
  effectiveUntil: string | null;
  status: PlanVersionStatus;
  createdAt: string;
}

export interface SchoolSubscription {
  id: string; // Same as schoolId
  schoolId: string;
  planId: string;
  planVersionId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startsAt: string;
  expiresAt: string;
  nextBillingDate?: string;
  amountPaise?: number;
  paymentMethod?: string;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  graceEndsAt: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  autoRenew?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  renewalStatus?: "NONE" | "SUCCESS" | "FAILED" | "PENDING";
  pendingChange?: {
    type: "DOWNGRADE" | "PLAN_CHANGE";
    targetPlanId: string;
    targetPlanVersionId: string;
    targetPlanName?: string;
    effectiveAt: string;
    createdBy: string;
    createdAt: string;
  } | null;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  suspensionReason?: string | null;
  source: "manual_admin" | "self_onboarding" | "system_trial" | "renewal_payment" | "upgrade_payment";
  lastPaymentId: string | null;
  lastOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureDefinition {
  id: string;
  key: string; // Unique key e.g. "student_management", "advanced_attendance"
  name: string;
  description: string;
  category: "core" | "academic" | "security" | "analytics" | "integration";
  defaultValue: boolean;
  valueType: "boolean" | "limit";
  createdAt: string;
  updatedAt: string;
}

export type ReminderFrequency =
  | "SHOW_ONCE"
  | "SHOW_DAILY"
  | "SHOW_ON_LOGIN"
  | "SHOW_UNTIL_ACTION";

export interface ReminderThresholdConfig {
  id: string;
  daysBeforeExpiry: number;
  enabled: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  showPopup: boolean;
  showBanner: boolean;
  showRechargeButton: boolean;
  frequency: ReminderFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalAccessPolicy {
  id: string; // "global"
  enabled: boolean;
  reminderDays: number[]; // e.g. [30, 15, 7, 3, 1]
  reminders: ReminderThresholdConfig[];
  gracePeriodDays: number; // e.g. 7
  graceAccessMode: "FULL_ACCESS" | "LIMITED_ACCESS" | "RESTRICTED_ACCESS" | "NO_ACCESS";
  restrictedAccessEnabled: boolean;
  expiredAccessMode: "RESTRICTED_ACCESS" | "NO_ACCESS";
  allowedFeaturesDuringGrace: string[];
  allowedFeaturesWhenRestricted: string[];
  allowedFeaturesWhenExpired: string[];
  showExpiryPopup: boolean;
  showRechargeButton: boolean;
  targetRoles: ("school_admin" | "teacher" | "student")[];
  updatedAt: string;
  updatedBy: string;
}

export interface AccessPolicy {
  id: string;
  role: string;
  schoolStatus: SubscriptionStatus;
  allowedFeatures: string[];
  deniedFeatures: string[];
  rateLimits: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolAccessSummary {
  schoolId: string;
  planId: string;
  planVersionId: string;
  status: SubscriptionStatus;
  accessMode: AccessMode;
  startsAt: string;
  expiresAt: string;
  graceEndsAt: string;
  daysRemaining: number;
  reminderRequired: boolean;
  allowedFeatures: string[];
  limits: PlanLimits;
}

export interface SchoolUsage {
  schoolId: string;
  students: number;
  teachers: number;
  classes: number;
  staff: number;
  lastReconciledAt: string;
  updatedAt: string;
}

export type ResourceLimitKey = "students" | "teachers" | "classes" | "staff";

export interface ResourceLimitStatus {
  current: number;
  limit: number;
  remaining: number;
  isOverLimit: boolean;
  isUnlimited: boolean;
}

export interface EffectiveEntitlement {
  schoolId: string;
  subscriptionStatus: SubscriptionStatus;
  accessMode: AccessMode;
  plan: {
    id: string;
    name: string;
    slug: string;
    version: number;
  };
  features: Record<string, boolean>;
  limits: {
    students: ResourceLimitStatus;
    teachers: ResourceLimitStatus;
    classes: ResourceLimitStatus;
    staff: ResourceLimitStatus;
  };
  isExpired: boolean;
  isInGrace: boolean;
  daysRemaining: number;
  expiresAt: string;
  graceEndsAt: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  code?: string;
  reason: string;
  feature?: string;
  message: string;
  accessMode: AccessMode;
  limitInfo?: {
    maxLimit: number;
    currentCount: number;
  };
}

export interface PlanLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  isOverLimit?: boolean;
  isUnlimited?: boolean;
  code?: string;
  reason?: string;
  message: string;
}

export interface SubscriptionReminderResult {
  shouldRemind: boolean;
  reminderId?: string;
  daysRemaining: number;
  severity: "info" | "warning" | "urgent" | "critical" | "expired";
  title: string;
  message: string;
  showPopup: boolean;
  showBanner: boolean;
  showRechargeButton: boolean;
  canRecharge: boolean;
  accessMode: AccessMode;
}

export interface SubscriptionNotificationTrack {
  id: string;
  schoolId: string;
  subscriptionId: string;
  reminderId: string;
  thresholdDays: number;
  shownAt: string;
  lastShownAt: string;
  dismissedAt: string | null;
  createdAt: string;
}

export interface FinanceSummary {
  grossSales: number; // Integer PAISE
  discountGiven: number; // Integer PAISE
  refundedAmount: number; // Integer PAISE
  netCollected: number; // Integer PAISE (Gross - Discount - Refund)
  successfulPaymentsCount: number;
  pendingPaymentsCount: number;
  failedPaymentsCount: number;
  refundedPaymentsCount: number;
}

export interface CashflowSummary {
  moneyIn: number; // Integer PAISE (PAYMENT + CREDIT)
  moneyOut: number; // Integer PAISE (REFUND + DEBIT)
  netCashflow: number; // Integer PAISE (Money In - Money Out)
}

export interface PlanRevenueSummary {
  planId: string;
  planName: string;
  transactionsCount: number;
  grossRevenue: number; // Integer PAISE
  discount: number; // Integer PAISE
  refund: number; // Integer PAISE
  netRevenue: number; // Integer PAISE
}

export interface SchoolRevenueSummary {
  schoolId: string;
  schoolName: string;
  totalPaymentsCount: number;
  grossRevenue: number; // Integer PAISE
  discount: number; // Integer PAISE
  refunds: number; // Integer PAISE
  netRevenue: number; // Integer PAISE
  currentPlanId: string;
  subscriptionStatus: SubscriptionStatus;
}

export type BillingAuditAction =
  | "PLAN_CREATED"
  | "PLAN_UPDATED"
  | "PLAN_VERSION_CREATED"
  | "PLAN_ENABLED"
  | "PLAN_DISABLED"
  | "PLAN_ARCHIVED"
  | "PLAN_FEATURE_UPDATED"
  | "PLAN_LIMIT_UPDATED"
  | "PLAN_FEATURE_CHANGED"
  | "PLAN_LIMIT_CHANGED"
  | "POPULAR_PLAN_CHANGED"
  | "SUBSCRIPTION_UPDATED"
  | "ACCESS_POLICY_UPDATED"
  | "REMINDER_CREATED"
  | "REMINDER_UPDATED"
  | "REMINDER_DISABLED"
  | "GRACE_PERIOD_UPDATED"
  | "EXPIRY_MODE_UPDATED"
  | "FEATURE_RESTRICTION_UPDATED"
  | "MANUAL_ACCESS_CHANGE"
  | "LIMIT_REACHED"
  | "OVER_LIMIT_DETECTED"
  | "USAGE_RECONCILED"
  | "MANUAL_ENTITLEMENT_OVERRIDE"
  | "FINANCE_VIEW"
  | "INVOICE_VIEW"
  | "REPORT_EXPORT"
  | "SUBSCRIPTION_ADJUSTMENT_CREATED"
  | "AUTO_RENEWAL_TOGGLED"
  | "BILLING_PROFILE_UPDATED"
  | "CUSTOM_OFFER_CREATED"
  | "CUSTOM_OFFER_DEACTIVATED"
  | "CUSTOM_OFFER_REDEEMED"
  | "SUBSCRIPTION_PERIOD_EXTENDED"
  | "SUBSCRIPTION_PERIOD_REDUCED"
  | "CUSTOM_PERIOD_ADJUSTED"
  | "TEMP_ACCESS_GRANTED"
  | "FEATURE_ACCESS_GRANTED"
  | "FEATURE_ACCESS_RESTRICTED"
  | "FEATURE_ACCESS_RESTORED"
  | "LIMIT_OVERRIDE_CREATED"
  | "LIMIT_OVERRIDE_REVOKED"
  | "SUBSCRIPTION_SUSPENDED"
  | "SUBSCRIPTION_RESUMED"
  | "PENALTY_CREATED"
  | "PENALTY_WAIVED"
  | "MANUAL_CREDIT_CREATED"
  | "SUBSCRIPTION_ACTIVATED"
  | "RECURRING_PAYMENT_SUCCESSFUL"
  | "RECURRING_PAYMENT_FAILED"
  | "SUBSCRIPTION_CANCELLED"
  | "GST_SETTINGS_UPDATED"
  | "COUPON_CREATED"
  | "COUPON_UPDATED"
  | "COUPON_DELETED"
  | "PLAN_DELETED";

export interface BillingAuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: BillingAuditAction;
  targetType: "plan" | "planVersion" | "schoolSubscription" | "accessPolicy" | "financeReport" | "invoice" | "adjustment" | "override" | "penalty" | "coupon" | "billing_settings";
  targetId: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export type SubscriptionAdjustmentType =
  | "ADD_DAYS"
  | "REMOVE_DAYS"
  | "ADD_MONTHS"
  | "REMOVE_MONTHS"
  | "CUSTOM_PERIOD_ADJUSTMENT"
  | "TEMPORARY_EXTENSION"
  | "MANUAL_CREDIT"
  | "PENALTY"
  | "ACCESS_OVERRIDE"
  | "SUSPENSION"
  | "RESTORE_ACCESS";

export interface SubscriptionAdjustmentRecord {
  id: string;
  schoolId: string;
  subscriptionId: string;
  type: SubscriptionAdjustmentType;
  value?: number;
  unit?: "days" | "months" | "date" | "currency";
  previousStartAt?: string;
  previousEndAt?: string;
  newStartAt?: string;
  newEndAt?: string;
  amount?: number; // integer PAISE if financial
  currency?: string;
  reason: string;
  actorId: string;
  actorRole: string;
  status: "APPLIED" | "REVERTED" | "CANCELLED";
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AccessOverrideRecord {
  id: string;
  schoolId: string;
  type: "FEATURE_GRANT" | "FEATURE_RESTRICT" | "TEMPORARY_ACCESS";
  featureKey?: string;
  enabled: boolean;
  startAt: string;
  endAt: string;
  reason: string;
  createdBy: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: string;
}

export interface LimitOverrideRecord {
  id: string;
  schoolId: string;
  limitKey: "students" | "teachers" | "classes" | "staff";
  overrideValue: number;
  startAt: string;
  endAt: string;
  reason: string;
  createdBy: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: string;
}

export interface PenaltyRecord {
  id: string;
  schoolId: string;
  amount: number; // integer PAISE
  currency: string;
  reason: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "WAIVED";
  createdBy: string;
  createdAt: string;
  paidAt?: string | null;
  paymentId?: string | null;
}

export interface FinancialAdjustmentRecord {
  id: string;
  schoolId: string;
  type: "MANUAL_CREDIT" | "MANUAL_CHARGE" | "PENALTY";
  amount: number; // integer PAISE
  currency: string;
  reason: string;
  actorId: string;
  reference?: string;
  createdAt: string;
}

// ==========================================
// FEE MANAGEMENT DATA MODELS (Integer PAISE)
// ==========================================

export type FeeType =
  | "tuition"
  | "admission"
  | "annual"
  | "exam"
  | "computer"
  | "transport"
  | "library"
  | "other";

export type FeeFrequency =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "annual"
  | "one_time";

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  academicYearName?: string;
  className: string; // "Class 10", "all", etc.
  sectionName?: string; // "Section A", "all", etc.
  feeType: FeeType;
  title: string;
  amountPaise: number; // Integer PAISE (e.g. 50000 = ₹500.00)
  frequency: FeeFrequency;
  dueDayOfMonth?: number; // 1-31
  status: "ACTIVE" | "INACTIVE";
  transactionCount?: number; // Protection count against safety deletion
  createdAt: string;
  updatedAt: string;
}

export interface MonthLedgerItem {
  month: string; // "April 2026"
  dueDate: string; // ISO date
  amountPaise: number; // Integer PAISE
  paidAmountPaise: number; // Integer PAISE
  discountPaise: number; // Integer PAISE
  lateFeePaise: number; // Integer PAISE
  pendingAmountPaise: number; // Integer PAISE
  status: "PAID" | "PENDING" | "PARTIAL" | "OVERDUE";
  paymentIds?: string[];
  receiptNumbers?: string[];
}

export interface StudentFeeAssignment {
  id: string; // `${schoolId}_${studentId}_${academicYearId}`
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  academicYearName?: string;
  feeStructureIds: string[];
  totalAssignedPaise: number; // Integer PAISE
  totalPaidPaise: number; // Integer PAISE
  totalDiscountPaise: number; // Integer PAISE
  totalLateFeePaise: number; // Integer PAISE
  totalPendingPaise: number; // Integer PAISE
  monthLedger: MonthLedgerItem[];
  status: "PAID" | "PENDING" | "PARTIAL" | "OVERDUE";
  lastPaymentDate?: string | null;
  updatedAt: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  receiptNumber: string; // e.g. "REC-20260903-0042"
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYearId: string;
  feeStructureId?: string;
  feeType: FeeType;
  periodMonths: string[]; // e.g. ["April 2026", "May 2026"]
  amountPaidPaise: number; // Integer PAISE
  discountPaise: number; // Integer PAISE
  lateFeePaise: number; // Integer PAISE
  netAmountPaise: number; // Integer PAISE (amountPaidPaise + lateFeePaise - discountPaise)
  paymentMethod: "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque" | "Online Payment" | "Other";
  transactionRef?: string;
  remarks?: string;
  paymentDate: string; // ISO String
  collectedBy: string;
  collectedByName?: string;
  status: "SUCCESS" | "REFUNDED" | "CANCELLED";
  createdAt: string;
}

export interface FeeDiscount {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  feeType: FeeType;
  discountType: "FIXED" | "PERCENTAGE" | "SCHOLARSHIP" | "CONCESSION" | "CUSTOM";
  amountPaise: number; // Integer PAISE or percentage value
  reason: string;
  appliedBy: string;
  createdAt: string;
}

export interface FeeSettings {
  id: string; // schoolId
  schoolId: string;
  currency: string; // "INR"
  receiptPrefix: string; // "REC"
  feeDueDayOfMonth: number; // 5
  lateFeeRule: {
    enabled: boolean;
    graceDays: number; // 5
    type: "FIXED" | "PERCENTAGE";
    value: number; // ₹50 or 5%
    maxLimitPaise: number; // Integer PAISE (e.g. 50000 = ₹500 max)
  };
  paymentMethods: string[];
  academicYearDefaultId?: string;
  updatedAt: string;
}


