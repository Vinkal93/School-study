"use client";

import React from "react";
import { StudentHeaderData, StudentNotificationData } from "./header/types";

interface StudentDashboardLayoutProps {
  student?: StudentHeaderData;
  notifications?: StudentNotificationData;
  tenantEnabledModules?: string[];
  children?: React.ReactNode;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
}

/**
 * Backward compatibility passthrough.
 * The authoritative frame, single header, and bottom navigation are now hosted
 * exclusively in `src/app/(dashboard)/student/layout.tsx` via `StudentShell`.
 */
export function StudentDashboardLayout({
  children,
}: StudentDashboardLayoutProps) {
  return <>{children}</>;
}
