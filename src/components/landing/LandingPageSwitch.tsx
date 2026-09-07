"use client";

import React from "react";
import { usePortalUI } from "@/context/portal-ui-context";
import { ClassicLandingPage } from "./ClassicLandingPage";
import { ModernLandingPage } from "./ModernLandingPage";
import { LiquidGlassLandingPage } from "./LiquidGlassLandingPage";

export function LandingPageSwitch() {
  const { settings, loading } = usePortalUI();

  // If liquid glass UI is selected for landing page, render Liquid Glass Landing Page
  if (!loading && settings.landingPage === "liquid_glass") {
    return <LiquidGlassLandingPage />;
  }

  // If new UI is selected for landing page, render Modern Landing Page
  if (!loading && settings.landingPage === "new") {
    return <ModernLandingPage />;
  }

  // Otherwise default to Classic Landing Page
  return <ClassicLandingPage />;
}
