import type {
  PartnerPermission,
  PartnerProgramSettings,
  PartnerType,
} from "@/types/partner";

export const PARTNER_COLLECTIONS = {
  PARTNERS: "partners",
  APPLICATIONS: "partnerApplications",
  LEADS: "partnerLeads",
  COMMISSIONS: "partnerCommissions",
  PAYOUTS: "partnerPayouts",
  RESOURCES: "partnerResources",
  TICKETS: "partnerSupportTickets",
  AUDIT: "partnerAuditLogs",
  NOTIFICATIONS: "partnerNotifications",
  ATTRIBUTIONS: "partnerReferralAttributions",
  CLICKS: "partnerReferralClicks",
  FRAUD: "partnerFraudFlags",
  AGREEMENTS: "partnerAgreements",
  SETTINGS: "partnerProgramSettings",
  SCHOOL_OWNERSHIP: "partnerSchoolOwnership",
} as const;

export const PARTNER_SETTINGS_DOC_ID = "global";

export const PARTNER_REF_COOKIE = "ss_partner_ref";
export const PARTNER_VISITOR_COOKIE = "ss_partner_vid";

export const PARTNER_PERMISSIONS: PartnerPermission[] = [
  "partner.dashboard.view",
  "partner.leads.view",
  "partner.leads.create",
  "partner.leads.update",
  "partner.commissions.view",
  "partner.payouts.view",
  "partner.payouts.request",
  "partner.resources.view",
  "partner.support.create",
  "partner.profile.update",
  "partner.analytics.view",
];

export const APPROVED_PARTNER_PERMISSIONS: PartnerPermission[] = [
  "partner.dashboard.view",
  "partner.leads.view",
  "partner.leads.create",
  "partner.leads.update",
  "partner.commissions.view",
  "partner.payouts.view",
  "partner.payouts.request",
  "partner.resources.view",
  "partner.support.create",
  "partner.profile.update",
  "partner.analytics.view",
];

export const PENDING_PARTNER_PERMISSIONS: PartnerPermission[] = [
  "partner.dashboard.view",
  "partner.profile.update",
];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  referral: "Referral Partner",
  sales: "Sales Partner",
  implementation: "Implementation Partner",
  school_it: "School IT Partner",
  district: "District Partner",
  reseller: "Reseller Partner",
  white_label: "White-Label Partner",
};

export const PARTNER_TYPE_DESCRIPTIONS: Record<PartnerType, string> = {
  referral: "For people who introduce schools to School Study.",
  sales: "For partners who generate leads and close School Study subscriptions.",
  implementation: "For IT professionals and agencies who onboard schools.",
  school_it: "For school IT vendors who recommend and support School Study.",
  district: "For education consultants with strong district school networks.",
  reseller: "For partners who sell School Study packages to schools.",
  white_label: "For larger organizations that resell under their own brand.",
};

export function defaultPartnerProgramSettings(nowIso = new Date().toISOString()): PartnerProgramSettings {
  return {
    enabled: true,
    requireApproval: true,
    autoBanOnFraud: false,
    payoutSchedule: "monthly",
    holdingPeriodDays: 15,
    minPayoutPaise: 500000,
    renewalDurationMonths: 24,
    defaultRenewalPercent: 10,
    referralCookieDays: 90,
    exclusiveTerritoryBlocksLeads: false,
    maxLeadsPerHour: 20,
    types: {
      referral: { enabled: true, initialPercent: 15, renewalPercent: 8 },
      sales: { enabled: true, initialPercent: 25, renewalPercent: 12 },
      implementation: { enabled: true, initialPercent: 20, renewalPercent: 10 },
      school_it: { enabled: true, initialPercent: 18, renewalPercent: 8 },
      district: { enabled: true, initialPercent: 30, renewalPercent: 15 },
      reseller: { enabled: true, initialPercent: 30, renewalPercent: 15, minPercent: 30, maxPercent: 40 },
      white_label: {
        enabled: true,
        initialPercent: 0,
        renewalPercent: 0,
        notes: "Pricing and commission are configured per partner by Super Admin.",
      },
    },
    activeAgreementVersion: "1.0",
    publicBaseUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://schoolstudy.com",
    updatedAt: nowIso,
  };
}
