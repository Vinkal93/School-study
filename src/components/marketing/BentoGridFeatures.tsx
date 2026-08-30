"use client";

import React, { FC, ReactNode, SVGProps } from "react";
import Link from "next/link";
import {
  FileText,
  Workflow,
  Users2,
  Globe2,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BentoCardProps {
  name: string;
  className: string;
  background: ReactNode;
  Icon?: React.ElementType;
  description: string;
  href?: string;
  cta?: string;
}

export const BentoCard: FC<BentoCardProps> = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}) => (
  <div
    key={name}
    className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-blue-700/60",
      className
    )}
  >
    {background}
    <div className="z-10 flex flex-col gap-2 transition-all duration-300 group-hover:-translate-y-2">
      {Icon && (
        <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <Icon className="h-6 w-6" />
        </div>
      )}

      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {name}
      </h3>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
        {description}
      </p>
    </div>

    {href && (
      <div className="z-10 pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 group-hover:translate-x-1 transition-transform"
        >
          <span>{cta || "Learn More"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )}

    <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-blue-500/[0.02] dark:group-hover:bg-blue-400/[0.02]" />
  </div>
);

export function BentoGridFeatures() {
  const features: BentoCardProps[] = [
    {
      Icon: FileText,
      name: "Automated Academic Reporting",
      description:
        "Generate and export comprehensive student report cards, grade books, and fee summaries with one single click in CSV, Excel, or PDF.",
      href: "/features",
      cta: "Explore Reports",
      className: "lg:col-span-1",
      background: (
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      ),
    },
    {
      Icon: Workflow,
      name: "Seamless Multi-Tenant Architecture",
      description:
        "Every school enjoys 100% isolated databases, custom domains, automated daily backups, and role-based access for admins, faculty, and students.",
      href: "/school-management",
      cta: "View Security Specs",
      className: "lg:col-span-2",
      background: (
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      ),
    },
    {
      Icon: Users2,
      name: "Real-Time Faculty & Student Hub",
      description:
        "Teachers manage attendance in seconds, broadcast instant circulars, and grade assignments while students track their attendance score live.",
      href: "/student-management",
      cta: "See Interactive Hub",
      className: "lg:col-span-2",
      background: (
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      ),
    },
    {
      Icon: Globe2,
      name: "Accessible Anywhere (PWA & APK)",
      description:
        "Blazing fast performance across mobile, tablet, and desktop with offline support and lightning-fast page transitions.",
      href: "/download",
      cta: "Download Apps",
      className: "lg:col-span-1",
      background: (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      ),
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-slate-50/60 dark:bg-[#070b14]/70 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Built for Modern Institutions</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Intelligent Infrastructure for School Leaders
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Everything your administrative staff, faculty, and students need to collaborate seamlessly without paper trails.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default BentoGridFeatures;
