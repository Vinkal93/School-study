import Link from "next/link";
import {
  School,
  Users,
  GraduationCap,
  ClipboardCheck,
  Workflow,
  ArrowRight,
} from "lucide-react";

interface RelatedModuleItem {
  title: string;
  href: string;
  description: string;
  icon: typeof School;
  anchorText: string;
}

const ALL_MODULES: RelatedModuleItem[] = [
  {
    title: "School Management",
    href: "/school-management",
    description: "Centralized administrative cockpit for multi-tenant school operations.",
    icon: School,
    anchorText: "Explore School Management Software",
  },
  {
    title: "Student Management",
    href: "/student-management",
    description: "Organize student profiles, admission numbers, and grade sections.",
    icon: Users,
    anchorText: "Explore Student Management",
  },
  {
    title: "Teacher Management",
    href: "/teacher-management",
    description: "Faculty directory, subject allocations, and classroom assignments.",
    icon: GraduationCap,
    anchorText: "Explore Teacher Management",
  },
  {
    title: "Attendance Automation",
    href: "/attendance-management",
    description: "Real-time roll-call tracking with calculated attendance percentages.",
    icon: ClipboardCheck,
    anchorText: "Explore Attendance Management",
  },
  {
    title: "School ERP System",
    href: "/school-erp",
    description: "A simple, uncluttered cloud ERP for daily institutional workflows.",
    icon: Workflow,
    anchorText: "Explore School ERP System",
  },
];

interface RelatedModulesProps {
  currentPath: string;
  title?: string;
  subtitle?: string;
}

export function RelatedModules({
  currentPath,
  title = "Explore Related School Modules",
  subtitle = "Discover how School Study's interconnected modules simplify your institution's daily workflows.",
}: RelatedModulesProps) {
  const related = ALL_MODULES.filter((mod) => mod.href !== currentPath).slice(0, 3);

  return (
    <section className="py-16 bg-slate-50/70 dark:bg-gray-900/40 border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {related.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.href}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-500/40"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-5 group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {mod.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <Link
                    href={mod.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 group-hover:gap-2 transition-all"
                  >
                    <span>{mod.anchorText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
