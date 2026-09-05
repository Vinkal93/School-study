"use client";

import { useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { GlobalSearchModal } from "@/components/super-admin/GlobalSearchModal";
import { getSchoolById } from "@/lib/services/school.service";
import { VerifyBadge } from "@/components/common/VerifyBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import type { School } from "@/types";

export function Topbar() {
  const { profile } = useAuth();
  const { toggleMobileNav } = useMobileNav();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (profile?.schoolId) {
      getSchoolById(profile.schoolId).then((s) => {
        if (s) setSchool(s);
      }).catch(() => {});
    }
  }, [profile?.schoolId]);

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        if (profile?.role === "super_admin") {
          e.preventDefault();
          setSearchModalOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [profile?.role]);

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin Platform Control",
    school_admin: "School Admin Portal",
    teacher: "Teacher Portal",
    student: "Student Portal",
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={toggleMobileNav}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Open sidebar navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 hidden sm:block">
              {school?.name || (profile?.role ? roleLabelMap[profile.role] || "Dashboard" : "Dashboard")}
            </h2>
            {school?.verificationBadge && school.verificationBadge !== "none" && (
              <VerifyBadge type={school.verificationBadge as any} size="xs" />
            )}
          </div>
        </div>

        {/* Center: Global Search Bar for Super Admin */}
        {profile?.role === "super_admin" && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-1.5 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <span>Search School Study...</span>
              </div>
              <kbd className="font-mono text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-semibold text-gray-400">
                ⌘K / Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Search Icon for Super Admin */}
          {profile?.role === "super_admin" && (
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {/* Theme Mode Switcher */}
          <ThemeToggle />

          {/* Realtime Notification Bell with Live Indicator & Dropdown */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <div className="pl-1 sm:pl-2 border-l border-gray-200 dark:border-gray-800">
            <ProfileDropdown school={school} />
          </div>
        </div>
      </header>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
