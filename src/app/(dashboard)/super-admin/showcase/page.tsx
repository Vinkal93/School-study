"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Eye,
  Edit2,
  CheckCircle2,
  PauseCircle,
  Archive,
  Monitor,
  Smartphone,
  Globe,
  Save,
  X,
  ArrowRight,
  ExternalLink,
  Power,
  Layers,
  Layout,
  RefreshCw,
} from "lucide-react";
import type { FeatureShowcase, ShowcaseFrequency, AiPortalType } from "@/types/ai";
import { DEFAULT_AI_SHOWCASE } from "@/types/ai";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import Link from "next/link";
import { showcaseAdminRequest } from "@/lib/services/showcase.service";

interface GlobalShowcaseSettings {
  enabled: boolean;
  landingBannerEnabled: boolean;
  dashboardModalEnabled: boolean;
}

export default function SuperAdminShowcasePage() {
  const { firebaseUser, profile } = useAuth();
  const [showcases, setShowcases] = useState<FeatureShowcase[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalShowcaseSettings>({
    enabled: true,
    landingBannerEnabled: true,
    dashboardModalEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [editingShowcase, setEditingShowcase] = useState<FeatureShowcase | null>(null);
  const [previewShowcase, setPreviewShowcase] = useState<FeatureShowcase | null>(null);
  const [previewMode, setPreviewMode] = useState<"landing" | "desktop" | "mobile">("landing");
  const [saving, setSaving] = useState(false);
  const [togglingAction, setTogglingAction] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = (await firebaseUser?.getIdToken?.().catch(() => "")) || "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [firebaseUser]);

  const fetchShowcases = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await showcaseAdminRequest("/api/super-admin/feature-showcase", { headers });
      if (res.ok) {
        const data = await res.json();
        setShowcases(data.showcases || []);
        if (data.settings) {
          setGlobalSettings({
            enabled: data.settings.enabled ?? true,
            landingBannerEnabled: data.settings.landingBannerEnabled ?? true,
            dashboardModalEnabled: data.settings.dashboardModalEnabled ?? true,
          });
        }
      }
    } catch (e) {
      toast.error("Failed to load showcases");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchShowcases();
  }, [fetchShowcases]);

  // Save or update an individual showcase
  const handleSave = async (showcaseToSave: FeatureShowcase) => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await showcaseAdminRequest("/api/super-admin/feature-showcase", {
        method: "POST",
        headers,
        body: JSON.stringify(showcaseToSave),
      });
      if (res.ok) {
        toast.success(`Showcase "${showcaseToSave.title}" saved successfully!`);
        await fetchShowcases();
        setEditingShowcase(null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save showcase");
      }
    } catch (e) {
      toast.error("Error connecting to server");
    } finally {
      setSaving(false);
    }
  };

  // Toggle individual showcase status
  const toggleStatus = async (showcase: FeatureShowcase, newStatus: FeatureShowcase["status"]) => {
    setTogglingAction(showcase.id);
    try {
      const headers = await getAuthHeaders();
      const updatedShowcase = {
        ...showcase,
        status: newStatus,
        enabled: newStatus === "PUBLISHED",
      };
      const res = await showcaseAdminRequest("/api/super-admin/feature-showcase", {
        method: "POST",
        headers,
        body: JSON.stringify(updatedShowcase),
      });
      if (res.ok) {
        toast.success(
          newStatus === "PUBLISHED"
            ? `Announcement "${showcase.title}" is now ACTIVE (ON)!`
            : `Announcement "${showcase.title}" is now PAUSED (OFF)!`
        );
        await fetchShowcases();
      } else {
        toast.error("Failed to update status");
      }
    } catch (e) {
      toast.error("Error updating status");
    } finally {
      setTogglingAction(null);
    }
  };

  // Toggle Landing Notice Banner specifically (ON / OFF)
  const toggleLandingBanner = async (targetState: boolean) => {
    setTogglingAction("landing");
    try {
      const headers = await getAuthHeaders();
      const res = await showcaseAdminRequest("/api/super-admin/feature-showcase", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "toggle_landing",
          enabled: targetState,
        }),
      });
      if (res.ok) {
        toast.success(
          targetState
            ? "New AI Feature Notice Banner is now LIVE on Landing Page (ON)!"
            : "New AI Feature Notice Banner is now HIDDEN on Landing Page (OFF)!"
        );
        await fetchShowcases();
      } else {
        toast.error("Failed to toggle landing banner");
      }
    } catch (e) {
      toast.error("Error toggling landing banner");
    } finally {
      setTogglingAction(null);
    }
  };

  // Master Toggle All (Landing Banners & Modals)
  const toggleMaster = async (targetState: boolean) => {
    setTogglingAction("master");
    try {
      const headers = await getAuthHeaders();
      const res = await showcaseAdminRequest("/api/super-admin/feature-showcase", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "toggle_all",
          enabled: targetState,
        }),
      });
      if (res.ok) {
        toast.success(
          targetState
            ? "All update popups & announcements turned ON!"
            : "All update popups & announcements turned OFF!"
        );
        await fetchShowcases();
      } else {
        toast.error("Failed to toggle master switch");
      }
    } catch (e) {
      toast.error("Error toggling master switch");
    } finally {
      setTogglingAction(null);
    }
  };

  // Check if AI Showcase specifically is published and landing banner is active
  const aiShowcase = showcases.find((s) => s.id === "showcase_ai_mode" || s.featureKey === "ai_mode") || showcases[0];
  const isLandingBannerActive = Boolean(
    globalSettings.enabled &&
    globalSettings.landingBannerEnabled &&
    aiShowcase &&
    aiShowcase.status === "PUBLISHED" &&
    aiShowcase.showOnLandingPage
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Feature Showcase & AI Notice Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage the "NEW AI FEATURE" landing notice banner and user spotlight popups across the platform.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchShowcases}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
            title="Refresh settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-xs"
          >
            <span>View Landing Page</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <button
            onClick={() =>
              setEditingShowcase({
                ...DEFAULT_AI_SHOWCASE,
                id: `showcase_${Date.now()}`,
                title: "New Feature Announcement",
                status: "PUBLISHED",
              })
            }
            className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Showcase
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRIMARY CONTROLLER: NEW AI FEATURE NOTICE BANNER               */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-2xl border transition-all shadow-xs ${
        isLandingBannerActive
          ? "bg-gradient-to-r from-indigo-950/20 via-purple-900/10 to-indigo-900/20 border-indigo-300 dark:border-indigo-800"
          : "bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                NEW AI FEATURE Notice Banner
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isLandingBannerActive
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {isLandingBannerActive ? "● LIVE ON HOMEPAGE" : "○ TURNED OFF / HIDDEN"}
              </span>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {aiShowcase?.title || "Introducing School Study AI"}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {aiShowcase?.description ||
                "Experience the next-generation AI copilot tailored for modern schools. Analyze attendance, track fee collection, and summarize academic operations effortlessly."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Badge: <strong>{aiShowcase?.badgeText || "NEW AI FEATURE"}</strong></span>
              <span>•</span>
              <span>CTA: <strong>{aiShowcase?.ctaText || "Try AI Mode"}</strong></span>
              <span>•</span>
              <span>URL: <code>{aiShowcase?.ctaUrl || "/admin/ai"}</code></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (aiShowcase) {
                  setPreviewShowcase(aiShowcase);
                  setPreviewMode("landing");
                }
              }}
              className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition"
            >
              <Eye className="h-4 w-4 text-indigo-500" />
              Preview Banner
            </button>

            <button
              onClick={() => {
                if (aiShowcase) setEditingShowcase(aiShowcase);
              }}
              className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition"
            >
              <Edit2 className="h-4 w-4 text-purple-500" />
              Edit Text & CTA
            </button>

            <button
              onClick={() => toggleLandingBanner(!isLandingBannerActive)}
              disabled={togglingAction === "landing"}
              className={`py-2.5 px-6 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                isLandingBannerActive
                  ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              }`}
            >
              <Power className="h-4 w-4" />
              {isLandingBannerActive ? "Turn Banner OFF" : "Turn Banner ON"}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECONDARY PLATFORM CONTROLS GRID                               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Master Switch Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                Master Platform Announcements Switch
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Instantly toggle all landing banners and dashboard spotlight popups globally.
            </p>
          </div>

          <button
            onClick={() => toggleMaster(!globalSettings.enabled)}
            disabled={togglingAction === "master"}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
              globalSettings.enabled
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {globalSettings.enabled ? "Turn ALL OFF" : "Turn ALL ON"}
          </button>
        </div>

        {/* Dashboard Modal Switch Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-purple-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 dark:text-white">
                Dashboard Spotlight Popup Modal
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Show/hide the modal popup that appears after user login in school admin, teacher, or student portals.
            </p>
          </div>

          <button
            onClick={async () => {
              const target = !globalSettings.dashboardModalEnabled;
              setTogglingAction("modal");
              try {
                const headers = await getAuthHeaders();
                await showcaseAdminRequest("/api/super-admin/feature-showcase", {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    action: "update_global_settings",
                    settings: { dashboardModalEnabled: target },
                  }),
                });
                toast.success(target ? "Dashboard popup enabled!" : "Dashboard popup paused!");
                await fetchShowcases();
              } finally {
                setTogglingAction(null);
              }
            }}
            disabled={togglingAction === "modal"}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
              globalSettings.dashboardModalEnabled
                ? "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {globalSettings.dashboardModalEnabled ? "Disable Modal (OFF)" : "Enable Modal (ON)"}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SHOWCASES TABLE                                                */}
      {/* ============================================================== */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              All Feature Announcements & Spotlights
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure each individual showcase placement, copy, badge, and status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase">
                <th className="py-3 px-3">Feature Key</th>
                <th className="py-3 px-3">Title & Copy</th>
                <th className="py-3 px-3">Placements</th>
                <th className="py-3 px-3">Target Portals</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Toggle & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
              {showcases.map((s) => {
                const isPublished = s.status === "PUBLISHED" && s.enabled !== false;
                const isBusy = togglingAction === s.id;

                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        {s.featureKey}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{s.title}</span>
                        {s.badgeText && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {s.badgeText}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs truncate max-w-sm">{s.description}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex gap-1.5">
                        {s.showOnLandingPage && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                            Landing
                          </span>
                        )}
                        {s.showOnDashboard && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-800">
                            Dashboard
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-gray-500">
                        {s.targetPortals?.length ? s.targetPortals.join(", ") : "All"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setPreviewShowcase(s);
                          setPreviewMode(s.showOnLandingPage ? "landing" : "desktop");
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Live Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingShowcase(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Edit Showcase"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {isPublished ? (
                        <button
                          onClick={() => toggleStatus(s, "PAUSED")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                          title="Pause Announcement"
                        >
                          <PauseCircle className="h-3.5 w-3.5" />
                          Pause (OFF)
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus(s, "PUBLISHED")}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
                          title="Publish Announcement"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Publish (ON)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* EDIT MODAL                                                     */}
      {/* ============================================================== */}
      {editingShowcase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit Feature Showcase / Notice
              </h3>
              <button
                onClick={() => setEditingShowcase(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Feature Key
                </label>
                <input
                  type="text"
                  value={editingShowcase.featureKey}
                  onChange={(e) =>
                    setEditingShowcase({ ...editingShowcase, featureKey: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={editingShowcase.title}
                  onChange={(e) =>
                    setEditingShowcase({ ...editingShowcase, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Description / Message
                </label>
                <textarea
                  rows={3}
                  value={editingShowcase.description}
                  onChange={(e) =>
                    setEditingShowcase({ ...editingShowcase, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Badge Text (e.g. NEW AI FEATURE)
                  </label>
                  <input
                    type="text"
                    value={editingShowcase.badgeText}
                    onChange={(e) =>
                      setEditingShowcase({ ...editingShowcase, badgeText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={editingShowcase.ctaText}
                    onChange={(e) =>
                      setEditingShowcase({ ...editingShowcase, ctaText: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    CTA Redirect URL
                  </label>
                  <input
                    type="text"
                    value={editingShowcase.ctaUrl || "/admin/ai"}
                    onChange={(e) =>
                      setEditingShowcase({ ...editingShowcase, ctaUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={editingShowcase.status}
                    onChange={(e) =>
                      setEditingShowcase({
                        ...editingShowcase,
                        status: e.target.value as any,
                        enabled: e.target.value === "PUBLISHED",
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                  >
                    <option value="PUBLISHED">PUBLISHED (Active / Visible)</option>
                    <option value="PAUSED">PAUSED (Turned Off / Hidden)</option>
                    <option value="DRAFT">DRAFT (Hidden)</option>
                    <option value="ARCHIVED">ARCHIVED (Archived)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  Placement Controls
                </span>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 dark:text-gray-200 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={editingShowcase.showOnLandingPage}
                      onChange={(e) =>
                        setEditingShowcase({
                          ...editingShowcase,
                          showOnLandingPage: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold block">Show Banner at top of Landing Page</span>
                      <span className="text-[11px] text-gray-500">Displays the purple notice bar at the top of the homepage</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 dark:text-gray-200 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={editingShowcase.showOnDashboard}
                      onChange={(e) =>
                        setEditingShowcase({
                          ...editingShowcase,
                          showOnDashboard: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold block">Show Modal in Portals & Dashboard</span>
                      <span className="text-[11px] text-gray-500">Pops up after login for school admins, teachers, and students</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setEditingShowcase(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingShowcase)}
                disabled={saving}
                className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LIVE PREVIEW MODAL                                             */}
      {/* ============================================================== */}
      {previewShowcase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Live Showcase Preview: {previewShowcase.title}
                </h3>
              </div>

              {/* Device Viewport Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setPreviewMode("landing")}
                  className={`flex items-center gap-1 py-1 px-3 rounded-lg font-medium transition ${
                    previewMode === "landing"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                      : "text-gray-500"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" /> Landing Banner
                </button>
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center gap-1 py-1 px-3 rounded-lg font-medium transition ${
                    previewMode === "desktop"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                      : "text-gray-500"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop Modal
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center gap-1 py-1 px-3 rounded-lg font-medium transition ${
                    previewMode === "mobile"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs"
                      : "text-gray-500"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile Modal
                </button>
              </div>

              <button
                onClick={() => setPreviewShowcase(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Viewport Canvas */}
            <div className="flex-1 overflow-y-auto py-8 bg-gray-100/70 dark:bg-gray-950/70 rounded-2xl flex items-center justify-center p-4 my-3 border border-dashed border-gray-300 dark:border-gray-800">
              {previewMode === "landing" ? (
                /* Landing Banner Preview */
                <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-lg bg-linear-to-r from-indigo-900 via-purple-900 to-indigo-950 px-4 py-3 text-white text-xs sm:text-sm flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mx-auto text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-indigo-200 border border-white/20">
                      <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
                      {previewShowcase.badgeText || "NEW AI FEATURE"}
                    </span>
                    <p className="font-medium text-white/90">
                      <strong className="font-semibold text-white">{previewShowcase.title}:</strong>{" "}
                      <span>{previewShowcase.description}</span>
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-900 shadow-xs ml-2">
                      {previewShowcase.ctaText || "Try AI Mode"} <ArrowRight className="h-3 w-3 inline" />
                    </span>
                  </div>
                </div>
              ) : (
                /* Dashboard Modal Preview */
                <div
                  className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all ${
                    previewMode === "mobile" ? "max-w-xs" : "max-w-md"
                  }`}
                >
                  <div className="p-6 bg-linear-to-b from-indigo-50 to-white dark:from-indigo-950/40 dark:to-gray-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md mb-3">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700">
                      {previewShowcase.badgeText || "FEATURE SPOTLIGHT"}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                      {previewShowcase.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      {previewShowcase.description}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                    <span className="py-2 px-3 text-xs text-gray-400 font-medium">
                      {previewShowcase.secondaryCtaText || "Maybe Later"}
                    </span>
                    <span className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs flex items-center gap-1">
                      {previewShowcase.ctaText || "Try AI Mode"} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
