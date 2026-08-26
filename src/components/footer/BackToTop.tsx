"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      type="button"
      aria-label="Scroll back to top of the page"
      className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-blue-500/50 dark:hover:bg-slate-800/80 dark:hover:text-blue-400 dark:focus-visible:ring-offset-slate-950"
    >
      <span>Back to top</span>
      <ArrowUp className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
