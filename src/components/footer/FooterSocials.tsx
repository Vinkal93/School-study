"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";

export function FooterSocials() {
  const { settings } = useSiteSettings();
  const socials = (settings.socials || [])
    .filter((s) => s.enabled)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (!settings.footer?.showSocial || socials.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5">
      {socials.map((social) => {
        const initial =
          social.platform.toLowerCase() === "x" || social.platform.toLowerCase() === "twitter"
            ? "X"
            : social.platform.toLowerCase().includes("linkedin")
            ? "in"
            : social.platform.toLowerCase().includes("youtube")
            ? "yt"
            : social.platform.toLowerCase().includes("github")
            ? "gh"
            : social.platform.toLowerCase().includes("instagram")
            ? "ig"
            : "fb";

        return (
          <a
            key={social.platform + social.url}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label || social.platform}
            title={social.label || social.platform}
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:text-blue-400 dark:focus-visible:ring-offset-slate-950"
          >
            <span className="font-mono text-xs uppercase tracking-tight">
              {initial}
            </span>
          </a>
        );
      })}
    </div>
  );
}
