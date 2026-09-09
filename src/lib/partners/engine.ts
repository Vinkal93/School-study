import type {
  CommissionType,
  Partner,
  PartnerCommission,
  PartnerLead,
  PartnerProgramSettings,
  PartnerType,
} from "@/types/partner";
import { defaultPartnerProgramSettings } from "./constants";

export function normalizeEmail(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

export function normalizePhone(value?: string | null): string {
  return (value || "").replace(/[^\d]/g, "");
}

export function normalizeSchoolKey(name: string, city?: string, state?: string): string {
  return [name, city, state]
    .map((v) => (v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .join("|");
}

export function slugFromName(name: string): string {
  const cleaned = (name || "PARTNER")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 12);
  return cleaned || "PARTNER";
}

export function generatePartnerCode(name: string, sequence: number): string {
  const seq = String(Math.max(1, sequence)).padStart(3, "0");
  return `SS-${slugFromName(name)}-${seq}`;
}

export function buildReferralUrl(baseUrl: string, code: string): string {
  const origin = (baseUrl || "https://schoolstudy.com").replace(/\/+$/, "");
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

export function getCommissionRatesForType(
  settings: PartnerProgramSettings,
  type: PartnerType,
  override?: { initialPercent?: number; renewalPercent?: number }
) {
  const rule = settings.types[type] || defaultPartnerProgramSettings().types[type];
  let initial = override?.initialPercent ?? rule.initialPercent;
  let renewal = override?.renewalPercent ?? rule.renewalPercent;
  if (typeof rule.minPercent === "number") initial = Math.max(rule.minPercent, initial);
  if (typeof rule.maxPercent === "number") initial = Math.min(rule.maxPercent, initial);
  return { initialPercent: initial, renewalPercent: renewal };
}

export function calculateCommissionPaise(grossAmountPaise: number, percent: number): number {
  if (!Number.isFinite(grossAmountPaise) || grossAmountPaise <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.round((grossAmountPaise * percent) / 100);
}

export function applyMaxCommission(amountPaise: number, maxPaise?: number | null): number {
  if (!maxPaise || maxPaise <= 0) return amountPaise;
  return Math.min(amountPaise, maxPaise);
}

export function commissionPayableAt(createdAtIso: string, holdingPeriodDays: number): string {
  const created = new Date(createdAtIso).getTime();
  const days = Math.max(0, holdingPeriodDays || 0);
  return new Date(created + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isCommissionPayable(commission: PartnerCommission, nowIso = new Date().toISOString()): boolean {
  if (commission.status !== "pending" && commission.status !== "approved") return false;
  if (!commission.payableAt) return true;
  return new Date(nowIso).getTime() >= new Date(commission.payableAt).getTime();
}

export function nextPayoutDate(schedule: PartnerProgramSettings["payoutSchedule"], from = new Date()): string {
  const d = new Date(from);
  if (schedule === "weekly") {
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  } else if (schedule === "biweekly") {
    d.setDate(d.getDate() + 14);
  } else if (schedule === "monthly") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  return d.toISOString();
}

export function onboardingPercent(partner: Partner): number {
  const steps = partner.onboarding;
  const values = [
    steps.welcome,
    steps.profileComplete,
    steps.agreementAccepted,
    steps.partnerCodeViewed,
    steps.trainingWatched,
    steps.salesMaterialsViewed,
    steps.firstLeadSubmitted,
  ];
  const done = values.filter(Boolean).length;
  return Math.round((done / values.length) * 100);
}

export function emptyOnboarding() {
  return {
    welcome: false,
    profileComplete: false,
    agreementAccepted: false,
    partnerCodeViewed: false,
    trainingWatched: false,
    salesMaterialsViewed: false,
    firstLeadSubmitted: false,
  };
}

export interface OwnershipRecord {
  key: string;
  partnerId: string;
  schoolName: string;
  mobile?: string;
  email?: string;
  schoolId?: string | null;
  createdAt: string;
}

export function detectLeadFraud(input: {
  partner: Partner;
  lead: {
    schoolName: string;
    mobile: string;
    email: string;
    city?: string;
    state?: string;
  };
  existingLeads: PartnerLead[];
  existingOwnership: OwnershipRecord[];
  partnerAccountsForEmail: number;
  leadsCreatedLastHour: number;
  maxLeadsPerHour: number;
  schoolAlreadyRegistered?: boolean;
}): { flags: string[]; blocked: boolean; message?: string } {
  const flags: string[] = [];
  const email = normalizeEmail(input.lead.email);
  const mobile = normalizePhone(input.lead.mobile);
  const key = normalizeSchoolKey(input.lead.schoolName, input.lead.city, input.lead.state);

  if (email && email === normalizeEmail(input.partner.personalInfo.email)) {
    flags.push("self_referral_email");
  }
  if (mobile && mobile === normalizePhone(input.partner.personalInfo.mobile)) {
    flags.push("self_referral_mobile");
  }
  if (input.partnerAccountsForEmail > 1) {
    flags.push("multiple_partner_accounts");
  }
  if (input.leadsCreatedLastHour >= input.maxLeadsPerHour) {
    flags.push("abnormal_lead_rate");
  }
  if (input.schoolAlreadyRegistered) {
    flags.push("existing_school");
  }

  const duplicateOwn = input.existingLeads.some(
    (l) =>
      l.partnerId === input.partner.id &&
      (normalizeSchoolKey(l.schoolName, l.city, l.state) === key ||
        (mobile && normalizePhone(l.contact.mobile) === mobile) ||
        (email && normalizeEmail(l.contact.email) === email))
  );
  if (duplicateOwn) flags.push("duplicate_own_lead");

  const ownedByOther = input.existingOwnership.find((o) => {
    if (o.partnerId === input.partner.id) return false;
    return (
      o.key === key ||
      (mobile && o.mobile && o.mobile === mobile) ||
      (email && o.email && o.email === email)
    );
  });

  if (ownedByOther) {
    flags.push("owned_by_another_partner");
    return {
      flags,
      blocked: true,
      message:
        "This school is already attributed to another partner. First valid referral keeps attribution unless Super Admin overrides it.",
    };
  }

  if (duplicateOwn) {
    return {
      flags,
      blocked: true,
      message: "You already have a lead for this school or contact.",
    };
  }

  if (input.leadsCreatedLastHour >= input.maxLeadsPerHour) {
    return {
      flags,
      blocked: true,
      message: "Lead creation rate limit reached. Please try again later.",
    };
  }

  return { flags, blocked: false };
}

export function canPartnerAccessLead(partnerId: string, lead: PartnerLead): boolean {
  return lead.partnerId === partnerId;
}

export function partnerCannotMarkPayoutPaid(): boolean {
  return true;
}

export function isSensitivePartnerField(field: string): boolean {
  return [
    "partnerType",
    "commissionConfig",
    "territory",
    "status",
    "partnerCode",
    "referralCodeEnabled",
  ].includes(field);
}

export function computeDashboardStats(input: {
  leads: PartnerLead[];
  commissions: PartnerCommission[];
  clicks: number;
  uniqueVisitors: number;
  holdingPeriodDays: number;
  nowIso?: string;
}) {
  const now = input.nowIso || new Date().toISOString();
  const leads = input.leads;
  const converted = leads.filter((l) => l.status === "converted");
  const demos = leads.filter((l) => l.status === "demo_completed" || l.status === "converted");
  const qualified = leads.filter((l) =>
    ["qualified", "demo_scheduled", "demo_completed", "proposal_sent", "negotiation", "converted"].includes(l.status)
  );
  const gross = input.commissions.reduce((s, c) => s + (c.grossAmountPaise || 0), 0);
  const pending = input.commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + c.commissionAmountPaise, 0);
  const payable = input.commissions
    .filter((c) => c.status === "payable" || (c.status === "approved" && isCommissionPayable(c, now)))
    .reduce((s, c) => s + c.commissionAmountPaise, 0);
  const paid = input.commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionAmountPaise, 0);
  const conversionRate = leads.length ? Math.round((converted.length / leads.length) * 1000) / 10 : 0;
  const clickToLead = input.clicks ? Math.round((leads.length / input.clicks) * 1000) / 10 : 0;
  const leadToDemo = leads.length ? Math.round((demos.length / leads.length) * 1000) / 10 : 0;
  const demoToConv = demos.length ? Math.round((converted.length / demos.length) * 1000) / 10 : 0;

  return {
    totalLeads: leads.length,
    qualifiedLeads: qualified.length,
    demos: demos.length,
    convertedSchools: converted.length,
    activeSchools: converted.length,
    conversionRate,
    totalRevenuePaise: gross,
    pendingCommissionPaise: pending,
    availableForPayoutPaise: payable,
    paidCommissionPaise: paid,
    clicks: input.clicks,
    uniqueVisitors: input.uniqueVisitors,
    funnel: {
      clicks: input.clicks,
      leads: leads.length,
      demos: demos.length,
      conversions: converted.length,
      clickToLead,
      leadToDemo,
      demoToConversion: demoToConv,
    },
  };
}

export function monthBuckets(fromIso: string, toIso: string): string[] {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

export function rangeFromPreset(preset: string, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  if (preset === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() };
  }
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : preset === "1y" ? 365 : 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

export function hashVisitor(parts: string[]): string {
  const raw = parts.filter(Boolean).join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `v_${h.toString(16)}`;
}

export type CommissionGenerationInput = {
  partner: Partner;
  settings: PartnerProgramSettings;
  schoolId: string;
  leadId?: string | null;
  subscriptionId: string;
  transactionId: string;
  grossAmountPaise: number;
  type: CommissionType;
  existingCommissionsForTx: PartnerCommission[];
  renewalCountForSchool: number;
  nowIso?: string;
};

export function generateCommissionRecord(input: CommissionGenerationInput): {
  commission: PartnerCommission | null;
  skippedReason?: string;
} {
  if (input.existingCommissionsForTx.some((c) => c.transactionId === input.transactionId && c.partnerId === input.partner.id)) {
    return { commission: null, skippedReason: "Commission already generated for this transaction." };
  }
  if (input.partner.status !== "approved") {
    return { commission: null, skippedReason: "Partner is not approved." };
  }
  const rates = getCommissionRatesForType(input.settings, input.partner.partnerType, {
    initialPercent: input.partner.commissionConfig.initialPercent,
    renewalPercent: input.partner.commissionConfig.renewalPercent,
  });
  if (input.type === "renewal") {
    const duration = input.partner.commissionConfig.renewalDurationMonths || input.settings.renewalDurationMonths;
    if (input.renewalCountForSchool >= duration) {
      return { commission: null, skippedReason: "Renewal commission duration exhausted." };
    }
  }
  const rate = input.type === "renewal" ? rates.renewalPercent : rates.initialPercent;
  if (rate <= 0) {
    return { commission: null, skippedReason: "Commission rate is zero. Configure rates in partner settings." };
  }
  const nowIso = input.nowIso || new Date().toISOString();
  const amount = applyMaxCommission(
    calculateCommissionPaise(input.grossAmountPaise, rate),
    input.partner.commissionConfig.maxCommissionPaise
  );
  const holding = input.partner.commissionConfig.holdingPeriodDays ?? input.settings.holdingPeriodDays;
  const id = `comm_${input.transactionId}_${input.partner.id}_${input.type}`;
  return {
    commission: {
      id,
      partnerId: input.partner.id,
      schoolId: input.schoolId,
      leadId: input.leadId || null,
      subscriptionId: input.subscriptionId,
      transactionId: input.transactionId,
      type: input.type,
      rate,
      grossAmountPaise: input.grossAmountPaise,
      commissionAmountPaise: amount,
      status: "pending",
      payableAt: commissionPayableAt(nowIso, holding),
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  };
}

export function maskBankDetails(details: { accountName?: string; accountNumber?: string; ifsc?: string; upi?: string }): string {
  const last4 = (details.accountNumber || "").slice(-4);
  const upi = details.upi ? details.upi.replace(/.(?=@)/g, "•") : "";
  const parts = [
    details.accountName || "",
    last4 ? `****${last4}` : "",
    details.ifsc ? details.ifsc.slice(0, 4) + "****" : "",
    upi,
  ].filter(Boolean);
  return parts.join(" · ") || "Payment details on file";
}

export function validateApplicationPayload(body: any): { ok: boolean; error?: string } {
  const p = body?.personalInfo || {};
  const b = body?.businessInfo || {};
  const part = body?.partnership || {};
  if (!p.fullName || String(p.fullName).trim().length < 2) return { ok: false, error: "Full name is required." };
  if (!normalizeEmail(p.email) || !p.email.includes("@")) return { ok: false, error: "A valid email is required." };
  if (normalizePhone(p.mobile).length < 10) return { ok: false, error: "A valid mobile number is required." };
  if (!b.businessName || !b.city || !b.state || !b.address) {
    return { ok: false, error: "Business name, address, city, and state are required." };
  }
  if (!part.partnerType) return { ok: false, error: "Please select a partner type." };
  if (!body?.acceptedTerms) return { ok: false, error: "You must accept the partner terms to apply." };
  return { ok: true };
}

export function sanitizePartnerForClient(partner: Partner, role: "partner" | "super_admin") {
  if (role === "super_admin") return partner;
  return {
    ...partner,
    commissionConfig: {
      initialPercent: partner.commissionConfig.initialPercent,
      renewalPercent: partner.commissionConfig.renewalPercent,
      renewalDurationMonths: partner.commissionConfig.renewalDurationMonths,
      minPayoutPaise: partner.commissionConfig.minPayoutPaise,
      holdingPeriodDays: partner.commissionConfig.holdingPeriodDays,
      maxCommissionPaise: partner.commissionConfig.maxCommissionPaise || null,
    },
  };
}

export function formatPaiseInr(paise: number): string {
  const rupees = (paise || 0) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}
