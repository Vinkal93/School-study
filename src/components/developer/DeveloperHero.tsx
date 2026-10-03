"use client";

import Link from "next/link";
import { Search, Sparkles, ArrowRight, Code2, GraduationCap, Laptop } from "lucide-react";

export function DeveloperHero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Avatar / Profile Emblem */}
        <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl sm:h-32 sm:w-32">
          <img
            src="/images/developer.jpg"
            alt="Vinkal Prajapati"
            className="h-full w-full rounded-3xl object-cover shadow-xl shadow-blue-500/20 border-2 border-blue-200 dark:border-blue-500/40"
          />
          {/* Subtle Online / Active Badge */}
          <div
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm dark:border-slate-950"
            title="Active Creator"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Roles Subtitle */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Code2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Developer</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Educator</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Creator</span>
        </div>

        {/* Main Heading */}
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          <a
            href="https://vinkal.sbci.online"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit Vinkal Prajapati's Website"
            aria-label="Visit Vinkal Prajapati's Website"
            className="group inline-flex items-center gap-2 hover:text-blue-600 transition-colors dark:hover:text-blue-400"
          >
            <span>Vinkal Prajapati</span>
          </a>
        </h1>

        {/* Supporting text */}
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
          Building practical digital products that make learning, education management, and everyday technology simpler.
        </p>

        {/* CTA Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="#projects"
            className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 dark:shadow-blue-600/30 dark:focus-visible:ring-offset-slate-950"
          >
            <span>Explore My Work</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>

          <a
            href="https://vinkal.sbci.online"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Vinkal Prajapati's Website"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-95 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-offset-slate-950"
          >
            <span>vinkal.sbci.online</span>
          </a>
        </div>
      </div>
    </section>
  );
}
