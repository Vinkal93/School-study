import type { CommunicationTemplate } from "@/types/communication";

export const DEFAULT_COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: "tpl_fee_upcoming",
    name: "Upcoming Fee Reminder (3 Days Before)",
    category: "fee_reminder",
    channel: "whatsapp",
    titleTemplate: "Upcoming Fee Reminder - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nThis is a gentle reminder that the school fee of ₹{{amount}} for {{student_name}} (Class: {{class_name}}, Adm No: {{admission_no}}) is due on {{due_date}}.\nPlease make the payment on time to ensure uninterrupted access.\nRegards, {{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "admission_no", "amount", "due_date", "school_name"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_fee_on_due",
    name: "Fee Due Today Alert",
    category: "fee_reminder",
    channel: "whatsapp",
    titleTemplate: "Fee Due Today - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nToday is the due date for {{student_name}}'s school fee of ₹{{amount}} (Adm No: {{admission_no}}).\nPlease ensure timely clearance today to avoid late fee penalties.\nPay Online: {{pay_link}}\nRegards, {{school_name}}",
    variables: ["parent_name", "student_name", "admission_no", "amount", "pay_link", "school_name"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_fee_overdue",
    name: "Overdue Fee Notice",
    category: "fee_reminder",
    channel: "whatsapp",
    titleTemplate: "Overdue Fee Alert - {{school_name}}",
    bodyTemplate:
      "URGENT NOTICE:\nDear {{parent_name}}, fee payment of ₹{{amount}} for {{student_name}} (Class: {{class_name}}) is OVERDUE since {{due_date}}.\nPlease settle the pending dues immediately via school portal or office cash counter.\nContact school office if payment already made.\n{{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "amount", "due_date", "school_name"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_fee_receipt",
    name: "Fee Payment Receipt Confirmation",
    category: "payment_receipt",
    channel: "whatsapp",
    titleTemplate: "Fee Receipt Confirmed - {{receipt_no}}",
    bodyTemplate:
      "Dear {{parent_name}},\nThank you! Fee payment of ₹{{amount}} for {{student_name}} has been received successfully.\nReceipt No: {{receipt_no}}\nDate: {{date}}\nDownload receipt from your student portal.\n- {{school_name}}",
    variables: ["parent_name", "student_name", "amount", "receipt_no", "date", "school_name"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_admission_welcome",
    name: "New Admission Welcome & Credentials",
    category: "admission_welcome",
    channel: "whatsapp",
    titleTemplate: "Welcome to {{school_name}} - Admission Confirmed",
    bodyTemplate:
      "Welcome to {{school_name}}!\nWe are delighted to confirm the admission of {{student_name}} in Class {{class_name}}.\nAdmission No: {{admission_no}}\nPortal Login: {{login_url}}\nRegistered Mobile: {{phone}}\nWe look forward to an enriching academic journey together!",
    variables: ["school_name", "student_name", "class_name", "admission_no", "login_url", "phone"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_admission_inapp",
    name: "Admission Confirmation (In-App)",
    category: "admission_welcome",
    channel: "in_app",
    titleTemplate: "Welcome to {{school_name}}! 🎓",
    bodyTemplate:
      "Congratulations {{student_name}}! Your admission in Class {{class_name}} (Adm #{{admission_no}}) is active. Explore your subjects, timetable, and assignments.",
    variables: ["school_name", "student_name", "class_name", "admission_no"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_fee_inapp",
    name: "Fee Due Alert (In-App)",
    category: "fee_reminder",
    channel: "in_app",
    titleTemplate: "Pending Fee Alert: ₹{{amount}}",
    bodyTemplate:
      "A pending fee of ₹{{amount}} for {{student_name}} is due on {{due_date}}. Please visit the Fee Portal to clear dues or download receipts.",
    variables: ["amount", "student_name", "due_date"],
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Resolves dynamic template variables like {{student_name}}, {{amount}}, etc.
 * 100% browser-safe and portable with zero node/admin dependencies.
 */
export function resolveTemplateVariables(template: string, data: Record<string, any>): string {
  if (!template) return "";
  let resolved = template;
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      resolved = resolved.replace(regex, String(val));
    }
  });
  return resolved;
}
