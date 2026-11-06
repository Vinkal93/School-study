"use client";

import React from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/**
 * Legacy alias maintained for backwards compatibility.
 * Reuses the single authoritative Notification Center 3.0 Bell.
 */
export function NotificationButton() {
  return <NotificationBell variant="student" />;
}
