"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { GlobalSearchModal } from "@/components/super-admin/GlobalSearchModal";
import { getSchoolById } from "@/lib/services/school.service";
import { VerifyBadge } from "@/components/common/VerifyBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ProfileDropdown } from "@/components/layout/ProfileDropdown";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import type { School } from "@/types";
import { cn } from "@/lib/utils/cn";

export interface TopbarProps {
  variant?: "classic" | "modern" | "liquid";
}

export function Topbar({ variant = "classic" }: TopbarProps) {
  const { profile } = useAuth();
  const { toggleMobileNav } = useMobileNav();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [activePlanName, setActivePlanName] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!profile?.schoolId) return;

    // Initial fetch
    getSchoolById(profile.schoolId)
      .then((s) => {
        if (s) {
          setSchool(s);
          if (s.planName) setActivePlanName(s.planName);
        }
      })
      .catch(() => {});

    // Real-time Firestore listeners
    const db = getFirebaseDb();
    if (!db) return;

    const unsubs: (() => void)[] = [];

    try {
      const schoolRef = doc(db, "schools", profile.schoolId);
      const unsubSchool = onSnapshot(
        schoolRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const s = { id: snap.id, ...data } as School;
            setSchool(s);
            if (s.planName) {
              setActivePlanName(s.planName);
            } else if (s.planId || (s as any).plan) {
              const pid = String(s.planId || (s as any).plan).toLowerCase();
              if (pid.includes("base")) setActivePlanName("Base");
              else if (pid.includes("growth")) setActivePlanName("Growth Plan");
              else if (pid.includes("pro")) setActivePlanName("Professional Plan");
              else if (pid.includes("enterprise")) setActivePlanName("Enterprise Plan");
              else if (pid.includes("free")) setActivePlanName("Free Plan");
              else setActivePlanName("Starter Plan");
            }
          }
        },
        () => {}
      );
      unsubs.push(unsubSchool);

      const subRef = doc(db, "schoolSubscriptions", profile.schoolId);
      const unsubSub = onSnapshot(
        subRef,
        (snap) => {
          if (snap.exists()) {
            const subData = snap.data();
            if (subData.planName) {
              setActivePlanName(subData.planName);
            } else if (subData.planId) {
              const pid = String(subData.planId).toLowerCase();
              if (pid.includes("base")) setActivePlanName("Base");
              else if (pid.includes("growth")) setActivePlanName("Growth Plan");
              else if (pid.includes("pro")) setActivePlanName("Professional Plan");
              else if (pid.includes("enterprise")) setActivePlanName("Enterprise Plan");
              else if (pid.includes("free")) setActivePlanName("Free Plan");
              else setActivePlanName("Starter Plan");
            }
          }
        },
        () => {}
      );
      unsubs.push(unsubSub);
    } catch {}

    return () => {
      unsubs.forEach((fn) => fn());
    };
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

  const handleCopySchoolId = () => {
    const idToCopy = school?.id || profile?.schoolId;
    if (!idToCopy) return;

    navigator.clipboard
      .writeText(idToCopy)
      .then(() => {
        setCopiedId(true);
        toast.success("School ID copied to clipboard!", {
          description: idToCopy,
        });
        setTimeout(() => setCopiedId(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy School ID");
      });
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin Platform Control",
    school_admin: "School Admin Portal",
    teacher: "Teacher Portal",
    student: "Student Portal",
  };

  const isSuperAdmin = profile?.role === "super_admin";
  const isSchoolPortal = profile?.schoolId || school;

  return (
    <>
      <header
        className={cn(
          "flex h-15 sm:h-16 items-center justify-between px-3.5 sm:px-6 transition-colors",
          variant === "liquid"
            ? "bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-b border-white/40 dark:border-white/10"
            : variant === "modern"
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80"
            : "border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
        )}
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={toggleMobileNav}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
            aria-label="Open sidebar navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* School Details or Portal Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[260px]">
              {school?.name || (profile?.role ? roleLabelMap[profile.role] || "Dashboard" : "Dashboard")}
            </h2>

            {school?.verificationBadge && school.verificationBadge !== "none" && (
              <VerifyBadge type={school.verificationBadge as any} size="xs" />
            )}

            {/* School Code Chip */}
            {isSchoolPortal && school?.code && (
              <span
                title={`School Code: ${school.code}`}
                className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/80 text-[11px] font-bold text-blue-700 dark:text-blue-300 shadow-2xs"
              >
                <span className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                  CODE
                </span>
                <span>{school.code}</span>
              </span>
            )}

            {/* School ID Badge with Instant 1-Click Copy */}
            {isSchoolPortal && (school?.id || profile?.schoolId) && (
              <button
                type="button"
                onClick={handleCopySchoolId}
                title="Click to copy School ID"
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors group cursor-pointer"
              >
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
                  ID
                </span>
                <span className="font-mono text-[10px] truncate max-w-[70px] sm:max-w-[100px]">
                  {school?.id || profile?.schoolId}
                </span>
                {copiedId ? (
                  <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar for Super Admin */}
        {isSuperAdmin && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-1.5 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <span>Search phone, ID, name, email...</span>
              </div>
              <kbd className="font-mono text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-semibold text-gray-400">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Right Action Icons & Badges */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Active Plan Badge for School Admin */}
          {profile?.role === "school_admin" && (
            <Link
              href="/admin/billing"
              title="Manage School Plan & Subscription"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/80 dark:border-blue-800/80 text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-700 transition-all hover:scale-105 shadow-2xs"
            >
              <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
              <span className="truncate max-w-[110px]">
                {activePlanName || school?.planName || "Standard Plan"}
              </span>
            </Link>
          )}

          {/* Mobile Search Icon for Super Admin */}
          {isSuperAdmin && (
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
