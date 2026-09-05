"use client";

import React from "react";
import { HelpCircle, Mail, Phone, Clock, MessageSquare, ExternalLink } from "lucide-react";

export interface SupportHelpSectionProps {
  siteSettings: any;
}

export function SupportHelpSection({ siteSettings }: SupportHelpSectionProps) {
  const email = siteSettings?.supportEmail || "SBCI224234@gmail.com";
  const phone = siteSettings?.supportPhone || "+91 9118245636";
  const hours = siteSettings?.supportHours || "Mon - Sat (9:00 AM - 7:00 PM IST)";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Need Help With Your Subscription?</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Our dedicated SaaS billing team is available to assist with plan customization, GST invoices, and payment issues.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">Email Billing Support</span>
            <a href={`mailto:${email}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-0.5 block">
              {email}
            </a>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Phone className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">Direct Helpline</span>
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="text-slate-700 dark:text-slate-300 font-bold hover:text-blue-600 dark:hover:text-blue-400 mt-0.5 block">
              {phone}
            </a>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">Support Operating Hours</span>
            <span className="text-slate-500 mt-0.5 block">{hours}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
