"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Users,
  ClipboardCheck,
  Bell,
  ShieldCheck,
  Building2,
  BarChart3,
  UserCog,
  Sparkles,
  Workflow,
  BookOpen,
  Shield,
  PhoneCall,
  LogIn,
  Layers,
  CreditCard,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

interface MarketingHeaderProps {
  currentPath?: string;
}

export function MarketingHeader({ currentPath = "/" }: MarketingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close mega menu on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMegaMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
    { label: "Pricing", href: "/pricing" },
    { label: "School ERP", href: "/school-erp" },
    { label: "Developer", href: "/about-developer" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-3 sm:top-4 z-50 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-2 sm:mb-4">
      {/* Floating Pill Container */}
      <div className="relative rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xl shadow-slate-900/5 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0 min-h-[44px] items-center"
          onClick={() => {
            setMobileMenuOpen(false);
            setMegaMenuOpen(false);
          }}
        >
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5 sm:h-5 sm:w-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          aria-label="Marketing Navigation"
          className="hidden xl:flex items-center gap-1 lg:gap-2 text-xs lg:text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          {/* Solutions / Mega Menu Trigger */}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMegaMenuOpen(!megaMenuOpen)}
              onMouseEnter={() => setMegaMenuOpen(true)}
              aria-expanded={megaMenuOpen}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${
                megaMenuOpen
                  ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              <span>Solutions</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  megaMenuOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
                }`}
              />
            </button>
          </div>

          {navLinks.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMegaMenuOpen(false)}
                className={`px-3.5 py-2 rounded-full transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                    : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <ThemeToggle />

          {/* Login Button (Pill style) */}
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-all min-h-[40px] sm:min-h-[44px]"
          >
            Login
          </Link>

          {/* Contact Button (Primary Blue Pill) */}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 transition-all min-h-[40px] sm:min-h-[44px]"
          >
            Contact
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setMegaMenuOpen(false);
            }}
            className="xl:hidden inline-flex items-center justify-center p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] transition-colors"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* ==========================================
            MEGA MENU OVERLAY (Ref: uploaded UI reference)
        ========================================== */}
        {megaMenuOpen && (
          <div
            ref={megaMenuRef}
            onMouseLeave={() => setMegaMenuOpen(false)}
            className="hidden xl:block absolute top-full left-0 right-0 mt-3 p-6 sm:p-8 bg-white/98 dark:bg-slate-900/98 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in-50 slide-in-from-top-2 duration-200"
          >
            <div className="grid grid-cols-3 gap-6">
              {/* Column 1: School Management Modules */}
              <div className="space-y-4">
                {/* Header Feature Banner Box */}
                <Link
                  href="/school-management"
                  onClick={() => setMegaMenuOpen(false)}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all"
                >
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      School Management Platform
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Core system for day-to-day operations
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>

                {/* Sub items */}
                <div className="space-y-1 pt-1">
                  <Link
                    href="/student-management"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        Student Management
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Profiles, sections & enrollment
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/teacher-management"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Teacher Workspace
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Faculty profiles & class assignment
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/attendance-management"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        Attendance Automation
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Daily tracking & attendance logs
                      </span>
                    </div>
                  </Link>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    + 8 more modules
                  </span>
                </div>
              </div>

              {/* Column 2: School ERP & Infrastructure */}
              <div className="space-y-4">
                {/* Header Feature Banner Box */}
                <Link
                  href="/school-erp"
                  onClick={() => setMegaMenuOpen(false)}
                  className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all"
                >
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      School ERP Infrastructure
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Multi-tenant cloud architecture
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>

                {/* Sub items */}
                <div className="space-y-1 pt-1">
                  <Link
                    href="/school-erp"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                        Multi-Tenant Isolation
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Strict data privacy & tenant boundary
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/features"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        Platform Analytics
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Institutional growth & reports
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/pricing"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        Flexible Pricing Plans
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Starter, Professional & Enterprise
                      </span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Column 3: Portals & Gateways */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  {/* Header Feature Banner Box */}
                  <Link
                    href="/login"
                    onClick={() => setMegaMenuOpen(false)}
                    className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all"
                  >
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Access Portals
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Role-based sign-in gateways
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>

                  {/* Sub items */}
                  <div className="space-y-1 pt-3">
                    <Link
                      href="/admin/login"
                      onClick={() => setMegaMenuOpen(false)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <UserCog className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        School Admin Portal
                      </span>
                    </Link>

                    <Link
                      href="/teacher/login"
                      onClick={() => setMegaMenuOpen(false)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Teacher Workspace
                      </span>
                    </Link>

                    <Link
                      href="/student/login"
                      onClick={() => setMegaMenuOpen(false)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        Student & Parent Hub
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Powered by Brand mark */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>Powered by</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>School Study</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MOBILE SLIDE-OUT DRAWER
      ========================================== */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 top-20 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 max-h-[calc(100dvh-5rem)] overflow-y-auto p-5 pb-8 shadow-2xl flex flex-col justify-between">
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
