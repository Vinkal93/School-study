"use client";

import { Code, Laptop, School, Cpu, CheckCircle2 } from "lucide-react";

export function DeveloperSkills() {
  const categories = [
    {
      title: "Software Development",
      icon: Laptop,
      items: [
        "Web Applications",
        "Mobile Applications",
        "SaaS Platforms",
        "APIs & Backend Systems",
      ],
    },
    {
      title: "Education Technology",
      icon: School,
      items: [
        "School Management Systems",
        "Student Directory & Rosters",
        "Interactive Learning Tools",
        "Institutional Administration",
      ],
    },
    {
      title: "Development Stack",
      icon: Cpu,
      technologies: [
        "TypeScript",
        "JavaScript",
        "React",
        "Next.js",
        "Node.js",
        "Firebase",
        "Kotlin",
        "Android",
        "Tailwind CSS",
        "HTML5 / CSS3",
      ],
    },
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Code className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Technical Capabilities</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            What I Work With
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Disciplines, domains, and technologies leveraged to build scalable software products.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-xl"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-5">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {cat.title}
                  </h3>

                  {cat.items && (
                    <ul className="mt-4 space-y-2.5">
                      {cat.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {cat.technologies && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {cat.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
