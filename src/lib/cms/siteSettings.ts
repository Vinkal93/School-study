import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { createBillingAuditLog } from "@/lib/billing";

export interface HeaderNavItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  type: "INTERNAL" | "EXTERNAL" | "ANCHOR";
  enabled: boolean;
  openInNewTab: boolean;
  displayOrder: number;
}

export interface HeaderCta {
  enabled: boolean;
  label: string;
  url: string;
  style?: "primary" | "outline";
}

export interface FooterLinkItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  enabled: boolean;
  openInNewTab: boolean;
  displayOrder: number;
}

export interface FooterColumn {
  id: string;
  title: string;
  enabled: boolean;
  displayOrder: number;
  links: FooterLinkItem[];
}

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  icon: string;
  enabled: boolean;
  displayOrder: number;
}

export interface LegalLink {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  displayOrder: number;
}

export interface SiteSettings {
  version: number;
  updatedAt: string;
  updatedBy: string;
  status: "published" | "draft";
  header: {
    enabled: boolean;
    logoUrl?: string;
    brandName: string;
    tagline: string;
    navigation: HeaderNavItem[];
    primaryCta: HeaderCta;
    secondaryCta: HeaderCta;
    showPricing: boolean;
    showLogin: boolean;
    showThemeToggle: boolean;
  };
  footer: {
    enabled: boolean;
    showBrand: boolean;
    showDescription: boolean;
    description: string;
    showNavigation: boolean;
    columns: FooterColumn[];
    showContact: boolean;
    showSocial: boolean;
    showLegal: boolean;
    showCopyright: boolean;
    copyrightText: string; // Supports {YEAR}
    developerName?: string;
    developerUrl?: string;
  };
  contact: {
    email: string;
    emailEnabled: boolean;
    phone: string;
    phoneEnabled: boolean;
    address: string;
    city: string;
    state: string; // Default "Uttar Pradesh"
    country: string; // Default "India"
    locationLabel: string; // "Uttar Pradesh, India"
    locationUrl?: string;
    locationEnabled: boolean;
  };
  socials: SocialLink[];
  legal: LegalLink[];
}

/**
 * Robust default initial configuration (Section 32).
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  version: 1,
  updatedAt: new Date("2026-08-29T10:00:00Z").toISOString(),
  updatedBy: "system",
  status: "published",
  header: {
    enabled: true,
    brandName: "School Study",
    tagline: "SMART SCHOOL MANAGEMENT",
    navigation: [
      { id: "nav_home", label: "Home", url: "/", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 1 },
      { id: "nav_features", label: "Features", url: "/features", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 2 },
      { id: "nav_pricing", label: "Pricing", url: "/pricing", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 3 },
      { id: "nav_download", label: "Download", url: "/download", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 4 },
      { id: "nav_erp", label: "School ERP", url: "/school-erp", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 5 },
      { id: "nav_developer", label: "Developer", url: "/about-developer", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 6 },
      { id: "nav_contact", label: "Contact", url: "/contact", type: "INTERNAL", enabled: true, openInNewTab: false, displayOrder: 7 },
    ],
    primaryCta: { enabled: true, label: "Login", url: "/login", style: "primary" },
    secondaryCta: { enabled: false, label: "Get Started", url: "/contact", style: "outline" },
    showPricing: true,
    showLogin: true,
    showThemeToggle: true,
  },
  footer: {
    enabled: true,
    showBrand: true,
    showDescription: true,
    description: "A simple, modern platform designed to help schools manage students, teachers, and everyday operations with ease.",
    showNavigation: true,
    columns: [
      {
        id: "col_product",
        title: "Product",
        enabled: true,
        displayOrder: 1,
        links: [
          { id: "lnk_p1", label: "Platform Overview", url: "/", enabled: true, openInNewTab: false, displayOrder: 1 },
          { id: "lnk_p2", label: "Core Features", url: "/features", enabled: true, openInNewTab: false, displayOrder: 2 },
          { id: "lnk_p3", label: "Pricing Plans", url: "/pricing", enabled: true, openInNewTab: false, displayOrder: 3 },
          { id: "lnk_p4", label: "Download App", url: "/download", enabled: true, openInNewTab: false, displayOrder: 4 },
          { id: "lnk_p5", label: "School Management", url: "/school-management", enabled: true, openInNewTab: false, displayOrder: 5 },
          { id: "lnk_p6", label: "School ERP", url: "/school-erp", enabled: true, openInNewTab: false, displayOrder: 6 },
        ],
      },
      {
        id: "col_modules",
        title: "Key Modules",
        enabled: true,
        displayOrder: 2,
        links: [
          { id: "lnk_m1", label: "Student Management", url: "/student-management", enabled: true, openInNewTab: false, displayOrder: 1 },
          { id: "lnk_m2", label: "Teacher Management", url: "/teacher-management", enabled: true, openInNewTab: false, displayOrder: 2 },
          { id: "lnk_m3", label: "Attendance Automation", url: "/attendance-management", enabled: true, openInNewTab: false, displayOrder: 3 },
          { id: "lnk_m4", label: "About Developer", url: "/about-developer", enabled: true, openInNewTab: false, displayOrder: 4 },
          { id: "lnk_m5", label: "Contact & Support", url: "/contact", enabled: true, openInNewTab: false, displayOrder: 5 },
        ],
      },
      {
        id: "col_portals",
        title: "Access Portals",
        enabled: true,
        displayOrder: 3,
        links: [
          { id: "lnk_po1", label: "School Admin Portal", url: "/admin/login", enabled: true, openInNewTab: false, displayOrder: 1 },
          { id: "lnk_po2", label: "Teacher Workspace", url: "/teacher/login", enabled: true, openInNewTab: false, displayOrder: 2 },
          { id: "lnk_po3", label: "Student & Parent Hub", url: "/student/login", enabled: true, openInNewTab: false, displayOrder: 3 },
          { id: "lnk_po4", label: "Staff Sign-in Gateway", url: "/login", enabled: true, openInNewTab: false, displayOrder: 4 },
        ],
      },
    ],
    showContact: true,
    showSocial: true,
    showLegal: true,
    showCopyright: true,
    copyrightText: "© {YEAR} School Study. All rights reserved.",
    developerName: "Vinkal Prajapati",
    developerUrl: "https://vinkal.sbci.online",
  },
  contact: {
    email: "sbci224234@gmail.com",
    emailEnabled: true,
    phone: "+91 9118245636",
    phoneEnabled: true,
    address: "School Study Platform",
    city: "",
    state: "Uttar Pradesh",
    country: "India",
    locationLabel: "Uttar Pradesh, India",
    locationUrl: "https://maps.google.com/?q=Uttar+Pradesh+India",
    locationEnabled: true,
  },
  socials: [
    { platform: "linkedin", label: "LinkedIn", url: "https://linkedin.com", icon: "Linkedin", enabled: true, displayOrder: 1 },
    { platform: "youtube", label: "YouTube", url: "https://youtube.com", icon: "Youtube", enabled: true, displayOrder: 2 },
    { platform: "x", label: "X (Twitter)", url: "https://x.com", icon: "Twitter", enabled: true, displayOrder: 3 },
    { platform: "facebook", label: "Facebook", url: "https://facebook.com", icon: "Facebook", enabled: true, displayOrder: 4 },
  ],
  legal: [
    { id: "leg_privacy", label: "Privacy Policy", url: "#", enabled: true, displayOrder: 1 },
    { id: "leg_terms", label: "Terms of Service", url: "#", enabled: true, displayOrder: 2 },
    { id: "leg_refund", label: "Refund Policy", url: "#", enabled: true, displayOrder: 3 },
    { id: "leg_status", label: "Platform Status", url: "/contact", enabled: true, displayOrder: 4 },
  ],
};

/**
 * Public Source of Truth: Reads published site settings.
 */
export async function getPublicSiteSettings(): Promise<SiteSettings> {
  const db = getFirebaseDb();
  if (!db) return DEFAULT_SITE_SETTINGS;

  try {
    const docRef = doc(db, "siteSettings", "global");
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { ...DEFAULT_SITE_SETTINGS, ...snap.data() } as SiteSettings;
    }
  } catch (err) {
    console.error("Failed to fetch public site settings from Firestore:", err);
  }

  return DEFAULT_SITE_SETTINGS;
}

/**
 * Super Admin: Saves a draft configuration.
 */
export async function saveSiteSettingsDraft(settings: SiteSettings, actorId: string): Promise<SiteSettings> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const nowIso = new Date().toISOString();
  const draft: SiteSettings = {
    ...settings,
    updatedAt: nowIso,
    updatedBy: actorId,
    status: "draft",
  };

  await setDoc(doc(db, "siteSettings", "draft"), draft);
  return draft;
}

/**
 * Super Admin: Publishes the live configuration and archives a version.
 */
export async function publishSiteSettings(settings: SiteSettings, actorId: string): Promise<SiteSettings> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Database unavailable.");

  const nowIso = new Date().toISOString();
  const nextVersion = (settings.version || 1) + 1;

  const published: SiteSettings = {
    ...settings,
    version: nextVersion,
    updatedAt: nowIso,
    updatedBy: actorId,
    status: "published",
  };

  // 1. Update active global doc
  await setDoc(doc(db, "siteSettings", "global"), published);

  // 2. Archive snapshot in version history
  const versionId = `v${nextVersion}_${Date.now()}`;
  await setDoc(doc(db, "siteSettingsVersions", versionId), published);

  // 3. Audit Logging
  await createBillingAuditLog(actorId, "super_admin", "MANUAL_ACCESS_CHANGE", "accessPolicy", "globalSiteSettings", {
    actionType: "SITE_SETTINGS_PUBLISHED",
    version: nextVersion,
    versionId,
    timestamp: nowIso,
  });

  return published;
}

/**
 * Super Admin: Lists historical published versions.
 */
export async function getSiteSettingsVersions(): Promise<SiteSettings[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(collection(db, "siteSettingsVersions"));
    const list = snap.docs.map((d) => d.data() as SiteSettings);
    list.sort((a, b) => (b.version || 0) - (a.version || 0));
    return list;
  } catch (err) {
    console.error("Failed to load site settings version history:", err);
    return [];
  }
}
