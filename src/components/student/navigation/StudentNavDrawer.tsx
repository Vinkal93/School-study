"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import { useTheme } from "@/context/theme-context";
import {
  X,
  Home,
  BookOpen,
  Calendar,
  Users,
  ClipboardList,
  GraduationCap,
  BookMarked,
  Wallet,
  Bell,
  Sparkles,
  Clock,
  User,
  Settings,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export function StudentNavDrawer() {
  const { isOpen, closeMobileNav } = useMobileNav();
  const { profile, firebaseUser, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  let theme = "light";
  let setTheme: (t: "light" | "dark") => void = () => {};
  try {
    const themeCtx = useTheme();
    theme = themeCtx.theme;
    setTheme = themeCtx.setTheme;
  } catch {
    // Graceful fallback
  }

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeMobileNav();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMobileNav]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const studentName = profile?.name || firebaseUser?.displayName || "Student";
  const studentEmail = profile?.email || firebaseUser?.email || "";
  const className = (profile as any)?.className || (profile as any)?.class || "";
  const sectionName = (profile as any)?.sectionName || (profile as any)?.section || "";
  const photoUrl =
    (profile as any)?.photoURL ||
    (profile as any)?.avatarUrl ||
    firebaseUser?.photoURL ||
    undefined;

  const handleLogout = async () => {
    try {
      closeMobileNav();
      await signOut();
      toast.success("Logged out successfully");
      router.push("/student/login");
    } catch (err: any) {
      toast.error(err?.message || "Failed to log out");
    }
  };

  const academicLinks: NavLinkItem[] = [
    { label: "Home Dashboard", href: "/student", icon: Home },
    { label: "Study & Materials", href: "/student/study", icon: BookOpen },
    { label: "Attendance Ledger", href: "/student/attendance", icon: Users },
    { label: "Homework & Tasks", href: "/student/homework", icon: ClipboardList },
    { label: "Daily Timetable", href: "/student/timetable", icon: Calendar },
    { label: "Examinations & Marks", href: "/student/exams", icon: GraduationCap },
    { label: "Digital Library", href: "/student/library", icon: BookMarked },
  ];

  const schoolLinks: NavLinkItem[] = [
    { label: "Fees & Receipts", href: "/student/fees", icon: Wallet },
    { label: "Notices & Circulars", href: "/student/notices", icon: Bell },
    { label: "School Events", href: "/student/events", icon: Sparkles },
    { label: "Leave Application", href: "/student/leave", icon: Clock },
  ];

  const accountLinks: NavLinkItem[] = [
    { label: "My Student Profile", href: "/student/profile", icon: User },
    { label: "App & Account Settings", href: "/student/settings", icon: Settings },
    { label: "Help & Support", href: "/student/help", icon: LifeBuoy },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn">
      {/* 1. Backdrop overlay with fluid blur */}
      <div
        onClick={closeMobileNav}
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* 2. Slide-over Sheet (iPhone glass card) */}
      <div className="relative w-[85%] max-w-sm sm:max-w-md h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/90 shadow-2xl flex flex-col z-10 animate-slideInLeft overflow-hidden">
        
        {/* Top Header & Student Card */}
        <div className="p-4 sm:p-5 border-b border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-indigo-50/60 via-blue-50/40 to-transparent dark:from-indigo-950/40 dark:via-slate-950 dark:to-transparent">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Student Portal
              </span>
            </div>
            <button
              type="button"
              onClick={closeMobileNav}
              aria-label="Close navigation drawer"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all active:scale-90"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Student Profile Info */}
          <Link
            href="/student/profile"
            onClick={closeMobileNav}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group shadow-xs"
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={studentName}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                studentName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {studentName}
                </h3>
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              </div>
              {studentEmail && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {studentEmail}
                </p>
              )}
              {(className || sectionName) && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                  Class {className} {sectionName ? `• Sec ${sectionName}` : ""}
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 focus:outline-none">
          {/* Group 1: Academics */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Academics & Learning
            </p>
            <div className="space-y-0.5 pt-1">
              {academicLinks.map((link) => {
                const isActive =
                  link.href === "/student"
                    ? pathname === "/student" || pathname === "/student/"
                    : pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileNav}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 2: School & Fees */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              School & Records
            </p>
            <div className="space-y-0.5 pt-1">
              {schoolLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileNav}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 3: Account */}
          <div className="space-y-1">
            <p className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Settings & Help
            </p>
            <div className="space-y-0.5 pt-1">
              {accountLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileNav}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{link.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Drawer Actions: Theme Toggle & Logout */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Dark / Light Mode Switcher */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 pl-1">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>Theme</span>
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-all ${
                  theme === "light"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-all ${
                  theme === "dark"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-extrabold text-xs transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of Student Account</span>
          </button>
        </div>

      </div>
    </div>
  );
}
