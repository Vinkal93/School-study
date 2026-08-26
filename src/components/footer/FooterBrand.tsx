"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { FooterSocials } from "./FooterSocials";

export function FooterBrand() {
  return (
    <div className="space-y-4 lg:max-w-sm">
      {/* Brand Logo & Name */}
      <Link href="/" className="group inline-flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-transform duration-200 group-hover:scale-105">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            School Study
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Smart School Management
          </span>
        </div>
      </Link>

      {/* Description */}
      <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
        A simple, modern platform designed to help schools manage students, teachers, and everyday operations with ease.
      </p>

      {/* Social Links */}
      <div className="pt-2">
        <FooterSocials />
      </div>
    </div>
  );
}
