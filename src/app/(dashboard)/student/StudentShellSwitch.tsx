"use client";

import React from "react";
import { usePortalUI } from "@/context/portal-ui-context";
import { ClassicStudentShell } from "@/components/portal-ui/shells/ClassicStudentShell";
import { NewStudentShell } from "@/components/portal-ui/shells/NewStudentShell";
import { LiquidGlassStudentShell } from "@/components/portal-ui/shells/LiquidGlassStudentShell";
import { PortalUIErrorBoundary } from "@/components/portal-ui/PortalUIErrorBoundary";

export function StudentShellSwitch({ children }: { children: React.ReactNode }) {
  const { isNewUI, isLiquidGlassUI } = usePortalUI();

  if (isLiquidGlassUI) {
    return (
      <PortalUIErrorBoundary
        fallback={<ClassicStudentShell>{children}</ClassicStudentShell>}
        portalName="Student Portal (Liquid Glass)"
      >
        <LiquidGlassStudentShell>{children}</LiquidGlassStudentShell>
      </PortalUIErrorBoundary>
    );
  }

  if (isNewUI) {
    return (
      <PortalUIErrorBoundary
        fallback={<ClassicStudentShell>{children}</ClassicStudentShell>}
        portalName="Student Portal"
      >
        <NewStudentShell>{children}</NewStudentShell>
      </PortalUIErrorBoundary>
    );
  }

  return <ClassicStudentShell>{children}</ClassicStudentShell>;
}
