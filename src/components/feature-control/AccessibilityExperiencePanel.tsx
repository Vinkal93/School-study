"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  Eye,
  PartyPopper,
  Save,
  RotateCcw,
  Clock,
  Type,
  Layout,
  HelpCircle,
  Zap,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Shield,
  BarChart3,
  PieChart,
  Activity,
  Layers,
  Smartphone,
  EyeOff,
  Contrast,
} from "lucide-react";
import { toast } from "sonner";
import {
  getExperienceSettings,
  saveExperienceSettings,
} from "@/lib/services/experienceControl.service";
import { ExperienceSettings, DEFAULT_EXPERIENCE_SETTINGS } from "@/types/experienceControl";
import { triggerConfettiSideCannons } from "@/components/magicui/confetti";
import { AdminWelcomeOverlay } from "@/components/common/AdminWelcomeOverlay";
import { Checkbox20 } from "@/components/reui/checkbox-20";
import {
  Chart1AreaGradient,
  Chart11DualBar,
  Chart13RadialDonut,
  Chart17HorizontalBar,
  Chart22RevenueArea,
  Chart25AttendancePulse,
} from "@/components/reui/chart-suite";

export function AccessibilityExperiencePanel() {
  const [settings, setSettings] = useState<ExperienceSettings>(DEFAULT_EXPERIENCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeChartPreview, setActiveChartPreview] = useState<"chart1" | "chart11" | "chart13" | "chart17" | "chart22" | "chart25">("chart1");

  useEffect(() => {
    getExperienceSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings(DEFAULT_EXPERIENCE_SETTINGS))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveExperienceSettings(settings);
      toast.success("Accessibility, Sidebar & Experience settings updated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_EXPERIENCE_SETTINGS);
    toast.info("Reset to standard defaults. Click 'Save Changes' to apply.");
  };

  const handleTestConfetti = () => {
    triggerConfettiSideCannons({ durationSeconds: settings.confettiDuration || 3 });
    toast.success("🎉 Fired Magic UI Side Cannons confetti!");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 animate-pulse">
        Loading Accessibility & Experience configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Live Preview Modal */}
      {showPreview && (
        <AdminWelcomeOverlay forcePreview={true} onPreviewClose={() => setShowPreview(false)} />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UI / UX & Accessibility Command Center</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Accessibility, Sidebar & Experience Controls
          </h2>
          <p className="text-sm text-blue-100 font-medium leading-relaxed">
            Configure the optional collapsible sidebar (@reui/c-collapsible-9), high-contrast accessibility modes, interactive visual analytics charts (@reui/c-chart suite), and admin welcome animations across all portals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-white/20 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Welcome</span>
          </button>
          <button
            onClick={handleTestConfetti}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-white/20 shadow-sm"
          >
            <PartyPopper className="w-4 h-4 text-pink-300" />
            <span>Test Confetti</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =========================================================================
            SECTION 1: COLLAPSIBLE SIDEBAR CONTROL (@reui/c-collapsible-9)
        ========================================================================= */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <PanelLeftClose className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Collapsible Sidebar & Navigation
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                    @reui/c-collapsible-9
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional collapsible rail navigation with tooltips and smooth transitions
                </p>
              </div>
            </div>

            {/* Global Collapsible Sidebar Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableCollapsibleSidebar}
                onChange={(e) =>
                  setSettings({ ...settings, enableCollapsibleSidebar: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            {/* Sidebar Mode Selector */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">
                Default Sidebar Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "collapsible_rail", label: "Collapsible Rail", desc: "Slim 72px rail with hover flyouts" },
                  { id: "default_expanded", label: "Standard Full", desc: "Full 260px wide traditional sidebar" },
                  { id: "floating_compact", label: "Floating Pill", desc: "Modern rounded floating nav" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, sidebarMode: m.id as any })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      settings.sidebarMode === m.id
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 shadow-xs"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-bold text-xs">{m.label}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Per-Portal Collapsible Activation using @reui/c-checkbox-20 */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">
                Enable Collapsible Behavior by Portal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Checkbox20
                  checked={settings.collapsiblePortals?.schoolAdmin ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      collapsiblePortals: {
                        ...settings.collapsiblePortals,
                        schoolAdmin: e.target.checked,
                      },
                    })
                  }
                  label="School Admin Portal"
                  description="Enable collapsible rail for school administrators"
                  badge="Recommended"
                />

                <Checkbox20
                  checked={settings.collapsiblePortals?.superAdmin ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      collapsiblePortals: {
                        ...settings.collapsiblePortals,
                        superAdmin: e.target.checked,
                      },
                    })
                  }
                  label="Super Admin Portal"
                  description="Enable collapsible rail for platform managers"
                  badge="Active"
                />

                <Checkbox20
                  checked={settings.collapsiblePortals?.teacher ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      collapsiblePortals: {
                        ...settings.collapsiblePortals,
                        teacher: e.target.checked,
                      },
                    })
                  }
                  label="Teacher Portal"
                  description="Compact view for faculty members on tablets"
                />

                <Checkbox20
                  checked={settings.collapsiblePortals?.student ?? false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      collapsiblePortals: {
                        ...settings.collapsiblePortals,
                        student: e.target.checked,
                      },
                    })
                  }
                  label="Student Portal"
                  description="Sidebar collapse (students default to bottom nav on phone)"
                />
              </div>
            </div>

            {/* Extra toggles */}
            <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">Auto-Collapse on Tablets & Small Laptops</p>
                  <p className="text-gray-500 text-[11px]">
                    Automatically switch to compact icon rail below 1280px screen width
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableSidebarAutoCollapseOnMobile ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableSidebarAutoCollapseOnMobile: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">Show Notification & Status Badges</p>
                  <p className="text-gray-500 text-[11px]">
                    Display badge count pills next to Inquiries, Attendance, and Notices in sidebar
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showSidebarBadges ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showSidebarBadges: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: ACCESSIBILITY & VISUAL COMFORT (WCAG AAA)
        ========================================================================= */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Contrast className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Accessibility & Visual Comfort
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Contrast standards, reduced motion, and realtime synchronization
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* High Contrast Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">High Contrast Mode (WCAG AAA)</p>
                <p className="text-gray-500 text-[11px]">
                  Enhance border contrast, deepen text weights, and sharpen button borders for low-vision readability
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrastMode ?? false}
                onChange={(e) =>
                  setSettings({ ...settings, highContrastMode: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Reduced Motion Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">Reduced Motion & Animation Pause</p>
                <p className="text-gray-500 text-[11px]">
                  Disable continuous background animations, floating confetti, and pulse effects for vestibular comfort & battery savings
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion ?? false}
                onChange={(e) =>
                  setSettings({ ...settings, reducedMotion: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Realtime Live Database Sync */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">Live Realtime Database Sync</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-emerald-700/80 dark:text-emerald-300/80 text-[11px]">
                  Listen to live Firestore updates across phones, tablets, and desktops simultaneously with zero latency
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.enableRealtimeSync ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, enableRealtimeSync: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Font Sizing Preference */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">
                Default Font Scale
              </label>
              <div className="flex gap-2">
                {[
                  { id: "normal", label: "Normal (100%)" },
                  { id: "large", label: "Large (110%)" },
                  { id: "extra_large", label: "Extra Large (125%)" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, fontSizePreference: f.id as any })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      settings.fontSizePreference === f.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: ADMIN WELCOME SCREEN & REGISTRATION ANIMATIONS
        ========================================================================= */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Admin Login Animated Welcome Screen
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Full-screen animated overlay with Magic UI BlurFade when admin logs in
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableAdminWelcomeScreen}
                onChange={(e) =>
                  setSettings({ ...settings, enableAdminWelcomeScreen: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            {/* Title Template */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-purple-500" />
                <span>Welcome Headline Template (Use {"{name}"} or {"{school}"})</span>
              </label>
              <input
                type="text"
                value={settings.welcomeTitleTemplate}
                onChange={(e) =>
                  setSettings({ ...settings, welcomeTitleTemplate: e.target.value })
                }
                placeholder="e.g. Welcome, {name} 👋"
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-semibold"
              />
            </div>

            {/* Subtitle Template */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                Subtitle / Tagline Text
              </label>
              <input
                type="text"
                value={settings.welcomeSubtitleTemplate}
                onChange={(e) =>
                  setSettings({ ...settings, welcomeSubtitleTemplate: e.target.value })
                }
                placeholder="e.g. School Administrator Workspace"
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-medium"
              />
            </div>

            {/* Screen Duration Selector */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Duration Before Smooth Fade Out: {settings.welcomeScreenDuration}s</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[1.0, 1.5, 2.0, 2.5, 3.0].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSettings({ ...settings, welcomeScreenDuration: dur })}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      settings.welcomeScreenDuration === dur
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: REGISTRATION CELEBRATION & ONBOARDING
        ========================================================================= */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    New School Registration Confetti
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Dual side-cannons confetti celebration upon new registration
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRegistrationConfetti}
                  onChange={(e) =>
                    setSettings({ ...settings, enableRegistrationConfetti: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Confetti Cannon Duration: {settings.confettiDuration} seconds
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSettings({ ...settings, confettiDuration: s })}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        settings.confettiDuration === s
                          ? "bg-pink-600 text-white shadow-xs"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">First-Time Admin Onboarding Steps</p>
                  <p className="text-gray-500 text-[11px]">
                    Highlight quick-start setup cards for newly registered school administrators
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableFirstTimeOnboarding}
                  onChange={(e) =>
                    setSettings({ ...settings, enableFirstTimeOnboarding: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: INTERACTIVE VISUAL ANALYTICS CHARTS SUITE (@reui/c-chart suite)
      ========================================================================= */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  Interactive Visual Analytics Charts Suite
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  @reui/c-chart suite
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Modern responsive charts featuring admissions curves, multi-bar fee collections, capacity donut gauges, and live attendance pulses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
              <span>Enable Charts on Dashboards</span>
              <input
                type="checkbox"
                checked={settings.enableDashboardCharts ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, enableDashboardCharts: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Live Chart Tabs Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
          {[
            { id: "chart1", label: "c-chart-1: Area Growth", tag: "Admissions" },
            { id: "chart11", label: "c-chart-11: Dual Bar", tag: "Collections" },
            { id: "chart13", label: "c-chart-13: Radial Donut", tag: "Capacity" },
            { id: "chart17", label: "c-chart-17: Horizontal Bar", tag: "Distribution" },
            { id: "chart22", label: "c-chart-22: Revenue Stream", tag: "Finance" },
            { id: "chart25", label: "c-chart-25: Attendance Pulse", tag: "Live Pulse" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChartPreview(c.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeChartPreview === c.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              <span>{c.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                activeChartPreview === c.id
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>
                {c.tag}
              </span>
            </button>
          ))}
        </div>

        {/* Active Chart Live Preview Canvas */}
        <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800">
          {activeChartPreview === "chart1" && <Chart1AreaGradient />}
          {activeChartPreview === "chart11" && <Chart11DualBar />}
          {activeChartPreview === "chart13" && <Chart13RadialDonut />}
          {activeChartPreview === "chart17" && <Chart17HorizontalBar />}
          {activeChartPreview === "chart22" && <Chart22RevenueArea />}
          {activeChartPreview === "chart25" && <Chart25AttendancePulse />}
        </div>
      </div>

      {/* Bottom Save / Reset Action Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs sticky bottom-4 z-20">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Changes are synced in real-time to all connected devices</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save All Experience Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessibilityExperiencePanel;
