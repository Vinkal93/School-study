"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

interface MarketingHeaderProps {
  currentPath?: string;
}

export function MarketingHeader({ currentPath }: MarketingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0 min-h-[44px] items-center"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <span className="text-base sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 tracking-wide uppercase block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Marketing Navigation"
          className="hidden xl:flex items-center gap-5 lg:gap-6 text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300"
        >
          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1.5 hover:text-blue-600 dark:hover:text-blue-400 ${
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

        {/* CTA Buttons, Theme Toggle & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <ThemeToggle />

          {/* Student Portal Link (Hidden on xs) */}
          <Link
            href="/student/login"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition-all min-h-[44px] items-center"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Student Portal</span>
          </Link>

          {/* Portal Sign In (Desktop) */}
          <Link
            href="/login"
            className="hidden sm:inline-flex px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all min-h-[44px] items-center"
          >
            Sign In
          </Link>

          {/* Get Started Button */}
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all min-h-[40px] sm:min-h-[44px]"
          >
            Get Started
          </Link>

          {/* Mobile Hamburger Toggle Button (Minimum 44x44px touch target) */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden inline-flex items-center justify-center p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 top-16 sm:top-20 z-50 bg-gray-950/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 max-h-[calc(100dvh-4rem)] sm:max-h-[calc(100dvh-5rem)] overflow-y-auto p-5 pb-8 shadow-2xl flex flex-col justify-between">
            <nav className="flex flex-col space-y-1.5" aria-label="Mobile Navigation">
              {navLinks.map((link) => {
                const isActive = currentPath === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <Link
                href="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 min-h-[48px]"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Student Portal</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 min-h-[48px]"
              >
                <span>Access Management System</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
