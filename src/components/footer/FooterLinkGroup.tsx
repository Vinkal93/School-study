"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FooterColumn } from "@/lib/cms/siteSettings";

interface FooterLinkGroupProps {
  column: FooterColumn;
}

export function FooterLinkGroup({ column }: FooterLinkGroupProps) {
  const activeLinks = (column.links || [])
    .filter((l) => l.enabled)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (!column.enabled || activeLinks.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section Title */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
        {column.title}
      </h4>

      {/* Links List */}
      <ul className="mt-3 space-y-2.5">
        {activeLinks.map((link) => {
          const isExternal = link.url.startsWith("http") || link.openInNewTab;
          const isAnchor = link.url.startsWith("#");

          const LinkContent = (
            <span className="group flex items-center justify-between text-xs text-slate-700 transition-all duration-200 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{link.label}</span>
              </span>
              <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
          );

          return (
            <li key={link.id || link.label}>
              {isExternal || isAnchor ? (
                <a
                  href={link.url}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="block py-0.5"
                >
                  {LinkContent}
                </a>
              ) : (
                <Link href={link.url} className="block py-0.5">
                  {LinkContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
