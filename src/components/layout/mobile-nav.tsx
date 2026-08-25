"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  Bell,
  Users,
  Building2,
  BookOpen,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const mobileRoleNavItems: Record<string, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", href: "/super-admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Schools", href: "/super-admin/schools", icon: <Building2 className="h-5 w-5" /> },
    { label: "Users", href: "/super-admin/users", icon: <Users className="h-5 w-5" /> },
  ],
  school_admin: [
    { label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Teachers", href: "/admin/teachers", icon: <Users className="h-5 w-5" /> },
    { label: "Students", href: "/admin/students", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Attendance", href: "/admin/attendance", icon: <ClipboardCheck className="h-5 w-5" /> },
    { label: "Notices", href: "/admin/notices", icon: <Bell className="h-5 w-5" /> },
  ],
  teacher: [
    { label: "Home", href: "/teacher", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Students", href: "/teacher/students", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Attendance", href: "/teacher/attendance", icon: <ClipboardCheck className="h-5 w-5" /> },
    { label: "Classes", href: "/teacher/classes", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Notices", href: "/teacher/notices", icon: <Bell className="h-5 w-5" /> },
  ],
  student: [
    { label: "Home", href: "/student", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/student/profile", icon: <Users className="h-5 w-5" /> },
    { label: "Attendance", href: "/student/attendance", icon: <ClipboardCheck className="h-5 w-5" /> },
    { label: "Notices", href: "/student/notices", icon: <Bell className="h-5 w-5" /> },
  ],
};

export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const items = profile?.role ? mobileRoleNavItems[profile.role] || [] : [];
  if (items.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-gray-200 bg-white/95 px-2 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95 shadow-lg">
      {items.map((item) => {
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <div className={`p-1 rounded-md ${isActive ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}>
              {item.icon}
            </div>
            <span className="mt-0.5 truncate max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
