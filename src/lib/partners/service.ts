import type {
  Partner,
  PartnerApplication,
  PartnerAuditAction,
  PartnerLead,
  PartnerLeadStatus,
  PartnerPayout,
  PartnerProgramSettings,
  PartnerType,
  PayoutStatus,
} from "@/types/partner";
import {
  buildReferralUrl,
  canPartnerAccessLead,
  detectLeadFraud,
  emptyOnboarding,
  generateCommissionRecord,
  generatePartnerCode,
  getCommissionRatesForType,
  hashVisitor,
  maskBankDetails,
  normalizeEmail,
  normalizePhone,
  normalizeSchoolKey,
  nextPayoutDate,
  validateApplicationPayload,
} from "./engine";
import {
  defaultAgreement,
  getActiveAgreement,
  getPartner,
  getPartnerByCode,
  getPartnerByUserId,
  getPayout,
  getSettings,
  getTicket,
  listApplications,
  listAttributions,
  listClicks,
  listCommissions,
  listFraud,
  listLeads,
  listOwnership,
  listPartners,
  listPayouts,
  listResources,
  listTickets,
  newId,
  nextCodeSequence,
  nowIso,
  overrideOwnership,
  saveAgreement,
  saveApplication,
  saveAttribution,
  saveAudit,
  saveClick,
  saveCommission,
  saveFraud,
  saveLead,
  saveOwnership,
  savePartner,
  savePayout,
  saveResource,
  saveSettings,
  saveTicket,
  getLead,
} from "./store";
import { encryptSecret } from "./crypto";
import {
  commissionGeneratedMessage,
  notifyAdmins,
  notifyPartner,
  payoutProcessedMessage,
} from "./notifications";
import { defaultPartnerProgramSettings } from "./constants";

async function audit(input: {
  actorId: string;
  actorRole: string;
  action: PartnerAuditAction;
  entity: string;
  entityId: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
}) {
  await saveAudit({
    id: newId("audit"),
    ...input,
    createdAt: nowIso(),
  });
}

export async function submitPartnerApplication(input: {
  userId: string;
  body: any;
  ip?: string;
  userAgent?: string;
}) {
  const settings = await getSettings();
  if (!settings.enabled) {
    throw Object.assign(new Error("The Partner Program is currently disabled."), { status: 403 });
  }
  const valid = validateApplicationPayload(input.body);
  if (!valid.ok) {
    throw Object.assign(new Error(valid.error), { status: 400 });
  }
  const existing = await getPartnerByUserId(input.userId);
  if (existing && existing.status !== "rejected") {
    throw Object.assign(new Error("An application already exists for this account."), { status: 409 });
  }
  const type = input.body.partnership.partnerType as PartnerType;
  if (!settings.types[type]?.enabled) {
    throw Object.assign(new Error("This partner type is not accepting applications."), { status: 400 });
  }
  const agreement = await getActiveAgreement();
  const rates = getCommissionRatesForType(settings, type);
  const now = nowIso();
  const partnerId = newId("ptr");
  const appId = newId("app");
  const personal = {
    fullName: String(input.body.personalInfo.fullName).trim(),
    email: normalizeEmail(input.body.personalInfo.email),
    mobile: String(input.body.personalInfo.mobile).trim(),
    whatsapp: String(input.body.personalInfo.whatsapp || input.body.personalInfo.mobile).trim(),
    photoUrl: input.body.personalInfo.photoUrl || "",
  };
  const business = {
    businessName: String(input.body.businessInfo.businessName).trim(),
    businessType: String(input.body.businessInfo.businessType || "Individual").trim(),
    website: input.body.businessInfo.website || "",
    gstNumber: input.body.businessInfo.gstNumber || "",
    pan: input.body.businessInfo.pan || "",
    address: String(input.body.businessInfo.address).trim(),
    city: String(input.body.businessInfo.city).trim(),
    state: String(input.body.businessInfo.state).trim(),
    pincode: String(input.body.businessInfo.pincode || "").trim(),
  };
  const partnership = {
    partnerType: type,
    educationExperience: String(input.body.partnership.educationExperience || ""),
    schoolsConnected: Number(input.body.partnership.schoolsConnected || 0),
    targetDistrict: String(input.body.partnership.targetDistrict || ""),
    targetState: String(input.body.partnership.targetState || ""),
    expectedMonthlyLeads: Number(input.body.partnership.expectedMonthlyLeads || 0),
    hearAbout: String(input.body.partnership.hearAbout || ""),
  };
  const partner: Partner = {
    id: partnerId,
    userId: input.userId,
    partnerCode: "",
    referralUrl: "",
    partnerType: type,
    status: "pending",
    referralCodeEnabled: false,
    personalInfo: personal,
    businessInfo: business,
    applicationDetails: partnership,
    documents: input.body.documents || {},
    territory: {
      state: partnership.targetState,
      district: partnership.targetDistrict,
      city: business.city,
      exclusive: false,
    },
    commissionConfig: {
      initialPercent: rates.initialPercent,
      renewalPercent: rates.renewalPercent,
      renewalDurationMonths: settings.renewalDurationMonths,
      maxCommissionPaise: null,
      minPayoutPaise: settings.minPayoutPaise,
      holdingPeriodDays: settings.holdingPeriodDays,
    },
    agreementVersion: agreement.version,
    agreementAcceptedAt: now,
    agreementIp: input.ip,
    marketingOptIn: Boolean(input.body.marketingOptIn),
    onboarding: emptyOnboarding(),
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const application: PartnerApplication = {
    id: appId,
    applicantUserId: input.userId,
    partnerId,
    applicationData: { personalInfo: personal, businessInfo: business, partnership },
    documents: input.body.documents || {},
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await savePartner(partner);
  await saveApplication(application);
  await audit({
    actorId: input.userId,
    actorRole: "partner",
    action: "partner.application.submitted",
    entity: "partner",
    entityId: partnerId,
    newData: { type, email: personal.email },
    ip: input.ip,
    userAgent: input.userAgent,
  });
  await notifyAdmins({
    title: "New partner application",
    message: `${personal.fullName} applied as ${type}.`,
    type: "partner_application",
    link: `/super-admin/partners/${partnerId}`,
  });
  if (input.body.documents && Object.values(input.body.documents).some(Boolean)) {
    await notifyAdmins({
      title: "Partner documents uploaded",
      message: `${personal.fullName} uploaded onboarding documents.`,
      type: "partner_documents",
      link: `/super-admin/partners/${partnerId}`,
    });
  }
  return { partner, application };
}

export async function approvePartner(actor: { uid: string; role: string }, partnerId: string, meta?: { ip?: string; userAgent?: string }) {
  const partner = await getPartner(partnerId);
  if (!partner) throw Object.assign(new Error("Partner not found."), { status: 404 });
  const previous = { ...partner };
  const settings = await getSettings();
  const seq = nextCodeSequence();
  const code = generatePartnerCode(partner.personalInfo.fullName || partner.businessInfo.businessName, seq);
  partner.status = "approved";
  partner.partnerCode = code;
  partner.referralUrl = buildReferralUrl(settings.publicBaseUrl, code);
  partner.referralCodeEnabled = true;
  partner.reviewedBy = actor.uid;
  partner.reviewedAt = nowIso();
  partner.updatedAt = nowIso();
  partner.lastActivityAt = nowIso();
  partner.onboarding.welcome = true;
  await savePartner(partner);
  const allApps = await listApplications();
  const app = allApps.find((a) => a.partnerId === partnerId);
  if (app) {
    app.status = "approved";
    app.reviewedBy = actor.uid;
    app.reviewedAt = nowIso();
    await saveApplication(app);
  }
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: "partner.approved",
    entity: "partner",
    entityId: partnerId,
    previousData: { status: previous.status },
    newData: { status: "approved", partnerCode: code },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  await notifyPartner({
    partnerId,
    email: partner.personalInfo.email,
    whatsapp: partner.personalInfo.whatsapp,
    title: "Partner application approved",
    message: "Your School Study Partner account has been approved.",
    type: "application_approved",
    link: "/partner/dashboard",
  });
  return partner;
}

export async function rejectPartner(
  actor: { uid: string; role: string },
  partnerId: string,
  reason: string,
  meta?: { ip?: string; userAgent?: string }
) {
  const partner = await getPartner(partnerId);
  if (!partner) throw Object.assign(new Error("Partner not found."), { status: 404 });
  const prev = partner.status;
  partner.status = "rejected";
  partner.rejectionReason = reason || "Application rejected.";
  partner.reviewedBy = actor.uid;
  partner.reviewedAt = nowIso();
  partner.updatedAt = nowIso();
  await savePartner(partner);
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: "partner.rejected",
    entity: "partner",
    entityId: partnerId,
    previousData: { status: prev },
    newData: { status: "rejected", reason },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  await notifyPartner({
    partnerId,
    email: partner.personalInfo.email,
    title: "Partner application rejected",
    message: partner.rejectionReason || "Your application was not approved.",
    type: "application_rejected",
  });
  return partner;
}

export async function setPartnerStatus(
  actor: { uid: string; role: string },
  partnerId: string,
  status: "suspended" | "approved" | "under_review",
  meta?: { ip?: string; userAgent?: string }
) {
  const partner = await getPartner(partnerId);
  if (!partner) throw Object.assign(new Error("Partner not found."), { status: 404 });
  const prev = partner.status;
  partner.status = status;
  partner.updatedAt = nowIso();
  await savePartner(partner);
  const action: PartnerAuditAction =
    status === "suspended" ? "partner.suspended" : status === "approved" ? "partner.reactivated" : "partner.updated";
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action,
    entity: "partner",
    entityId: partnerId,
    previousData: { status: prev },
    newData: { status },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return partner;
}

export async function updatePartnerAdmin(
  actor: { uid: string; role: string },
  partnerId: string,
  patch: Partial<Partner>,
  meta?: { ip?: string; userAgent?: string }
) {
  const partner = await getPartner(partnerId);
  if (!partner) throw Object.assign(new Error("Partner not found."), { status: 404 });
  const previous = {
    partnerType: partner.partnerType,
    commissionConfig: partner.commissionConfig,
    territory: partner.territory,
    status: partner.status,
    referralCodeEnabled: partner.referralCodeEnabled,
  };
  if (patch.partnerType) partner.partnerType = patch.partnerType;
  if (patch.commissionConfig) partner.commissionConfig = { ...partner.commissionConfig, ...patch.commissionConfig };
  if (patch.territory) {
    const conflict = await detectTerritoryConflict(partnerId, patch.territory);
    partner.territory = { ...partner.territory, ...patch.territory };
    if (conflict) {
      await notifyAdmins({
        title: "Territory conflict",
        message: `Territory overlap detected while assigning territory to ${partner.personalInfo.fullName}.`,
        type: "territory_conflict",
        link: `/super-admin/partners/${partnerId}`,
      });
    }
  }
  if (typeof patch.referralCodeEnabled === "boolean") partner.referralCodeEnabled = patch.referralCodeEnabled;
  if (patch.personalInfo) partner.personalInfo = { ...partner.personalInfo, ...patch.personalInfo };
  if (patch.businessInfo) partner.businessInfo = { ...partner.businessInfo, ...patch.businessInfo };
  partner.updatedAt = nowIso();
  await savePartner(partner);
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: patch.territory ? "partner.territory.assigned" : "partner.commission.config.changed",
    entity: "partner",
    entityId: partnerId,
    previousData: previous,
    newData: {
      partnerType: partner.partnerType,
      commissionConfig: partner.commissionConfig,
      territory: partner.territory,
      referralCodeEnabled: partner.referralCodeEnabled,
    },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  if (patch.territory) {
    await notifyPartner({
      partnerId,
      email: partner.personalInfo.email,
      title: "Territory assigned",
      message: `Your territory was updated: ${partner.territory.state || ""} ${partner.territory.district || ""}`.trim(),
      type: "territory_assigned",
    });
  }
  return partner;
}

export async function detectTerritoryConflict(
  partnerId: string,
  territory: { state?: string; district?: string; city?: string; exclusive?: boolean }
) {
  const partners = await listPartners();
  return partners.some((p) => {
    if (p.id === partnerId || p.status !== "approved") return false;
    if (!p.territory.exclusive && !territory.exclusive) return false;
    const stateMatch = territory.state && p.territory.state && territory.state === p.territory.state;
    const districtMatch = territory.district && p.territory.district && territory.district === p.territory.district;
    const cityMatch = territory.city && p.territory.city && territory.city === p.territory.city;
    return Boolean(stateMatch && (districtMatch || cityMatch || (!territory.district && !p.territory.district)));
  });
}

export async function updatePartnerSelf(partner: Partner, patch: any) {
  const allowed = {
    photoUrl: patch.photoUrl,
    fullName: patch.fullName,
    mobile: patch.mobile,
    whatsapp: patch.whatsapp,
    website: patch.website,
    address: patch.address,
    city: patch.city,
    state: patch.state,
    pincode: patch.pincode,
    marketingOptIn: patch.marketingOptIn,
  };
  if (allowed.fullName) partner.personalInfo.fullName = String(allowed.fullName).trim();
  if (allowed.mobile) partner.personalInfo.mobile = String(allowed.mobile).trim();
  if (allowed.whatsapp) partner.personalInfo.whatsapp = String(allowed.whatsapp).trim();
  if (allowed.photoUrl !== undefined) partner.personalInfo.photoUrl = allowed.photoUrl;
  if (allowed.website !== undefined) partner.businessInfo.website = allowed.website;
  if (allowed.address) partner.businessInfo.address = String(allowed.address);
  if (allowed.city) partner.businessInfo.city = String(allowed.city);
  if (allowed.state) partner.businessInfo.state = String(allowed.state);
  if (allowed.pincode) partner.businessInfo.pincode = String(allowed.pincode);
  if (typeof allowed.marketingOptIn === "boolean") partner.marketingOptIn = allowed.marketingOptIn;
  partner.onboarding.profileComplete = true;
  partner.updatedAt = nowIso();
  partner.lastActivityAt = nowIso();
  await savePartner(partner);
  return partner;
}

export async function acceptAgreement(partner: Partner, ip?: string) {
  const agreement = await getActiveAgreement();
  partner.agreementVersion = agreement.version;
  partner.agreementAcceptedAt = nowIso();
  partner.agreementIp = ip;
  partner.onboarding.agreementAccepted = true;
  partner.updatedAt = nowIso();
  await savePartner(partner);
  await audit({
    actorId: partner.userId,
    actorRole: "partner",
    action: "agreement.accepted",
    entity: "partner",
    entityId: partner.id,
    newData: { version: agreement.version, ip },
    ip,
  });
  return partner;
}

export async function trackReferralClick(input: {
  code: string;
  visitorId?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
}) {
  const settings = await getSettings();
  const partner = await getPartnerByCode(input.code);
  if (!partner || partner.status !== "approved" || !partner.referralCodeEnabled) {
    return { ok: false, error: "Invalid or disabled referral code." };
  }
  const visitorId = input.visitorId || hashVisitor([input.ip || "", input.userAgent || "", String(Date.now())]);
  const clicks = await listClicks(partner.id);
  const unique = !clicks.some((c) => c.visitorId === visitorId);
  const click = {
    id: newId("clk"),
    partnerId: partner.id,
    partnerCode: partner.partnerCode,
    visitorId,
    unique,
    path: input.path || "/",
    createdAt: nowIso(),
  };
  await saveClick(click);
  const attrId = `attr_${visitorId}`;
  await saveAttribution({
    id: attrId,
    partnerId: partner.id,
    partnerCode: partner.partnerCode,
    visitorId,
    ipHash: hashVisitor([input.ip || ""]),
    userAgent: input.userAgent,
    landingPath: input.path || "/",
    converted: false,
    createdAt: nowIso(),
  });
  partner.lastActivityAt = nowIso();
  await savePartner(partner);
  return {
    ok: true,
    partnerId: partner.id,
    partnerCode: partner.partnerCode,
    visitorId,
    cookieDays: settings.referralCookieDays,
  };
}

export async function createLead(partner: Partner, body: any, actorRole = "partner") {
  const settings = await getSettings();
  if (partner.status !== "approved") {
    throw Object.assign(new Error("Only approved partners can create leads."), { status: 403 });
  }
  const schoolName = String(body.schoolName || "").trim();
  const contact = {
    person: String(body.contactPerson || "").trim(),
    mobile: String(body.mobile || "").trim(),
    email: normalizeEmail(body.email),
  };
  if (!schoolName || !contact.person || normalizePhone(contact.mobile).length < 10) {
    throw Object.assign(new Error("School name, contact person, and mobile are required."), { status: 400 });
  }
  const leads = await listLeads();
  const ownership = await listOwnership();
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const leadsCreatedLastHour = leads.filter(
    (l) => l.partnerId === partner.id && new Date(l.createdAt).getTime() > hourAgo
  ).length;
  const partners = await listPartners();
  const partnerAccountsForEmail = partners.filter(
    (p) => normalizeEmail(p.personalInfo.email) === normalizeEmail(partner.personalInfo.email)
  ).length;

  const fraud = detectLeadFraud({
    partner,
    lead: {
      schoolName,
      mobile: contact.mobile,
      email: contact.email,
      city: body.city,
      state: body.state,
    },
    existingLeads: leads,
    existingOwnership: ownership,
    partnerAccountsForEmail,
    leadsCreatedLastHour,
    maxLeadsPerHour: settings.maxLeadsPerHour,
    schoolAlreadyRegistered: Boolean(body.schoolAlreadyRegistered),
  });

  if (fraud.blocked) {
    await saveFraud({
      id: newId("fraud"),
      partnerId: partner.id,
      reasons: fraud.flags,
      severity: fraud.flags.includes("owned_by_another_partner") ? "high" : "medium",
      reviewed: false,
      createdAt: nowIso(),
    });
    throw Object.assign(new Error(fraud.message || "Lead rejected."), { status: 409, flags: fraud.flags });
  }

  if (settings.exclusiveTerritoryBlocksLeads && partner.territory.exclusive) {
    // exclusive partner is allowed in their territory; others are not auto-blocked unless this setting is on
  }

  const now = nowIso();
  const lead: PartnerLead = {
    id: newId("lead"),
    partnerId: partner.id,
    schoolId: null,
    schoolName,
    contact,
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    studentCount: Number(body.studentCount || 0),
    teacherCount: Number(body.teacherCount || 0),
    currentSoftware: body.currentSoftware || "",
    requirements: body.requirements || "",
    expectedBudget: body.expectedBudget || "",
    notes: body.notes || "",
    status: "new",
    attribution: "first_valid_referral",
    attributionLocked: true,
    fraudFlags: fraud.flags,
    createdAt: now,
    updatedAt: now,
  };
  await saveLead(lead);
  await saveOwnership({
    key: normalizeSchoolKey(schoolName, lead.city, lead.state),
    partnerId: partner.id,
    schoolName,
    mobile: normalizePhone(contact.mobile),
    email: contact.email,
    createdAt: now,
  });
  partner.onboarding.firstLeadSubmitted = true;
  partner.lastActivityAt = now;
  await savePartner(partner);
  await audit({
    actorId: partner.userId,
    actorRole,
    action: "lead.created",
    entity: "lead",
    entityId: lead.id,
    newData: { schoolName },
  });
  await notifyAdmins({
    title: "New partner lead",
    message: `${partner.personalInfo.fullName} referred ${schoolName}.`,
    type: "new_lead",
    link: `/super-admin/partners/${partner.id}`,
  });
  if (fraud.flags.length) {
    await notifyAdmins({
      title: "Partner lead flagged",
      message: `Lead ${schoolName} flagged: ${fraud.flags.join(", ")}`,
      type: "fraud_flag",
      link: `/super-admin/partners/${partner.id}`,
    });
  }
  return lead;
}

export async function updateLead(actorPartnerId: string, leadId: string, patch: Partial<PartnerLead>, asAdmin = false) {
  const lead = await getLead(leadId);
  if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
  if (!asAdmin && !canPartnerAccessLead(actorPartnerId, lead)) {
    throw Object.assign(new Error("Access Denied. You cannot access another partner's leads."), { status: 403 });
  }
  const prev = { ...lead };
  if (patch.status) lead.status = patch.status;
  if (patch.notes !== undefined) lead.notes = patch.notes;
  if (patch.schoolId) lead.schoolId = patch.schoolId;
  if (asAdmin) {
    if (patch.contact) lead.contact = { ...lead.contact, ...patch.contact };
    if (patch.schoolName) lead.schoolName = patch.schoolName;
  }
  lead.updatedAt = nowIso();
  await saveLead(lead);
  await audit({
    actorId: actorPartnerId,
    actorRole: asAdmin ? "super_admin" : "partner",
    action: patch.status === "demo_completed" ? "demo.completed" : "lead.updated",
    entity: "lead",
    entityId: lead.id,
    previousData: { status: prev.status },
    newData: { status: lead.status },
  });
  const partner = await getPartner(lead.partnerId);
  if (partner && patch.status) {
    await notifyPartner({
      partnerId: partner.id,
      email: partner.personalInfo.email,
      title: "Lead updated",
      message: `${lead.schoolName} is now ${lead.status.replace(/_/g, " ")}.`,
      type: "lead_updated",
      link: "/partner/leads",
    });
    if (lead.status === "demo_scheduled") {
      await notifyPartner({
        partnerId: partner.id,
        email: partner.personalInfo.email,
        title: "Demo scheduled",
        message: `A demo was scheduled for ${lead.schoolName}.`,
        type: "demo_scheduled",
      });
    }
  }
  return lead;
}

export async function overrideAttribution(
  actor: { uid: string; role: string },
  leadId: string,
  newPartnerId: string,
  meta?: { ip?: string; userAgent?: string }
) {
  const lead = await getLead(leadId);
  if (!lead) throw Object.assign(new Error("Lead not found."), { status: 404 });
  const previousPartnerId = lead.partnerId;
  const previous = { partnerId: lead.partnerId, attribution: lead.attribution };
  lead.partnerId = newPartnerId;
  lead.attribution = "admin_override";
  lead.attributionLocked = true;
  lead.updatedAt = nowIso();
  await saveLead(lead);
  await overrideOwnership(normalizeSchoolKey(lead.schoolName, lead.city, lead.state), newPartnerId, lead.schoolName);
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: "partner.attribution.overridden",
    entity: "lead",
    entityId: leadId,
    previousData: previous,
    newData: { partnerId: newPartnerId },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return lead;
}

export async function attachSchoolToReferral(input: {
  schoolId: string;
  schoolName: string;
  partnerCode?: string | null;
  visitorId?: string | null;
  adminEmail?: string;
  phone?: string;
}) {
  let partner: Partner | null = null;
  if (input.partnerCode) partner = await getPartnerByCode(input.partnerCode);
  if (!partner && input.visitorId) {
    const attrs = await listAttributions();
    const attr = attrs.find((a) => a.visitorId === input.visitorId);
    if (attr) partner = await getPartner(attr.partnerId);
  }
  if (!partner || partner.status !== "approved" || !partner.referralCodeEnabled) return null;

  const ownership = await listOwnership();
  const key = normalizeSchoolKey(input.schoolName);
  const owned = ownership.find(
    (o) =>
      o.key === key ||
      (input.adminEmail && o.email === normalizeEmail(input.adminEmail)) ||
      (input.phone && o.mobile === normalizePhone(input.phone))
  );
  const attributedPartnerId = owned?.partnerId || partner.id;
  if (owned && owned.partnerId !== partner.id) {
    partner = (await getPartner(owned.partnerId)) || partner;
  }

  const leads = await listLeads(attributedPartnerId);
  let lead = leads.find(
    (l) =>
      normalizeSchoolKey(l.schoolName, l.city, l.state) === key ||
      (input.adminEmail && normalizeEmail(l.contact.email) === normalizeEmail(input.adminEmail))
  );
  if (!lead) {
    lead = {
      id: newId("lead"),
      partnerId: attributedPartnerId,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      contact: {
        person: "School Admin",
        mobile: input.phone || "",
        email: normalizeEmail(input.adminEmail),
      },
      city: "",
      state: "",
      status: "qualified",
      attribution: owned && owned.partnerId !== partner.id ? "first_valid_referral" : "first_valid_referral",
      attributionLocked: true,
      fraudFlags: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await saveLead(lead);
    if (!owned) {
      await saveOwnership({
        key,
        partnerId: attributedPartnerId,
        schoolName: input.schoolName,
        email: normalizeEmail(input.adminEmail),
        mobile: normalizePhone(input.phone),
        schoolId: input.schoolId,
        createdAt: nowIso(),
      });
    }
  } else {
    lead.schoolId = input.schoolId;
    lead.updatedAt = nowIso();
    await saveLead(lead);
  }
  return { partner, lead };
}

export async function generateCommissionForSuccessfulPayment(input: {
  schoolId: string;
  schoolName?: string;
  subscriptionId: string;
  transactionId: string;
  grossAmountPaise: number;
  isRenewal: boolean;
}) {
  const settings = await getSettings();
  const leads = await listLeads();
  const lead = leads.find((l) => l.schoolId === input.schoolId);
  const ownership = await listOwnership();
  const owned = ownership.find((o) => o.schoolId === input.schoolId);
  const partnerId = lead?.partnerId || owned?.partnerId;
  if (!partnerId) return null;
  const partner = await getPartner(partnerId);
  if (!partner) return null;

  const existing = await listCommissions(partner.id);
  const renewalCount = existing.filter((c) => c.schoolId === input.schoolId && c.type === "renewal").length;
  const generated = generateCommissionRecord({
    partner,
    settings,
    schoolId: input.schoolId,
    leadId: lead?.id,
    subscriptionId: input.subscriptionId,
    transactionId: input.transactionId,
    grossAmountPaise: input.grossAmountPaise,
    type: input.isRenewal ? "renewal" : "initial",
    existingCommissionsForTx: existing,
    renewalCountForSchool: renewalCount,
  });
  if (!generated.commission) {
    if (generated.skippedReason) {
      await notifyAdmins({
        title: "Commission issue",
        message: `${generated.skippedReason} (school ${input.schoolId}, partner ${partner.id})`,
        type: "commission_issue",
        link: `/super-admin/partners/${partner.id}`,
      });
    }
    return null;
  }
  await saveCommission(generated.commission);
  if (lead) {
    lead.status = "converted";
    lead.schoolId = input.schoolId;
    lead.updatedAt = nowIso();
    await saveLead(lead);
  }
  await audit({
    actorId: "system",
    actorRole: "system",
    action: "commission.generated",
    entity: "commission",
    entityId: generated.commission.id,
    newData: {
      amount: generated.commission.commissionAmountPaise,
      rate: generated.commission.rate,
      type: generated.commission.type,
    },
  });
  await notifyPartner({
    partnerId: partner.id,
    email: partner.personalInfo.email,
    whatsapp: partner.personalInfo.whatsapp,
    title: "Commission generated",
    message: commissionGeneratedMessage(generated.commission.commissionAmountPaise),
    type: "commission_generated",
    link: "/partner/payouts",
  });
  await notifyPartner({
    partnerId: partner.id,
    email: partner.personalInfo.email,
    title: "School converted",
    message: "Congratulations! Your referred school has successfully subscribed.",
    type: "school_converted",
  });
  await notifyAdmins({
    title: "New school conversion",
    message: `Partner ${partner.personalInfo.fullName} converted a school (${input.schoolId}).`,
    type: "school_conversion",
    link: `/super-admin/partners/${partner.id}`,
  });
  partner.lastActivityAt = nowIso();
  await savePartner(partner);
  return generated.commission;
}

export async function requestPayout(
  partner: Partner,
  input: { amountPaise: number; paymentMethod: string; bankDetails: Record<string, string> }
) {
  const settings = await getSettings();
  const min = partner.commissionConfig.minPayoutPaise || settings.minPayoutPaise;
  if (input.amountPaise < min) {
    throw Object.assign(new Error(`Minimum payout is ${min / 100} INR.`), { status: 400 });
  }
  const commissions = await listCommissions(partner.id);
  const available = commissions
    .filter((c) => c.status === "payable" || c.status === "approved")
    .reduce((s, c) => s + c.commissionAmountPaise, 0);
  const pendingPayouts = (await listPayouts(partner.id)).filter((p) =>
    ["pending", "approved", "processing"].includes(p.status)
  );
  const reserved = pendingPayouts.reduce((s, p) => s + p.amountPaise, 0);
  if (input.amountPaise > available - reserved) {
    throw Object.assign(new Error("Requested amount exceeds available balance."), { status: 400 });
  }
  const payout: PartnerPayout = {
    id: newId("pay"),
    partnerId: partner.id,
    amountPaise: input.amountPaise,
    status: "pending",
    paymentMethod: input.paymentMethod || "bank",
    bankDetailsMasked: maskBankDetails(input.bankDetails || {}),
    bankDetailsEncrypted: encryptSecret(JSON.stringify(input.bankDetails || {})),
    requestedAt: nowIso(),
  };
  await savePayout(payout);
  await audit({
    actorId: partner.userId,
    actorRole: "partner",
    action: "payout.requested",
    entity: "payout",
    entityId: payout.id,
    newData: { amountPaise: payout.amountPaise },
  });
  await notifyAdmins({
    title: "Payout request",
    message: `${partner.personalInfo.fullName} requested a payout.`,
    type: "payout_request",
    link: "/super-admin/partner-payouts",
  });
  return payout;
}

export async function processPayout(
  actor: { uid: string; role: string },
  payoutId: string,
  action: PayoutStatus,
  extra?: { paymentReference?: string; rejectionReason?: string; ip?: string; userAgent?: string }
) {
  if (actor.role === "partner") {
    throw Object.assign(new Error("Partners cannot change payout status."), { status: 403 });
  }
  const payout = await getPayout(payoutId);
  if (!payout) throw Object.assign(new Error("Payout not found."), { status: 404 });
  const prev = payout.status;
  payout.status = action;
  payout.processedAt = nowIso();
  payout.processedBy = actor.uid;
  if (extra?.paymentReference) payout.paymentReference = extra.paymentReference;
  if (extra?.rejectionReason) payout.rejectionReason = extra.rejectionReason;
  await savePayout(payout);

  if (action === "paid") {
    const commissions = await listCommissions(payout.partnerId);
    let remaining = payout.amountPaise;
    for (const c of commissions.filter((c) => c.status === "payable" || c.status === "approved")) {
      if (remaining <= 0) break;
      remaining -= c.commissionAmountPaise;
      c.status = "paid";
      c.paidAt = nowIso();
      c.payoutId = payout.id;
      c.updatedAt = nowIso();
      await saveCommission(c);
    }
  }

  const actionMap: Record<PayoutStatus, PartnerAuditAction> = {
    pending: "payout.requested",
    approved: "payout.approved",
    processing: "payout.processing",
    paid: "payout.paid",
    rejected: "payout.rejected",
  };
  await audit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: actionMap[action],
    entity: "payout",
    entityId: payout.id,
    previousData: { status: prev },
    newData: { status: action, paymentReference: payout.paymentReference || null },
    ip: extra?.ip,
    userAgent: extra?.userAgent,
  });
  const partner = await getPartner(payout.partnerId);
  if (partner && (action === "approved" || action === "paid")) {
    await notifyPartner({
      partnerId: partner.id,
      email: partner.personalInfo.email,
      whatsapp: partner.personalInfo.whatsapp,
      title: action === "paid" ? "Payout paid" : "Payout approved",
      message: action === "paid" ? payoutProcessedMessage(payout.amountPaise) : "Your payout request was approved.",
      type: action === "paid" ? "payout_paid" : "payout_approved",
    });
  }
  return payout;
}

export async function partnerDashboard(partner: Partner) {
  const [leads, commissions, clicks, payouts, settings] = await Promise.all([
    listLeads(partner.id),
    listCommissions(partner.id),
    listClicks(partner.id),
    listPayouts(partner.id),
    getSettings(),
  ]);
  const { computeDashboardStats, onboardingPercent } = await import("./engine");
  const stats = computeDashboardStats({
    leads,
    commissions,
    clicks: clicks.length,
    uniqueVisitors: new Set(clicks.filter((c) => c.unique).map((c) => c.visitorId)).size,
    holdingPeriodDays: partner.commissionConfig.holdingPeriodDays,
  });
  return {
    partner,
    stats,
    onboardingPercent: onboardingPercent(partner),
    nextPayout: nextPayoutDate(settings.payoutSchedule),
    minPayoutPaise: partner.commissionConfig.minPayoutPaise,
    payouts,
    settings: {
      holdingPeriodDays: settings.holdingPeriodDays,
      payoutSchedule: settings.payoutSchedule,
    },
  };
}

export async function adminPartnerOverview() {
  const [partners, leads, commissions, payouts] = await Promise.all([
    listPartners(),
    listLeads(),
    listCommissions(),
    listPayouts(),
  ]);
  return {
    totalPartners: partners.length,
    pendingApplications: partners.filter((p) => p.status === "pending" || p.status === "under_review").length,
    activePartners: partners.filter((p) => p.status === "approved").length,
    suspendedPartners: partners.filter((p) => p.status === "suspended").length,
    totalReferredSchools: leads.length,
    convertedSchools: leads.filter((l) => l.status === "converted").length,
    totalCommissionPaise: commissions.reduce((s, c) => s + c.commissionAmountPaise, 0),
    pendingCommissionPaise: commissions
      .filter((c) => ["pending", "approved", "payable", "processing"].includes(c.status))
      .reduce((s, c) => s + c.commissionAmountPaise, 0),
    paidCommissionPaise: commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commissionAmountPaise, 0),
    revenueGeneratedPaise: commissions.reduce((s, c) => s + c.grossAmountPaise, 0),
    pendingPayouts: payouts.filter((p) => p.status === "pending").length,
  };
}

export async function ensureDefaultSettings() {
  const current = await getSettings();
  if (!current.types) {
    await saveSettings(defaultPartnerProgramSettings());
  }
  const agreement = await getActiveAgreement();
  if (agreement.id === "agr_default") {
    await saveAgreement(defaultAgreement());
  }
  return getSettings();
}

export async function seedDefaultResources(actorId: string) {
  const existing = await listResources();
  if (existing.length) return existing;
  const defaults = [
    { title: "Product Brochure", category: "sales" as const },
    { title: "Pricing PDF", category: "sales" as const },
    { title: "Demo Presentation", category: "sales" as const },
    { title: "Feature Sheet", category: "sales" as const },
    { title: "WhatsApp Templates", category: "sales" as const },
    { title: "Email Templates", category: "sales" as const },
    { title: "School Proposal", category: "sales" as const },
    { title: "FAQ", category: "sales" as const },
    { title: "School Study Logo", category: "marketing" as const },
    { title: "Social Media Creatives", category: "marketing" as const },
    { title: "Posters", category: "marketing" as const },
    { title: "Banners", category: "marketing" as const },
    { title: "Product Screenshots", category: "marketing" as const },
    { title: "Demo Videos", category: "training" as const },
  ];
  for (const item of defaults) {
    await saveResource({
      id: newId("res"),
      title: item.title,
      description: `Official ${item.title} for School Study partners.`,
      category: item.category,
      fileUrl: `/partners/resources#${item.title.toLowerCase().replace(/\s+/g, "-")}`,
      visibility: "all",
      createdAt: nowIso(),
      createdBy: actorId,
    });
  }
  return listResources();
}

export { listPartners, listLeads, listCommissions, listPayouts, listResources, listTickets, listFraud, getSettings, saveSettings, listAttributions };
