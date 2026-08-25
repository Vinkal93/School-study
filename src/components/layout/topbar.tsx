"use client";

import { LogOut, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function Topbar() {
  const { profile, signOut } = useAuth();
  const { toggleMobileNav } = useMobileNav();
  const router = useRouter();

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
    super_admin: "Super Admin",
    school_admin: "School Admin",
    teacher: "Teacher",
    student: "Student",
  };

  return (
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

        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {profile?.role ? roleLabelMap[profile.role] || "Dashboard" : "Dashboard"}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Mode Switcher */}
        <ThemeToggle />

        {/* User Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {profile?.name ? profile.name.charAt(0) : <User className="h-4 w-4" />}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {profile?.name || "User"}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {profile?.role ? roleLabelMap[profile.role] : "..."}
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
  );
}
