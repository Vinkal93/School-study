/**
 * MULTI-TENANT COMMUNICATION & NOTIFICATION SYSTEM DATA CONTRACTS
 * 
 * Production Communication Engine 2.0 Single-Source-of-Truth:
 * 1. Global Super Admin credentials (Twilio, Email Provider, Master switches)
 * 2. School-level plan capabilities, allowances & Super Admin manual overrides
 * 3. Channel dispatching (WhatsApp Cloud API, Twilio SMS, In-App Notification Feed, Manual WhatsApp)
 * 4. Delivery logs, audit records, retry states, and real-time webhook tracking
 * 5. Dynamic variable registry & Fee reminder automation rules
 */

export type CommunicationChannel = "whatsapp" | "sms" | "email" | "in_app";

export type WhatsAppSendMode = "api" | "manual";

export type CommunicationDeliveryStatus =
  | "draft"
  | "queued"
  | "processing"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "undelivered"
  | "cancelled"
  | "manual_copied"
  | "manual_opened"
  | "manual_sent";

export type CommunicationTriggerType =
  | "manual"
  | "automation"
  | "admission"
  | "fee_reminder"
  | "fee_receipt"
  | "attendance_alert"
  | "exam_notice"
  | "test_message";

export type TemplateApprovalStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "archived";

export interface ChannelControlState {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  in_app: boolean;
  automation: boolean;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // e.g. whatsapp:+14155238886
  smsFromNumber?: string;
  messagingServiceSid?: string;
  isConfigured: boolean;
}

export interface EmailProviderConfig {
  provider: "resend" | "sendgrid" | "smtp" | "none";
  apiKey: string;
  senderEmail: string;
  senderName: string;
  isConfigured: boolean;
}

export interface CommunicationPlanLimits {
  monthlyWhatsAppAllowance: number; // -1 for unlimited, 0 for none, or fixed number
  monthlySmsAllowance: number; // -1 for unlimited, 0 for none, or fixed number
  monthlyTestAllowance: number;
  maxRecipientsPerBatch: number;
  customTemplateAllowance: number;
  dailyMessageCap: number;
  perMinuteRate: number;
  automationRuleAllowance: number;
}

export const DEFAULT_COMMUNICATION_PLAN_LIMITS: Record<string, CommunicationPlanLimits> = {
  free: {
    monthlyWhatsAppAllowance: 0,
    monthlySmsAllowance: 0,
    monthlyTestAllowance: 5,
    maxRecipientsPerBatch: 10,
    customTemplateAllowance: 2,
    dailyMessageCap: 20,
    perMinuteRate: 15,
    automationRuleAllowance: 0,
  },
  base: {
    monthlyWhatsAppAllowance: 0,
    monthlySmsAllowance: 0,
    monthlyTestAllowance: 5,
    maxRecipientsPerBatch: 10,
    customTemplateAllowance: 2,
    dailyMessageCap: 20,
    perMinuteRate: 15,
    automationRuleAllowance: 0,
  },
  starter: {
    monthlyWhatsAppAllowance: 0,
    monthlySmsAllowance: 0,
    monthlyTestAllowance: 10,
    maxRecipientsPerBatch: 25,
    customTemplateAllowance: 5,
    dailyMessageCap: 50,
    perMinuteRate: 30,
    automationRuleAllowance: 1,
  },
  growth: {
    monthlyWhatsAppAllowance: 1000,
    monthlySmsAllowance: 500,
    monthlyTestAllowance: 25,
    maxRecipientsPerBatch: 100,
    customTemplateAllowance: 15,
    dailyMessageCap: 300,
    perMinuteRate: 60,
    automationRuleAllowance: 5,
  },
  professional: {
    monthlyWhatsAppAllowance: 5000,
    monthlySmsAllowance: 2000,
    monthlyTestAllowance: 50,
    maxRecipientsPerBatch: 500,
    customTemplateAllowance: 50,
    dailyMessageCap: 1500,
    perMinuteRate: 120,
    automationRuleAllowance: 15,
  },
  enterprise: {
    monthlyWhatsAppAllowance: -1, // Unlimited
    monthlySmsAllowance: -1, // Unlimited
    monthlyTestAllowance: -1,
    maxRecipientsPerBatch: -1,
    customTemplateAllowance: -1,
    dailyMessageCap: -1,
    perMinuteRate: 240,
    automationRuleAllowance: -1,
  },
};

export interface GlobalCommunicationSettings {
  masterEnabled: boolean;
  channels: ChannelControlState;
  twilio: TwilioConfig;
  email: EmailProviderConfig;
  planAccess: {
    free: ChannelControlState;
    base: ChannelControlState;
    starter: ChannelControlState;
    growth: ChannelControlState;
    professional: ChannelControlState;
    enterprise: ChannelControlState;
    [planSlug: string]: ChannelControlState;
  };
  planLimits?: Record<string, CommunicationPlanLimits>;
  schoolOverrides: Record<string, {
    enabled?: boolean;
    channels?: Partial<ChannelControlState>;
    limits?: Partial<CommunicationPlanLimits>;
    monthlyLimit?: number;
    updatedAt: string;
    updatedBy?: string;
  }>;
  updatedAt: string;
  updatedBy?: string;
}

export interface SchoolCommunicationAccess {
  schoolId: string;
  schoolName?: string;
  planSlug: string;
  planName: string;
  tierName?: string;
  isGloballyEnabled: boolean;
  canManualWhatsApp: boolean;
  canSendWhatsApp: boolean;
  canSendSms: boolean;
  canSendSMS?: boolean;
  canSendEmail: boolean;
  canSendInApp: boolean;
  canAutomate: boolean;
  canBulkSend: boolean;
  canSchedule: boolean;
  canTestMessage: boolean;
  canCustomTemplates: boolean;
  canDeliveryTrack: boolean;
  isOverridden: boolean;
  overrideEnabled?: boolean;
  lockReason?: string;
  twilioReady?: boolean;
  twilioWarning?: string;
  limits: CommunicationPlanLimits;
  monthlyUsage: {
    totalSent: number;
    whatsappSent: number;
    smsSent: number;
    emailSent: number;
    inAppSent: number;
    manualOpened: number;
    testsSent: number;
    failed: number;
    limit: number;
  };
}

export interface CommunicationTemplate {
  id: string;
  schoolId?: string; // empty string for system default
  name: string;
  category: "fee_reminder" | "admission_welcome" | "payment_receipt" | "attendance_alert" | "exam_notice" | "general";
  channel: CommunicationChannel;
  titleTemplate?: string;
  bodyTemplate: string;
  variables: string[]; // e.g. ["student_name", "school_name", "fee_amount", "due_date", "invoice_number"]
  status: TemplateApprovalStatus;
  providerStatus?: TemplateApprovalStatus;
  isSystemDefault?: boolean;
  whatsappTemplateSid?: string; // Twilio Content Template SID (e.g. HXxxxxxxxx)
  whatsappLanguage?: string; // e.g. "en_US" or "hi"
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeAutomationRule {
  id: string;
  schoolId: string;
  name: string;
  type: "before_due" | "on_due" | "overdue" | "late_fee" | "payment_receipt" | "admission_welcome";
  daysOffset: number; // e.g. -3 for 3 days before due date, 0 for on due date, +3 for 3 days overdue
  channels: CommunicationChannel[];
  titleTemplate?: string;
  bodyTemplate: string;
  enabled: boolean;
  templateId?: string;
  eligibleClassIds?: string[]; // Empty means all classes
  minOutstandingAmount?: number; // Minimum balance to trigger reminder
  quietHoursStart?: number; // e.g. 21 (9 PM)
  quietHoursEnd?: number; // e.g. 8 (8 AM)
  maxRemindersPerInvoice?: number;
  excludeWaivedOrDisputed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationLogEntry {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  parentName?: string;
  recipient: string; // phone number, email, or user UID
  channel: CommunicationChannel;
  sendMode?: WhatsAppSendMode; // "api" vs "manual"
  templateId?: string;
  templateName?: string;
  title?: string;
  content: string;
  triggeredBy: {
    uid: string;
    name: string;
    role: string;
  };
  triggerType: CommunicationTriggerType;
  status: CommunicationDeliveryStatus;
  providerMessageId?: string;
  errorReason?: string;
  deliveryReport?: {
    providerStatus?: string;
    deliveredAt?: string;
    readAt?: string;
    failedAt?: string;
    errorCode?: string | number;
    errorMessage?: string;
    lastUpdated?: string;
  };
  retryCount: number;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface SendMessagePayload {
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  parentName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  userId?: string;
  channel: CommunicationChannel;
  sendMode?: WhatsAppSendMode;
  templateId?: string;
  title?: string;
  content: string;
  triggerType: CommunicationTriggerType;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string | null;
}

export interface BatchSendMessagePayload {
  schoolId: string;
  recipients: Array<{
    studentId: string;
    studentName: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    parentName?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    userId?: string;
    amount?: string | number;
    outstandingAmount?: string | number;
    dueDate?: string;
    invoiceNumber?: string;
    receiptNo?: string;
    customVariables?: Record<string, string>;
  }>;
  channel: CommunicationChannel;
  sendMode?: WhatsAppSendMode;
  templateId?: string;
  titleTemplate?: string;
  contentTemplate: string;
  triggerType: CommunicationTriggerType;
  scheduledFor?: string | null;
}

export interface SendResult {
  success: boolean;
  logId: string;
  channel: CommunicationChannel;
  status: CommunicationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
  waLink?: string; // For manual WhatsApp mode
}
