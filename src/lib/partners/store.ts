import { PARTNER_COLLECTIONS, PARTNER_SETTINGS_DOC_ID, defaultPartnerProgramSettings } from "./constants";
import type {
  OwnershipRecord,
} from "./engine";
import type {
  Partner,
  PartnerAgreement,
  PartnerApplication,
  PartnerAuditLog,
  PartnerCommission,
  PartnerFraudFlag,
  PartnerLead,
  PartnerNotification,
  PartnerPayout,
  PartnerProgramSettings,
  PartnerResource,
  PartnerSupportTicket,
  ReferralAttribution,
  ReferralClickEvent,
} from "@/types/partner";

type CollMap<T> = Map<string, T>;

const g = globalThis as any;
if (!g.__PARTNER_STORE__) {
  g.__PARTNER_STORE__ = {
    partners: new Map(),
    applications: new Map(),
    leads: new Map(),
    commissions: new Map(),
    payouts: new Map(),
    resources: new Map(),
    tickets: new Map(),
    audit: new Map(),
    notifications: new Map(),
    attributions: new Map(),
    clicks: new Map(),
    fraud: new Map(),
    agreements: new Map(),
    ownership: new Map(),
    settings: defaultPartnerProgramSettings(),
    codeSeq: 1,
  };
}

const mem = g.__PARTNER_STORE__ as {
  partners: CollMap<Partner>;
  applications: CollMap<PartnerApplication>;
  leads: CollMap<PartnerLead>;
  commissions: CollMap<PartnerCommission>;
  payouts: CollMap<PartnerPayout>;
  resources: CollMap<PartnerResource>;
  tickets: CollMap<PartnerSupportTicket>;
  audit: CollMap<PartnerAuditLog>;
  notifications: CollMap<PartnerNotification>;
  attributions: CollMap<ReferralAttribution>;
  clicks: CollMap<ReferralClickEvent>;
  fraud: CollMap<PartnerFraudFlag>;
  agreements: CollMap<PartnerAgreement>;
  ownership: CollMap<OwnershipRecord & { id: string }>;
  settings: PartnerProgramSettings;
  codeSeq: number;
};

async function getAdminDb() {
  if (typeof window !== "undefined") return null;
  try {
    const adminModule = await import("@/lib/firebase/admin");
    return typeof adminModule.getSafeAdminDb === "function"
      ? adminModule.getSafeAdminDb()
      : adminModule.adminDb || null;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function persist(collection: string, id: string, data: Record<string, unknown>) {
  const adminDb = await getAdminDb();
  if (!adminDb) return;
  try {
    await adminDb.collection(collection).doc(id).set(data, { merge: true });
  } catch (e) {
    console.warn(`[PartnerStore] persist ${collection}/${id} notice:`, e);
  }
}

async function removeDoc(collection: string, id: string) {
  const adminDb = await getAdminDb();
  if (!adminDb) return;
  try {
    await adminDb.collection(collection).doc(id).delete();
  } catch (e) {
    console.warn(`[PartnerStore] delete ${collection}/${id} notice:`, e);
  }
}

async function loadAll<T>(collection: string): Promise<T[]> {
  const adminDb = await getAdminDb();
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection(collection).get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];
  } catch {
    return [];
  }
}

let hydrated = false;
export async function hydratePartnerStore() {
  if (hydrated) return;
  hydrated = true;
  const [
    partners,
    applications,
    leads,
    commissions,
    payouts,
    resources,
    tickets,
    audit,
    notifications,
    attributions,
    clicks,
    fraud,
    agreements,
    ownership,
  ] = await Promise.all([
    loadAll<Partner>(PARTNER_COLLECTIONS.PARTNERS),
    loadAll<PartnerApplication>(PARTNER_COLLECTIONS.APPLICATIONS),
    loadAll<PartnerLead>(PARTNER_COLLECTIONS.LEADS),
    loadAll<PartnerCommission>(PARTNER_COLLECTIONS.COMMISSIONS),
    loadAll<PartnerPayout>(PARTNER_COLLECTIONS.PAYOUTS),
    loadAll<PartnerResource>(PARTNER_COLLECTIONS.RESOURCES),
    loadAll<PartnerSupportTicket>(PARTNER_COLLECTIONS.TICKETS),
    loadAll<PartnerAuditLog>(PARTNER_COLLECTIONS.AUDIT),
    loadAll<PartnerNotification>(PARTNER_COLLECTIONS.NOTIFICATIONS),
    loadAll<ReferralAttribution>(PARTNER_COLLECTIONS.ATTRIBUTIONS),
    loadAll<ReferralClickEvent>(PARTNER_COLLECTIONS.CLICKS),
    loadAll<PartnerFraudFlag>(PARTNER_COLLECTIONS.FRAUD),
    loadAll<PartnerAgreement>(PARTNER_COLLECTIONS.AGREEMENTS),
    loadAll<OwnershipRecord & { id: string }>(PARTNER_COLLECTIONS.SCHOOL_OWNERSHIP),
  ]);
  partners.forEach((p) => mem.partners.set(p.id, p));
  applications.forEach((p) => mem.applications.set(p.id, p));
  leads.forEach((p) => mem.leads.set(p.id, p));
  commissions.forEach((p) => mem.commissions.set(p.id, p));
  payouts.forEach((p) => mem.payouts.set(p.id, p));
  resources.forEach((p) => mem.resources.set(p.id, p));
  tickets.forEach((p) => mem.tickets.set(p.id, p));
  audit.forEach((p) => mem.audit.set(p.id, p));
  notifications.forEach((p) => mem.notifications.set(p.id, p));
  attributions.forEach((p) => mem.attributions.set(p.id, p));
  clicks.forEach((p) => mem.clicks.set(p.id, p));
  fraud.forEach((p) => mem.fraud.set(p.id, p));
  agreements.forEach((p) => mem.agreements.set(p.id, p));
  ownership.forEach((p) => mem.ownership.set(p.id, p));

  const adminDb = await getAdminDb();
  if (adminDb) {
    try {
      const snap = await adminDb.collection(PARTNER_COLLECTIONS.SETTINGS).doc(PARTNER_SETTINGS_DOC_ID).get();
      if (snap.exists) {
        mem.settings = { ...defaultPartnerProgramSettings(), ...snap.data() } as PartnerProgramSettings;
      }
    } catch {}
  }
  mem.codeSeq = Math.max(mem.codeSeq, mem.partners.size + 1);
}

export async function getSettings(): Promise<PartnerProgramSettings> {
  await hydratePartnerStore();
  return mem.settings;
}

export async function saveSettings(settings: PartnerProgramSettings) {
  mem.settings = settings;
  await persist(PARTNER_COLLECTIONS.SETTINGS, PARTNER_SETTINGS_DOC_ID, settings as any);
}

export function nextCodeSequence(): number {
  mem.codeSeq += 1;
  return mem.codeSeq;
}

export async function savePartner(partner: Partner) {
  mem.partners.set(partner.id, partner);
  await persist(PARTNER_COLLECTIONS.PARTNERS, partner.id, partner as any);
}

export async function getPartner(id: string): Promise<Partner | null> {
  await hydratePartnerStore();
  return mem.partners.get(id) || null;
}

export async function getPartnerByUserId(userId: string): Promise<Partner | null> {
  await hydratePartnerStore();
  return [...mem.partners.values()].find((p) => p.userId === userId) || null;
}

export async function getPartnerByCode(code: string): Promise<Partner | null> {
  await hydratePartnerStore();
  const normalized = (code || "").trim().toUpperCase();
  return [...mem.partners.values()].find((p) => p.partnerCode.toUpperCase() === normalized) || null;
}

export async function listPartners(): Promise<Partner[]> {
  await hydratePartnerStore();
  return [...mem.partners.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveApplication(app: PartnerApplication) {
  mem.applications.set(app.id, app);
  await persist(PARTNER_COLLECTIONS.APPLICATIONS, app.id, app as any);
}

export async function getApplication(id: string) {
  await hydratePartnerStore();
  return mem.applications.get(id) || null;
}

export async function listApplications(): Promise<PartnerApplication[]> {
  await hydratePartnerStore();
  return [...mem.applications.values()];
}

export async function saveLead(lead: PartnerLead) {
  mem.leads.set(lead.id, lead);
  await persist(PARTNER_COLLECTIONS.LEADS, lead.id, lead as any);
}

export async function getLead(id: string) {
  await hydratePartnerStore();
  return mem.leads.get(id) || null;
}

export async function listLeads(partnerId?: string): Promise<PartnerLead[]> {
  await hydratePartnerStore();
  const all = [...mem.leads.values()];
  return partnerId ? all.filter((l) => l.partnerId === partnerId) : all;
}

export async function saveOwnership(record: OwnershipRecord) {
  const id = `own_${record.key.replace(/[^a-z0-9]+/g, "_").slice(0, 80)}`;
  const doc = { ...record, id };
  mem.ownership.set(id, doc);
  await persist(PARTNER_COLLECTIONS.SCHOOL_OWNERSHIP, id, doc as any);
  return doc;
}

export async function listOwnership(): Promise<(OwnershipRecord & { id: string })[]> {
  await hydratePartnerStore();
  return [...mem.ownership.values()];
}

export async function overrideOwnership(key: string, newPartnerId: string, schoolName: string) {
  await hydratePartnerStore();
  const existing = [...mem.ownership.values()].find((o) => o.key === key);
  const next: OwnershipRecord & { id: string } = {
    id: existing?.id || `own_${key.replace(/[^a-z0-9]+/g, "_").slice(0, 80)}`,
    key,
    partnerId: newPartnerId,
    schoolName,
    createdAt: nowIso(),
    schoolId: existing?.schoolId || null,
    email: existing?.email,
    mobile: existing?.mobile,
  };
  mem.ownership.set(next.id, next);
  await persist(PARTNER_COLLECTIONS.SCHOOL_OWNERSHIP, next.id, next as any);
  return existing;
}

export async function saveCommission(c: PartnerCommission) {
  mem.commissions.set(c.id, c);
  await persist(PARTNER_COLLECTIONS.COMMISSIONS, c.id, c as any);
}

export async function listCommissions(partnerId?: string): Promise<PartnerCommission[]> {
  await hydratePartnerStore();
  const all = [...mem.commissions.values()];
  return partnerId ? all.filter((c) => c.partnerId === partnerId) : all;
}

export async function savePayout(p: PartnerPayout) {
  mem.payouts.set(p.id, p);
  await persist(PARTNER_COLLECTIONS.PAYOUTS, p.id, p as any);
}

export async function getPayout(id: string) {
  await hydratePartnerStore();
  return mem.payouts.get(id) || null;
}

export async function listPayouts(partnerId?: string): Promise<PartnerPayout[]> {
  await hydratePartnerStore();
  const all = [...mem.payouts.values()];
  return partnerId ? all.filter((p) => p.partnerId === partnerId) : all;
}

export async function saveResource(r: PartnerResource) {
  mem.resources.set(r.id, r);
  await persist(PARTNER_COLLECTIONS.RESOURCES, r.id, r as any);
}

export async function deleteResource(id: string) {
  mem.resources.delete(id);
  await removeDoc(PARTNER_COLLECTIONS.RESOURCES, id);
}

export async function listResources(): Promise<PartnerResource[]> {
  await hydratePartnerStore();
  return [...mem.resources.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveTicket(t: PartnerSupportTicket) {
  mem.tickets.set(t.id, t);
  await persist(PARTNER_COLLECTIONS.TICKETS, t.id, t as any);
}

export async function getTicket(id: string) {
  await hydratePartnerStore();
  return mem.tickets.get(id) || null;
}

export async function listTickets(partnerId?: string): Promise<PartnerSupportTicket[]> {
  await hydratePartnerStore();
  const all = [...mem.tickets.values()];
  return partnerId ? all.filter((t) => t.partnerId === partnerId) : all;
}

export async function saveAudit(log: PartnerAuditLog) {
  mem.audit.set(log.id, log);
  await persist(PARTNER_COLLECTIONS.AUDIT, log.id, log as any);
}

export async function listAudit(entityId?: string): Promise<PartnerAuditLog[]> {
  await hydratePartnerStore();
  const all = [...mem.audit.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entityId ? all.filter((l) => l.entityId === entityId) : all;
}

export async function saveNotification(n: PartnerNotification) {
  mem.notifications.set(n.id, n);
  await persist(PARTNER_COLLECTIONS.NOTIFICATIONS, n.id, n as any);
}

export async function listNotifications(filter: { audience?: "partner" | "super_admin"; partnerId?: string }) {
  await hydratePartnerStore();
  return [...mem.notifications.values()]
    .filter((n) => (filter.audience ? n.audience === filter.audience : true))
    .filter((n) => (filter.partnerId ? n.partnerId === filter.partnerId : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveAttribution(a: ReferralAttribution) {
  mem.attributions.set(a.id, a);
  await persist(PARTNER_COLLECTIONS.ATTRIBUTIONS, a.id, a as any);
}

export async function listAttributions(partnerId?: string) {
  await hydratePartnerStore();
  const all = [...mem.attributions.values()];
  return partnerId ? all.filter((a) => a.partnerId === partnerId) : all;
}

export async function saveClick(c: ReferralClickEvent) {
  mem.clicks.set(c.id, c);
  await persist(PARTNER_COLLECTIONS.CLICKS, c.id, c as any);
}

export async function listClicks(partnerId?: string) {
  await hydratePartnerStore();
  const all = [...mem.clicks.values()];
  return partnerId ? all.filter((c) => c.partnerId === partnerId) : all;
}

export async function saveFraud(f: PartnerFraudFlag) {
  mem.fraud.set(f.id, f);
  await persist(PARTNER_COLLECTIONS.FRAUD, f.id, f as any);
}

export async function listFraud() {
  await hydratePartnerStore();
  return [...mem.fraud.values()];
}

export async function saveAgreement(a: PartnerAgreement) {
  mem.agreements.set(a.id, a);
  await persist(PARTNER_COLLECTIONS.AGREEMENTS, a.id, a as any);
}

export async function listAgreements() {
  await hydratePartnerStore();
  return [...mem.agreements.values()].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getActiveAgreement() {
  const settings = await getSettings();
  const all = await listAgreements();
  return (
    all.find((a) => a.active && a.version === settings.activeAgreementVersion) ||
    all.find((a) => a.active) ||
    defaultAgreement()
  );
}

export function defaultAgreement(): PartnerAgreement {
  return {
    id: "agr_default",
    version: "1.0",
    title: "School Study Partner Terms & Conditions",
    body: `By applying to the School Study Partner Program you agree to: (1) accurately represent School Study to schools; (2) not claim commissions for schools you do not introduce; (3) keep confidential pricing and customer data; (4) follow brand guidelines; (5) accept that commissions are generated only from successful paid subscriptions; (6) understand Super Admin may suspend accounts for fraud or policy violations; (7) accept that first valid referral owns attribution unless Super Admin overrides it.`,
    publishedAt: "2026-01-01T00:00:00.000Z",
    publishedBy: "system",
    active: true,
  };
}

export { newId, nowIso, mem as partnerMemory };
