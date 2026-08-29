"use client";

import React from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { BackToTop } from "./BackToTop";

import { useSiteSettings } from "@/context/SiteSettingsContext";

export function FooterBottomBar() {
  const { settings } = useSiteSettings();
  const currentYear = new Date().getFullYear();

  const footerConfig = settings.footer;
  const copyrightTemplate = footerConfig?.copyrightText || "© {YEAR} School Study. All rights reserved.";
  const renderedCopyright = copyrightTemplate.replace(/\{YEAR\}/gi, currentYear.toString());

  const legalLinks = (settings.legal || [])
    .filter((l) => l.enabled)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs text-slate-700 sm:flex-row dark:border-slate-800/80 dark:text-slate-300">
      {/* Copyright */}
      <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left font-medium">
        {footerConfig?.showCopyright !== false && (
          <span>{renderedCopyright}</span>
        )}

        {footerConfig?.showLegal !== false && legalLinks.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {legalLinks.map((l, idx) => (
              <React.Fragment key={l.id || l.label}>
                {idx > 0 && <span>•</span>}
                <Link href={l.url} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {l.label}
                </Link>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Crafted Badge & Developer Credit */}
      <div className="flex flex-col items-center gap-1 text-center sm:items-center">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
          <span>Crafted for modern educational institutions</span>
          <Heart className="h-3 w-3 text-red-500/90 fill-red-500/90" />
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300">
          <span>Developed by</span>
          <a
            href={footerConfig?.developerUrl || "https://vinkal.sbci.online"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${footerConfig?.developerName || "Vinkal Prajapati"} website`}
            className="group inline-flex items-center gap-1 font-bold text-slate-900 underline-offset-2 transition-all duration-200 hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
          >
            <span>{footerConfig?.developerName || "Vinkal Prajapati"}</span>
          </a>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <Link
            href="/about-developer"
            className="font-semibold text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
          >
            About
          </Link>
        </div>
      </div>

      {/* Back To Top Button */}
      <div>
        <BackToTop />
      </div>
    </div>
  );
}
