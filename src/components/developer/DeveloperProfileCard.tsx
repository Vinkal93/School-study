"use client";

import { Search, Mail, Phone, GraduationCap, Code2, Sparkles, UserCheck } from "lucide-react";

export function DeveloperProfileCard() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-8 shadow-md sm:p-10 dark:border-slate-800/80 dark:from-slate-900/90 dark:to-[#0A1222]/90 dark:shadow-2xl">
          {/* Subtle Ambient Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15"
          />

          <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
            {/* Left side: Avatar Image + Bio Details */}
            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
              <div className="relative flex-shrink-0">
                <img
                  src="/images/developer.jpg"
                  alt="Vinkal Prajapati"
                  className="h-28 w-28 rounded-3xl object-cover shadow-xl shadow-blue-500/20 border-2 border-white/20 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    <a
                      href="https://vinkal.sbci.online"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Visit Vinkal Prajapati's Website"
                      aria-label="Visit Vinkal Prajapati's Website"
                      className="hover:text-blue-600 transition-colors dark:hover:text-blue-400"
                    >
                      Vinkal Prajapati
                    </a>
                  </h3>
                  <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    Developer
                  </span>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    Educator
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Technology Creator
                  </span>
                </div>

                <p className="text-xs text-slate-500 max-w-md pt-1 dark:text-slate-400">
                  Specializing in Education Technology, Cloud-Native Web Architectures, and Multi-Tenant School Software.
                </p>
              </div>
            </div>

            {/* Right side: Direct Portfolio & Connect Actions */}
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <a
                href="https://vinkal.sbci.online"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Vinkal Prajapati Website"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 dark:shadow-blue-600/30"
              >
                <span>Visit vinkal.sbci.online</span>
              </a>

              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Mail className="h-4 w-4 text-slate-400" />
                <span>Get in Touch</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
