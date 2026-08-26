"use client";

import Link from "next/link";
import { FolderGit2, ArrowUpRight, School, BookOpen, Wallet, Brain } from "lucide-react";

const PROJECTS = [
  {
    title: "School Study",
    category: "Education Technology",
    icon: School,
    description:
      "A modern school management platform designed to simplify everyday school operations for administrators, teachers, and students.",
    status: "Building / Evolving",
    href: "/",
    isInternal: true,
  },
  {
    title: "Study One",
    category: "Education",
    icon: BookOpen,
    description:
      "A learning-focused application designed to help students access educational content and digital learning tools.",
    status: "Production / Active",
  },
  {
    title: "Finance Friend",
    category: "Productivity / Finance",
    icon: Wallet,
    description:
      "A personal finance application focused on tracking income, expenses, and financial clarity.",
    status: "Maintained",
  },
  {
    title: "Vin Quiz",
    category: "AI + Education",
    icon: Brain,
    description:
      "An educational quiz and learning application exploring AI-assisted learning experiences.",
    status: "Active Project",
  },
];

export function DeveloperProjects() {
  return (
    <section id="projects" className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <FolderGit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Portfolio & Work</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Things I&apos;ve Built
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Selected digital products focused on education, student learning, and personal productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PROJECTS.map((proj) => {
            const Icon = proj.icon;
            const CardBody = (
              <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-blue-500/40 dark:shadow-xl">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {proj.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {proj.category}
                    </span>
                    <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{proj.title}</span>
                      {proj.href && (
                        <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      )}
                    </h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                      {proj.description}
                    </p>
                  </div>
                </div>
              </div>
            );

            return proj.href ? (
              <Link key={proj.title} href={proj.href} className="block h-full">
                {CardBody}
              </Link>
            ) : (
              <div key={proj.title} className="h-full">
                {CardBody}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
