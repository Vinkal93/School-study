"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNav } from "@/context/mobile-nav-context";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  ClipboardCheck,
  Bell,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleNavItems: Record<string, NavItem[]> = {
  super_admin: [
    {
      label: "Dashboard",
      href: "/super-admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "Schools",
      href: "/super-admin/schools",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      label: "Users",
      href: "/super-admin/users",
      icon: <Users className="h-5 w-5" />,
    },
  ],
  school_admin: [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "Teachers",
      href: "/admin/teachers",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Students",
      href: "/admin/students",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: "Classes",
      href: "/admin/classes",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "Attendance",
      href: "/admin/attendance",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Notices",
      href: "/admin/notices",
      icon: <Bell className="h-5 w-5" />,
    },
  ],
  teacher: [
    {
      label: "Dashboard",
      href: "/teacher",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "My Classes",
      href: "/teacher/classes",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "My Students",
      href: "/teacher/students",
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      label: "Attendance",
      href: "/teacher/attendance",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Notices",
      href: "/teacher/notices",
      icon: <Bell className="h-5 w-5" />,
    },
  ],
  student: [
    {
      label: "Dashboard",
      href: "/student",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "My Profile",
      href: "/student/profile",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "My Attendance",
      href: "/student/attendance",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      label: "Notices",
      href: "/student/notices",
      icon: <Bell className="h-5 w-5" />,
    },
  ],
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { profile } = useAuth();
  const { isOpen, closeMobileNav } = useMobileNav();

  const currentNavItems = profile?.role ? roleNavItems[profile.role] || [] : [];

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          {(!collapsed || isOpen) && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                SchoolStudy
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                SaaS Portal
              </span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={closeMobileNav}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {currentNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/teacher" &&
              item.href !== "/student" &&
              item.href !== "/super-admin" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileNav}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              )}
            >
              {item.icon}
              {(!collapsed || isOpen) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Role Badge Footer */}
      {(!collapsed || isOpen) && profile && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900 text-xs">
            <span className="font-semibold text-gray-900 dark:text-white capitalize">
              {profile.role.replace("_", " ")}
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {profile.email}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-950",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {navContent}
      </aside>

      {/* 2. Mobile Slide-out Drawer & Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={closeMobileNav}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-950 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
