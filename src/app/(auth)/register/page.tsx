import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import { SchoolRegistrationFlow } from "@/components/auth/SchoolRegistrationFlow";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";

export const metadata: Metadata = constructMetadata({
  title: "Register Your School | Free Starter Tier | School Study",
  description:
    "Register your school on School Study in 60 seconds. Get started for free with 10 students, 2 teachers, attendance, and online portals.",
  canonicalUrl: "/register",
});

export default function RegisterSchoolPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col justify-between bg-gradient-to-b from-blue-50/60 via-slate-50 to-white dark:from-[#070b14] dark:via-[#0b1120] dark:to-[#070b14] px-4 py-8">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 dark:text-white leading-tight block">
              School Study
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase block -mt-0.5">
              Smart School Management
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Center Registration Flow */}
      <div className="my-8">
        <SchoolRegistrationFlow />
      </div>

      {/* Bottom Footer Note */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-600">
        © {new Date().getFullYear()} School Study. Developed for modern educational institutions.
      </div>
    </div>
  );
}
