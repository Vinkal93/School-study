"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
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
  ChevronDown,
  Shield,
  Activity,
  BarChart3,
  Sliders,
  History,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SubNavItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  subItems?: SubNavItem[];
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
      label: "Inquiries",
      href: "/super-admin/inquiries",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      label: "Users",
      href: "/super-admin/users",
      icon: <Users className="h-5 w-5" />,
      subItems: [
        { label: "All Users", href: "/super-admin/users" },
        { label: "School Admins", href: "/super-admin/users?role=school_admin" },
        { label: "Teachers", href: "/super-admin/users?role=teacher" },
        { label: "Students", href: "/super-admin/users?role=student" },
      ],
    },
    {
      label: "Activity",
      href: "/super-admin/activity/logins",
      icon: <Activity className="h-5 w-5" />,
      subItems: [
        { label: "Login Activity", href: "/super-admin/activity/logins" },
        { label: "Audit Logs", href: "/super-admin/audit" },
      ],
    },
    {
      label: "Analytics",
      href: "/super-admin/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      label: "Settings",
      href: "/super-admin/settings",
      icon: <Settings className="h-5 w-5" />,
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
  const searchParams = useSearchParams();
  const currentFullUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  const { profile } = useAuth();
  const { isOpen, closeMobileNav } = useMobileNav();

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Users: true,
    Activity: true,
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

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
                SaaS Platform
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
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {currentNavItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isParentActive =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/teacher" &&
              item.href !== "/student" &&
              item.href !== "/super-admin" &&
              pathname.startsWith(item.href));

          const isExpanded = expandedSections[item.label] ?? false;

          if (hasSubItems && (!collapsed || isOpen)) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isParentActive
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 text-gray-400",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* Submenu Links */}
                {isExpanded && (
                  <div className="ml-8 space-y-1 border-l-2 border-gray-100 pl-2.5 dark:border-gray-800">
                    {item.subItems!.map((sub) => {
                      const isSubActive = currentFullUrl === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={closeMobileNav}
                          className={cn(
                            "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            isSubActive
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold"
                              : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileNav}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isParentActive
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
