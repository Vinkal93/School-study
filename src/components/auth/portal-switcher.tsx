"use client";

import Link from "next/link";
import { Shield, Users, GraduationCap } from "lucide-react";

interface PortalSwitcherProps {
  currentPortal: "staff" | "student" | "super_admin";
}

export function PortalSwitcher({ currentPortal }: PortalSwitcherProps) {
  const portals = [
    {
      id: "staff",
      label: "Staff & Admin",
      href: "/login",
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: "student",
      label: "Student Portal",
      href: "/student-login",
      icon: <GraduationCap className="h-3.5 w-3.5" />,
    },
    {
      id: "super_admin",
      label: "Super Admin",
      href: "/super-admin-login",
      icon: <Shield className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="flex items-center justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 text-xs font-semibold">
      {portals.map((p) => {
        const isActive = currentPortal === p.id;
        return (
          <Link
            key={p.id}
            href={p.href}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition-all ${
              isActive
                ? "bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400 font-bold"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {p.icon}
            <span className="hidden sm:inline">{p.label}</span>
            <span className="sm:hidden">{p.id === "super_admin" ? "Super" : p.id === "student" ? "Student" : "Staff"}</span>
          </Link>
        );
      })}
    </div>
  );
}
