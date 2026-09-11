"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlurFade } from "@/components/magicui/blur-fade";
import { triggerConfettiSideCannons } from "@/components/magicui/confetti";
import { useAuth } from "@/hooks/use-auth";
import {
  getExperienceSettings,
  subscribeToExperienceSettings,
} from "@/lib/services/experienceControl.service";
import { ExperienceSettings, DEFAULT_EXPERIENCE_SETTINGS } from "@/types/experienceControl";
import { Sparkles, GraduationCap, ArrowRight } from "lucide-react";

interface AdminWelcomeOverlayProps {
  forcePreview?: boolean;
  onPreviewClose?: () => void;
}

export function AdminWelcomeOverlay({
  forcePreview = false,
  onPreviewClose,
}: AdminWelcomeOverlayProps) {
  const { profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState<ExperienceSettings>(DEFAULT_EXPERIENCE_SETTINGS);

  useEffect(() => {
    const unsub = subscribeToExperienceSettings((s) => setSettings(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (forcePreview) {
      setVisible(true);
      return;
    }

    // Only show for school admins or super admins
    if (!profile) return;
    const isTargetAdmin =
      profile.role === "school_admin" ||
      profile.role === "super_admin" ||
      (profile.role as string) === "admin";

    if (!isTargetAdmin) return;

    // Check if welcome screen is enabled in settings
    if (settings.enableAdminWelcomeScreen === false) return;

    // Check session storage to show once per login session
    const sessionKey = `admin_welcome_shown_${profile.uid || "session"}`;
    const alreadyShown = sessionStorage.getItem(sessionKey);
    const justRegistered = sessionStorage.getItem("just_registered_school");

    if (!alreadyShown || justRegistered) {
      setVisible(true);
      sessionStorage.setItem(sessionKey, "true");

      // Trigger celebratory side-cannons confetti if newly registered or enabled
      if (justRegistered || settings.enableRegistrationConfetti) {
        setTimeout(() => {
          triggerConfettiSideCannons({
            durationSeconds: settings.confettiDuration || 3,
          });
        }, 200);
        sessionStorage.removeItem("just_registered_school");
      }
    }
  }, [profile, settings, forcePreview]);

  // Auto-dismiss after configured duration
  useEffect(() => {
    if (!visible) return;

    const durationMs = Math.max(1000, (settings.welcomeScreenDuration || 2.0) * 1000);
    const timer = setTimeout(() => {
      handleDismiss();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, settings.welcomeScreenDuration]);

  const handleDismiss = () => {
    setVisible(false);
    if (onPreviewClose) onPreviewClose();
  };

  if (!visible) return null;

  const adminName = profile?.name || "Administrator";
  const schoolName = (profile as any)?.schoolName || "Your School";

  const rawTitle = settings.welcomeTitleTemplate || "Welcome, {name} 👋";
  const displayTitle = rawTitle.replace("{name}", adminName).replace("{school}", schoolName);

  const rawSub = settings.welcomeSubtitleTemplate || "{school} Workspace";
  const displaySub = rawSub.replace("{name}", adminName).replace("{school}", schoolName);

  return (
    <AnimatePresence>
      <motion.div
        key="admin-welcome-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(12px)", scale: 1.03 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl px-6 text-center select-none"
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        </div>

        {/* Center Animated Content with Magic UI BlurFade */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          {/* Badge */}
          <BlurFade delay={0.1} inView>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-sm">
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>School Administrator Workspace</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            </div>
          </BlurFade>

          {/* Big Center Headline (Magic UI BlurFade) */}
          {settings.showWelcomeBigText !== false && (
            <BlurFade delay={0.25} inView>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {displayTitle}
              </h1>
            </BlurFade>
          )}

          {/* Subheadline (Magic UI BlurFade) */}
          <BlurFade delay={0.4} inView>
            <p className="text-base sm:text-xl font-semibold text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
              {displaySub}
            </p>
          </BlurFade>

          {/* Progress loader bar */}
          <BlurFade delay={0.5} inView>
            <div className="pt-4 flex flex-col items-center gap-2">
              <div className="w-44 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: settings.welcomeScreenDuration || 2.0,
                    ease: "linear",
                  }}
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                />
              </div>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Opening your dashboard...
              </span>
            </div>
          </BlurFade>

          {/* Quick Skip button */}
          <div className="pt-2">
            <button
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all"
            >
              <span>Skip directly to dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AdminWelcomeOverlay;
