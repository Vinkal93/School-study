import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Users,
  GraduationCap,
  ClipboardCheck,
  User,
  Headphones,
  Shield,
  UserCog,
  BookOpen,
  LogIn,
  LayoutDashboard,
  Sparkles,
  CreditCard,
  Smartphone,
  School,
  Workflow,
} from "lucide-react";
import { FooterColumn } from "@/lib/cms/siteSettings";

interface FooterLinkGroupProps {
  column: FooterColumn;
}

// Icon mapper for key modules & portals
const getLinkIcon = (label: string, columnTitle: string) => {
  const l = label.toLowerCase();
  const c = columnTitle.toLowerCase();

  if (l.includes("student management")) return <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  if (l.includes("teacher management")) return <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  if (l.includes("attendance")) return <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (l.includes("developer")) return <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  if (l.includes("contact") || l.includes("support")) return <Headphones className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
  
  if (l.includes("admin")) return <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  if (l.includes("teacher workspace")) return <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  if (l.includes("student & parent") || l.includes("parent hub")) return <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  if (l.includes("staff sign-in") || l.includes("sign-in")) return <LogIn className="h-4 w-4 text-blue-600 dark:text-blue-400" />;

  return <ChevronRight className="h-3.5 w-3.5 text-blue-500/80 transition-transform duration-200 group-hover:translate-x-0.5" />;
};

export function FooterLinkGroup({ column }: FooterLinkGroupProps) {
  const activeLinks = (column.links || [])
    .filter((l) => l.enabled)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (!column.enabled || activeLinks.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Section Title with Blue Accent Bar */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
          {column.title}
        </h4>
        <div className="w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1.5" />
      </div>

      {/* Links List */}
      <ul className="mt-4 space-y-3">
        {activeLinks.map((link) => {
          const isExternal = link.url.startsWith("http") || link.openInNewTab;
          const isAnchor = link.url.startsWith("#");

          const LinkContent = (
            <span className="group flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-300">
              <span className="flex items-center gap-2">
                {getLinkIcon(link.label, column.title)}
                <span className="font-medium">{link.label}</span>
              </span>
              <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 text-blue-600 dark:text-blue-400" />
            </span>
          );

          return (
            <li key={link.id || link.label}>
              {isExternal || isAnchor ? (
                <a
                  href={link.url}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="block py-0.5"
                >
                  {LinkContent}
                </a>
              ) : (
                <Link href={link.url} className="block py-0.5">
                  {LinkContent}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
