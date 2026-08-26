"use client";

import { useState, useEffect } from "react";
import { LogOut, User, Menu, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { GlobalSearchModal } from "@/components/super-admin/GlobalSearchModal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function Topbar() {
  const { profile, signOut } = useAuth();
  const { toggleMobileNav } = useMobileNav();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const router = useRouter();

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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

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

          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:block">
            {profile?.role ? roleLabelMap[profile.role] || "Dashboard" : "Dashboard"}
          </h2>
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

          {/* User Info */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {profile?.name ? profile.name.charAt(0) : <User className="h-4 w-4" />}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {profile?.name || "User"}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {profile?.email || ""}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
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
