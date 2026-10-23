import type { CommunicationTemplate } from "@/types/communication";

export const DEFAULT_COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: "tpl_fee_upcoming",
    name: "Upcoming Fee Reminder (3 Days Before)",
    category: "fee_reminder",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Upcoming Fee Reminder - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nThis is a gentle reminder that the school fee of {{fee_amount}} for {{student_name}} (Class: {{class_name}}, Adm No: {{admission_number}}) is due on {{due_date}}.\nPlease make the payment on time to ensure uninterrupted access.\nRegards, {{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "admission_number", "fee_amount", "due_date", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_fee_on_due",
    name: "Fee Due Today Alert",
    category: "fee_reminder",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Fee Due Today - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nToday is the due date for {{student_name}}'s school fee of {{outstanding_amount}} (Adm No: {{admission_number}}).\nPlease clear today to avoid late fee penalties.\nPay Online: {{payment_link}}\nRegards, {{school_name}}",
    variables: ["parent_name", "student_name", "admission_number", "outstanding_amount", "payment_link", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_fee_overdue",
    name: "Overdue Fee Notice",
    category: "fee_reminder",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Overdue Fee Alert - {{school_name}}",
    bodyTemplate:
      "URGENT NOTICE:\nDear {{parent_name}}, fee payment of {{outstanding_amount}} for {{student_name}} (Class: {{class_name}}) is OVERDUE since {{due_date}}.\nPlease settle the pending dues immediately via school portal or office cash counter.\nPay Online: {{payment_link}}\n- {{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "outstanding_amount", "due_date", "payment_link", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_sms_fee_reminder",
    name: "SMS Quick Fee Reminder",
    category: "fee_reminder",
    channel: "sms",
    status: "approved",
    titleTemplate: "Fee Reminder",
    bodyTemplate:
      "Dear {{parent_name}}, fee of {{outstanding_amount}} for {{student_name}} is due on {{due_date}}. Pay online: {{payment_link}} - {{school_name}}",
    variables: ["parent_name", "outstanding_amount", "student_name", "due_date", "payment_link", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_fee_receipt",
    name: "Fee Payment Receipt Confirmation",
    category: "payment_receipt",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Fee Receipt Confirmed - {{invoice_number}}",
    bodyTemplate:
      "Dear {{parent_name}},\nThank you! Fee payment of {{fee_amount}} for {{student_name}} has been received successfully.\nInvoice / Receipt No: {{invoice_number}}\nDownload receipt from your student portal.\n- {{school_name}}",
    variables: ["parent_name", "student_name", "fee_amount", "invoice_number", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_absence_alert",
    name: "Daily Student Absence Alert",
    category: "attendance_alert",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Student Absent Notice - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nThis is to notify that {{student_name}} (Class: {{class_name}} {{section}}) is marked ABSENT today. If this absence is unexcused, kindly contact the school office: {{school_contact}}.\n- {{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "section", "school_contact", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_exam_notice",
    name: "Exam Schedule & Roll Card Alert",
    category: "exam_notice",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Exam Schedule Notice - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nUpcoming examinations for {{student_name}} (Class {{class_name}}) commence soon. Please ensure all outstanding fees are settled to release the hall ticket.\nHelpline: {{school_contact}}\n- {{school_name}}",
    variables: ["parent_name", "student_name", "class_name", "school_contact", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_school_notice",
    name: "School General Circular / Announcement",
    category: "general",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "School Circular - {{school_name}}",
    bodyTemplate:
      "Dear {{parent_name}},\nImportant announcement regarding {{student_name}}'s school schedule. Please check the student portal for detailed circulars: {{payment_link}}.\nRegards, {{school_name}}",
    variables: ["parent_name", "student_name", "payment_link", "school_name"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_admission_welcome",
    name: "New Admission Welcome & Credentials",
    category: "admission_welcome",
    channel: "whatsapp",
    status: "approved",
    titleTemplate: "Welcome to {{school_name}} - Admission Confirmed",
    bodyTemplate:
      "Welcome to {{school_name}}!\nWe are delighted to confirm the admission of {{student_name}} in Class {{class_name}}.\nAdmission No: {{admission_number}}\nWe look forward to an enriching academic journey together!",
    variables: ["school_name", "student_name", "class_name", "admission_number"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl_fee_inapp",
    name: "Fee Due Alert (In-App)",
    category: "fee_reminder",
    channel: "in_app",
    status: "approved",
    titleTemplate: "Pending Fee Alert: {{outstanding_amount}}",
    bodyTemplate:
      "A pending fee of {{outstanding_amount}} for {{student_name}} is due on {{due_date}}. Please visit the Fee Portal to clear dues or download receipts.",
    variables: ["outstanding_amount", "student_name", "due_date"],
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

/**
 * Resolves dynamic template variables like {{student_name}}, {{fee_amount}}, etc.
 */
export function resolveTemplateVariables(
  template: string,
  data: Record<string, any>
): string {
  if (!template) return "";
  let resolved = template;

  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      resolved = resolved.replace(regex, String(val));
    }
  });

  // Support common aliases
  if (data.student_name) {
    resolved = resolved.replace(/{{\s*student\s*}}/gi, String(data.student_name));
  }
  if (data.parent_name) {
    resolved = resolved.replace(/{{\s*parent\s*}}/gi, String(data.parent_name));
  }
  if (data.fee_amount || data.outstanding_amount || data.amount) {
    const amt = data.outstanding_amount || data.fee_amount || data.amount;
    resolved = resolved.replace(/{{\s*amount\s*}}/gi, String(amt));
    resolved = resolved.replace(/{{\s*outstanding_amount\s*}}/gi, String(amt));
  }
  if (data.admission_number || data.admission_no) {
    const adm = data.admission_number || data.admission_no;
    resolved = resolved.replace(/{{\s*admission_no\s*}}/gi, String(adm));
    resolved = resolved.replace(/{{\s*admission_number\s*}}/gi, String(adm));
  }
  if (data.payment_link || data.pay_link) {
    const link = data.payment_link || data.pay_link;
    resolved = resolved.replace(/{{\s*pay_link\s*}}/gi, String(link));
    resolved = resolved.replace(/{{\s*payment_link\s*}}/gi, String(link));
  }

  // Remove any remaining unresolved {{...}} with empty string
  resolved = resolved.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, "");

  return resolved.trim();
}
