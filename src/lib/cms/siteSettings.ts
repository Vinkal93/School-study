import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { createBillingAuditLog } from "@/lib/billing/audit";

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

export interface GeneralSettings {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  copyrightText: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface BrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  brandDisplayName: string;
  themeColor: string;
}

export interface LandingSettings {
  landingVersion: "classic" | "modern";
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  ctaPrimaryLabel: string;
  ctaPrimaryUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  showHeroStats: boolean;
  showFeaturesSection: boolean;
  showHowItWorksSection: boolean;
  showTestimonialsSection: boolean;
  showFaqSection: boolean;
  showCtaBanner: boolean;
}

export interface SeoSettings {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  googleSiteVerification: string;
  locale: string;
}

export type AnnouncementType = "INFO" | "WARNING" | "PROMO" | "ALERT";
export type AnnouncementStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "ARCHIVED";
export type AnnouncementTargetArea = "ALL" | "HOMEPAGE" | "PRICING" | "PORTALS";

export interface CmsAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  startAt: string; // ISO
  endAt: string | null; // ISO or null
  active: boolean;
  priority: number;
  targetPublicArea: AnnouncementTargetArea;
  status?: AnnouncementStatus;
  linkText?: string;
  linkUrl?: string;
  createdAt: string;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  active: boolean;
}

export interface CmsTestimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  content: string;
  avatarUrl?: string;
  rating: number; // 1-5
  displayOrder: number;
  active: boolean;
}

export interface CmsLegalContent {
  privacyPolicyText: string;
  termsOfServiceText: string;
  refundPolicyText: string;
  lastUpdated: string;
}

export interface SiteSettings {
  version: number;
  updatedAt: string;
  updatedBy: string;
  status: "published" | "draft";
  general: GeneralSettings;
  branding: BrandingSettings;
  landing: LandingSettings;
  seo: SeoSettings;
  announcements: CmsAnnouncement[];
  faqs: CmsFaq[];
  testimonials: CmsTestimonial[];
  legalContent: CmsLegalContent;
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
 * Robust default initial configuration.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  version: 1,
  updatedAt: new Date("2026-08-29T10:00:00Z").toISOString(),
  updatedBy: "system",
  status: "published",
  general: {
    siteName: "School Study",
    siteTagline: "Smart School Management Platform",
    siteDescription:
      "A complete, secure, modern platform designed to help schools manage students, teachers, classes, and everyday operations with ease.",
    supportEmail: "sbci224234@gmail.com",
    supportPhone: "+91 9118245636",
    address: "School Study Platform, Uttar Pradesh, India",
    copyrightText: "© {YEAR} School Study. All rights reserved.",
    maintenanceMode: false,
    maintenanceMessage: "We are currently performing scheduled maintenance. Please check back shortly.",
  },
  branding: {
    logoUrl: "/icon.svg",
    faviconUrl: "/favicon.ico",
    brandDisplayName: "School Study",
    themeColor: "#2563EB",
  },
  landing: {
    landingVersion: "classic",
    heroBadge: "Next-Generation School ERP & Management",
    heroHeadline: "Simple School Management Software for Modern Schools",
    heroSubheadline:
      "School Study is a powerful and intuitive school management system that helps institutions manage students, faculty, attendance, classes, fees, and more — all from one centralized, secure platform.",
    ctaPrimaryLabel: "Get Started for Free",
    ctaPrimaryUrl: "/register",
    ctaSecondaryLabel: "Explore Portals",
    ctaSecondaryUrl: "/login",
    showHeroStats: true,
    showFeaturesSection: true,
    showHowItWorksSection: true,
    showTestimonialsSection: true,
    showFaqSection: true,
    showCtaBanner: true,
  },
  seo: {
    defaultTitle: "School Management Software for Modern Schools | School Study",
    titleTemplate: "%s | School Study",
    defaultDescription:
      "School Study is a modern school management platform for schools to manage students, teachers, classes and attendance from one simple system.",
    keywords: [
      "School Study",
      "School Management Software",
      "School ERP Platform",
      "Student Attendance Management",
      "Teacher Portal",
      "Multi-Tenant School Management",
      "Education Technology",
    ],
    ogTitle: "School Study — Smart School ERP Platform",
    ogDescription:
      "Centralized cloud software for educational institutions to automate attendance, students, admissions, and fee records.",
    ogImage: "/icon.svg",
    canonicalUrl: "https://school.sbci.online",
    googleSiteVerification: "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8",
    locale: "en_US",
  },
  announcements: [
    {
      id: "ann_welcome",
      title: "Welcome to School Study SaaS 2.0",
      message: "Experience our automated student attendance and multi-tenant school management suite.",
      type: "INFO",
      startAt: new Date("2026-01-01").toISOString(),
      endAt: null,
      active: true,
      priority: 1,
      targetPublicArea: "ALL",
      status: "ACTIVE",
      linkText: "Learn More",
      linkUrl: "/features",
      createdAt: new Date("2026-01-01").toISOString(),
    },
  ],
  faqs: [
    {
      id: "faq_1",
      question: "What is School Study?",
      answer:
        "School Study is an all-in-one cloud platform providing student management, teacher portals, attendance tracking, fee receipts, and school administration.",
      category: "General",
      displayOrder: 1,
      active: true,
    },
    {
      id: "faq_2",
      question: "Is there a free trial available?",
      answer:
        "Yes! Schools can sign up for the Starter plan for free or request temporary VIP demo access for premium features.",
      category: "Pricing",
      displayOrder: 2,
      active: true,
    },
    {
      id: "faq_3",
      question: "How secure is student and institutional data?",
      answer:
        "All data is strictly isolated per school tenant with Firebase enterprise authentication and encrypted Firestore access control.",
      category: "Security",
      displayOrder: 3,
      active: true,
    },
  ],
  testimonials: [
    {
      id: "test_1",
      name: "Dr. Ananya Sharma",
      role: "Principal",
      organization: "Delhi Public Model School",
      content:
        "School Study transformed our daily attendance and admissions process. The interface is remarkably fast and easy for all our staff.",
      rating: 5,
      displayOrder: 1,
      active: true,
    },
    {
      id: "test_2",
      name: "Rajiv Malhotra",
      role: "Director of Academics",
      organization: "St. Xavier's Academy",
      content:
        "Managing student batches, teacher records, and monthly fee collections has never been this seamless.",
      rating: 5,
      displayOrder: 2,
      active: true,
    },
  ],
  legalContent: {
    privacyPolicyText:
      "School Study is committed to safeguarding institutional and personal privacy. We do not sell user data to third parties.",
    termsOfServiceText:
      "By using School Study, schools agree to adhere to fair usage policies and maintain authorized administrator credentials.",
    refundPolicyText:
      "Subscription cancellations may be initiated from the school billing dashboard before the renewal cycle.",
    lastUpdated: new Date("2026-08-29").toISOString(),
  },
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
    description:
      "A simple, modern platform designed to help schools manage students, teachers, and everyday operations with ease.",
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
 * Computes temporal announcement status based on start/end dates.
 */
export function computeAnnouncementStatus(
  ann: CmsAnnouncement,
  nowMs: number = Date.now()
): AnnouncementStatus {
  if (!ann.active) return "ARCHIVED";
  const startMs = ann.startAt ? new Date(ann.startAt).getTime() : 0;
  const endMs = ann.endAt ? new Date(ann.endAt).getTime() : Infinity;

  if (startMs > nowMs) return "SCHEDULED";
  if (endMs < nowMs) return "EXPIRED";
  return "ACTIVE";
}

/**
 * Strips dangerous HTML tags and script injections from text inputs.
 */
export function sanitizeCmsString(str: any): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onload\s*=/gi, "")
    .replace(/onerror\s*=/gi, "")
    .trim();
}

/**
 * Sanitizes entire SiteSettings payload before persisting.
 */
export function sanitizeSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const merged: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...settings,
    general: {
      ...DEFAULT_SITE_SETTINGS.general,
      ...(settings.general || {}),
      siteName: sanitizeCmsString(settings.general?.siteName || DEFAULT_SITE_SETTINGS.general.siteName),
      siteTagline: sanitizeCmsString(settings.general?.siteTagline || DEFAULT_SITE_SETTINGS.general.siteTagline),
      siteDescription: sanitizeCmsString(settings.general?.siteDescription || DEFAULT_SITE_SETTINGS.general.siteDescription),
      supportEmail: sanitizeCmsString(settings.general?.supportEmail || DEFAULT_SITE_SETTINGS.general.supportEmail),
      supportPhone: sanitizeCmsString(settings.general?.supportPhone || DEFAULT_SITE_SETTINGS.general.supportPhone),
      address: sanitizeCmsString(settings.general?.address || DEFAULT_SITE_SETTINGS.general.address),
      copyrightText: sanitizeCmsString(settings.general?.copyrightText || DEFAULT_SITE_SETTINGS.general.copyrightText),
    },
    branding: {
      ...DEFAULT_SITE_SETTINGS.branding,
      ...(settings.branding || {}),
      brandDisplayName: sanitizeCmsString(settings.branding?.brandDisplayName || DEFAULT_SITE_SETTINGS.branding.brandDisplayName),
    },
    landing: {
      ...DEFAULT_SITE_SETTINGS.landing,
      ...(settings.landing || {}),
      heroBadge: sanitizeCmsString(settings.landing?.heroBadge || DEFAULT_SITE_SETTINGS.landing.heroBadge),
      heroHeadline: sanitizeCmsString(settings.landing?.heroHeadline || DEFAULT_SITE_SETTINGS.landing.heroHeadline),
      heroSubheadline: sanitizeCmsString(settings.landing?.heroSubheadline || DEFAULT_SITE_SETTINGS.landing.heroSubheadline),
      ctaPrimaryLabel: sanitizeCmsString(settings.landing?.ctaPrimaryLabel || DEFAULT_SITE_SETTINGS.landing.ctaPrimaryLabel),
      ctaSecondaryLabel: sanitizeCmsString(settings.landing?.ctaSecondaryLabel || DEFAULT_SITE_SETTINGS.landing.ctaSecondaryLabel),
    },
    seo: {
      ...DEFAULT_SITE_SETTINGS.seo,
      ...(settings.seo || {}),
      defaultTitle: sanitizeCmsString(settings.seo?.defaultTitle || DEFAULT_SITE_SETTINGS.seo.defaultTitle),
      defaultDescription: sanitizeCmsString(settings.seo?.defaultDescription || DEFAULT_SITE_SETTINGS.seo.defaultDescription),
    },
    announcements: (settings.announcements || DEFAULT_SITE_SETTINGS.announcements).map((a) => ({
      ...a,
      title: sanitizeCmsString(a.title),
      message: sanitizeCmsString(a.message),
      linkText: a.linkText ? sanitizeCmsString(a.linkText) : undefined,
    })),
    faqs: (settings.faqs || DEFAULT_SITE_SETTINGS.faqs).map((f) => ({
      ...f,
      question: sanitizeCmsString(f.question),
      answer: sanitizeCmsString(f.answer),
      category: sanitizeCmsString(f.category || "General"),
    })),
    testimonials: (settings.testimonials || DEFAULT_SITE_SETTINGS.testimonials).map((t) => ({
      ...t,
      name: sanitizeCmsString(t.name),
      role: sanitizeCmsString(t.role),
      organization: sanitizeCmsString(t.organization),
      content: sanitizeCmsString(t.content),
    })),
    legalContent: {
      ...DEFAULT_SITE_SETTINGS.legalContent,
      ...(settings.legalContent || {}),
      privacyPolicyText: sanitizeCmsString(settings.legalContent?.privacyPolicyText || DEFAULT_SITE_SETTINGS.legalContent.privacyPolicyText),
      termsOfServiceText: sanitizeCmsString(settings.legalContent?.termsOfServiceText || DEFAULT_SITE_SETTINGS.legalContent.termsOfServiceText),
      refundPolicyText: sanitizeCmsString(settings.legalContent?.refundPolicyText || DEFAULT_SITE_SETTINGS.legalContent.refundPolicyText),
    },
    header: {
      ...DEFAULT_SITE_SETTINGS.header,
      ...(settings.header || {}),
      navigation: settings.header?.navigation || DEFAULT_SITE_SETTINGS.header.navigation,
    },
    footer: {
      ...DEFAULT_SITE_SETTINGS.footer,
      ...(settings.footer || {}),
      columns: settings.footer?.columns || DEFAULT_SITE_SETTINGS.footer.columns,
    },
    contact: {
      ...DEFAULT_SITE_SETTINGS.contact,
      ...(settings.contact || {}),
    },
    socials: settings.socials || DEFAULT_SITE_SETTINGS.socials,
    legal: settings.legal || DEFAULT_SITE_SETTINGS.legal,
  };

  return merged;
}

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
      const data = snap.data() as Partial<SiteSettings>;
      return sanitizeSiteSettings(data);
    }
  } catch (err) {
    console.error("Failed to fetch public site settings from Firestore:", err);
  }

  return DEFAULT_SITE_SETTINGS;
}

/**
 * Super Admin: Saves a draft configuration.
 */
export async function saveSiteSettingsDraft(
  settings: Partial<SiteSettings>,
  actorId: string
): Promise<SiteSettings> {
  const sanitized = sanitizeSiteSettings(settings);
  const nowIso = new Date().toISOString();
  const draft: SiteSettings = {
    ...sanitized,
    updatedAt: nowIso,
    updatedBy: actorId,
    status: "draft",
  };

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "siteSettings", "draft"), draft);
  }
  return draft;
}

/**
 * Super Admin: Publishes the live configuration and archives a version snapshot.
 */
export async function publishSiteSettings(
  settings: Partial<SiteSettings>,
  actorId: string
): Promise<SiteSettings> {
  const sanitized = sanitizeSiteSettings(settings);
  const nowIso = new Date().toISOString();
  const nextVersion = (sanitized.version || 1) + 1;

  const published: SiteSettings = {
    ...sanitized,
    version: nextVersion,
    updatedAt: nowIso,
    updatedBy: actorId,
    status: "published",
  };

  const versionId = `v${nextVersion}_${Date.now()}`;

  const db = getFirebaseDb();
  if (db) {
    await setDoc(doc(db, "siteSettings", "global"), published);
    await setDoc(doc(db, "siteSettingsVersions", versionId), published);

    await createBillingAuditLog(
      actorId,
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      "globalSiteSettings",
      {
        actionType: "SITE_SETTINGS_PUBLISHED",
        version: nextVersion,
        versionId,
        timestamp: nowIso,
      }
    ).catch(() => {});
  }

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
