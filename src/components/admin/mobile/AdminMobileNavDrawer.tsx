"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  School as SchoolIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/context/theme-context";

interface AdminMobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

export function AdminMobileNavDrawer({
  isOpen,
  onClose,
  schoolName = "School Study",
}: AdminMobileNavDrawerProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!isOpen) return null;

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Teachers", href: "/admin/teachers", icon: Users },
    { label: "Classes & Sections", href: "/admin/classes", icon: BookOpen },
    { label: "Attendance", href: "/admin/attendance", icon: ClipboardCheck },
    { label: "Fees", href: "/admin/fees", icon: CreditCard },
    { label: "Reports & Exports", href: "/admin/reports", icon: FileText },
    { label: "Notices", href: "/admin/notices", icon: Bell },
  ];

  const adminName = profile?.name || "Administrator";
  const userInitial = adminName.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0F172A] text-slate-100 shadow-2xl animate-in slide-in-from-left duration-250 ease-out">
        {/* Header with Close */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <SchoolIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white truncate max-w-[160px]">
                {schoolName}
              </h2>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                Admin Portal
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Navigation"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md ring-2 ring-blue-400/30">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{adminName}</p>
              <p className="text-[11px] text-slate-400 truncate capitalize">
                {profile?.role === "super_admin" ? "Super Administrator" : "School Administrator"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 pb-1">
            <div className="border-t border-slate-800 my-2" />
          </div>

          <Link
            href="/admin/settings"
            onClick={onClose}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
              pathname.startsWith("/admin/settings")
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Settings</span>
          </Link>

          <Link
            href="/support"
            onClick={onClose}
            className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all"
          >
            <HelpCircle className="h-4 w-4 text-slate-400" />
            <span>Help & Support</span>
          </Link>
        </nav>

        {/* Footer: Dark Mode & Version */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-blue-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
              <span>Dark Mode</span>
            </div>
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                theme === "dark" ? "bg-blue-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="text-center text-[10px] text-slate-500 font-mono">
            School Study Enterprise v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
