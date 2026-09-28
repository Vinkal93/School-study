/**
 * MULTI-TENANT COMMUNICATION & NOTIFICATION SYSTEM DATA CONTRACTS
 * 
 * Strict Single-Source-of-Truth for:
 * 1. Global Super Admin credentials (Twilio, Email Provider, Master switches)
 * 2. School-level plan entitlements & Super Admin manual overrides
 * 3. Channel dispatching (WhatsApp, Email, In-App)
 * 4. Delivery logs, audit records, and retry states
 * 5. Dynamic variable resolution & Fee automation rules
 */

export type CommunicationChannel = "whatsapp" | "email" | "in_app";

export type CommunicationDeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type CommunicationTriggerType =
  | "manual"
  | "automation"
  | "admission"
  | "fee_reminder"
  | "fee_receipt";

export interface ChannelControlState {
  whatsapp: boolean;
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
  schoolOverrides: Record<string, {
    enabled?: boolean;
    channels?: Partial<ChannelControlState>;
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
  isGloballyEnabled: boolean;
  canSendWhatsApp: boolean;
  canSendEmail: boolean;
  canSendInApp: boolean;
  canAutomate: boolean;
  isOverridden: boolean;
  overrideEnabled?: boolean;
  lockReason?: string;
  monthlyUsage: {
    totalSent: number;
    whatsappSent: number;
    emailSent: number;
    inAppSent: number;
    failed: number;
    limit: number;
  };
}

export interface CommunicationTemplate {
  id: string;
  schoolId?: string; // empty string for system default
  name: string;
  category: "fee_reminder" | "admission_welcome" | "payment_receipt" | "attendance_alert" | "general";
  channel: CommunicationChannel;
  titleTemplate?: string;
  bodyTemplate: string;
  variables: string[]; // e.g. ["student_name", "school_name", "amount", "due_date", "receipt_no", "admission_no", "parent_name"]
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeAutomationRule {
  id: string;
  schoolId: string;
  name: string;
  type: "before_due" | "on_due" | "overdue" | "late_fee" | "admission_welcome";
  daysOffset: number; // e.g. -3 for 3 days before due date, 0 for on due date, +3 for 3 days overdue
  channels: CommunicationChannel[];
  titleTemplate?: string;
  bodyTemplate: string;
  enabled: boolean;
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
  parentName?: string;
  recipient: string; // phone number, email, or user UID
  channel: CommunicationChannel;
  templateId?: string;
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
  parentName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  userId?: string;
  channel: CommunicationChannel;
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
    parentName?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    userId?: string;
    amount?: string | number;
    dueDate?: string;
    receiptNo?: string;
    customVariables?: Record<string, string>;
  }>;
  channel: CommunicationChannel;
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
}
