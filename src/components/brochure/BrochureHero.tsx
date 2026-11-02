"use client";

import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  QrCode,
  School,
  Clock,
  TrendingUp,
  Cloud,
} from "lucide-react";
import {
  BROCHURE_SECTIONS,
  BROCHURE_KEY_STATS,
  BROCHURE_CONTACT,
} from "@/lib/cms/brochureData";
import { BrochureDownloadButton } from "./BrochureDownloadButton";
import { generateQRCodeSVG } from "@/lib/utils/qr-code";

export function BrochureHero() {
  const section = BROCHURE_SECTIONS.hero;
  const qrSvg = generateQRCodeSVG(BROCHURE_CONTACT.brochureUrl, {
    size: 140,
    color: "#102A43",
    bgColor: "#ffffff",
    quietZone: 2,
  });

  return (
    <section
      id="section-1-hero"
      className="relative pt-6 sm:pt-10 pb-12 sm:pb-16 overflow-hidden print:pt-0 print:pb-4"
    >
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/50 via-teal-50/20 to-transparent dark:from-blue-950/20 dark:via-teal-950/10 dark:to-transparent pointer-events-none -z-10 rounded-full blur-3xl opacity-70" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges & Breadcrumb Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide uppercase shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{section.badge}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/40 text-teal-700 dark:text-teal-300 text-xs font-bold tracking-wide uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Multi-Tenant Cloud ERP</span>
          </div>
        </div>

        {/* Main Grid: Left Hero Content, Right Interactive Brochure & QR Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              School Study —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 dark:from-blue-400 dark:via-indigo-400 dark:to-teal-300">
                Smart School Management Software
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-semibold text-teal-700 dark:text-teal-400">
              {section.subtitle}
            </p>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {section.description}
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(section.highlights || []).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 rounded-xl px-3.5 py-2.5"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            {/* CTA Group */}
            <div className="pt-3 space-y-4">
              <BrochureDownloadButton />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={BROCHURE_CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Book Guided Demo on WhatsApp</span>
                </a>

                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-all"
                >
                  <School className="h-4 w-4" />
                  <span>Register Free School Trial</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Card: QR Code & Direct Access Container */}
          <div className="lg:col-span-4">
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/15 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-900/90 dark:via-slate-950 dark:to-blue-950/40 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Scan for Mobile Brochure
                  </span>
                </div>
                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
                  Live QR
                </span>
              </div>

              {/* QR Code SVG Display */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-white shadow-inner mx-auto max-w-[170px]">
                <div
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  className="w-full flex items-center justify-center"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Point smartphone camera to scan
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instant mobile access to online interactive brochure & direct WhatsApp inquiry.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 text-center">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {BROCHURE_CONTACT.websiteUrl}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-12 pt-8 border-t border-slate-200/80 dark:border-white/10">
          {BROCHURE_KEY_STATS.map((stat, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 shadow-xs"
            >
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {stat.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {stat.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
