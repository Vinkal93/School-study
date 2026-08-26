import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, LogIn, Headphones, GraduationCap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-slate-900 selection:bg-blue-100 selection:text-blue-900 dark:bg-gray-950 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md text-center">
        {/* Emblem */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-950/50 dark:text-blue-400">
          <FileQuestion className="h-10 w-10" />
        </div>

        {/* 404 Code & Heading */}
        <span className="mt-6 inline-block font-mono text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Error 404 • Resource Not Found
        </span>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Page Not Found
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          The page you requested could not be located. It may have been moved, renamed, or is currently unavailable.
        </p>

        {/* Action Links */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 active:scale-95"
          >
            <LogIn className="h-4 w-4 text-slate-400" />
            <span>Access Portals</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>Need assistance? Contact support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
