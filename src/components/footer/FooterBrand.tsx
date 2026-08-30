"use client";

import Link from "next/link";
import { GraduationCap, Smartphone, ArrowRight } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { FooterSocials } from "./FooterSocials";

export function FooterBrand() {
  const { settings } = useSiteSettings();
  const footerConfig = settings.footer;
  const brandName = settings.header?.brandName || "School Study";
  const tagline = settings.header?.tagline || "SMART SCHOOL MANAGEMENT";

  if (!footerConfig.showBrand) return null;

  return (
    <div className="space-y-4">
      {/* Brand Logo & Name */}
      <Link href="/" className="group inline-flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-transform duration-200 group-hover:scale-105">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <span className="block text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {brandName}
          </span>
          <span className="block text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            {tagline}
          </span>
        </div>
      </Link>

      {/* Description */}
      {footerConfig.showDescription && (
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-normal max-w-sm">
          {footerConfig.description || "A simple, modern platform designed to help schools manage students, teachers, and everyday operations with ease."}
        </p>
      )}

      {/* App Download CTA Button */}
      <div>
        <Link
          href="/download"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow transition-all group"
        >
          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Download Mobile App (APK & PWA)</span>
          <ArrowRight className="h-3.5 w-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Social Links */}
      <div className="pt-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">Follow us on</span>
        <FooterSocials />
      </div>
    </div>
  );
}
