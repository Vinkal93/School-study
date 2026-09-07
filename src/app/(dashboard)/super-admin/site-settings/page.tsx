"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutTemplate,
  Globe,
  Save,
  Send,
  Plus,
  Trash2,
  Eye,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Mail,
  Phone,
  MapPin,
  Share2,
  Shield,
  History,
  Tag,
  Sparkles,
  HelpCircle,
  MessageSquare,
  FileText,
  Palette,
  Search,
  Check,
  Power,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  HeaderNavItem,
  FooterColumn,
  FooterLinkItem,
  SocialLink,
  LegalLink,
  CmsAnnouncement,
  CmsFaq,
  CmsTestimonial,
  computeAnnouncementStatus,
} from "@/lib/cms/siteSettings";
import { toast } from "sonner";

export default function SuperAdminSiteSettingsPage() {
  const { profile, firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "branding"
    | "landing"
    | "announcements"
    | "faqs"
    | "testimonials"
    | "seo"
    | "header"
    | "footer"
    | "legal"
    | "history"
  >("general");

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [publishedSettings, setPublishedSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [versions, setVersions] = useState<SiteSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New item draft states
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<CmsAnnouncement>>({
    title: "",
    message: "",
    type: "INFO",
    startAt: new Date().toISOString().slice(0, 10),
    endAt: "",
    active: true,
    priority: 1,
    targetPublicArea: "ALL",
    linkText: "",
    linkUrl: "",
  });

  const [newFaq, setNewFaq] = useState<Partial<CmsFaq>>({
    question: "",
    answer: "",
    category: "General",
    displayOrder: 1,
    active: true,
  });

  const [newTestimonial, setNewTestimonial] = useState<Partial<CmsTestimonial>>({
    name: "",
    role: "Principal",
    organization: "",
    content: "",
    rating: 5,
    displayOrder: 1,
    active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const res = await fetch("/api/super-admin/site-settings", {
        headers: {
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          ...(firebaseUser?.uid ? { "x-user-id": firebaseUser.uid } : {}),
          ...(profile?.role ? { "x-user-role": profile.role } : {}),
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setPublishedSettings(json.published || DEFAULT_SITE_SETTINGS);
        setSettings(json.draft || json.published || DEFAULT_SITE_SETTINGS);
        setVersions(json.versions || []);
      } else {
        setPublishedSettings(DEFAULT_SITE_SETTINGS);
        setSettings(DEFAULT_SITE_SETTINGS);
      }
    } catch (err: any) {
      console.warn("Could not fetch site settings, using default configuration:", err);
      setPublishedSettings(DEFAULT_SITE_SETTINGS);
      setSettings(DEFAULT_SITE_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [firebaseUser]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const res = await fetch("/api/super-admin/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          ...(firebaseUser?.uid ? { "x-user-id": firebaseUser.uid } : {}),
          ...(profile?.role ? { "x-user-role": profile.role } : {}),
        },
        body: JSON.stringify({
          action: "draft",
          settings,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save draft.");

      setSettings(json.settings);
      setStatusMessage({ type: "success", text: "Draft configuration saved successfully." });
      toast.success("Draft saved successfully.");
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "Failed to save draft." });
      toast.error(e.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setStatusMessage(null);
    try {
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      const res = await fetch("/api/super-admin/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          ...(firebaseUser?.uid ? { "x-user-id": firebaseUser.uid } : {}),
          ...(profile?.role ? { "x-user-role": profile.role } : {}),
        },
        body: JSON.stringify({
          action: "publish",
          settings,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to publish site settings.");

      setPublishedSettings(json.settings);
      setSettings(json.settings);
      setStatusMessage({
        type: "success",
        text: `Version ${json.settings.version} published live to website!`,
      });
      toast.success(`Published Version ${json.settings.version} live to website!`);
      loadData();
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "Failed to publish site settings." });
      toast.error(e.message || "Failed to publish site settings.");
    } finally {
      setPublishing(false);
    }
  };

  // --- Announcement Handlers ---
  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title?.trim()) {
      toast.error("Announcement title is required.");
      return;
    }
    const item: CmsAnnouncement = {
      id: `ann_${Date.now()}`,
      title: newAnnouncement.title.trim(),
      message: newAnnouncement.message?.trim() || "",
      type: newAnnouncement.type || "INFO",
      startAt: newAnnouncement.startAt ? new Date(newAnnouncement.startAt).toISOString() : new Date().toISOString(),
      endAt: newAnnouncement.endAt ? new Date(newAnnouncement.endAt).toISOString() : null,
      active: Boolean(newAnnouncement.active),
      priority: Number(newAnnouncement.priority) || 1,
      targetPublicArea: newAnnouncement.targetPublicArea || "ALL",
      linkText: newAnnouncement.linkText?.trim() || undefined,
      linkUrl: newAnnouncement.linkUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setSettings({
      ...settings,
      announcements: [item, ...(settings.announcements || [])],
    });

    setNewAnnouncement({
      title: "",
      message: "",
      type: "INFO",
      startAt: new Date().toISOString().slice(0, 10),
      endAt: "",
      active: true,
      priority: 1,
      targetPublicArea: "ALL",
      linkText: "",
      linkUrl: "",
    });

    toast.success("Announcement added to draft.");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setSettings({
      ...settings,
      announcements: settings.announcements.filter((a) => a.id !== id),
    });
  };

  // --- FAQ Handlers ---
  const handleAddFaq = () => {
    if (!newFaq.question?.trim() || !newFaq.answer?.trim()) {
      toast.error("FAQ question and answer are required.");
      return;
    }
    const item: CmsFaq = {
      id: `faq_${Date.now()}`,
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim(),
      category: newFaq.category?.trim() || "General",
      displayOrder: (settings.faqs?.length || 0) + 1,
      active: true,
    };
    setSettings({
      ...settings,
      faqs: [...(settings.faqs || []), item],
    });
    setNewFaq({ question: "", answer: "", category: "General", displayOrder: 1, active: true });
    toast.success("FAQ added to draft.");
  };

  const handleDeleteFaq = (id: string) => {
    setSettings({
      ...settings,
      faqs: settings.faqs.filter((f) => f.id !== id),
    });
  };

  // --- Testimonial Handlers ---
  const handleAddTestimonial = () => {
    if (!newTestimonial.name?.trim() || !newTestimonial.content?.trim()) {
      toast.error("Testimonial name and content are required.");
      return;
    }
    const item: CmsTestimonial = {
      id: `test_${Date.now()}`,
      name: newTestimonial.name.trim(),
      role: newTestimonial.role?.trim() || "Principal",
      organization: newTestimonial.organization?.trim() || "School",
      content: newTestimonial.content.trim(),
      rating: Number(newTestimonial.rating) || 5,
      displayOrder: (settings.testimonials?.length || 0) + 1,
      active: true,
    };
    setSettings({
      ...settings,
      testimonials: [...(settings.testimonials || []), item],
    });
    setNewTestimonial({ name: "", role: "Principal", organization: "", content: "", rating: 5, displayOrder: 1, active: true });
    toast.success("Testimonial added to draft.");
  };

  const handleDeleteTestimonial = (id: string) => {
    setSettings({
      ...settings,
      testimonials: settings.testimonials.filter((t) => t.id !== id),
    });
  };

  // --- Header Nav Helpers ---
  const addHeaderNavItem = () => {
    const newItem: HeaderNavItem = {
      id: `nav_${Date.now()}`,
      label: "New Page",
      url: "/new-page",
      type: "INTERNAL",
      enabled: true,
      openInNewTab: false,
      displayOrder: (settings.header.navigation?.length || 0) + 1,
    };
    setSettings({
      ...settings,
      header: {
        ...settings.header,
        navigation: [...(settings.header.navigation || []), newItem],
      },
    });
  };

  const updateHeaderNavItem = (index: number, updates: Partial<HeaderNavItem>) => {
    const nav = [...settings.header.navigation];
    nav[index] = { ...nav[index], ...updates };
    setSettings({ ...settings, header: { ...settings.header, navigation: nav } });
  };

  const deleteHeaderNavItem = (index: number) => {
    const nav = settings.header.navigation.filter((_, i) => i !== index);
    setSettings({ ...settings, header: { ...settings.header, navigation: nav } });
  };

  // --- Footer Column Helpers ---
  const addFooterColumn = () => {
    const newCol: FooterColumn = {
      id: `col_${Date.now()}`,
      title: "New Column",
      enabled: true,
      displayOrder: (settings.footer.columns?.length || 0) + 1,
      links: [],
    };
    setSettings({
      ...settings,
      footer: {
        ...settings.footer,
        columns: [...(settings.footer.columns || []), newCol],
      },
    });
  };

  const deleteFooterColumn = (colIndex: number) => {
    const cols = settings.footer.columns.filter((_, i) => i !== colIndex);
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-blue-600" />
              Site Settings & Central CMS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
              Live v{publishedSettings.version || 1}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage public marketing pages, branding, landing version (Classic/Modern), announcements, FAQs, testimonials, and SEO metadata.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            title="Reload from Firestore"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-slate-500" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{publishing ? "Publishing..." : "Publish Live to Website"}</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto no-scrollbar">
        {[
          { id: "general", label: "General & Identity", icon: Sliders },
          { id: "branding", label: "Branding & Assets", icon: Palette },
          { id: "landing", label: "Landing Page Version", icon: Globe },
          { id: "announcements", label: `Announcements (${settings.announcements?.length || 0})`, icon: Tag },
          { id: "faqs", label: `FAQs (${settings.faqs?.length || 0})`, icon: HelpCircle },
          { id: "testimonials", label: `Testimonials (${settings.testimonials?.length || 0})`, icon: MessageSquare },
          { id: "seo", label: "SEO & Search Console", icon: Search },
          { id: "header", label: "Header Navigation", icon: LayoutTemplate },
          { id: "footer", label: "Footer & Socials", icon: MapPin },
          { id: "legal", label: "Legal Policies", icon: FileText },
          { id: "history", label: "Version History", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === "general" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            General Site Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Site Name *</label>
              <input
                type="text"
                value={settings.general?.siteName || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, siteName: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Site Tagline</label>
              <input
                type="text"
                value={settings.general?.siteTagline || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, siteTagline: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Site Description</label>
            <textarea
              rows={2}
              value={settings.general?.siteDescription || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, siteDescription: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Support Email</label>
              <input
                type="email"
                value={settings.general?.supportEmail || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportEmail: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Support Phone</label>
              <input
                type="text"
                value={settings.general?.supportPhone || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportPhone: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Physical Address / Headquarters</label>
            <input
              type="text"
              value={settings.general?.address || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, address: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Copyright Notice</label>
            <input
              type="text"
              value={settings.general?.copyrightText || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  general: { ...settings.general, copyrightText: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING */}
      {activeTab === "branding" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Brand Assets & Color Theme
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand Display Name</label>
              <input
                type="text"
                value={settings.branding?.brandDisplayName || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, brandDisplayName: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Theme Color (Hex)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.branding?.themeColor || "#2563EB"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, themeColor: e.target.value },
                    })
                  }
                  className="h-9 w-9 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.branding?.themeColor || "#2563EB"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, themeColor: e.target.value },
                    })
                  }
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Logo URL</label>
              <input
                type="text"
                value={settings.branding?.logoUrl || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, logoUrl: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="/icon.svg"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Favicon URL</label>
              <input
                type="text"
                value={settings.branding?.faviconUrl || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, faviconUrl: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                placeholder="/favicon.ico"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LANDING PAGE VERSION & COPY */}
      {activeTab === "landing" && (
        <div className="space-y-6">
          {/* Landing Version Switcher */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Active Landing Page Version
            </h3>
            <p className="text-xs text-slate-500">
              Select which landing design version is served at root domain (<code className="font-mono font-bold">/</code>). The Classic Footer remains authoritative.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div
                onClick={() =>
                  setSettings({
                    ...settings,
                    landing: { ...settings.landing, landingVersion: "classic" },
                  })
                }
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.landing?.landingVersion === "classic"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">Classic Landing</span>
                  {settings.landing?.landingVersion === "classic" && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Features FlipWords hero headline, BentoGrid components, and full enterprise navigation.
                </p>
              </div>

              <div
                onClick={() =>
                  setSettings({
                    ...settings,
                    landing: { ...settings.landing, landingVersion: "modern" },
                  })
                }
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.landing?.landingVersion === "modern"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">Modern 2.0 Landing</span>
                  {settings.landing?.landingVersion === "modern" && <Check className="h-4 w-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Modern design presentation with Bento cards and quick lead registration modal.
                </p>
              </div>

              <div
                onClick={() =>
                  setSettings({
                    ...settings,
                    landing: { ...settings.landing, landingVersion: "liquid_glass" },
                  })
                }
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  settings.landing?.landingVersion === "liquid_glass"
                    ? "border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 ring-1 ring-cyan-400"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm flex items-center gap-1.5">
                    <span>Liquid Glass</span>
                    <span className="text-xs">💧</span>
                  </span>
                  {settings.landing?.landingVersion === "liquid_glass" && <Check className="h-4 w-4 text-cyan-600" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ultra-sleek liquid glassmorphism, glowing orbs, frosted translucent cards and Apple iOS styling.
                </p>
              </div>
            </div>
          </div>

          {/* Hero Copy Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Hero Section Copy
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Badge Text</label>
                <input
                  type="text"
                  value={settings.landing?.heroBadge || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landing: { ...settings.landing, heroBadge: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Headline</label>
                <input
                  type="text"
                  value={settings.landing?.heroHeadline || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landing: { ...settings.landing, heroHeadline: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subheadline</label>
                <textarea
                  rows={2}
                  value={settings.landing?.heroSubheadline || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      landing: { ...settings.landing, heroSubheadline: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          {/* Add Announcement Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Create Public Announcement Banner
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Announcement Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Admission Season 2026 Live"
                  value={newAnnouncement.title || ""}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Type / Style</label>
                <select
                  value={newAnnouncement.type || "INFO"}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="INFO">Info (Blue)</option>
                  <option value="PROMO">Promotion / Offer (Emerald)</option>
                  <option value="WARNING">Warning (Amber)</option>
                  <option value="ALERT">Urgent Alert (Rose)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Message</label>
              <textarea
                rows={2}
                placeholder="Details of the announcement displayed to visitors..."
                value={newAnnouncement.message || ""}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={newAnnouncement.startAt || ""}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, startAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={newAnnouncement.endAt || ""}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, endAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Public Area</label>
                <select
                  value={newAnnouncement.targetPublicArea || "ALL"}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetPublicArea: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Public Pages</option>
                  <option value="HOMEPAGE">Homepage Only</option>
                  <option value="PRICING">Pricing Page Only</option>
                  <option value="PORTALS">Portals Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddAnnouncement}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Announcement to Draft</span>
              </button>
            </div>
          </div>

          {/* Announcements List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Active & Scheduled Announcements ({settings.announcements?.length || 0})
            </h3>

            <div className="space-y-3">
              {settings.announcements?.map((a) => {
                const liveStatus = computeAnnouncementStatus(a);
                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white">{a.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            liveStatus === "ACTIVE"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : liveStatus === "SCHEDULED"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {liveStatus}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {a.type}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{a.message}</p>
                      <span className="text-[10px] text-slate-400">
                        Area: {a.targetPublicArea} | From: {a.startAt.slice(0, 10)} {a.endAt ? `to ${a.endAt.slice(0, 10)}` : "(No expiry)"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {(!settings.announcements || settings.announcements.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">No announcements in draft.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FAQS */}
      {activeTab === "faqs" && (
        <div className="space-y-6">
          {/* Add FAQ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Add Frequently Asked Question (FAQ)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Question *</label>
                  <input
                    type="text"
                    placeholder="e.g. How do I import existing student records?"
                    value={newFaq.question || ""}
                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="General / Billing / Security"
                    value={newFaq.category || ""}
                    onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Answer *</label>
                <textarea
                  rows={2}
                  placeholder="Clear and concise answer..."
                  value={newFaq.answer || ""}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add FAQ to Draft</span>
                </button>
              </div>
            </div>
          </div>

          {/* FAQs List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Published FAQs List ({settings.faqs?.length || 0})
            </h3>

            <div className="space-y-3">
              {settings.faqs?.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{f.question}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {f.category}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 pl-5">{f.answer}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteFaq(f.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TESTIMONIALS */}
      {activeTab === "testimonials" && (
        <div className="space-y-6">
          {/* Add Testimonial */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Add Verified Testimonial
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={newTestimonial.name || ""}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Role</label>
                  <input
                    type="text"
                    placeholder="Principal / Director"
                    value={newTestimonial.role || ""}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Organization / School</label>
                  <input
                    type="text"
                    placeholder="Delhi Public Model School"
                    value={newTestimonial.organization || ""}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, organization: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Review Content *</label>
                <textarea
                  rows={2}
                  placeholder="Testimonial text from the school leader..."
                  value={newTestimonial.content || ""}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddTestimonial}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Testimonial to Draft</span>
                </button>
              </div>
            </div>
          </div>

          {/* Testimonials List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Customer Testimonials ({settings.testimonials?.length || 0})
            </h3>

            <div className="space-y-3">
              {settings.testimonials?.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                      <span className="text-slate-400">— {t.role}, {t.organization}</span>
                      <span className="text-amber-500 font-bold">{"★".repeat(t.rating || 5)}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic">"{t.content}"</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTestimonial(t.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SEO & SEARCH CONSOLE */}
      {activeTab === "seo" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Search Engine Optimization (SEO) & Google Search Console
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Meta Title</label>
              <input
                type="text"
                value={settings.seo?.defaultTitle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, defaultTitle: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title Template</label>
              <input
                type="text"
                value={settings.seo?.titleTemplate || "%s | School Study"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, titleTemplate: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Meta Description</label>
            <textarea
              rows={2}
              value={settings.seo?.defaultDescription || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  seo: { ...settings.seo, defaultDescription: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Production Canonical URL</label>
              <input
                type="text"
                value={settings.seo?.canonicalUrl || "https://school.sbci.online"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, canonicalUrl: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Google Search Console Verification Token</label>
              <input
                type="text"
                value={settings.seo?.googleSiteVerification || "zZHJ9sQqwYwYL1UpsI5ZZK3dUZlBoomo5LdBR7KVJd8"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    seo: { ...settings.seo, googleSiteVerification: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: HEADER NAVIGATION */}
      {activeTab === "header" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Header Navigation Links ({settings.header.navigation?.length || 0})
            </h3>
            <button
              onClick={addHeaderNavItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Nav Link</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3">#</th>
                  <th className="p-3">Label</th>
                  <th className="p-3">Target URL</th>
                  <th className="p-3 text-center">Active</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.header.navigation?.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateHeaderNavItem(idx, { label: e.target.value })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs w-full max-w-[140px]"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => updateHeaderNavItem(idx, { url: e.target.value })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs w-full max-w-[180px]"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(e) => updateHeaderNavItem(idx, { enabled: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteHeaderNavItem(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: FOOTER & SOCIALS */}
      {activeTab === "footer" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Footer Bio & Columns
          </h3>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Footer Bio Text</label>
            <textarea
              rows={2}
              value={settings.footer.description || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  footer: { ...settings.footer, description: e.target.value },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {settings.footer.columns?.map((col, idx) => (
              <div key={col.id || idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{col.title}</span>
                  <span className="text-slate-400">{col.links?.length || 0} links</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: LEGAL POLICIES */}
      {activeTab === "legal" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Public Legal Policies
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Privacy Policy Summary</label>
              <textarea
                rows={3}
                value={settings.legalContent?.privacyPolicyText || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    legalContent: { ...settings.legalContent, privacyPolicyText: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Terms of Service Summary</label>
              <textarea
                rows={3}
                value={settings.legalContent?.termsOfServiceText || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    legalContent: { ...settings.legalContent, termsOfServiceText: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Refund Policy Summary</label>
              <textarea
                rows={3}
                value={settings.legalContent?.refundPolicyText || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    legalContent: { ...settings.legalContent, refundPolicyText: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: VERSION HISTORY */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Historical Published Snapshots ({versions.length})
          </h3>

          <div className="space-y-3 text-xs">
            {versions.map((v) => (
              <div
                key={v.version}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="font-extrabold text-blue-600">Version {v.version}</span>
                  <p className="text-slate-500 mt-0.5">
                    Published on {new Date(v.updatedAt).toLocaleString("en-IN")} by {v.updatedBy}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSettings(v);
                    toast.info(`Loaded Version ${v.version} into editor. Click 'Publish Live' to rollback.`);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Load to Editor
                </button>
              </div>
            ))}
            {versions.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No historical versions recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
