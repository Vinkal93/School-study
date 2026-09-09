export type PartnerType =
  | "referral"
  | "sales"
  | "implementation"
  | "school_it"
  | "district"
  | "reseller"
  | "white_label";

export type PartnerStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

export type PartnerLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "demo_scheduled"
  | "demo_completed"
  | "proposal_sent"
  | "negotiation"
  | "converted"
  | "lost"
  | "invalid";

export type CommissionType = "initial" | "renewal";

export type CommissionStatus =
  | "pending"
  | "approved"
  | "payable"
  | "processing"
  | "paid"
  | "cancelled"
  | "reversed";

export type PayoutStatus = "pending" | "approved" | "processing" | "paid" | "rejected";

export type PartnerTicketStatus =
  | "open"
  | "in_progress"
  | "waiting_for_partner"
  | "resolved"
  | "closed";

export type PartnerResourceCategory =
  | "sales"
  | "marketing"
  | "training"
  | "legal"
  | "other";

export type PartnerAuditAction =
  | "partner.application.submitted"
  | "partner.approved"
  | "partner.rejected"
  | "partner.suspended"
  | "partner.reactivated"
  | "partner.updated"
  | "partner.territory.assigned"
  | "partner.commission.config.changed"
  | "partner.referral.code.toggled"
  | "partner.attribution.overridden"
  | "lead.created"
  | "lead.updated"
  | "lead.converted"
  | "demo.completed"
  | "school.converted"
  | "commission.generated"
  | "commission.approved"
  | "commission.modified"
  | "commission.reversed"
  | "payout.requested"
  | "payout.approved"
  | "payout.rejected"
  | "payout.processing"
  | "payout.paid"
  | "agreement.accepted"
  | "agreement.published"
  | "resource.uploaded"
  | "fraud.flagged";

export type PartnerPermission =
  | "partner.dashboard.view"
  | "partner.leads.view"
  | "partner.leads.create"
  | "partner.leads.update"
  | "partner.commissions.view"
  | "partner.payouts.view"
  | "partner.payouts.request"
  | "partner.resources.view"
  | "partner.support.create"
  | "partner.profile.update"
  | "partner.analytics.view";

export interface PartnerPersonalInfo {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp: string;
  photoUrl?: string;
}

export interface PartnerBusinessInfo {
  businessName: string;
  businessType: string;
  website?: string;
  gstNumber?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PartnerApplicationDetails {
  partnerType: PartnerType;
  educationExperience: string;
  schoolsConnected: number;
  targetDistrict: string;
  targetState: string;
  expectedMonthlyLeads: number;
  hearAbout: string;
}

export interface PartnerDocuments {
  panUrl?: string;
  gstCertificateUrl?: string;
  businessRegistrationUrl?: string;
  identityProofUrl?: string;
}

export interface PartnerTerritory {
  state?: string;
  district?: string;
  city?: string;
  exclusive: boolean;
}

export interface PartnerCommissionConfig {
  initialPercent: number;
  renewalPercent: number;
  renewalDurationMonths: number;
  maxCommissionPaise?: number | null;
  minPayoutPaise: number;
  holdingPeriodDays: number;
}

export interface PartnerOnboardingState {
  welcome: boolean;
  profileComplete: boolean;
  agreementAccepted: boolean;
  partnerCodeViewed: boolean;
  trainingWatched: boolean;
  salesMaterialsViewed: boolean;
  firstLeadSubmitted: boolean;
}

export interface Partner {
  id: string;
  userId: string;
  partnerCode: string;
  referralUrl: string;
  partnerType: PartnerType;
  status: PartnerStatus;
  referralCodeEnabled: boolean;
  personalInfo: PartnerPersonalInfo;
  businessInfo: PartnerBusinessInfo;
  applicationDetails: PartnerApplicationDetails;
  documents: PartnerDocuments;
  territory: PartnerTerritory;
  commissionConfig: PartnerCommissionConfig;
  agreementVersion?: string;
  agreementAcceptedAt?: string;
  agreementIp?: string;
  marketingOptIn: boolean;
  onboarding: PartnerOnboardingState;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerApplication {
  id: string;
  applicantUserId: string;
  partnerId: string;
  applicationData: {
    personalInfo: PartnerPersonalInfo;
    businessInfo: PartnerBusinessInfo;
    partnership: PartnerApplicationDetails;
  };
  documents: PartnerDocuments;
  status: PartnerStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerLeadContact {
  person: string;
  mobile: string;
  email: string;
}

export interface PartnerLead {
  id: string;
  partnerId: string;
  schoolId?: string | null;
  schoolName: string;
  contact: PartnerLeadContact;
  city: string;
  state: string;
  studentCount?: number;
  teacherCount?: number;
  currentSoftware?: string;
  requirements?: string;
  expectedBudget?: string;
  notes?: string;
  status: PartnerLeadStatus;
  attribution: "first_valid_referral" | "admin_override";
  attributionLocked: boolean;
  fraudFlags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  schoolId: string;
  leadId?: string | null;
  subscriptionId: string;
  transactionId: string;
  type: CommissionType;
  rate: number;
  grossAmountPaise: number;
  commissionAmountPaise: number;
  status: CommissionStatus;
  payableAt?: string;
  paidAt?: string;
  payoutId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPayout {
  id: string;
  partnerId: string;
  amountPaise: number;
  status: PayoutStatus;
  paymentMethod: string;
  paymentReference?: string;
  bankDetailsMasked: string;
  bankDetailsEncrypted?: string;
  rejectionReason?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface PartnerResource {
  id: string;
  title: string;
  description?: string;
  category: PartnerResourceCategory;
  fileUrl: string;
  mimeType?: string;
  visibility: "all" | PartnerType[];
  createdAt: string;
  createdBy: string;
}

export interface PartnerSupportMessage {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface PartnerSupportTicket {
  id: string;
  partnerId: string;
  subject: string;
  category: string;
  status: PartnerTicketStatus;
  messages: PartnerSupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerAuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: PartnerAuditAction;
  entity: string;
  entityId: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PartnerNotification {
  id: string;
  audience: "partner" | "super_admin";
  partnerId?: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ReferralAttribution {
  id: string;
  partnerId: string;
  partnerCode: string;
  visitorId: string;
  ipHash?: string;
  userAgent?: string;
  landingPath: string;
  schoolId?: string | null;
  converted: boolean;
  createdAt: string;
}

export interface ReferralClickEvent {
  id: string;
  partnerId: string;
  partnerCode: string;
  visitorId: string;
  unique: boolean;
  path: string;
  createdAt: string;
}

export interface PartnerFraudFlag {
  id: string;
  partnerId: string;
  leadId?: string;
  reasons: string[];
  severity: "low" | "medium" | "high";
  reviewed: boolean;
  createdAt: string;
}

export interface PartnerAgreement {
  id: string;
  version: string;
  title: string;
  body: string;
  publishedAt: string;
  publishedBy: string;
  active: boolean;
}

export interface PartnerTypeCommissionRule {
  enabled: boolean;
  initialPercent: number;
  renewalPercent: number;
  minPercent?: number;
  maxPercent?: number;
  notes?: string;
}

export interface PartnerProgramSettings {
  enabled: boolean;
  requireApproval: boolean;
  autoBanOnFraud: boolean;
  payoutSchedule: "weekly" | "biweekly" | "monthly" | "manual";
  holdingPeriodDays: number;
  minPayoutPaise: number;
  renewalDurationMonths: number;
  defaultRenewalPercent: number;
  referralCookieDays: number;
  exclusiveTerritoryBlocksLeads: boolean;
  maxLeadsPerHour: number;
  types: Record<PartnerType, PartnerTypeCommissionRule>;
  activeAgreementVersion: string;
  publicBaseUrl: string;
  updatedAt: string;
  updatedBy?: string;
}
