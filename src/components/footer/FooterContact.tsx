"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { FOOTER_CONTACT } from "./footerData";

export function FooterContact() {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
        Get in touch
      </h4>

      <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <li>
          <a
            href={`mailto:${FOOTER_CONTACT.email}`}
            className="group flex items-center gap-2.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-blue-800 dark:group-hover:text-blue-400">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">{FOOTER_CONTACT.email}</span>
          </a>
        </li>

        <li>
          <a
            href={`tel:${FOOTER_CONTACT.phone}`}
            className="group flex items-center gap-2.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-blue-800 dark:group-hover:text-blue-400">
              <Phone className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">{FOOTER_CONTACT.phone}</span>
          </a>
        </li>

        <li className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <span className="leading-relaxed">{FOOTER_CONTACT.address}</span>
        </li>
      </ul>
    </div>
  );
}
