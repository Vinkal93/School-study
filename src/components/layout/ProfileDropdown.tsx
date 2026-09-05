"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Building2,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { School } from "@/types";

interface ProfileDropdownProps {
  school?: School | null;
}

export function ProfileDropdown({ school }: ProfileDropdownProps) {
  const { profile, firebaseUser, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("Logged out successfully");
      setIsOpen(false);
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = profile?.name || firebaseUser?.displayName || "User";
  const displayEmail = profile?.email || firebaseUser?.email || "Signed in";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  const roleMeta = useMemo(() => {
    switch (profile?.role as string) {
      case "super_admin":
        return {
          label: "Super Admin",
          color: "bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800",
          settingsHref: "/super-admin/settings",
          billingHref: "/super-admin/billing",
          securityHref: "/super-admin/settings#security",
        };
      case "admin":
      case "school_admin" as any:
        return {
          label: "School Admin",
          color: "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          settingsHref: "/admin/settings",
          billingHref: "/admin/billing",
          securityHref: "/admin/settings",
        };
      case "teacher":
        return {
          label: "Teacher",
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          settingsHref: "/teacher/profile",
          billingHref: null,
          securityHref: "/teacher/profile",
        };
      case "student":
        return {
          label: "Student",
          color: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          settingsHref: "/student/profile",
          billingHref: null,
          securityHref: "/student/profile",
        };
      default:
        return {
          label: profile?.role ? String(profile.role) : "User",
          color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          settingsHref: "/settings",
          billingHref: null,
          securityHref: "/settings",
        };
    }
  }, [profile?.role]);

  const organizationName =
    school?.name ||
    (profile?.role === "super_admin" ? "School Study Platform" : "School Member");

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* ==========================================
          TRIGGER BUTTON
      ========================================== */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Profile Menu"
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 group cursor-pointer"
      >
        {/* Avatar Circle */}
        <div className="flex h-8 w-8 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs shadow-xs group-hover:ring-2 group-hover:ring-blue-400/40 transition-all">
          {userInitial}
        </div>

        {/* Text Details (desktop only) */}
        <div className="hidden lg:flex flex-col text-left leading-tight max-w-[140px]">
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {roleMeta.label}
          </span>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ==========================================
          DROPDOWN FLYOUT PANEL
      ========================================== */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-72 max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top User Card Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm shadow-sm">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {displayEmail}
                </p>
              </div>
            </div>

            {/* Badges Row: Role + Organization + Status */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${roleMeta.color}`}
              >
                {roleMeta.label}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Active
              </span>
            </div>

            {/* School / Org row */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate font-medium">{organizationName}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-1.5 space-y-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {/* Profile / Account Settings */}
            <Link
              href={roleMeta.settingsHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Account & Settings</span>
            </Link>

            {/* Billing / Subscription (For Super Admin and School Admins) */}
            {roleMeta.billingHref && (
              <Link
                href={roleMeta.billingHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="flex-1">Subscription & Billing</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                  Plan
                </span>
              </Link>
            )}

            {/* Security / PIN */}
            {roleMeta.securityHref && (
              <Link
                href={roleMeta.securityHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Lock className="h-4 w-4 text-amber-500" />
                <span>Security & Credentials</span>
              </Link>
            )}

            {/* Help / Support Link */}
            <Link
              href="/support"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Help & Documentation</span>
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="h-4 w-4" />
                <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
              </div>
              <span className="text-[10px] text-rose-400 font-mono">ESC</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
