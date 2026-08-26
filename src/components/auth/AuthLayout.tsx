"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { GraduationCap, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

export interface AuthLayoutFeature {
  icon: ReactNode;
  title: string;
  desc: string;
}

export interface AuthLayoutProps {
  portalBadge: string;
  badgeIcon?: ReactNode;
  headline: string;
  description: string;
  features?: AuthLayoutFeature[];
  children: ReactNode;
  variant?: "blue" | "emerald" | "purple" | "navy";
  backHref?: string;
  backLabel?: string;
}

export function AuthLayout({
  portalBadge,
  badgeIcon,
  headline,
  description,
  features = [],
  children,
  variant = "blue",
  backHref = "/login",
  backLabel = "Back to Portals",
}: AuthLayoutProps) {
  const variantStyles = {
    blue: {
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      leftBg: "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white",
      featureIconBg: "bg-white/15 text-white",
    },
    purple: {
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
      leftBg: "bg-gradient-to-br from-purple-600 via-indigo-700 to-blue-800 text-white",
      featureIconBg: "bg-white/15 text-white",
    },
    emerald: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
      leftBg: "bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white",
      featureIconBg: "bg-white/15 text-white",
    },
    navy: {
      badge: "bg-gray-800 text-indigo-300 border-gray-700 dark:bg-gray-900 dark:text-indigo-400 dark:border-gray-800",
      leftBg: "bg-gradient-to-br from-slate-900 via-gray-900 to-blue-950 text-white",
      featureIconBg: "bg-indigo-500/20 text-indigo-300",
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col justify-between bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 group min-h-[44px] items-center"
        >
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-all min-h-[44px] items-center"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Portals</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-3.5 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[560px]">
          {/* Left Branding / Visual Panel (Desktop only) */}
          <div
            className={`hidden lg:flex lg:col-span-5 p-8 sm:p-10 flex-col justify-between relative overflow-hidden ${style.leftBg}`}
          >
            {/* Subtle decorative circles */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Badge & Headline */}
            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white border border-white/20">
                {badgeIcon}
                <span>{portalBadge}</span>
              </div>

              <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-snug">
                {headline}
              </h2>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Middle Feature Highlights */}
            {features.length > 0 && (
              <div className="space-y-3 my-4 relative z-10">
                {features.map((f, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 backdrop-blur-sm ${style.featureIconBg}`}
                    >
                      {f.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{f.title}</h4>
                      <p className="text-[11px] text-white/75 leading-tight mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Security / Trust Mark */}
            <div className="pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70 relative z-10">
              <span>Secure Multi-Tenant Cloud</span>
              <span className="font-semibold text-white">v1.0.0</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-5 sm:p-8 lg:p-12 flex flex-col justify-center bg-white dark:bg-gray-900">
            <div className="w-full max-w-md mx-auto">{children}</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 pb-safe">
        <p>© 2026 School Study. All rights reserved.</p>
      </footer>
    </div>
  );
}
