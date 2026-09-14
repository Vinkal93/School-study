"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import type { FeatureShowcase, ShowcaseFrequency, AiPortalType } from "@/types/ai";
import { DEFAULT_AI_SHOWCASE } from "@/types/ai";

export default function SuperAdminShowcasePage() {
  const [showcases, setShowcases] = useState<FeatureShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShowcase, setEditingShowcase] = useState<FeatureShowcase | null>(null);
  const [previewShowcase, setPreviewShowcase] = useState<FeatureShowcase | null>(null);
  const [previewMode, setPreviewMode] = useState<"landing" | "desktop" | "mobile">("landing");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchShowcases();
  }, []);

  const fetchShowcases = async () => {
    try {
      const res = await fetch("/api/super-admin/feature-showcase");
      if (res.ok) {
        const data = await res.json();
        setShowcases(data.showcases || []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (showcaseToSave: FeatureShowcase) => {
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/feature-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(showcaseToSave),
      });
      if (res.ok) {
        await fetchShowcases();
        setEditingShowcase(null);
      }
    } catch (e) {
      alert("Failed to save feature showcase");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (showcase: FeatureShowcase, newStatus: FeatureShowcase["status"]) => {
    await handleSave({ ...showcase, status: newStatus });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-amber-500" />
            Feature Showcase & Rollout Announcements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Publish announcements, feature spotlight modals, and landing banners dynamically.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingShowcase({
              ...DEFAULT_AI_SHOWCASE,
              id: `showcase_${Date.now()}`,
              title: "New Feature Announcement",
            })
          }
          className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create Showcase
        </button>
      </div>

      {/* Showcases Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          All Active & Scheduled Showcases
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase">
                <th className="py-3 px-3">Feature</th>
                <th className="py-3 px-3">Title & Subtitle</th>
                <th className="py-3 px-3">Placements</th>
                <th className="py-3 px-3">Target Portals</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-300">
              {showcases.map((s) => (
                <tr key={s.id}>
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      {s.featureKey}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-gray-900 dark:text-white text-sm">{s.title}</div>
                    <div className="text-gray-400 text-xs truncate max-w-xs">{s.subtitle}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex gap-1.5">
                      {s.showOnLandingPage && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                          Landing
                        </span>
                      )}
                      {s.showOnDashboard && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
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
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : s.status === "PAUSED"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setPreviewShowcase(s);
                        setPreviewMode(s.showOnLandingPage ? "landing" : "desktop");
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition"
                      title="Live Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingShowcase(s)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition"
                      title="Edit Showcase"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {s.status === "PUBLISHED" ? (
                      <button
                        onClick={() => toggleStatus(s, "PAUSED")}
                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition"
                        title="Pause Announcement"
                      >
                        <PauseCircle className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStatus(s, "PUBLISHED")}
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition"
                        title="Publish Announcement"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
                Edit Feature Showcase
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
                  Description
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
                    Badge Text
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

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 dark:text-gray-200">
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
                  Show on Landing Page
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 dark:text-gray-200">
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
                  Show in Dashboard Modal
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setEditingShowcase(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(editingShowcase)}
                disabled={saving}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
              >
                Save Showcase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LIVE PREVIEW MODAL (Landing, Desktop, Mobile)                  */}
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
                <div className="w-full max-w-3xl rounded-xl overflow-hidden shadow-lg bg-linear-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-indigo-200">
                      {previewShowcase.badgeText || "NEW"}
                    </span>
                    <p className="text-sm">
                      <strong>{previewShowcase.title}:</strong> {previewShowcase.description}
                    </p>
                  </div>
                  <span className="py-1.5 px-3.5 rounded-full bg-white text-indigo-950 text-xs font-bold shrink-0">
                    {previewShowcase.ctaText || "Try AI Mode"}
                  </span>
                </div>
              ) : (
                /* Dashboard Modal Preview (Desktop or Mobile simulated frame) */
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
