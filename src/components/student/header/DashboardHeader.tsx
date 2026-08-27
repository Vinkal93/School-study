"use client";

import React from "react";
import { MenuButton } from "./MenuButton";
import { Greeting } from "./Greeting";
import { NotificationButton } from "./NotificationButton";
import { StudentAvatar } from "./StudentAvatar";
import { DashboardHeaderProps } from "./types";
import { useMobileNav } from "@/context/mobile-nav-context";

export function DashboardHeader({
  student,
  notifications,
  onMenuClick,
  onNotificationClick,
  onProfileClick,
}: DashboardHeaderProps) {
  const { toggleMobileNav } = useMobileNav();

  const handleMenu = () => {
    console.log("DashboardHeader: Menu clicked");
    if (onMenuClick) {
      onMenuClick();
    } else {
      toggleMobileNav();
    }
  };

  const handleNotification = () => {
    console.log("DashboardHeader: Notifications clicked");
    if (onNotificationClick) {
      onNotificationClick();
    }
  };

  return (
    <header className="w-full bg-transparent px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-900/40">
      {/* LEFT: Menu / Hamburger Icon */}
      <MenuButton onClick={handleMenu} />

      {/* CENTER: Dynamic Time Greeting & Student First Name */}
      <Greeting firstName={student.firstName} />

      {/* RIGHT: Notification Bell & Student Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <NotificationButton
          unreadCount={notifications.unreadCount}
          onClick={handleNotification}
        />
        <StudentAvatar
          fullName={student.fullName}
          photoUrl={student.photoUrl}
          onClick={onProfileClick}
        />
      </div>
    </header>
  );
}
