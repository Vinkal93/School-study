"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  Globe,
  Save,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Eye,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Mail,
  Phone,
  MapPin,
  Share2,
  Shield,
  History,
  ExternalLink,
  ChevronRight,
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
} from "@/lib/cms/siteSettings";
import { MarketingHeader } from "@/components/marketing";
import { Footer } from "@/components/footer";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";

export default function SuperAdminSiteSettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "header" | "footer" | "contact" | "social" | "legal" | "preview" | "history"
  >("header");

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [publishedSettings, setPublishedSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [versions, setVersions] = useState<SiteSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/site-settings");
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
  }, []);

  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/super-admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          settings,
          actorId: profile?.email || "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save draft");
      setSettings(json.settings);
      setStatusMessage({ type: "success", text: "Draft configuration saved successfully." });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save draft." });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/super-admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          settings,
          actorId: profile?.email || "super_admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to publish");
      setPublishedSettings(json.settings);
      setSettings(json.settings);
      await loadData();
      setStatusMessage({ type: "success", text: `Published Version ${json.settings.version} live to website!` });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to publish." });
    } finally {
      setPublishing(false);
    }
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

  // --- Footer Column & Link Helpers ---
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

  const updateFooterColumn = (colIndex: number, updates: Partial<FooterColumn>) => {
    const cols = [...settings.footer.columns];
    cols[colIndex] = { ...cols[colIndex], ...updates };
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  const deleteFooterColumn = (colIndex: number) => {
    const cols = settings.footer.columns.filter((_, i) => i !== colIndex);
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  const addFooterLink = (colIndex: number) => {
    const cols = [...settings.footer.columns];
    const newLink: FooterLinkItem = {
      id: `lnk_${Date.now()}`,
      label: "New Link",
      url: "/",
      enabled: true,
      openInNewTab: false,
      displayOrder: (cols[colIndex].links?.length || 0) + 1,
    };
    cols[colIndex].links = [...(cols[colIndex].links || []), newLink];
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  const updateFooterLink = (colIndex: number, linkIndex: number, updates: Partial<FooterLinkItem>) => {
    const cols = [...settings.footer.columns];
    cols[colIndex].links[linkIndex] = { ...cols[colIndex].links[linkIndex], ...updates };
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  const deleteFooterLink = (colIndex: number, linkIndex: number) => {
    const cols = [...settings.footer.columns];
    cols[colIndex].links = cols[colIndex].links.filter((_, i) => i !== linkIndex);
    setSettings({ ...settings, footer: { ...settings.footer, columns: cols } });
  };

  // --- Social Links Helpers ---
  const addSocialLink = () => {
    const newSocial: SocialLink = {
      platform: "instagram",
      label: "Instagram",
      url: "https://instagram.com",
      icon: "Instagram",
      enabled: true,
      displayOrder: (settings.socials?.length || 0) + 1,
    };
    setSettings({
      ...settings,
      socials: [...(settings.socials || []), newSocial],
    });
  };

  const updateSocialLink = (index: number, updates: Partial<SocialLink>) => {
    const socials = [...settings.socials];
    socials[index] = { ...socials[index], ...updates };
    setSettings({ ...settings, socials });
  };

  const deleteSocialLink = (index: number) => {
    const socials = settings.socials.filter((_, i) => i !== index);
    setSettings({ ...settings, socials });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <LayoutTemplate className="h-6 w-6 text-blue-600" />
              Global Header & Footer CMS
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
              Live v{publishedSettings.version || 1}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage public navigation, brand identity, footer columns, contact details, and social links with instant live publishing.
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto no-scrollbar">
        {[
          { id: "header", label: "Header & Navigation", icon: LayoutTemplate },
          { id: "footer", label: "Footer Columns & Links", icon: Globe },
          { id: "contact", label: "Contact & Location", icon: MapPin },
          { id: "social", label: "Social Media", icon: Share2 },
          { id: "legal", label: "Legal & Copyright", icon: Shield },
          { id: "preview", label: "Live Preview", icon: Eye },
          { id: "history", label: "Version History", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 ${
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

      {/* TAB 1: HEADER MANAGEMENT */}
      {activeTab === "header" && (
        <div className="space-y-6">
          {/* Brand & Global Header Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Brand Identity & Global Header Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Brand Name:
                </label>
                <input
                  type="text"
                  value={settings.header.brandName || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header, brandName: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tagline / Subtitle:
                </label>
                <input
                  type="text"
                  value={settings.header.tagline || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header, tagline: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.header.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header, enabled: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">Enable Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.header.showThemeToggle !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header: { ...settings.header, showThemeToggle: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600 h-4 w-4"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Show Theme Switcher</span>
              </label>
            </div>
          </div>

          {/* CTA Buttons Config (Section 4) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Call To Action (CTA) Buttons
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Primary CTA */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Primary Button (e.g. Login / Start)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.header.primaryCta?.enabled !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          header: {
                            ...settings.header,
                            primaryCta: { ...settings.header.primaryCta, enabled: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-[11px] font-semibold">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Button Label:</label>
                  <input
                    type="text"
                    value={settings.header.primaryCta?.label || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: {
                          ...settings.header,
                          primaryCta: { ...settings.header.primaryCta, label: e.target.value },
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Target URL:</label>
                  <input
                    type="text"
                    value={settings.header.primaryCta?.url || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: {
                          ...settings.header,
                          primaryCta: { ...settings.header.primaryCta, url: e.target.value },
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Secondary CTA */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Secondary Button</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.header.secondaryCta?.enabled || false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          header: {
                            ...settings.header,
                            secondaryCta: { ...settings.header.secondaryCta, enabled: e.target.checked },
                          },
                        })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="text-[11px] font-semibold">Enabled</span>
                  </label>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Button Label:</label>
                  <input
                    type="text"
                    value={settings.header.secondaryCta?.label || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: {
                          ...settings.header,
                          secondaryCta: { ...settings.header.secondaryCta, label: e.target.value },
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Target URL:</label>
                  <input
                    type="text"
                    value={settings.header.secondaryCta?.url || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        header: {
                          ...settings.header,
                          secondaryCta: { ...settings.header.secondaryCta, url: e.target.value },
                        },
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
                Navigation Links ({settings.header.navigation?.length || 0})
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
                    <th className="p-3">Order</th>
                    <th className="p-3">Label</th>
                    <th className="p-3">Target URL</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">New Tab</th>
                    <th className="p-3 text-center">Active</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {settings.header.navigation?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
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
                      <td className="p-3">
                        <select
                          value={item.type}
                          onChange={(e) => updateHeaderNavItem(idx, { type: e.target.value as any })}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value="INTERNAL">Internal</option>
                          <option value="EXTERNAL">External</option>
                          <option value="ANCHOR">Anchor</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.openInNewTab}
                          onChange={(e) => updateHeaderNavItem(idx, { openInNewTab: e.target.checked })}
                          className="rounded text-blue-600"
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
        </div>
      )}

      {/* TAB 2: FOOTER MANAGEMENT */}
      {activeTab === "footer" && (
        <div className="space-y-6">
          {/* Footer Visibility & Bio */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Footer Description & Visibility Toggles
            </h3>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
                Footer Bio Description:
              </label>
              <textarea
                rows={2}
                value={settings.footer.description || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    footer: { ...settings.footer, description: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.footer.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, enabled: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">Enable Footer</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.footer.showBrand}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, showBrand: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Show Brand & Bio</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.footer.showNavigation}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, showNavigation: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Show Columns</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.footer.showContact}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, showContact: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Show Get in Touch</span>
              </label>
            </div>
          </div>

          {/* Footer Dynamic Columns (Section 6 & 7) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
                Footer Columns ({settings.footer.columns?.length || 0})
              </h3>
              <button
                onClick={addFooterColumn}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Footer Column</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {settings.footer.columns?.map((col, colIdx) => (
                <div
                  key={col.id || colIdx}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => updateFooterColumn(colIdx, { title: e.target.value })}
                      className="font-bold text-sm text-slate-900 dark:text-white p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={col.enabled}
                          onChange={(e) => updateFooterColumn(colIdx, { enabled: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span>Active</span>
                      </label>

                      <button
                        onClick={() => deleteFooterColumn(colIdx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Column"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Links List */}
                  <div className="space-y-2 text-xs">
                    {col.links?.map((link, linkIdx) => (
                      <div
                        key={link.id || linkIdx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label"
                            value={link.label}
                            onChange={(e) => updateFooterLink(colIdx, linkIdx, { label: e.target.value })}
                            className="w-1/2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="URL"
                            value={link.url}
                            onChange={(e) => updateFooterLink(colIdx, linkIdx, { url: e.target.value })}
                            className="w-1/2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={link.enabled}
                              onChange={(e) => updateFooterLink(colIdx, linkIdx, { enabled: e.target.checked })}
                              className="rounded text-blue-600"
                            />
                            <span>Enabled</span>
                          </label>

                          <button
                            onClick={() => deleteFooterLink(colIdx, linkIdx)}
                            className="text-red-500 hover:underline cursor-pointer text-[11px]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addFooterLink(colIdx)}
                      className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Link</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT & LOCATION (Section 8, 9, 10, 32) */}
      {activeTab === "contact" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Contact Information & Regional Location
          </h3>

          <div className="space-y-4 text-xs">
            {/* Email */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Support Email Address:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.contact.emailEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contact: { ...settings.contact, emailEnabled: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold">Enabled</span>
                </label>
              </div>
              <input
                type="email"
                value={settings.contact.email || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, email: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>

            {/* Phone */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Contact Phone Number:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.contact.phoneEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contact: { ...settings.contact, phoneEnabled: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold">Enabled</span>
                </label>
              </div>
              <input
                type="text"
                value={settings.contact.phone || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, phone: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>

            {/* Location & Maps (Section 8 & 32: Uttar Pradesh, India) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  Location & Map Destination (Uttar Pradesh, India):
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.contact.locationEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        contact: { ...settings.contact, locationEnabled: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-semibold">Enabled</span>
                </label>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Display Label:</label>
                <input
                  type="text"
                  value={settings.contact.locationLabel || "Uttar Pradesh, India"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contact: { ...settings.contact, locationLabel: e.target.value },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Map / Search Destination URL:</label>
                <input
                  type="text"
                  value={settings.contact.locationUrl || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contact: { ...settings.contact, locationUrl: e.target.value },
                    })
                  }
                  placeholder="https://maps.google.com/?q=Uttar+Pradesh+India"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOCIAL MEDIA LINKS */}
      {activeTab === "social" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
              Social Media Accounts ({settings.socials?.length || 0})
            </h3>
            <button
              onClick={addSocialLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Social Link</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                  <th className="p-3">Platform</th>
                  <th className="p-3">Label</th>
                  <th className="p-3">Profile URL</th>
                  <th className="p-3 text-center">Active</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.socials?.map((soc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3">
                      <select
                        value={soc.platform}
                        onChange={(e) => updateSocialLink(idx, { platform: e.target.value, label: e.target.value })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold capitalize"
                      >
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                        <option value="x">X (Twitter)</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="github">GitHub</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={soc.label}
                        onChange={(e) => updateSocialLink(idx, { label: e.target.value })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={soc.url}
                        onChange={(e) => updateSocialLink(idx, { url: e.target.value })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs w-full max-w-[280px]"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={soc.enabled}
                        onChange={(e) => updateSocialLink(idx, { enabled: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteSocialLink(idx)}
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

      {/* TAB 5: LEGAL & COPYRIGHT */}
      {activeTab === "legal" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Copyright & Legal Policies
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Copyright String (Supports {"{YEAR}"}):
              </label>
              <input
                type="text"
                value={settings.footer.copyrightText || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    footer: { ...settings.footer, copyrightText: e.target.value },
                  })
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Preview: {settings.footer.copyrightText?.replace(/\{YEAR\}/gi, new Date().getFullYear().toString())}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Legal Policy Links:</h4>
              <div className="space-y-2">
                {settings.legal?.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.label}
                      onChange={(e) => {
                        const leg = [...settings.legal];
                        leg[idx].label = e.target.value;
                        setSettings({ ...settings, legal: leg });
                      }}
                      className="w-1/3 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                    />
                    <input
                      type="text"
                      value={l.url}
                      onChange={(e) => {
                        const leg = [...settings.legal];
                        leg[idx].url = e.target.value;
                        setSettings({ ...settings, legal: leg });
                      }}
                      className="w-1/2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs"
                    />
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={l.enabled}
                        onChange={(e) => {
                          const leg = [...settings.legal];
                          leg[idx].enabled = e.target.checked;
                          setSettings({ ...settings, legal: leg });
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIVE INTERACTIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Device Frame:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    previewDevice === "desktop" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    previewDevice === "mobile" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              * Preview renders current unsaved/draft configuration in real-time
            </div>
          </div>

          <div
            className={`mx-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-3xl p-4 transition-all overflow-hidden ${
              previewDevice === "mobile" ? "max-w-sm shadow-2xl" : "w-full shadow-lg"
            }`}
          >
            <SiteSettingsProvider initialSettings={settings}>
              <div className="space-y-12">
                <MarketingHeader />
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  [ Website Page Body Content Placeholder ]
                </div>
                <Footer />
              </div>
            </SiteSettingsProvider>
          </div>
        </div>
      )}

      {/* TAB 7: VERSION HISTORY & RESTORE (Section 18) */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400">
            Published Version History ({versions.length})
          </h3>

          {versions.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No previous version snapshots found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-700 dark:text-slate-300">
                    <th className="p-3">Version</th>
                    <th className="p-3">Published Date</th>
                    <th className="p-3">Published By</th>
                    <th className="p-3">Brand Name</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {versions.map((ver, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-blue-600">v{ver.version}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {new Date(ver.updatedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{ver.updatedBy}</td>
                      <td className="p-3 font-semibold">{ver.header?.brandName || "School Study"}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSettings(ver);
                            setActiveTab("header");
                            setStatusMessage({
                              type: "success",
                              text: `Loaded version v${ver.version} into editor. Click "Publish" to restore live.`,
                            });
                          }}
                          className="font-bold text-blue-600 hover:underline text-xs cursor-pointer"
                        >
                          Load to Editor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
