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
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
        Get in touch
      </h4>

      <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
        {contact?.emailEnabled && contact.email && (
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="group flex items-center gap-2.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-blue-800 dark:group-hover:text-blue-400">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium">{contact.email}</span>
            </a>
          </li>
        )}

        {contact?.phoneEnabled && contact.phone && (
          <li>
            <a
              href={`tel:${contact.phone}`}
              className="group flex items-center gap-2.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-blue-800 dark:group-hover:text-blue-400">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium">{contact.phone}</span>
            </a>
          </li>
        )}

        {contact?.locationEnabled && (contact.locationLabel || contact.state) && (
          <li className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            {contact.locationUrl ? (
              <a
                href={contact.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="leading-relaxed hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {contact.locationLabel || `${contact.state}, ${contact.country}`}
              </a>
            ) : (
              <span className="leading-relaxed">
                {contact.locationLabel || `${contact.state}, ${contact.country}`}
              </span>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
