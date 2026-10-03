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

import { FeatureShowcaseBanner } from "@/components/showcase/FeatureShowcaseBanner";

export interface LandingPageSwitchProps {
  initialVersion?: PortalUIVersion;
}

export function LandingPageSwitch({ initialVersion }: LandingPageSwitchProps) {
  const { settings, loading } = usePortalUI();
  const [queryVersion, setQueryVersion] = React.useState<PortalUIVersion | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("theme") || params.get("version") || params.get("ui");
      if (v === "liquid_glass" || v === "classic" || v === "new") {
        setQueryVersion(v as PortalUIVersion);
      }
    }
  }, []);

  // Instant zero-flicker resolution:
  // 1. URL preview parameter (?theme=liquid_glass)
  // 2. Live Super Admin settings (settings.landingPage)
  // 3. Fallback to SSR initialVersion
  const activeVersion: PortalUIVersion = queryVersion || (!loading
    ? settings.landingPage
    : initialVersion || settings.landingPage || "new");

  return (
    <>
      <FeatureShowcaseBanner />
      {activeVersion === "liquid_glass" ? (
        <LiquidGlassLandingPage />
      ) : activeVersion === "classic" ? (
        <ClassicLandingPage />
      ) : (
        <ModernLandingPage />
      )}
    </>
  );
}
