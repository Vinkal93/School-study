"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  GraduationCap,
  Plus,
  FileText,
  Menu,
} from "lucide-react";

interface AdminMobileBottomNavProps {
  onOpenDrawer: () => void;
  onOpenAddStudent: () => void;
}

export function AdminMobileBottomNav({
  onOpenDrawer,
  onOpenAddStudent,
}: AdminMobileBottomNavProps) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/admin";
  const isStudentsActive = pathname.startsWith("/admin/students");
  const isReportsActive = pathname.startsWith("/admin/reports");

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-4 py-2 safe-area-bottom shadow-lg">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Home */}
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isHomeActive
              ? "text-blue-600 dark:text-blue-400 font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Home className={`h-5 w-5 ${isHomeActive ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] mt-1 font-semibold">Home</span>
        </Link>

        {/* Students */}
        <Link
          href="/admin/students"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isStudentsActive
              ? "text-blue-600 dark:text-blue-400 font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <GraduationCap className={`h-5 w-5 ${isStudentsActive ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] mt-1 font-semibold">Students</span>
        </Link>

        {/* Center Floating Action Button (+) */}
        <button
          onClick={onOpenAddStudent}
          aria-label="Add New Student"
          className="relative -top-3 h-12 w-12 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white dark:ring-slate-900"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        {/* Reports */}
        <Link
          href="/admin/reports"
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            isReportsActive
              ? "text-blue-600 dark:text-blue-400 font-extrabold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className={`h-5 w-5 ${isReportsActive ? "stroke-[2.5]" : "stroke-2"}`} />
          <span className="text-[10px] mt-1 font-semibold">Reports</span>
        </Link>

        {/* More / Menu */}
        <button
          onClick={onOpenDrawer}
          aria-label="Open Menu Drawer"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
        >
          <Menu className="h-5 w-5 stroke-2" />
          <span className="text-[10px] mt-1 font-semibold">More</span>
        </button>
      </div>
    </div>
  );
}
