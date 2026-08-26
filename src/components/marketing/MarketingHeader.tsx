import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

interface MarketingHeaderProps {
  currentPath?: string;
}

export function MarketingHeader({ currentPath }: MarketingHeaderProps) {
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "School Management", href: "/school-management" },
    { label: "School ERP", href: "/school-erp" },
    { label: "Students", href: "/student-management" },
    { label: "Teachers", href: "/teacher-management" },
    { label: "Attendance", href: "/attendance-management" },
    { label: "Developer", href: "/about-developer" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Marketing Navigation" className="hidden xl:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Buttons & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />

          {/* Student Portal Link */}
          <Link
            href="/student/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition-all"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Student Portal
          </Link>

          {/* Portal Sign In */}
          <Link
            href="/login"
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            Sign In
          </Link>

          {/* Get Started Button */}
          <Link
            href="/login"
            className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
