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
} from "lucide-react";
import { toast } from "sonner";
import {
  getExperienceSettings,
  saveExperienceSettings,
} from "@/lib/services/experienceControl.service";
import { ExperienceSettings, DEFAULT_EXPERIENCE_SETTINGS } from "@/types/experienceControl";
import { triggerConfettiSideCannons } from "@/components/magicui/confetti";
import { AdminWelcomeOverlay } from "@/components/common/AdminWelcomeOverlay";

export function AccessibilityExperiencePanel() {
  const [settings, setSettings] = useState<ExperienceSettings>(DEFAULT_EXPERIENCE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      toast.success("Accessibility & Experience settings updated successfully!");
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
    <div className="space-y-6">
      {/* Live Preview Modal */}
      {showPreview && (
        <AdminWelcomeOverlay forcePreview={true} onPreviewClose={() => setShowPreview(false)} />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UI / UX & Accessibility Control</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Admin Welcome & Registration Experience
          </h2>
          <p className="text-sm text-blue-100 font-medium">
            Control the full-screen animated welcome screen for School Admins upon login, side-cannons confetti animations for new registrations, and interactive onboarding tours.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-white/20 shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Welcome Screen</span>
          </button>
          <button
            onClick={handleTestConfetti}
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <PartyPopper className="w-4 h-4 text-pink-500" />
            <span>Test Side Cannons</span>
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Admin Welcome Screen Control */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
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

            {/* Enable/Disable Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableAdminWelcomeScreen}
                onChange={(e) =>
                  setSettings({ ...settings, enableAdminWelcomeScreen: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="space-y-4 text-xs">
            {/* Show Big Text Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">Show Big Center Headline</p>
                <p className="text-gray-500 text-[11px]">
                  Display large text greeting in the center of the screen
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.showWelcomeBigText}
                onChange={(e) =>
                  setSettings({ ...settings, showWelcomeBigText: e.target.checked })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {/* Screen Duration Selector */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Screen Duration Before Smooth Fade Out: {settings.welcomeScreenDuration}s</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[1.0, 1.5, 2.0, 2.5, 3.0].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setSettings({ ...settings, welcomeScreenDuration: dur })}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      settings.welcomeScreenDuration === dur
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>

            {/* Title Template */}
            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-500" />
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
          </div>
        </div>

        {/* Section 2: Registration Confetti & First-time Onboarding */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-5 shadow-sm flex flex-col justify-between">
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
                    Dual side-cannons confetti celebration when a new school registers
                  </p>
                </div>
              </div>

              {/* Confetti Toggle */}
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
              {/* Confetti Duration Selector */}
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
                          ? "bg-pink-600 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Onboarding Guide Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200">First-Time Admin Onboarding</p>
                  <p className="text-gray-500 text-[11px]">
                    Highlight quick-start setup cards for newly registered school admins
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

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccessibilityExperiencePanel;
