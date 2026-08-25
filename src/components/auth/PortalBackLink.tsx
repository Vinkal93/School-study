"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PortalBackLinkProps {
  label?: string;
  href?: string;
}

export function PortalBackLink({
  label = "Back to Portal Selection",
  href = "/login",
}: PortalBackLinkProps) {
  return (
    <div className="pt-4 text-center">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{label}</span>
      </Link>
    </div>
  );
}
