"use client";

import { Heart } from "lucide-react";
import { BackToTop } from "./BackToTop";

export function FooterBottomBar() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-500">
      {/* Copyright */}
      <div className="flex items-center gap-1.5">
        <span>© {currentYear} School Study. All rights reserved.</span>
      </div>

      {/* Crafted Badge */}
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        <span>Crafted for modern educational institutions</span>
        <Heart className="h-3 w-3 text-red-500/80 fill-red-500/80" />
      </div>

      {/* Back To Top Button */}
      <div>
        <BackToTop />
      </div>
    </div>
  );
}
