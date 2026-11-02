"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  BROCHURE_SECTIONS,
  BROCHURE_PRICING_SUMMARY,
  BROCHURE_FAQS,
  BROCHURE_CONTACT,
} from "@/lib/cms/brochureData";

export function WhySchoolStudySection() {
  const section = BROCHURE_SECTIONS.whySchoolStudy;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section
      id="section-11-why-us"
      className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Section 11 • Institutional ROI & Plans</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {section.title}
          </h2>

          <p className="text-sm sm:text-base font-semibold text-teal-700 dark:text-teal-400">
            {section.subtitle}
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {section.description}
          </p>
        </div>

        {/* Highlights Checklist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-12">
          {(section.highlights || []).map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                {h}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Tiers Summary Cards */}
        <div className="mb-14">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Transparent, Value-Driven Tiered Plans
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Pick the right tier for your school size. All plans include automated cloud backups and multi-tenant security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BROCHURE_PRICING_SUMMARY.map((plan, idx) => {
              const isPopular = idx === 1;
              return (
                <div
                  key={idx}
                  className={`flex flex-col justify-between rounded-3xl border p-6 sm:p-7 transition-all ${
                    isPopular
                      ? "border-blue-500 dark:border-blue-400 bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/10 scale-[1.02]"
                      : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isPopular
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {plan.badge}
                      </span>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        {plan.students}
                      </span>
                    </div>

                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                      {plan.plan}
                    </h4>

                    {/* Features list */}
                    <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-white/10">
                      {plan.features.map((f, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/10">
                    <Link
                      href="/pricing"
                      className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isPopular
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span>Explore {plan.plan} Pricing</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Brochure FAQs Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Frequently Asked Questions by School Principals
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Clear answers regarding transition timeline, hardware, privacy, and support.
            </p>
          </div>

          <div className="space-y-3">
            {BROCHURE_FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span className="pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/10 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
