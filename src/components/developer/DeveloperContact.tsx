"use client";

import { Mail, Phone, Headphones, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";

export function DeveloperContact() {
  const supportEmail = "sbci224234@gmail.com";
  const supportPhone = "+91 9118245636";
  const telHref = "+919118245636";

  return (
    <section id="support" className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10 lg:p-12 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-xl">
          {/* Section Tag */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Headphones className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Direct Assistance</span>
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Need Help?
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg">
                Have questions about School Study, institutional onboarding, or feature requests? We&apos;re here to assist you directly.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Official Creator Support</span>
            </div>
          </div>

          {/* Contact Cards Grid */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Email Support Card */}
            <a
              href={`mailto:${supportEmail}`}
              aria-label="Email School Study support"
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-500/40 dark:hover:bg-slate-800/90"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Mail className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Email Support
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {supportEmail}
                </p>
                <span className="mt-2 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Send an email →
                </span>
              </div>
            </a>

            {/* Phone Support Card */}
            <a
              href={`tel:${telHref}`}
              aria-label="Call School Study support"
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-emerald-500/40 dark:hover:bg-slate-800/90"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <Phone className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Phone / Helpline
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {supportPhone}
                </p>
                <span className="mt-2 inline-block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Call helpline →
                </span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
