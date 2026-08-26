"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import type { FooterGroup } from "./footerData";

interface FooterLinkGroupProps {
  group: FooterGroup;
}

export function FooterLinkGroup({ group }: FooterLinkGroupProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200/60 pb-4 md:border-b-0 md:pb-0 dark:border-slate-800/60">
      {/* Mobile Accordion Header / Desktop Section Title */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-2 text-left md:pointer-events-none md:py-0"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
          {group.title}
        </h4>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 md:hidden ${
            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {/* Links List (Always visible on md+, collapsible on mobile) */}
      <ul
        className={`mt-3 space-y-2.5 overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 md:max-h-none md:opacity-100"
        }`}
      >
        {group.links.map((link) => {
          const Icon = link.icon;
          const isAnchor = link.href.startsWith("#");

          const LinkContent = (
            <span className="group flex items-center justify-between text-xs text-slate-700 transition-all duration-200 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400">
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors duration-200 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400" />
                <span className="font-semibold">{link.label}</span>
                {link.badge && (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {link.badge}
                  </span>
                )}
              </span>
              <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
            </span>
          );

          return (
            <li key={link.label}>
              {isAnchor ? (
                <a href={link.href} className="block py-0.5">
                  {LinkContent}
                </a>
              ) : (
                <Link href={link.href} className="block py-0.5">
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
