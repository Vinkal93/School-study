"use client";

import { Sparkles, Target, TrendingUp, RefreshCw, Layers } from "lucide-react";

const PRINCIPLES = [
  {
    number: "01",
    title: "Simplicity",
    description: "Technology should reduce complexity, not create more of it.",
    icon: Sparkles,
    color: "blue",
  },
  {
    number: "02",
    title: "Real-World Problems",
    description: "Products should be built around problems people actually face.",
    icon: Target,
    color: "indigo",
  },
  {
    number: "03",
    title: "Long-Term Thinking",
    description: "Build today's product with an architecture that can support tomorrow's growth.",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    number: "04",
    title: "Continuous Improvement",
    description: "Launch, listen, improve, and keep making the product better.",
    icon: RefreshCw,
    color: "amber",
  },
];

export function DeveloperPrinciples() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Product Principles</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            My Approach to Building Products
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Core philosophies that shape every interface, workflow, and architectural decision.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-blue-500/40 dark:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                      {item.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/50 dark:text-blue-400 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
