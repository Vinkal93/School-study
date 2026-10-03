"use client";

import React from "react";
import { ModernLandingPage } from "./ModernLandingPage";
import { Droplets, Sparkles } from "lucide-react";

/**
 * LIQUID GLASS LANDING PAGE
 * 
 * Apple iOS/macOS inspired Liquid Glass presentation for the Landing Page:
 * - Dynamic Liquid Glass announcement banner
 * - Ambient iridescent mesh orbs floating in background
 * - Frosted glass containers and specular highlights
 * - Renders complete modern landing page components with liquid glass aesthetic
 */
export function LiquidGlassLandingPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-50/40 via-sky-50/30 to-purple-50/40 dark:from-[#070A12] dark:via-[#0A1020] dark:to-[#100B1E] overflow-x-hidden selection:bg-cyan-500 selection:text-white">
      {/* Iridescent Ambient Background Glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-tr from-cyan-400/20 via-sky-400/15 to-indigo-500/20 dark:from-cyan-500/10 dark:via-sky-500/8 dark:to-indigo-600/10 blur-[130px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-bl from-purple-400/20 via-pink-400/15 to-blue-500/20 dark:from-purple-600/10 dark:via-indigo-600/8 dark:to-blue-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Dynamic Liquid Glass Announcement Header Strip */}
      <div className="sticky top-0 z-50 w-full px-4 py-1.5 bg-gradient-to-r from-cyan-600/90 via-sky-600/90 to-indigo-600/90 backdrop-blur-xl text-white flex items-center justify-between text-xs font-bold shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-2 sm:px-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-200 animate-bounce" />
            <span>Liquid Glass Presentation Active</span>
            <span className="hidden sm:inline text-white/80 font-normal">
              • Next-generation Apple-inspired glassmorphism
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
              Live Preview
            </span>
          </div>
        </div>
      </div>

      {/* Main Modern Content */}
      <div className="relative">
        <ModernLandingPage />
      </div>
    </div>
  );
}
