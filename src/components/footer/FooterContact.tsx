"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export function FooterContact() {
  const { settings } = useSiteSettings();
  const contact = settings.contact;
  const showContact = settings.footer?.showContact;

  if (!showContact) return null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          Get in touch
        </h4>
        <div className="w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1.5" />
      </div>

      <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
        {contact?.emailEnabled && contact.email && (
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="group flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs transition-all"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex-shrink-0">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{contact.email}</span>
            </a>
          </li>
        )}

        {contact?.phoneEnabled && contact.phone && (
          <li>
            <a
              href={`tel:${contact.phone}`}
              className="group flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs transition-all"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex-shrink-0">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{contact.phone}</span>
            </a>
          </li>
        )}

        {contact?.locationEnabled && (contact.locationLabel || contact.state) && (
          <li>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex-shrink-0">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                {contact.locationLabel || `${contact.state}, ${contact.country}`}
              </span>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
