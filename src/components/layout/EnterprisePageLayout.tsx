"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  ResponsiveActionMenu,
  ActionMenuItem,
} from "@/components/common/ResponsiveActionMenu";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface EnterprisePageLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  badge?: React.ReactNode;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  advancedActions?: ActionMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export function EnterprisePageLayout({
  breadcrumbs,
  title,
  badge,
  description,
  primaryAction,
  secondaryActions,
  advancedActions,
  children,
  className,
}: EnterprisePageLayoutProps) {
  return (
    <div className={cn("space-y-6 max-w-7xl mx-auto", className)}>
      {/* 1. Context & Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="pb-1">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <li className="flex-shrink-0">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1"
              >
                <Home className="h-3 w-3" />
                <span>Dashboard</span>
              </Link>
            </li>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={item.url} className="flex items-center gap-1.5 flex-shrink-0">
                  <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  {isLast ? (
                    <span
                      className="font-semibold text-slate-900 dark:text-white"
                      aria-current="page"
                    >
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.url}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* 2 & 3. Header: Title, Description, and Action Hierarchy */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* 4, 5, 7. Action Matrix: Primary, Secondary, and Advanced Menu */}
        {(primaryAction || secondaryActions || (advancedActions && advancedActions.length > 0)) && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {secondaryActions}
            {primaryAction}
            {advancedActions && advancedActions.length > 0 && (
              <ResponsiveActionMenu
                secondaryActions={advancedActions}
                menuPosition="right"
              />
            )}
          </div>
        )}
      </div>

      {/* 6. Main Content */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
