"use client";

import { FOOTER_SOCIALS } from "./footerData";

export function FooterSocials() {
  return (
    <div className="flex items-center gap-2.5">
      {FOOTER_SOCIALS.map((social) => {
        return (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.ariaLabel}
            title={social.name}
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:text-blue-400 dark:focus-visible:ring-offset-slate-950"
          >
            {/* Minimal Brand Identifier */}
            <span className="font-mono text-xs uppercase tracking-tight">
              {social.name.startsWith("X")
                ? "X"
                : social.name.startsWith("LinkedIn")
                ? "in"
                : social.name.startsWith("YouTube")
                ? "yt"
                : "fb"}
            </span>
          </a>
        );
      })}
    </div>
  );
}
