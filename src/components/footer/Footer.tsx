"use client";

import { FooterCTA } from "./FooterCTA";
import { FooterBrand } from "./FooterBrand";
import { FooterLinkGroup } from "./FooterLinkGroup";
import { FooterContact } from "./FooterContact";
import { FooterBottomBar } from "./FooterBottomBar";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export function Footer() {
  const { settings } = useSiteSettings();
  const footerConfig = settings.footer;

  if (!footerConfig.enabled) {
    return null;
  }

  const activeColumns = (footerConfig.columns || [])
    .filter((col) => col.enabled)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <footer
      id="contact"
      className="relative overflow-hidden border-t border-slate-200/80 bg-slate-50/90 text-slate-800 transition-colors duration-200 dark:border-slate-800/80 dark:bg-[#070D18] dark:text-slate-200"
    >
      {/* Subtle Background Radial Pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] dark:opacity-30"
      />

      <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        {/* Top CTA Area */}
        <FooterCTA />

        {/* Main Footer Content Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6 lg:gap-10">
          {/* Column 1: Brand, Tagline, Bio, Socials */}
          <div className="md:col-span-2 lg:col-span-2">
            <FooterBrand />
          </div>

          {/* Dynamic Navigation Columns */}
          {footerConfig.showNavigation && activeColumns.length > 0 && (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-2 lg:col-span-3">
              {activeColumns.map((col) => (
                <FooterLinkGroup key={col.id} column={col} />
              ))}
            </div>
          )}

          {/* Column: Contact Information */}
          <div className="md:col-span-2 lg:col-span-1">
            <FooterContact />
          </div>
        </div>

        {/* Bottom Bar: Copyright, Made with care, Back to top */}
        <FooterBottomBar />
      </div>
    </footer>
  );
}
