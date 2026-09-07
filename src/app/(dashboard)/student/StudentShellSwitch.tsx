"use client";

import React from "react";
import { usePortalUI } from "@/context/portal-ui-context";
import { ClassicStudentShell } from "@/components/portal-ui/shells/ClassicStudentShell";
import { NewStudentShell } from "@/components/portal-ui/shells/NewStudentShell";
import { LiquidGlassStudentShell } from "@/components/portal-ui/shells/LiquidGlassStudentShell";
import { PortalUIErrorBoundary } from "@/components/portal-ui/PortalUIErrorBoundary";

import { StudentComplaintPopup } from "@/components/student/StudentComplaintPopup";

export function StudentShellSwitch({ children }: { children: React.ReactNode }) {
  const { isNewUI, isLiquidGlassUI } = usePortalUI();

  return (
    <>
      <StudentComplaintPopup />
      {isLiquidGlassUI ? (
        <PortalUIErrorBoundary
          fallback={<ClassicStudentShell>{children}</ClassicStudentShell>}
          portalName="Student Portal (Liquid Glass)"
        >
          <LiquidGlassStudentShell>{children}</LiquidGlassStudentShell>
        </PortalUIErrorBoundary>
      ) : isNewUI ? (
        <PortalUIErrorBoundary
          fallback={<ClassicStudentShell>{children}</ClassicStudentShell>}
          portalName="Student Portal"
        >
          <NewStudentShell>{children}</NewStudentShell>
        </PortalUIErrorBoundary>
      ) : (
        <ClassicStudentShell>{children}</ClassicStudentShell>
      )}
    </>
  );
}
