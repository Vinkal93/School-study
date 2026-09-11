"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePortalUI } from "@/context/portal-ui-context";
import type { PortalUIVersion } from "@/types/portal-ui";

// High-performance code-splitting: Only download the currently active landing page variant
const ModernLandingPage = dynamic(
  () => import("./ModernLandingPage").then((mod) => mod.ModernLandingPage),
  { ssr: true }
);

const ClassicLandingPage = dynamic(
  () => import("./ClassicLandingPage").then((mod) => mod.ClassicLandingPage),
  { ssr: true }
);

const LiquidGlassLandingPage = dynamic(
  () => import("./LiquidGlassLandingPage").then((mod) => mod.LiquidGlassLandingPage),
  { ssr: true }
);

export interface LandingPageSwitchProps {
  initialVersion?: PortalUIVersion;
}

export function LandingPageSwitch({ initialVersion }: LandingPageSwitchProps) {
  const { settings, loading } = usePortalUI();

  // Instant zero-flicker resolution:
  // 1. If live settings loaded from Firestore or localStorage, use settings.landingPage
  // 2. Otherwise fallback to SSR initialVersion (from cookie / server config)
  // 3. Default to "new" (Modern UI 2.0)
  const activeVersion: PortalUIVersion = !loading
    ? settings.landingPage
    : initialVersion || settings.landingPage || "new";

  if (activeVersion === "liquid_glass") {
    return <LiquidGlassLandingPage />;
  }

  if (activeVersion === "classic") {
    return <ClassicLandingPage />;
  }

  return <ModernLandingPage />;
}
