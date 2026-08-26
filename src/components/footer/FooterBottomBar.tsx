"use client";

import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { BackToTop } from "./BackToTop";

export function FooterBottomBar() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-500">
      {/* Copyright */}
      <div className="flex items-center gap-1.5 text-center sm:text-left">
        <span>© {currentYear} School Study. All rights reserved.</span>
      </div>

      {/* Crafted Badge & Developer Credit */}
      <div className="flex flex-col items-center gap-1 text-center sm:items-center">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <span>Crafted for modern educational institutions</span>
          <Heart className="h-3 w-3 text-red-500/80 fill-red-500/80" />
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Developed by</span>
          <a
            href="https://www.google.com/search?q=Vinkal+Prajapati"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Search Vinkal Prajapati on Google"
            className="group inline-flex items-center gap-1 font-semibold text-slate-700 underline-offset-2 transition-all duration-200 hover:text-blue-600 hover:underline dark:text-slate-200 dark:hover:text-blue-400"
          >
            <span>Vinkal Prajapati</span>
            <Search className="h-2.5 w-2.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link
            href="/about-developer"
            className="font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
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
