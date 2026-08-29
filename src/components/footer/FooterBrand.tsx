"use client";

import Link from "next/link";
import { GraduationCap, Smartphone, ArrowRight } from "lucide-react";
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
      <p className="text-xs leading-relaxed text-slate-700 sm:text-sm dark:text-slate-300 font-medium">
        A simple, modern platform designed to help schools manage students, teachers, and everyday operations with ease.
      </p>

      {/* App Download CTA Button */}
      <div>
        <Link
          href="/download"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-xs group"
        >
          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Download Mobile App (APK & PWA)</span>
          <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Social Links */}
      <div className="pt-1">
        <FooterSocials />
      </div>
    </div>
  );
}
