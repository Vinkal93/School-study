"use client";

import { Compass, ArrowRight, Lightbulb, Box, School, MessageSquareHeart, Sparkles, Network } from "lucide-react";

const TIMELINE = [
  { step: "01", label: "Idea", desc: "Identify administrative bottlenecks in schools", icon: Lightbulb },
  { step: "02", label: "MVP", desc: "Core multi-tenant system for rosters & attendance", icon: Box },
  { step: "03", label: "Real Schools", desc: "Deploy in genuine classroom workflows", icon: School },
  { step: "04", label: "Feedback", desc: "Listen carefully to educators & admins", icon: MessageSquareHeart },
  { step: "05", label: "Better Product", desc: "Refine UX, security, and performance", icon: Sparkles },
  { step: "06", label: "Growing Platform", desc: "End-to-end modern education ecosystem", icon: Network },
];

export function DeveloperVision() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Product Roadmap</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            The Bigger Vision
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Building practical technology that helps schools become organized, efficient, and digitally empowered.
          </p>
        </div>

        {/* Vision Paragraph */}
        <div className="mx-auto max-w-3xl mb-12 text-center text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            School Study starts with a focused, high-performance MVP. Over time, the platform evolves through continuous institutional feedback rather than bloating features for the sake of numbers.
          </p>
        </div>

        {/* Timeline Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {TIMELINE.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      STEP {item.step}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                    {item.label}
                  </h3>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>

                {idx < TIMELINE.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
